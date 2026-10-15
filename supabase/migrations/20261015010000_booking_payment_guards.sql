create index bookings_customer_id_status_expires_at_idx
  on public.bookings (customer_id, status, expires_at);

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

  select g.price_cents into v_price
  from public.price_grid g
  where g.plan = p_plan
    and g.small_bin_count = p_small_bin_count
    and g.large_bin_count = p_large_bin_count;

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

revoke execute on function public.create_booking(
  uuid, date, text, text, text, double precision, double precision, public.booking_plan,
  smallint, smallint, smallint[], smallint[], boolean, text, integer
) from public, anon, authenticated;

grant execute on function public.create_booking(
  uuid, date, text, text, text, double precision, double precision, public.booking_plan,
  smallint, smallint, smallint[], smallint[], boolean, text, integer
) to service_role;

create function public.confirm_booking_payment(
  p_booking_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_amount_cents integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.stripe_checkout_session_id = p_checkout_session_id
    and b.amount_total_cents = p_amount_cents
  for update;

  if not found then
    return 'not_found';
  end if;

  if v_booking.status in ('paid', 'completed') then
    return 'already_paid';
  end if;

  if v_booking.status = 'cancelled' then
    return 'not_payable';
  end if;

  if v_booking.status = 'pending_payment' and v_booking.expires_at > now() then
    update public.bookings b
    set status = 'paid', stripe_payment_intent_id = p_payment_intent_id
    where b.id = v_booking.id;

    return 'paid';
  end if;

  perform pg_advisory_xact_lock(hashtext('booking-day:' || v_booking.scheduled_date::text));

  if public.day_status(v_booking.scheduled_date, v_booking.latitude, v_booking.longitude)
    = 'available' then
    update public.bookings b
    set status = 'paid', stripe_payment_intent_id = p_payment_intent_id
    where b.id = v_booking.id;

    return 'paid';
  end if;

  update public.bookings b
  set status = 'expired', stripe_payment_intent_id = p_payment_intent_id
  where b.id = v_booking.id;

  return 'refund_required';
end;
$$;

revoke execute on function public.confirm_booking_payment(uuid, text, text, integer)
  from public, anon, authenticated;

grant execute on function public.confirm_booking_payment(uuid, text, text, integer)
  to service_role;
