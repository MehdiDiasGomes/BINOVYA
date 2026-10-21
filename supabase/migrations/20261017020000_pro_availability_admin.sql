-- Pro space lot 2: availability administration and booking reschedule.
-- - Admin writes go through the server (service role) after requireAdmin + auth.getUser(): the
--   authenticated role loses every write on bookings, availability_rules and availability_overrides.
-- - day_status() logic moves to day_check() (adds an excluded booking and optional date bounds),
--   day_status() keeps its signature and behaviour.
-- - admin_reschedule_booking() moves a paid booking atomically, admin_day_overview() feeds the UI.
-- - Every policy calling is_admin() now wraps it in (select ...) so it is evaluated once per query.
-- See docs/specs/booking-system.md and docs/specs/technical.md.

-- ---------------------------------------------------------------------------
-- Constraints on the availability tables
-- ---------------------------------------------------------------------------

alter table public.availability_rules
  add constraint availability_rules_max_bookings_upper check (max_bookings <= 50);

alter table public.availability_overrides
  add constraint availability_overrides_max_bookings_upper check (max_bookings <= 50),
  add constraint availability_overrides_latitude_range
    check (sector_latitude between -90 and 90),
  add constraint availability_overrides_longitude_range
    check (sector_longitude between -180 and 180),
  add constraint availability_overrides_note_length check (char_length(note) <= 500);

-- ---------------------------------------------------------------------------
-- Day check shared by day_status() and the admin reschedule
-- ---------------------------------------------------------------------------

create function public.day_check(
  p_date date,
  p_latitude double precision,
  p_longitude double precision,
  p_exclude_booking_id uuid,
  p_apply_bounds boolean
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings public.booking_settings%rowtype;
  v_override public.availability_overrides%rowtype;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_capacity integer;
  v_count integer;
  v_anchor_latitude double precision;
  v_anchor_longitude double precision;
begin
  select * into v_settings from public.booking_settings limit 1;

  if p_apply_bounds
    and (p_date < v_today + v_settings.min_lead_days
      or p_date > v_today + v_settings.horizon_days) then
    return 'closed';
  end if;

  select * into v_override from public.availability_overrides o where o.date = p_date;

  if v_override.max_bookings is not null then
    v_capacity := v_override.max_bookings;
  else
    select r.max_bookings into v_capacity
    from public.availability_rules r
    where r.weekday = extract(dow from p_date)::smallint;
  end if;

  if coalesce(v_capacity, 0) = 0 then
    return 'closed';
  end if;

  select count(*) into v_count
  from public.bookings b
  where b.scheduled_date = p_date
    and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
    and (
      b.status in ('paid', 'completed')
      or (b.status = 'pending_payment' and b.expires_at > now())
    );

  if v_count >= v_capacity then
    return 'full';
  end if;

  v_anchor_latitude := v_override.sector_latitude;
  v_anchor_longitude := v_override.sector_longitude;

  if v_anchor_latitude is null then
    select b.latitude, b.longitude into v_anchor_latitude, v_anchor_longitude
    from public.bookings b
    where b.scheduled_date = p_date
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
      and (
        b.status in ('paid', 'completed')
        or (b.status = 'pending_payment' and b.expires_at > now())
      )
    order by b.created_at
    limit 1;
  end if;

  if v_anchor_latitude is not null
    and public.distance_km(v_anchor_latitude, v_anchor_longitude, p_latitude, p_longitude)
      > v_settings.day_sector_radius_km then
    return 'outOfSector';
  end if;

  return 'available';
end;
$$;

comment on function public.day_check(date, double precision, double precision, uuid, boolean) is
  'Status of a day (closed, full, outOfSector, available) for an address, optionally ignoring one booking and the lead time / horizon bounds. Shared by day_status() and admin_reschedule_booking().';

revoke execute on function public.day_check(date, double precision, double precision, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.day_check(date, double precision, double precision, uuid, boolean)
  to service_role;

create or replace function public.day_status(
  p_date date,
  p_latitude double precision,
  p_longitude double precision
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.day_check(p_date, p_latitude, p_longitude, null, true);
$$;

-- ---------------------------------------------------------------------------
-- Admin reschedule
-- ---------------------------------------------------------------------------

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
  overridden_reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_settings public.booking_settings%rowtype;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_day_status text;
  v_refusal text;
begin
  if p_booking_id is null then
    return query select false, 'not_found'::text, null::date, null::date, null::text;
    return;
  end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;

  if not found then
    return query select false, 'not_found'::text, null::date, null::date, null::text;
    return;
  end if;

  if v_booking.status <> 'paid' then
    return query
      select false, 'not_paid'::text, v_booking.scheduled_date, null::date, null::text;
    return;
  end if;

  if p_new_date is null or p_new_date in ('infinity', '-infinity') then
    return query
      select false, 'invalid_date'::text, v_booking.scheduled_date, null::date, null::text;
    return;
  end if;

  if p_new_date = v_booking.scheduled_date then
    return query
      select false, 'same_date'::text, v_booking.scheduled_date, p_new_date, null::text;
    return;
  end if;

  if p_new_date < v_today then
    return query
      select false, 'past_date'::text, v_booking.scheduled_date, p_new_date, null::text;
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
    v_refusal := 'out_of_area';
  else
    v_day_status := public.day_check(
      p_new_date, v_booking.latitude, v_booking.longitude, v_booking.id, false
    );
    v_refusal := case v_day_status
      when 'closed' then 'day_closed'
      when 'full' then 'day_full'
      when 'outOfSector' then 'out_of_sector'
      else null
    end;
  end if;

  if v_refusal is not null and not coalesce(p_force, false) then
    return query
      select false, v_refusal, v_booking.scheduled_date, p_new_date, null::text;
    return;
  end if;

  update public.bookings b
  set
    scheduled_date = p_new_date,
    reminder_sent_at = null,
    day_of_sms_sent_at = null
  where b.id = v_booking.id;

  return query
    select true, null::text, v_booking.scheduled_date, p_new_date, v_refusal;
end;
$$;

comment on function public.admin_reschedule_booking(uuid, date, boolean) is
  'Moves a paid booking to another date under the day locks. Refusals: not_found, not_paid, invalid_date, same_date, past_date (never forced), out_of_area, day_closed, day_full, out_of_sector (forced by p_force, then reported in overridden_reason). Resets reminder_sent_at and day_of_sms_sent_at. Lead time and horizon are not applied.';

revoke execute on function public.admin_reschedule_booking(uuid, date, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_reschedule_booking(uuid, date, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Admin day overview
-- ---------------------------------------------------------------------------

create function public.admin_day_overview(p_from date, p_to date)
returns table (
  day date,
  weekday smallint,
  capacity integer,
  capacity_source text,
  is_closed boolean,
  sector_latitude double precision,
  sector_longitude double precision,
  note text,
  active_count integer,
  paid_count integer,
  booked_latitude double precision,
  booked_longitude double precision
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
    ),
    first_booking.latitude,
    first_booking.longitude
  from generate_series(0, p_to - p_from) as g (i)
  left join public.availability_overrides o on o.date = p_from + g.i
  left join public.availability_rules r on r.weekday = extract(dow from p_from + g.i)::smallint
  left join lateral (
    select b.latitude, b.longitude
    from public.bookings b
    where b.scheduled_date = p_from + g.i
      and (
        b.status in ('paid', 'completed')
        or (b.status = 'pending_payment' and b.expires_at > now())
      )
    order by b.created_at
    limit 1
  ) as first_booking on true
  order by 1;
end;
$$;

comment on function public.admin_day_overview(date, date) is
  'One row per date of the range (400 days max): effective capacity and its source, imposed sector, active bookings (counted toward capacity), paid bookings (to move if the day is closed) and the sector set by the first active booking.';

revoke execute on function public.admin_day_overview(date, date) from public, anon, authenticated;
grant execute on function public.admin_day_overview(date, date) to service_role;

-- ---------------------------------------------------------------------------
-- Writes reserved to the server (service role)
-- ---------------------------------------------------------------------------

drop policy "bookings_admin_update" on public.bookings;
revoke update on public.bookings from anon, authenticated;

drop policy "availability_rules_admin_all" on public.availability_rules;
drop policy "availability_overrides_admin_all" on public.availability_overrides;
revoke insert, update, delete on public.availability_rules from anon, authenticated;
revoke insert, update, delete on public.availability_overrides from anon, authenticated;

create policy "availability_rules_admin_select" on public.availability_rules
  for select to authenticated
  using ((select public.is_admin()));

create policy "availability_overrides_admin_select" on public.availability_overrides
  for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Policies recreated with (select public.is_admin())
-- ---------------------------------------------------------------------------

drop policy "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (
    (id = (select auth.uid()) and (select public.has_recent_sign_in()))
    or (select public.is_admin())
  );

drop policy "bookings_select_own_or_admin" on public.bookings;
create policy "bookings_select_own_or_admin" on public.bookings
  for select to authenticated
  using (
    (customer_id = (select auth.uid()) and (select public.has_recent_sign_in()))
    or (select public.is_admin())
  );

drop policy "intervention_photos_select_own_or_admin" on public.intervention_photos;
create policy "intervention_photos_select_own_or_admin" on public.intervention_photos
  for select to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.has_recent_sign_in())
      and exists (
        select 1 from public.bookings b
        where b.id = intervention_photos.booking_id and b.customer_id = (select auth.uid())
      )
    )
  );

drop policy "intervention_photos_admin_write" on public.intervention_photos;
create policy "intervention_photos_admin_write" on public.intervention_photos
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy "booking_settings_admin_all" on public.booking_settings;
create policy "booking_settings_admin_all" on public.booking_settings
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy "price_grid_admin_write" on public.price_grid;
create policy "price_grid_admin_write" on public.price_grid
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy "quote_requests_admin_all" on public.quote_requests;
create policy "quote_requests_admin_all" on public.quote_requests
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy "intervention_photos_objects_select" on storage.objects;
create policy "intervention_photos_objects_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'intervention-photos'
    and (
      (select public.is_admin())
      or (
        (select public.has_recent_sign_in())
        and exists (
          select 1 from public.bookings b
          where b.id::text = (storage.foldername(name))[1]
            and b.customer_id = (select auth.uid())
        )
      )
    )
  );

drop policy "intervention_photos_objects_admin_insert" on storage.objects;
create policy "intervention_photos_objects_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'intervention-photos' and (select public.is_admin()));

drop policy "intervention_photos_objects_admin_update" on storage.objects;
create policy "intervention_photos_objects_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'intervention-photos' and (select public.is_admin()))
  with check (bucket_id = 'intervention-photos' and (select public.is_admin()));

drop policy "intervention_photos_objects_admin_delete" on storage.objects;
create policy "intervention_photos_objects_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'intervention-photos' and (select public.is_admin()));

drop policy "quote_photos_objects_admin_select" on storage.objects;
create policy "quote_photos_objects_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'quote-photos' and (select public.is_admin()));

drop policy "quote_photos_objects_admin_delete" on storage.objects;
create policy "quote_photos_objects_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'quote-photos' and (select public.is_admin()));
