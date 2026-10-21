-- Admin session rule: public.is_admin() now requires the admin role AND a magic link sign-in
-- (amr otp/magiclink) less than 7 days old (same duration as has_recent_sign_in()), so a password sign-in or an
-- expired link session cannot use any admin policy. The amr reading is shared with
-- has_recent_sign_in(), whose behaviour does not change. claim_admin_login_link() also skips banned admins.

create function public.oldest_link_sign_in_at()
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  v_amr jsonb := auth.jwt() -> 'amr';
  v_oldest numeric;
begin
  if v_amr is null or jsonb_typeof(v_amr) <> 'array' then
    return null;
  end if;

  select min((e.entry ->> 'timestamp')::numeric)
  into v_oldest
  from jsonb_array_elements(v_amr) as e (entry)
  where jsonb_typeof(e.entry) = 'object'
    and e.entry ->> 'method' in ('otp', 'magiclink')
    and (e.entry ->> 'timestamp') ~ '^[0-9]{1,12}(\.[0-9]+)?$';

  return to_timestamp(v_oldest::double precision);
end;
$$;

comment on function public.oldest_link_sign_in_at() is
  'Time of the oldest otp/magiclink entry of the JWT amr claim (fixed at sign-in, not moved by token refresh), null when absent. Numeric strings are accepted like the original has_recent_sign_in().';

revoke execute on function public.oldest_link_sign_in_at() from public, anon, authenticated;
grant execute on function public.oldest_link_sign_in_at() to anon, authenticated, service_role;

create or replace function public.has_recent_sign_in()
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  c_max_age constant interval := interval '7 days';
begin
  return coalesce(public.oldest_link_sign_in_at() >= now() - c_max_age, false);
end;
$$;

revoke execute on function public.has_recent_sign_in() from public, anon;
grant execute on function public.has_recent_sign_in() to authenticated, service_role;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  c_max_age constant interval := interval '7 days';
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    return false;
  end if;

  return coalesce(public.oldest_link_sign_in_at() >= now() - c_max_age, false);
end;
$$;

comment on function public.is_admin() is
  'True when the JWT carries app_metadata.role = admin and the magic link sign-in is less than 7 days old. Password sessions are never admin.';

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create or replace function public.claim_admin_login_link(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_min_interval constant interval := interval '60 seconds';
  c_max_links constant integer := 5;
  c_window constant interval := interval '24 hours';
  v_email text := lower(trim(p_email));
  v_user_id uuid;
begin
  insert into public.admin_login_links as l (user_id, sent_at, link_count, window_start)
  select u.id, now(), 1, now()
  from auth.users u
  where lower(u.email) = v_email
    and u.raw_app_meta_data ->> 'role' = 'admin'
    and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= now())
  on conflict (user_id) do update
  set
    sent_at = now(),
    link_count = case
      when l.window_start <= now() - c_window then 1
      else l.link_count + 1
    end,
    window_start = case
      when l.window_start <= now() - c_window then now()
      else l.window_start
    end
  where l.sent_at <= now() - c_min_interval
    and (l.window_start <= now() - c_window or l.link_count < c_max_links)
  returning l.user_id into v_user_id;

  return v_user_id;
end;
$$;

revoke execute on function public.claim_admin_login_link(text) from public, anon, authenticated;
grant execute on function public.claim_admin_login_link(text) to service_role;
