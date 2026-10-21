-- Pro space lot 3, rules after the security audit and the code review.
-- - Customers read their photos (table rows and bucket objects) only once the booking is
--   completed: the rule no longer relies on the server route alone. Admin branch and the
--   has_recent_sign_in() rule are unchanged.
-- - admin_set_intervention_photo() refuses a paid booking whose date has not come (future_date),
--   same computation as admin_complete_booking(). Completed bookings are always accepted.
-- - admin_complete_booking() no longer returns customer_email and customer_first_name (the server
--   reads profiles itself).
-- - intervention_photos_storage_path_format is validated. If an existing row does not follow
--   {booking_id}/{kind}.jpg the migration fails as a whole and nothing is applied: run the
--   pre-check query of the report first.
-- See docs/specs/booking-system.md and docs/specs/technical.md.

-- ---------------------------------------------------------------------------
-- Customer reads: completed bookings only
-- ---------------------------------------------------------------------------

drop policy "intervention_photos_select_own_or_admin" on public.intervention_photos;
create policy "intervention_photos_select_own_or_admin" on public.intervention_photos
  for select to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.has_recent_sign_in())
      and exists (
        select 1 from public.bookings b
        where b.id = intervention_photos.booking_id
          and b.customer_id = (select auth.uid())
          and b.status = 'completed'
      )
    )
  );

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
            and b.status = 'completed'
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Admin photo write: future_date
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_intervention_photo(
  p_booking_id uuid,
  p_kind public.photo_kind,
  p_storage_path text
)
returns table (
  ok boolean,
  reason text,
  replaced boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_replaced boolean;
begin
  if p_booking_id is null then
    return query select false, 'not_found'::text, null::boolean;
    return;
  end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;

  if not found then
    return query select false, 'not_found'::text, null::boolean;
    return;
  end if;

  if v_booking.status not in ('paid', 'completed') then
    return query select false, 'not_paid'::text, null::boolean;
    return;
  end if;

  if v_booking.status = 'paid' and v_booking.scheduled_date > v_today then
    return query select false, 'future_date'::text, null::boolean;
    return;
  end if;

  if p_kind is null then
    return query select false, 'invalid_kind'::text, null::boolean;
    return;
  end if;

  if p_storage_path is distinct from (p_booking_id::text || '/' || p_kind::text || '.jpg') then
    return query select false, 'invalid_path'::text, null::boolean;
    return;
  end if;

  select exists (
    select 1 from public.intervention_photos p
    where p.booking_id = p_booking_id and p.kind = p_kind
  ) into v_replaced;

  insert into public.intervention_photos (booking_id, kind, storage_path)
  values (p_booking_id, p_kind, p_storage_path)
  on conflict (booking_id, kind)
  do update set storage_path = excluded.storage_path, updated_at = now();

  return query select true, null::text, v_replaced;
end;
$$;

comment on function public.admin_set_intervention_photo(uuid, public.photo_kind, text) is
  'Records (or replaces) the before / after photo of a paid or completed booking, under the booking row lock. Refusals: not_found, not_paid (status other than paid / completed), future_date (paid booking scheduled after today in Europe/Paris; completed bookings are always accepted), invalid_kind, invalid_path (must be {booking_id}/{kind}.jpg). Never sends a mail.';

revoke execute on function public.admin_set_intervention_photo(uuid, public.photo_kind, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_intervention_photo(uuid, public.photo_kind, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Admin end of intervention: no customer data in the result
-- ---------------------------------------------------------------------------

drop function public.admin_complete_booking(uuid, boolean);

create function public.admin_complete_booking(
  p_booking_id uuid,
  p_force boolean default false
)
returns table (
  ok boolean,
  reason text,
  send_photos_mail boolean,
  without_photos boolean,
  booking_date date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_has_photos boolean;
begin
  if p_booking_id is null then
    return query select false, 'not_found'::text, null::boolean, null::boolean, null::date;
    return;
  end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;

  if not found then
    return query select false, 'not_found'::text, null::boolean, null::boolean, null::date;
    return;
  end if;

  if v_booking.status = 'completed' then
    return query
      select false, 'already_completed'::text, null::boolean, null::boolean,
        v_booking.scheduled_date;
    return;
  end if;

  if v_booking.status <> 'paid' then
    return query
      select false, 'not_paid'::text, null::boolean, null::boolean, v_booking.scheduled_date;
    return;
  end if;

  if v_booking.scheduled_date > v_today then
    return query
      select false, 'future_date'::text, null::boolean, null::boolean, v_booking.scheduled_date;
    return;
  end if;

  select count(distinct p.kind) = 2 into v_has_photos
  from public.intervention_photos p
  where p.booking_id = v_booking.id;

  if not v_has_photos and not coalesce(p_force, false) then
    return query
      select false, 'missing_photos'::text, null::boolean, null::boolean,
        v_booking.scheduled_date;
    return;
  end if;

  update public.bookings b
  set
    status = 'completed',
    completed_at = now(),
    completed_without_photos = not v_has_photos,
    photos_notified_at = case when v_has_photos then now() else null end
  where b.id = v_booking.id;

  return query
    select true, null::text, v_has_photos, not v_has_photos, v_booking.scheduled_date;
end;
$$;

comment on function public.admin_complete_booking(uuid, boolean) is
  'Finishes a paid booking under its row lock: status completed, completed_at = now(). Refusals, never forced: not_found, already_completed, not_paid, future_date (scheduled_date after today in Europe/Paris). missing_photos when a before or after photo is absent, unless p_force. send_photos_mail is true only when both photos exist (photos_notified_at is claimed in the same transaction, so a booking can only be notified once); a forced finish without photos sets completed_without_photos and sends nothing. Returns no customer data.';

revoke execute on function public.admin_complete_booking(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_complete_booking(uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Path convention checked on existing rows
-- ---------------------------------------------------------------------------

alter table public.intervention_photos
  validate constraint intervention_photos_storage_path_format;
