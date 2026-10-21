-- Pro space lot 2, hardening after the security audit.
-- - availability_overrides.sector_label: address chosen in the search, tied to the coordinates.
-- - admin_day_overview() returns sector_label and no longer returns the home of the first customer.
-- - admin_reschedule_booking() refuses dates beyond 365 days (too_far) and more than 3 moves per
--   rolling hour for one booking (too_frequent), both never forced.
-- - Writes on price_grid, booking_settings and quote_requests are reserved to the server (service
--   role); anon / authenticated also lose insert, delete and truncate on bookings.
-- booking_items and services were dropped by 20261014000000, their policies went with them.
-- See docs/specs/booking-system.md and docs/specs/technical.md.

-- ---------------------------------------------------------------------------
-- Sector label
-- ---------------------------------------------------------------------------

alter table public.availability_overrides
  add column sector_label text,
  add constraint availability_overrides_sector_label_length
    check (char_length(sector_label) between 1 and 300),
  add constraint availability_overrides_sector_label_needs_coordinates
    check (sector_label is null or sector_latitude is not null);

comment on column public.availability_overrides.sector_label is
  'Address chosen in the search for the imposed sector. Null whenever the sector is cleared.';

-- ---------------------------------------------------------------------------
-- Reschedule throttle columns
-- ---------------------------------------------------------------------------

alter table public.bookings
  add column rescheduled_at timestamptz,
  add column reschedule_count smallint not null default 0 check (reschedule_count >= 0),
  add column reschedule_window_start timestamptz;

comment on column public.bookings.rescheduled_at is 'Last admin reschedule of the booking.';
comment on column public.bookings.reschedule_count is
  'Admin reschedules since reschedule_window_start (at most 3 per hour).';
comment on column public.bookings.reschedule_window_start is
  'Start of the current one-hour reschedule window, null before the first move.';

-- ---------------------------------------------------------------------------
-- Admin reschedule: too_far and too_frequent
-- ---------------------------------------------------------------------------

drop function public.admin_reschedule_booking(uuid, date, boolean);

create function public.admin_reschedule_booking(
  p_booking_id uuid,
  p_new_date date,
  p_force boolean default false
)
returns table (
  ok boolean,
  reason text,
  old_date date,
  new_date date,
  overridden_reason text,
  overridden_reasons text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_days_ahead constant integer := 365;
  c_max_moves constant integer := 3;
  c_window constant interval := interval '1 hour';
  v_booking public.bookings%rowtype;
  v_settings public.booking_settings%rowtype;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_in_window boolean;
  v_day_status text;
  v_day_reason text;
  v_refusal text;
  v_reasons text[] := array[]::text[];
begin
  if p_booking_id is null then
    return query
      select false, 'not_found'::text, null::date, null::date, null::text, null::text[];
    return;
  end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;

  if not found then
    return query
      select false, 'not_found'::text, null::date, null::date, null::text, null::text[];
    return;
  end if;

  if v_booking.status <> 'paid' then
    return query
      select false, 'not_paid'::text, v_booking.scheduled_date, null::date, null::text, null::text[];
    return;
  end if;

  if p_new_date is null or p_new_date in ('infinity', '-infinity') then
    return query
      select false, 'invalid_date'::text, v_booking.scheduled_date, null::date, null::text,
        null::text[];
    return;
  end if;

  if p_new_date = v_booking.scheduled_date then
    return query
      select false, 'same_date'::text, v_booking.scheduled_date, p_new_date, null::text,
        null::text[];
    return;
  end if;

  if p_new_date < v_today then
    return query
      select false, 'past_date'::text, v_booking.scheduled_date, p_new_date, null::text,
        null::text[];
    return;
  end if;

  if p_new_date > v_today + c_max_days_ahead then
    return query
      select false, 'too_far'::text, v_booking.scheduled_date, p_new_date, null::text,
        null::text[];
    return;
  end if;

  v_in_window := v_booking.reschedule_window_start is not null
    and v_booking.reschedule_window_start > now() - c_window;

  if v_in_window and v_booking.reschedule_count >= c_max_moves then
    return query
      select false, 'too_frequent'::text, v_booking.scheduled_date, p_new_date, null::text,
        null::text[];
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtext('booking-day:' || least(v_booking.scheduled_date, p_new_date)::text)
  );
  perform pg_advisory_xact_lock(
    hashtext('booking-day:' || greatest(v_booking.scheduled_date, p_new_date)::text)
  );

  select * into v_settings from public.booking_settings limit 1;

  if public.distance_km(
    v_settings.depot_latitude, v_settings.depot_longitude, v_booking.latitude, v_booking.longitude
  ) > v_settings.service_area_radius_km then
    v_reasons := array_append(v_reasons, 'out_of_area');
  end if;

  v_day_status := public.day_check(
    p_new_date, v_booking.latitude, v_booking.longitude, v_booking.id, false
  );
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
      select false, v_refusal, v_booking.scheduled_date, p_new_date, null::text, null::text[];
    return;
  end if;

  update public.bookings b
  set
    scheduled_date = p_new_date,
    reminder_sent_at = null,
    day_of_sms_sent_at = null,
    rescheduled_at = now(),
    reschedule_count = case when v_in_window then v_booking.reschedule_count + 1 else 1 end,
    reschedule_window_start = case when v_in_window then v_booking.reschedule_window_start else now() end
  where b.id = v_booking.id;

  return query
    select true, null::text, v_booking.scheduled_date, p_new_date, v_refusal, v_reasons;
end;
$$;

comment on function public.admin_reschedule_booking(uuid, date, boolean) is
  'Moves a paid booking to another date under the day locks. Never forced: not_found, not_paid, invalid_date, same_date, past_date, too_far (more than 365 days ahead), too_frequent (4th move within one hour). Soft checks, all evaluated in this order: out_of_area, then day_closed / day_full / out_of_sector (day_check). Without p_force the first one refuses (reason). With p_force the move happens and overridden_reasons lists every soft check that failed, overridden_reason being the first. Resets reminder_sent_at and day_of_sms_sent_at, records the move for the throttle. Lead time and horizon are not applied.';

revoke execute on function public.admin_reschedule_booking(uuid, date, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_reschedule_booking(uuid, date, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Admin day overview: sector_label in, booked_latitude / booked_longitude out
-- ---------------------------------------------------------------------------

drop function public.admin_day_overview(date, date);

create function public.admin_day_overview(p_from date, p_to date)
returns table (
  day date,
  weekday smallint,
  capacity integer,
  capacity_source text,
  is_closed boolean,
  sector_latitude double precision,
  sector_longitude double precision,
  sector_label text,
  note text,
  active_count integer,
  paid_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'INVALID_RANGE';
  end if;

  return query
  select
    (p_from + g.i)::date,
    extract(dow from p_from + g.i)::smallint,
    coalesce(o.max_bookings, r.max_bookings, 0),
    case when o.max_bookings is not null then 'override' else 'rule' end,
    coalesce(o.max_bookings, r.max_bookings, 0) = 0,
    o.sector_latitude,
    o.sector_longitude,
    o.sector_label,
    o.note,
    (
      select count(*)::integer
      from public.bookings b
      where b.scheduled_date = p_from + g.i
        and (
          b.status in ('paid', 'completed')
          or (b.status = 'pending_payment' and b.expires_at > now())
        )
    ),
    (
      select count(*)::integer
      from public.bookings b
      where b.scheduled_date = p_from + g.i and b.status = 'paid'
    )
  from generate_series(0, p_to - p_from) as g (i)
  left join public.availability_overrides o on o.date = p_from + g.i
  left join public.availability_rules r on r.weekday = extract(dow from p_from + g.i)::smallint
  order by 1;
end;
$$;

comment on function public.admin_day_overview(date, date) is
  'One row per date of the range (400 days max): effective capacity and its source, imposed sector with its label, active bookings (counted toward capacity) and paid bookings (to move if the day is closed).';

revoke execute on function public.admin_day_overview(date, date) from public, anon, authenticated;
grant execute on function public.admin_day_overview(date, date) to service_role;

-- ---------------------------------------------------------------------------
-- Writes reserved to the server (service role)
-- ---------------------------------------------------------------------------

revoke insert, delete, truncate on public.bookings from anon, authenticated;
revoke truncate on public.availability_rules from anon, authenticated;
revoke truncate on public.availability_overrides from anon, authenticated;

drop policy "price_grid_admin_write" on public.price_grid;
revoke insert, update, delete, truncate on public.price_grid from anon, authenticated;

drop policy "booking_settings_admin_all" on public.booking_settings;
revoke insert, update, delete, truncate on public.booking_settings from anon, authenticated;
create policy "booking_settings_admin_select" on public.booking_settings
  for select to authenticated
  using ((select public.is_admin()));

drop policy "quote_requests_admin_all" on public.quote_requests;
revoke insert, update, delete, truncate on public.quote_requests from anon, authenticated;
create policy "quote_requests_admin_select" on public.quote_requests
  for select to authenticated
  using ((select public.is_admin()));
