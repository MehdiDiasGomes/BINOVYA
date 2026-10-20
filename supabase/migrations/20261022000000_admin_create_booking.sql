-- Pro space: the admin creates an intervention himself.
-- - bookings.payment_method ('stripe' default, 'offline'): offline bookings are created paid by
--   the admin (cash, transfer) and never carry a Stripe session, payment intent or invoice.
-- - bookings.created_by_admin tells admin-created bookings from online ones.
-- - booking_price_cents() is the single price grid lookup, shared by create_booking() and
--   admin_create_booking().
-- - admin_create_booking() creates the booking under the day advisory lock: 'payment_link' mode
--   holds the slot (24 h by default) as pending_payment, 'offline' mode creates it paid.
-- - admin_claim_checkout_link_resend() throttles the resend of the Stripe link (3 per hour).
-- Both functions are reserved to the server (service role) after requireAdmin.
-- expire_stale_bookings() and confirm_booking_payment() need no change: they rely on
-- expires_at and the Stripe session id only.
-- See docs/specs/booking-system.md and docs/specs/technical.md.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.bookings
  add column payment_method text not null default 'stripe',
  add column created_by_admin boolean not null default false,
  add column checkout_link_resent_at timestamptz,
  add column checkout_link_resend_count smallint not null default 0,
  add column checkout_link_resend_window_start timestamptz,
  add constraint bookings_payment_method_check check (payment_method in ('stripe', 'offline')),
  add constraint bookings_offline_has_no_stripe_ids check (
    payment_method <> 'offline'
    or (
      stripe_checkout_session_id is null
      and stripe_payment_intent_id is null
      and stripe_invoice_id is null
    )
  ),
  add constraint bookings_checkout_link_resend_count_check check (checkout_link_resend_count >= 0);

comment on column public.bookings.payment_method is
  'stripe: paid (or to pay) through Stripe Checkout. offline: paid outside the site (cash, transfer), created paid by the admin, never any Stripe session, payment intent or invoice.';
comment on column public.bookings.created_by_admin is
  'True when the admin created the booking from the Pro space.';
comment on column public.bookings.checkout_link_resent_at is 'Last resend of the Stripe payment link.';
comment on column public.bookings.checkout_link_resend_count is
  'Payment link resends since checkout_link_resend_window_start (at most 3 per hour).';
comment on column public.bookings.checkout_link_resend_window_start is
  'Start of the current one-hour resend window, null before the first resend.';

-- ---------------------------------------------------------------------------
-- Shared price lookup
-- ---------------------------------------------------------------------------

create function public.booking_price_cents(
  p_plan public.booking_plan,
  p_small_bin_count smallint,
  p_large_bin_count smallint
)
returns integer
language sql
stable
set search_path = ''
as $$
  select g.price_cents
  from public.price_grid g
  where g.plan = p_plan
    and g.small_bin_count = p_small_bin_count
    and g.large_bin_count = p_large_bin_count;
$$;

comment on function public.booking_price_cents(public.booking_plan, smallint, smallint) is
  'Price per visit from price_grid, tax included; null when the combination requires a quote.';

revoke execute on function public.booking_price_cents(public.booking_plan, smallint, smallint)
  from public, anon, authenticated;
grant execute on function public.booking_price_cents(public.booking_plan, smallint, smallint)
  to service_role;

create or replace function public.create_booking(
  p_customer_id uuid,
  p_scheduled_date date,
  p_address text,
  p_city text,
  p_postcode text,
  p_latitude double precision,
  p_longitude double precision,
  p_plan public.booking_plan,
  p_small_bin_count smallint,
  p_large_bin_count smallint,
  p_household_collection_weekdays smallint[],
  p_recycling_collection_weekdays smallint[],
  p_bins_ready_confirmed boolean,
  p_country_code text default 'FR',
  p_hold_minutes integer default 35
)
returns table (new_booking_id uuid, total_cents integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.booking_settings%rowtype;
  v_price integer;
  v_booking_id uuid;
begin
  if not coalesce(p_bins_ready_confirmed, false) then
    raise exception 'BINS_NOT_CONFIRMED';
  end if;

  v_price := public.booking_price_cents(p_plan, p_small_bin_count, p_large_bin_count);

  if v_price is null then
    raise exception 'QUOTE_REQUIRED';
  end if;

  select * into v_settings from public.booking_settings limit 1;

  if public.distance_km(v_settings.depot_latitude, v_settings.depot_longitude, p_latitude, p_longitude)
    > v_settings.service_area_radius_km then
    raise exception 'OUT_OF_AREA';
  end if;

  perform pg_advisory_xact_lock(hashtext('booking-day:' || p_scheduled_date::text));

  if public.day_status(p_scheduled_date, p_latitude, p_longitude) <> 'available' then
    raise exception 'DAY_UNAVAILABLE';
  end if;

  perform pg_advisory_xact_lock(hashtext('booking-customer:' || p_customer_id::text));

  if exists (
    select 1
    from public.bookings b
    where b.customer_id = p_customer_id
      and b.status = 'pending_payment'
      and b.expires_at > now()
  ) then
    raise exception 'PENDING_BOOKING_EXISTS';
  end if;

  insert into public.bookings (
    customer_id, scheduled_date, address, city, postcode, country_code, latitude, longitude,
    plan, small_bin_count, large_bin_count, household_collection_weekdays,
    recycling_collection_weekdays, bins_ready_confirmed_at, amount_total_cents, expires_at
  )
  values (
    p_customer_id, p_scheduled_date, p_address, p_city, p_postcode, p_country_code, p_latitude,
    p_longitude, p_plan, p_small_bin_count, p_large_bin_count,
    coalesce(p_household_collection_weekdays, '{}'),
    coalesce(p_recycling_collection_weekdays, '{}'), now(), v_price,
    now() + make_interval(mins => p_hold_minutes)
  )
  returning id into v_booking_id;

  return query select v_booking_id, v_price;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin booking creation
-- ---------------------------------------------------------------------------

create function public.admin_create_booking(
  p_customer_id uuid,
  p_mode text,
  p_scheduled_date date,
  p_address text,
  p_city text,
  p_postcode text,
  p_latitude double precision,
  p_longitude double precision,
  p_plan public.booking_plan,
  p_small_bin_count smallint,
  p_large_bin_count smallint,
  p_household_collection_weekdays smallint[],
  p_recycling_collection_weekdays smallint[],
  p_country_code text default 'FR',
  p_force boolean default false,
  p_hold_minutes integer default 1440
)
returns table (
  ok boolean,
  reason text,
  new_booking_id uuid,
  total_cents integer,
  hold_expires_at timestamptz,
  overridden_reasons text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_days_ahead constant integer := 365;
  v_settings public.booking_settings%rowtype;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_price integer;
  v_day_status text;
  v_day_reason text;
  v_refusal text;
  v_reasons text[] := array[]::text[];
  v_booking_id uuid;
  v_expires_at timestamptz;
begin
  if p_mode is null or p_mode not in ('payment_link', 'offline')
    or p_customer_id is null
    or p_scheduled_date is null or p_scheduled_date in ('infinity', '-infinity')
    or p_plan is null
    or p_latitude is null or p_latitude not between -90 and 90
    or p_longitude is null or p_longitude not between -180 and 180
    or nullif(btrim(p_address), '') is null or char_length(p_address) > 200
    or nullif(btrim(p_city), '') is null or char_length(p_city) > 100
    or nullif(btrim(p_postcode), '') is null or char_length(p_postcode) > 20
    or p_country_code is null or p_country_code not in ('FR', 'LU')
    or exists (
      select 1 from unnest(coalesce(p_household_collection_weekdays, '{}')) as w (d)
      where w.d not between 0 and 6
    )
    or exists (
      select 1 from unnest(coalesce(p_recycling_collection_weekdays, '{}')) as w (d)
      where w.d not between 0 and 6
    )
    or (p_mode = 'payment_link' and (p_hold_minutes is null or p_hold_minutes not between 30 and 1440))
  then
    return query
      select false, 'invalid_input'::text, null::uuid, null::integer, null::timestamptz,
        null::text[];
    return;
  end if;

  if p_small_bin_count is null or p_large_bin_count is null
    or p_small_bin_count not between 0 and 2 or p_large_bin_count not between 0 and 2 then
    return query
      select false, 'invalid_quantities'::text, null::uuid, null::integer, null::timestamptz,
        null::text[];
    return;
  end if;

  v_price := public.booking_price_cents(p_plan, p_small_bin_count, p_large_bin_count);

  if v_price is null then
    return query
      select false, 'quote_required'::text, null::uuid, null::integer, null::timestamptz,
        null::text[];
    return;
  end if;

  if not exists (select 1 from public.profiles pr where pr.id = p_customer_id) then
    return query
      select false, 'customer_not_found'::text, null::uuid, null::integer, null::timestamptz,
        null::text[];
    return;
  end if;

  if p_scheduled_date < v_today then
    return query
      select false, 'past_date'::text, null::uuid, null::integer, null::timestamptz, null::text[];
    return;
  end if;

  if p_scheduled_date > v_today + c_max_days_ahead then
    return query
      select false, 'too_far'::text, null::uuid, null::integer, null::timestamptz, null::text[];
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext('booking-day:' || p_scheduled_date::text));

  if p_mode = 'payment_link' then
    perform pg_advisory_xact_lock(hashtext('booking-customer:' || p_customer_id::text));

    if exists (
      select 1
      from public.bookings b
      where b.customer_id = p_customer_id
        and b.status = 'pending_payment'
        and b.expires_at > now()
    ) then
      return query
        select false, 'customer_pending'::text, null::uuid, null::integer, null::timestamptz,
          null::text[];
      return;
    end if;
  end if;

  select * into v_settings from public.booking_settings limit 1;

  if public.distance_km(
    v_settings.depot_latitude, v_settings.depot_longitude, p_latitude, p_longitude
  ) > v_settings.service_area_radius_km then
    v_reasons := array_append(v_reasons, 'out_of_area');
  end if;

  v_day_status := public.day_check(p_scheduled_date, p_latitude, p_longitude, null, false);
  v_day_reason := case v_day_status
    when 'closed' then 'day_closed'
    when 'full' then 'day_full'
    when 'outOfSector' then 'out_of_sector'
    else null
  end;

  if v_day_reason is not null then
    v_reasons := array_append(v_reasons, v_day_reason);
  end if;

  v_refusal := v_reasons[1];

  if v_refusal is not null and not coalesce(p_force, false) then
    return query
      select false, v_refusal, null::uuid, null::integer, null::timestamptz, null::text[];
    return;
  end if;

  if p_mode = 'payment_link' then
    v_expires_at := now() + make_interval(mins => p_hold_minutes);
  end if;

  insert into public.bookings (
    customer_id, scheduled_date, address, city, postcode, country_code, latitude, longitude,
    plan, small_bin_count, large_bin_count, household_collection_weekdays,
    recycling_collection_weekdays, bins_ready_confirmed_at, amount_total_cents, status,
    expires_at, payment_method, created_by_admin
  )
  values (
    p_customer_id, p_scheduled_date, btrim(p_address), btrim(p_city), btrim(p_postcode),
    p_country_code, p_latitude, p_longitude, p_plan, p_small_bin_count, p_large_bin_count,
    coalesce(p_household_collection_weekdays, '{}'),
    coalesce(p_recycling_collection_weekdays, '{}'), now(), v_price,
    case p_mode when 'offline' then 'paid'::public.booking_status
      else 'pending_payment'::public.booking_status end,
    v_expires_at,
    case p_mode when 'offline' then 'offline' else 'stripe' end,
    true
  )
  returning id into v_booking_id;

  return query
    select true, null::text, v_booking_id, v_price, v_expires_at, v_reasons;
end;
$$;

comment on function public.admin_create_booking(
  uuid, text, date, text, text, text, double precision, double precision, public.booking_plan,
  smallint, smallint, smallint[], smallint[], text, boolean, integer
) is
  'Creates a booking for a customer under the day advisory lock; the price comes from price_grid. p_mode payment_link: pending_payment, slot held p_hold_minutes (30 to 1440, default 1440), hold_expires_at returned, payment_method stripe. p_mode offline: created paid, no expiry, payment_method offline. Never forced: invalid_input, invalid_quantities, quote_required, customer_not_found, past_date, too_far (more than 365 days ahead), customer_pending (payment_link only: the customer already has an unexpired pending booking). Soft checks, as admin_reschedule_booking(): out_of_area, then day_closed / day_full / out_of_sector (day_check without lead time or horizon); without p_force the first one refuses (reason), with p_force the booking is created and overridden_reasons lists every soft check that failed. Returns no customer data.';

revoke execute on function public.admin_create_booking(
  uuid, text, date, text, text, text, double precision, double precision, public.booking_plan,
  smallint, smallint, smallint[], smallint[], text, boolean, integer
) from public, anon, authenticated;
grant execute on function public.admin_create_booking(
  uuid, text, date, text, text, text, double precision, double precision, public.booking_plan,
  smallint, smallint, smallint[], smallint[], text, boolean, integer
) to service_role;

-- ---------------------------------------------------------------------------
-- Payment link resend throttle
-- ---------------------------------------------------------------------------

create function public.admin_claim_checkout_link_resend(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_resends constant integer := 3;
  c_window constant interval := interval '1 hour';
  v_booking public.bookings%rowtype;
  v_in_window boolean;
begin
  if p_booking_id is null then
    return 'not_found';
  end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;

  if not found then
    return 'not_found';
  end if;

  if v_booking.status <> 'pending_payment' then
    return 'not_pending';
  end if;

  if v_booking.expires_at is null or v_booking.expires_at <= now() then
    return 'expired';
  end if;

  if v_booking.stripe_checkout_session_id is null then
    return 'no_link';
  end if;

  v_in_window := v_booking.checkout_link_resend_window_start is not null
    and v_booking.checkout_link_resend_window_start > now() - c_window;

  if v_in_window and v_booking.checkout_link_resend_count >= c_max_resends then
    return 'too_frequent';
  end if;

  update public.bookings b
  set
    checkout_link_resent_at = now(),
    checkout_link_resend_count = case
      when v_in_window then v_booking.checkout_link_resend_count + 1 else 1 end,
    checkout_link_resend_window_start = case
      when v_in_window then v_booking.checkout_link_resend_window_start else now() end
  where b.id = v_booking.id;

  return 'ok';
end;
$$;

comment on function public.admin_claim_checkout_link_resend(uuid) is
  'Claims one resend of the Stripe payment link under the booking row lock. Returns ok, not_found, not_pending (status other than pending_payment), expired (hold elapsed), no_link (no Stripe session yet) or too_frequent (4th claim within one hour). The caller sends the mail only on ok.';

revoke execute on function public.admin_claim_checkout_link_resend(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_claim_checkout_link_resend(uuid) to service_role;
