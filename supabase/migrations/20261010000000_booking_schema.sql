-- Booking system: tables, security rules, storage and booking functions.
-- See docs/specs/booking-system.md.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.booking_status as enum (
  'pending_payment',
  'paid',
  'completed',
  'cancelled',
  'expired'
);

create type public.photo_kind as enum ('before', 'after');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  first_unit_price_cents integer not null check (first_unit_price_cents > 0),
  additional_unit_price_cents integer not null check (additional_unit_price_cents > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  scheduled_date date not null,
  address text not null,
  city text not null,
  postcode text not null,
  latitude double precision not null,
  longitude double precision not null,
  collection_weekdays smallint[] not null default '{}',
  status public.booking_status not null default 'pending_payment',
  amount_total_cents integer not null default 0 check (amount_total_cents >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  expires_at timestamptz,
  reminder_sent_at timestamptz,
  day_of_sms_sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index bookings_scheduled_date_idx on public.bookings (scheduled_date);
create index bookings_customer_id_idx on public.bookings (customer_id);

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  service_id uuid not null references public.services (id),
  quantity integer not null check (quantity between 1 and 10),
  line_total_cents integer not null check (line_total_cents >= 0),
  unique (booking_id, service_id)
);

create table public.intervention_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind public.photo_kind not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (booking_id, kind)
);

create table public.availability_rules (
  weekday smallint primary key check (weekday between 0 and 6),
  max_bookings integer not null check (max_bookings >= 0)
);

comment on column public.availability_rules.weekday is '0 = Sunday ... 6 = Saturday';

create table public.availability_overrides (
  date date primary key,
  max_bookings integer check (max_bookings >= 0),
  sector_latitude double precision,
  sector_longitude double precision,
  note text,
  check ((sector_latitude is null) = (sector_longitude is null))
);

comment on table public.availability_overrides is
  'Per-date exceptions: closing or resizing a day (max_bookings) and/or forcing its sector.';

create table public.booking_settings (
  id boolean primary key default true check (id),
  depot_latitude double precision not null,
  depot_longitude double precision not null,
  service_area_radius_km numeric not null check (service_area_radius_km > 0),
  day_sector_radius_km numeric not null check (day_sector_radius_km > 0),
  min_lead_days integer not null check (min_lead_days >= 0),
  horizon_days integer not null check (horizon_days > 0)
);

comment on table public.booking_settings is 'Single-row configuration of the booking rules.';

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

insert into public.services (slug, name, first_unit_price_cents, additional_unit_price_cents)
values
  ('small-bin', 'Petits bacs', 1990, 990),
  ('large-bin', 'Grands bacs', 3990, 2990);

-- Provisional capacity: 6 interventions on weekdays, closed on weekends.
insert into public.availability_rules (weekday, max_bookings)
values (0, 0), (1, 6), (2, 6), (3, 6), (4, 6), (5, 6), (6, 0);

-- Depot: Uckange (57270). Lead time and horizon are provisional.
insert into public.booking_settings (
  depot_latitude,
  depot_longitude,
  service_area_radius_km,
  day_sector_radius_km,
  min_lead_days,
  horizon_days
)
values (49.306789, 6.149675, 30, 15, 2, 60);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- The admin role lives in app_metadata, which only the server can write.
create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- Straight-line distance (haversine).
create function public.distance_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Status of a day for a given address: closed, full, outOfSector or available.
-- A day is restricted to the sector set by its override, or else by its first active booking.
create function public.day_status(
  p_date date,
  p_latitude double precision,
  p_longitude double precision
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

  if p_date < v_today + v_settings.min_lead_days
    or p_date > v_today + v_settings.horizon_days then
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

-- Availability of every day of the booking window for a given address.
create function public.get_availability(
  p_latitude double precision,
  p_longitude double precision
)
returns table (day date, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select d::date, public.day_status(d::date, p_latitude, p_longitude)
  from public.booking_settings s,
    generate_series(
      (now() at time zone 'Europe/Paris')::date + s.min_lead_days,
      (now() at time zone 'Europe/Paris')::date + s.horizon_days,
      interval '1 day'
    ) as d;
$$;

-- Creates a booking and holds its slot atomically. Prices are computed here, never trusted
-- from the client. The slot is released if the booking is not paid before expires_at.
create function public.create_booking(
  p_customer_id uuid,
  p_scheduled_date date,
  p_address text,
  p_city text,
  p_postcode text,
  p_latitude double precision,
  p_longitude double precision,
  p_collection_weekdays smallint[],
  p_items jsonb,
  p_hold_minutes integer default 35
)
returns table (new_booking_id uuid, total_cents integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.booking_settings%rowtype;
  v_service public.services%rowtype;
  v_item record;
  v_booking_id uuid;
  v_line_total integer;
  v_total integer := 0;
begin
  select * into v_settings from public.booking_settings limit 1;

  if public.distance_km(v_settings.depot_latitude, v_settings.depot_longitude, p_latitude, p_longitude)
    > v_settings.service_area_radius_km then
    raise exception 'OUT_OF_AREA';
  end if;

  -- Serialises concurrent bookings on the same day so the last slot cannot be taken twice.
  perform pg_advisory_xact_lock(hashtext('booking-day:' || p_scheduled_date::text));

  if public.day_status(p_scheduled_date, p_latitude, p_longitude) <> 'available' then
    raise exception 'DAY_UNAVAILABLE';
  end if;

  insert into public.bookings (
    customer_id, scheduled_date, address, city, postcode, latitude, longitude,
    collection_weekdays, expires_at
  )
  values (
    p_customer_id, p_scheduled_date, p_address, p_city, p_postcode, p_latitude, p_longitude,
    coalesce(p_collection_weekdays, '{}'), now() + make_interval(mins => p_hold_minutes)
  )
  returning id into v_booking_id;

  for v_item in
    select * from jsonb_to_recordset(p_items) as item (slug text, quantity integer)
  loop
    select * into v_service from public.services s where s.slug = v_item.slug and s.is_active;

    if not found then
      raise exception 'UNKNOWN_SERVICE';
    end if;

    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 10 then
      raise exception 'INVALID_QUANTITY';
    end if;

    v_line_total := v_service.first_unit_price_cents
      + (v_item.quantity - 1) * v_service.additional_unit_price_cents;

    insert into public.booking_items (booking_id, service_id, quantity, line_total_cents)
    values (v_booking_id, v_service.id, v_item.quantity, v_line_total);

    v_total := v_total + v_line_total;
  end loop;

  if v_total = 0 then
    raise exception 'EMPTY_BOOKING';
  end if;

  update public.bookings b set amount_total_cents = v_total where b.id = v_booking_id;

  return query select v_booking_id, v_total;
end;
$$;

-- Marks unpaid bookings whose hold has elapsed as expired.
create function public.expire_stale_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.bookings b
  set status = 'expired'
  where b.status = 'pending_payment' and b.expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Booking functions are reserved to the server (secret key).
revoke execute on function public.day_status(date, double precision, double precision)
  from public, anon, authenticated;
revoke execute on function public.get_availability(double precision, double precision)
  from public, anon, authenticated;
revoke execute on function public.create_booking(
  uuid, date, text, text, text, double precision, double precision, smallint[], jsonb, integer
) from public, anon, authenticated;
revoke execute on function public.expire_stale_bookings() from public, anon, authenticated;

grant execute on function public.day_status(date, double precision, double precision)
  to service_role;
grant execute on function public.get_availability(double precision, double precision)
  to service_role;
grant execute on function public.create_booking(
  uuid, date, text, text, text, double precision, double precision, smallint[], jsonb, integer
) to service_role;
grant execute on function public.expire_stale_bookings() to service_role;

-- ---------------------------------------------------------------------------
-- Table privileges (row level security below decides which rows are reachable)
-- ---------------------------------------------------------------------------

grant select on public.services to anon;
grant select, update on public.profiles to authenticated;
grant select, update on public.bookings to authenticated;
grant select on public.booking_items to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.intervention_photos to authenticated;
grant select, insert, update, delete on public.availability_rules to authenticated;
grant select, insert, update, delete on public.availability_overrides to authenticated;
grant select, update on public.booking_settings to authenticated;
grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.intervention_photos enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_overrides enable row level security;
alter table public.booking_settings enable row level security;

-- Profiles: a customer reads and edits their own profile. Creation is done by the server.
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Services: the active catalogue is public, only the admin edits it.
create policy "services_select_active_or_admin" on public.services
  for select to anon, authenticated
  using (is_active or public.is_admin());

create policy "services_admin_write" on public.services
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Bookings: a customer reads their own bookings, only the admin changes them.
-- Creation and payment updates go through the server (secret key).
create policy "bookings_select_own_or_admin" on public.bookings
  for select to authenticated
  using (customer_id = (select auth.uid()) or public.is_admin());

create policy "bookings_admin_update" on public.bookings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "booking_items_select_own_or_admin" on public.booking_items
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_items.booking_id and b.customer_id = (select auth.uid())
    )
  );

-- Photos: a customer reads the photos of their own bookings, only the admin adds or removes.
create policy "intervention_photos_select_own_or_admin" on public.intervention_photos
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = intervention_photos.booking_id and b.customer_id = (select auth.uid())
    )
  );

create policy "intervention_photos_admin_write" on public.intervention_photos
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Scheduling configuration: admin only.
create policy "availability_rules_admin_all" on public.availability_rules
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "availability_overrides_admin_all" on public.availability_overrides
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "booking_settings_admin_all" on public.booking_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: private bucket, files stored as {booking_id}/{kind}.{ext}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'intervention-photos',
  'intervention-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "intervention_photos_objects_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'intervention-photos'
    and (
      public.is_admin()
      or exists (
        select 1 from public.bookings b
        where b.id::text = (storage.foldername(name))[1]
          and b.customer_id = (select auth.uid())
      )
    )
  );

create policy "intervention_photos_objects_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'intervention-photos' and public.is_admin());

create policy "intervention_photos_objects_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'intervention-photos' and public.is_admin())
  with check (bucket_id = 'intervention-photos' and public.is_admin());

create policy "intervention_photos_objects_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'intervention-photos' and public.is_admin());
