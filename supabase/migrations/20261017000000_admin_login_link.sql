-- Admin magic link throttling (one per 60 s, five per rolling 24 h per admin), done atomically
-- in the database. Admins have no profiles row, so the counters live in their own table.
-- See docs/specs/booking-system.md.

create table public.admin_login_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sent_at timestamptz not null,
  link_count integer not null check (link_count >= 0),
  window_start timestamptz not null
);

comment on table public.admin_login_links is
  'Magic link throttle of admin accounts, written only by public.claim_admin_login_link.';

alter table public.admin_login_links enable row level security;

revoke all on public.admin_login_links from public, anon, authenticated;
grant all on public.admin_login_links to service_role;

create function public.claim_admin_login_link(p_email text)
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

comment on function public.claim_admin_login_link(text) is
  'Returns the id of the admin (app_metadata.role = admin) owning p_email when a magic link may be sent now, null otherwise.';

revoke execute on function public.claim_admin_login_link(text) from public, anon, authenticated;
grant execute on function public.claim_admin_login_link(text) to service_role;
