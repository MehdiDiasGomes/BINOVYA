-- Pro space lot 3: intervention photos and end of intervention.
-- - Photos are written by the server only (service role): upload to the private bucket, then
--   admin_set_intervention_photo() records the row. The authenticated role keeps read access only,
--   on the table and on the bucket (admin and own bookings, 7-day session rule unchanged).
-- - admin_complete_booking() finishes an intervention atomically and tells the server whether the
--   "photos available" mail must be sent (once: photos_notified_at is claimed in the same
--   transaction).
-- - The bucket now only accepts JPEG, the browser converts every photo before upload.
-- See docs/specs/booking-system.md and docs/specs/technical.md.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.bookings
  add column completed_without_photos boolean not null default false,
  add column photos_notified_at timestamptz,
  add constraint bookings_completed_without_photos_needs_completion
    check (not completed_without_photos or completed_at is not null),
  add constraint bookings_photos_notified_needs_completion
    check (photos_notified_at is null or completed_at is not null),
  add constraint bookings_photos_notified_excludes_without_photos
    check (not (completed_without_photos and photos_notified_at is not null));

comment on column public.bookings.completed_at is 'Time the admin finished the intervention.';
comment on column public.bookings.completed_without_photos is
  'True when the intervention was finished by force while a before or after photo was missing. No photos mail is sent in that case, even if photos are added later.';
comment on column public.bookings.photos_notified_at is
  'Claimed by admin_complete_booking() when the intervention is finished with both photos: the "photos available" mail is sent at most once.';

alter table public.intervention_photos
  add column updated_at timestamptz not null default now(),
  add constraint intervention_photos_storage_path_format
    check (storage_path = booking_id::text || '/' || kind::text || '.jpg') not valid;

comment on column public.intervention_photos.updated_at is 'Last upload of this photo (replacements keep the same storage path).';
comment on constraint intervention_photos_storage_path_format on public.intervention_photos is
  'Path convention {booking_id}/{kind}.jpg: the file is always JPEG and replaced in place.';

-- ---------------------------------------------------------------------------
-- Bucket: JPEG only
-- ---------------------------------------------------------------------------

update storage.buckets
set allowed_mime_types = array['image/jpeg']
where id = 'intervention-photos';

-- ---------------------------------------------------------------------------
-- Admin photo write
-- ---------------------------------------------------------------------------

create function public.admin_set_intervention_photo(
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
  'Records (or replaces) the before / after photo of a paid or completed booking, under the booking row lock. Refusals: not_found, not_paid (status other than paid / completed), invalid_kind, invalid_path (must be {booking_id}/{kind}.jpg). Never sends a mail.';

revoke execute on function public.admin_set_intervention_photo(uuid, public.photo_kind, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_intervention_photo(uuid, public.photo_kind, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Admin end of intervention
-- ---------------------------------------------------------------------------

create function public.admin_complete_booking(
  p_booking_id uuid,
  p_force boolean default false
)
returns table (
  ok boolean,
  reason text,
  send_photos_mail boolean,
  without_photos boolean,
  customer_email text,
  customer_first_name text,
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
  v_email text;
  v_first_name text;
begin
  if p_booking_id is null then
    return query
      select false, 'not_found'::text, null::boolean, null::boolean, null::text, null::text,
        null::date;
    return;
  end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;

  if not found then
    return query
      select false, 'not_found'::text, null::boolean, null::boolean, null::text, null::text,
        null::date;
    return;
  end if;

  if v_booking.status = 'completed' then
    return query
      select false, 'already_completed'::text, null::boolean, null::boolean, null::text,
        null::text, v_booking.scheduled_date;
    return;
  end if;

  if v_booking.status <> 'paid' then
    return query
      select false, 'not_paid'::text, null::boolean, null::boolean, null::text, null::text,
        v_booking.scheduled_date;
    return;
  end if;

  if v_booking.scheduled_date > v_today then
    return query
      select false, 'future_date'::text, null::boolean, null::boolean, null::text, null::text,
        v_booking.scheduled_date;
    return;
  end if;

  select count(distinct p.kind) = 2 into v_has_photos
  from public.intervention_photos p
  where p.booking_id = v_booking.id;

  if not v_has_photos and not coalesce(p_force, false) then
    return query
      select false, 'missing_photos'::text, null::boolean, null::boolean, null::text, null::text,
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

  select pr.email, pr.first_name into v_email, v_first_name
  from public.profiles pr
  where pr.id = v_booking.customer_id;

  return query
    select true, null::text, v_has_photos, not v_has_photos, v_email, v_first_name,
      v_booking.scheduled_date;
end;
$$;

comment on function public.admin_complete_booking(uuid, boolean) is
  'Finishes a paid booking under its row lock: status completed, completed_at = now(). Refusals, never forced: not_found, already_completed, not_paid, future_date (scheduled_date after today in Europe/Paris). missing_photos when a before or after photo is absent, unless p_force. send_photos_mail is true only when both photos exist (photos_notified_at is claimed in the same transaction, so a booking can only be notified once); a forced finish without photos sets completed_without_photos and sends nothing.';

revoke execute on function public.admin_complete_booking(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_complete_booking(uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Writes reserved to the server (service role)
-- ---------------------------------------------------------------------------

drop policy if exists "intervention_photos_admin_write" on public.intervention_photos;
revoke all on public.intervention_photos from anon, authenticated;
grant select on public.intervention_photos to authenticated;

drop policy if exists "intervention_photos_objects_admin_insert" on storage.objects;
drop policy if exists "intervention_photos_objects_admin_update" on storage.objects;
drop policy if exists "intervention_photos_objects_admin_delete" on storage.objects;
