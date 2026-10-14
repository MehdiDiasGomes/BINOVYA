create type public.booking_plan as enum ('one_off', 'quarterly', 'annual');

comment on type public.booking_plan is
  'one_off: single visit, quarterly: one visit every 3 months, annual: one visit every month.';

create type public.quote_status as enum ('new', 'answered', 'closed');

create table public.price_grid (
  plan public.booking_plan not null,
  small_bin_count smallint not null check (small_bin_count between 0 and 2),
  large_bin_count smallint not null check (large_bin_count between 0 and 2),
  price_cents integer not null check (price_cents > 0),
  primary key (plan, small_bin_count, large_bin_count),
  check (small_bin_count + large_bin_count between 1 and 2)
);

comment on table public.price_grid is
  'Price per visit, tax included. A combination missing from the grid requires a quote.';

insert into public.price_grid (plan, small_bin_count, large_bin_count, price_cents)
values
  ('one_off', 1, 0, 2900),
  ('one_off', 2, 0, 4900),
  ('one_off', 0, 1, 5900),
  ('one_off', 0, 2, 10000),
  ('quarterly', 1, 0, 2400),
  ('quarterly', 2, 0, 3900),
  ('quarterly', 0, 1, 3900),
  ('quarterly', 0, 2, 7900),
  ('annual', 1, 0, 1900),
  ('annual', 2, 0, 3500),
  ('annual', 0, 1, 2900),
  ('annual', 0, 2, 6900);

drop function public.create_booking(
  uuid, date, text, text, text, double precision, double precision, smallint[], jsonb, integer
);
drop table public.booking_items;
drop table public.services;

alter table public.bookings rename column collection_weekdays to household_collection_weekdays;

alter table public.bookings
  add column recycling_collection_weekdays smallint[] not null default '{}',
  add column country_code text not null default 'FR' check (country_code in ('FR', 'LU')),
  add column plan public.booking_plan not null,
  add column small_bin_count smallint not null check (small_bin_count >= 0),
  add column large_bin_count smallint not null check (large_bin_count >= 0),
  add column bins_ready_confirmed_at timestamptz not null,
  add constraint bookings_bin_count_check check (small_bin_count + large_bin_count >= 1);

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  company text,
  email text not null,
  phone text not null,
  address text not null,
  city text not null,
  postcode text not null,
  country_code text not null default 'FR' check (country_code in ('FR', 'LU')),
  latitude double precision,
  longitude double precision,
  small_bin_count smallint not null default 0 check (small_bin_count >= 0),
  large_bin_count smallint not null default 0 check (large_bin_count >= 0),
  plan public.booking_plan,
  comment text,
  photo_paths text[] not null default '{}',
  status public.quote_status not null default 'new',
  created_at timestamptz not null default now(),
  check (small_bin_count + large_bin_count >= 1),
  check ((latitude is null) = (longitude is null))
);

create index quote_requests_status_created_at_idx
  on public.quote_requests (status, created_at desc);

update public.booking_settings set service_area_radius_km = 20;

update public.availability_rules set max_bookings = 3 where weekday between 1 and 5;

create function public.create_booking(
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

grant select on public.price_grid to anon, authenticated;
grant insert, update, delete on public.price_grid to authenticated;
grant select, update, delete on public.quote_requests to authenticated;
grant all on public.price_grid, public.quote_requests to service_role;

alter table public.price_grid enable row level security;
alter table public.quote_requests enable row level security;

create policy "price_grid_select_all" on public.price_grid
  for select to anon, authenticated
  using (true);

create policy "price_grid_admin_write" on public.price_grid
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "quote_requests_admin_all" on public.quote_requests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-photos',
  'quote-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "quote_photos_objects_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'quote-photos' and public.is_admin());

create policy "quote_photos_objects_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'quote-photos' and public.is_admin());
