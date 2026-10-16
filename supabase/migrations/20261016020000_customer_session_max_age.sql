-- Customer sessions last 7 days from the magic link sign-in. The server routes enforce it, and
-- this makes row level security enforce it too, so a stolen refresh token cannot read data
-- directly through PostgREST or Storage after that. Admin access is unchanged.

create function public.has_recent_sign_in()
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  c_max_age constant interval := interval '7 days';
  v_amr jsonb := auth.jwt() -> 'amr';
  v_result boolean;
begin
  if v_amr is null or jsonb_typeof(v_amr) <> 'array' then
    return false;
  end if;

  select coalesce(bool_or(
    e.entry ->> 'method' in ('otp', 'magiclink')
    and (
      case
        when (e.entry ->> 'timestamp') ~ '^[0-9]{1,12}(\.[0-9]+)?$'
          then (e.entry ->> 'timestamp')::numeric
      end
    ) >= extract(epoch from now() - c_max_age)
  ), false)
  into v_result
  from jsonb_array_elements(v_amr) as e (entry);

  return v_result;
end;
$$;

revoke execute on function public.has_recent_sign_in() from public, anon;
grant execute on function public.has_recent_sign_in() to authenticated, service_role;

drop policy "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (
    (id = (select auth.uid()) and (select public.has_recent_sign_in()))
    or public.is_admin()
  );

drop policy "bookings_select_own_or_admin" on public.bookings;
create policy "bookings_select_own_or_admin" on public.bookings
  for select to authenticated
  using (
    (customer_id = (select auth.uid()) and (select public.has_recent_sign_in()))
    or public.is_admin()
  );

drop policy "intervention_photos_select_own_or_admin" on public.intervention_photos;
create policy "intervention_photos_select_own_or_admin" on public.intervention_photos
  for select to authenticated
  using (
    public.is_admin()
    or (
      (select public.has_recent_sign_in())
      and exists (
        select 1 from public.bookings b
        where b.id = intervention_photos.booking_id and b.customer_id = (select auth.uid())
      )
    )
  );

drop policy "intervention_photos_objects_select" on storage.objects;
create policy "intervention_photos_objects_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'intervention-photos'
    and (
      public.is_admin()
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
