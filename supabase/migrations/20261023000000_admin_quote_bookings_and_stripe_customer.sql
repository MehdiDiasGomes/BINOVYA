-- Pro space: quote-based and idempotent admin bookings, one Stripe customer per profile.
-- - profiles.stripe_customer_id: written by the server (service role) only; the customer update
--   grant stays limited to first_name, last_name and phone.
-- - bookings.admin_request_id: idempotency key of admin_create_booking(); a replay returns the
--   existing booking (is_replay = true) without creating anything nor re-checking capacity.
-- - bookings.price_source ('grid' | 'quote') and bookings.admin_note (internal, max 500
--   characters). In quote mode the admin sets the price and 0 to 50 bins per format; online
--   bookings and grid-priced bookings stay limited to 0..2 bins per format.
-- - admin_note and admin_request_id are hidden from the customer: select on bookings is now
--   granted column by column. Any future bookings column must be granted to authenticated
--   explicitly if the customer needs to read it.
-- admin_create_booking() changes signature: dropped and recreated, still service_role only.
-- See docs/specs/booking-system.md and docs/specs/technical.md.

-- ---------------------------------------------------------------------------
-- Stripe customer
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column stripe_customer_id text,
  add constraint profiles_stripe_customer_id_format
    check (stripe_customer_id is null or left(stripe_customer_id, 4) = 'cus_');

create unique index profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

comment on column public.profiles.stripe_customer_id is
  'Stripe customer id (cus_...), one per customer, created and written by the server (service role) only.';

-- ---------------------------------------------------------------------------
-- Booking columns and constraints
-- ---------------------------------------------------------------------------

alter table public.bookings
  add column admin_request_id uuid,
  add column price_source text not null default 'grid',
  add column admin_note text,
  add constraint bookings_price_source_check check (price_source in ('grid', 'quote')),
  add constraint bookings_admin_note_length
    check (admin_note is null or char_length(admin_note) between 1 and 500),
  add constraint bookings_admin_request_id_admin_only
    check (admin_request_id is null or created_by_admin),
  add constraint bookings_quote_admin_only check (price_source = 'grid' or created_by_admin),
  add constraint bookings_bin_count_by_price_source check (
    case price_source
      when 'quote' then small_bin_count <= 50 and large_bin_count <= 50
      else small_bin_count <= 2 and large_bin_count <= 2
    end
  );

create unique index bookings_admin_request_id_key
  on public.bookings (admin_request_id)
  where admin_request_id is not null;

comment on column public.bookings.admin_request_id is
  'Idempotency key sent by the Pro space when the admin creates a booking; null for online bookings.';
comment on column public.bookings.price_source is
  'grid: price from price_grid (0 to 2 bins per format). quote: price set by the admin after a quote (0 to 50 bins per format), admin-created only.';
comment on column public.bookings.admin_note is
  'Internal note of the admin (max 500 characters), never readable by the customer.';

do $$
declare
  v_columns text;
begin
  select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position)
  into v_columns
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'bookings'
    and c.column_name not in ('admin_note', 'admin_request_id');

  revoke select on public.bookings from anon, authenticated;
  execute format('grant select (%s) on public.bookings to authenticated', v_columns);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin booking creation (new signature)
-- ---------------------------------------------------------------------------

drop function public.admin_create_booking(
  uuid, text, date, text, text, text, double precision, double precision, public.booking_plan,
  smallint, smallint, smallint[], smallint[], text, boolean, integer
);

create function public.admin_create_booking(
  p_customer_id uuid,
  p_request_id uuid,
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
  p_hold_minutes integer default 1440,
  p_quote_amount_cents integer default null,
  p_note text default null
)
returns table (
  ok boolean,
  reason text,
  new_booking_id uuid,
  total_cents integer,
  hold_expires_at timestamptz,
  overridden_reasons text[],
  is_replay boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_days_ahead constant integer := 365;
  c_max_quote_cents constant integer := 1000000;
  c_max_quote_bins constant integer := 50;
  v_settings public.booking_settings%rowtype;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_is_quote boolean := p_quote_amount_cents is not null;
  v_note text := nullif(btrim(p_note), '');
  v_existing public.bookings%rowtype;
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
    or p_request_id is null
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
    or char_length(v_note) > 500
  then
    return query
      select false, 'invalid_input'::text, null::uuid, null::integer, null::timestamptz,
        null::text[], false;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext('booking-request:' || p_request_id::text));

  select * into v_existing from public.bookings b where b.admin_request_id = p_request_id;

  if found then
    if v_existing.customer_id <> p_customer_id then
      return query
        select false, 'invalid_input'::text, null::uuid, null::integer, null::timestamptz,
          null::text[], false;
      return;
    end if;

    return query
      select true, null::text, v_existing.id, v_existing.amount_total_cents, v_existing.expires_at,
        array[]::text[], true;
    return;
  end if;

  if v_is_quote and p_quote_amount_cents not between 1 and c_max_quote_cents then
    return query
      select false, 'invalid_quote_amount'::text, null::uuid, null::integer, null::timestamptz,
        null::text[], false;
    return;
  end if;

  if p_small_bin_count is null or p_large_bin_count is null
    or p_small_bin_count < 0 or p_large_bin_count < 0
    or p_small_bin_count + p_large_bin_count < (case when v_is_quote then 1 else 0 end)
    or p_small_bin_count > (case when v_is_quote then c_max_quote_bins else 2 end)
    or p_large_bin_count > (case when v_is_quote then c_max_quote_bins else 2 end) then
    return query
      select false, 'invalid_quantities'::text, null::uuid, null::integer, null::timestamptz,
        null::text[], false;
    return;
  end if;

  if v_is_quote then
    v_price := p_quote_amount_cents;
  else
    v_price := public.booking_price_cents(p_plan, p_small_bin_count, p_large_bin_count);

    if v_price is null then
      return query
        select false, 'quote_required'::text, null::uuid, null::integer, null::timestamptz,
          null::text[], false;
      return;
    end if;
  end if;

  if not exists (select 1 from public.profiles pr where pr.id = p_customer_id) then
    return query
      select false, 'customer_not_found'::text, null::uuid, null::integer, null::timestamptz,
        null::text[], false;
    return;
  end if;

  if p_scheduled_date < v_today then
    return query
      select false, 'past_date'::text, null::uuid, null::integer, null::timestamptz, null::text[],
        false;
    return;
  end if;

  if p_scheduled_date > v_today + c_max_days_ahead then
    return query
      select false, 'too_far'::text, null::uuid, null::integer, null::timestamptz, null::text[],
        false;
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
          null::text[], false;
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
      select false, v_refusal, null::uuid, null::integer, null::timestamptz, null::text[], false;
    return;
  end if;

  if p_mode = 'payment_link' then
    v_expires_at := now() + make_interval(mins => p_hold_minutes);
  end if;

  insert into public.bookings (
    customer_id, scheduled_date, address, city, postcode, country_code, latitude, longitude,
    plan, small_bin_count, large_bin_count, household_collection_weekdays,
    recycling_collection_weekdays, bins_ready_confirmed_at, amount_total_cents, status,
    expires_at, payment_method, created_by_admin, admin_request_id, price_source, admin_note
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
    true, p_request_id, case when v_is_quote then 'quote' else 'grid' end, v_note
  )
  returning id into v_booking_id;

  return query
    select true, null::text, v_booking_id, v_price, v_expires_at, v_reasons, false;
end;
$$;

comment on function public.admin_create_booking(
  uuid, uuid, text, date, text, text, text, double precision, double precision,
  public.booking_plan, smallint, smallint, smallint[], smallint[], text, boolean, integer, integer,
  text
) is
  'Creates a booking for a customer under the day advisory lock. Idempotent on p_request_id (required): when a booking already carries it for the same customer, it is returned with is_replay true and nothing is checked nor created (another customer: invalid_input). Price: p_quote_amount_cents null = price_grid (price_source grid, 0 to 2 bins per format, quote_required when the combination is not in the grid); given (1 to 1000000 cents, else invalid_quote_amount) = that price (price_source quote, 0 to 50 bins per format, at least one bin). p_note (max 500 characters, trimmed, empty = null) is stored as admin_note. p_mode payment_link: pending_payment, slot held p_hold_minutes (30 to 1440, default 1440), hold_expires_at returned, payment_method stripe. p_mode offline: created paid, no expiry, payment_method offline. Never forced: invalid_input, invalid_quote_amount, invalid_quantities, quote_required, customer_not_found, past_date, too_far (more than 365 days ahead), customer_pending (payment_link only). Soft checks, as admin_reschedule_booking(): out_of_area, then day_closed / day_full / out_of_sector (day_check without lead time or horizon); without p_force the first one refuses (reason), with p_force the booking is created and overridden_reasons lists every soft check that failed. Returns no customer data.';

revoke execute on function public.admin_create_booking(
  uuid, uuid, text, date, text, text, text, double precision, double precision,
  public.booking_plan, smallint, smallint, smallint[], smallint[], text, boolean, integer, integer,
  text
) from public, anon, authenticated;
grant execute on function public.admin_create_booking(
  uuid, uuid, text, date, text, text, text, double precision, double precision,
  public.booking_plan, smallint, smallint, smallint[], smallint[], text, boolean, integer, integer,
  text
) to service_role;
