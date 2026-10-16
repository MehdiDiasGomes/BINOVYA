-- Magic link rate limiting (one per 60 s, five per rolling 24 h per profile) done atomically
-- in the database, and removal of every customer write access to profiles.

alter table public.profiles
  add column login_link_count integer not null default 0,
  add column login_link_window_start timestamptz;

comment on column public.profiles.login_link_count is
  'Magic links sent since login_link_window_start, capped by public.claim_login_link.';
comment on column public.profiles.login_link_window_start is
  'Start of the current 24 h window used to cap magic links per profile.';

create function public.claim_login_link(p_email text)
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
  v_profile_id uuid;
begin
  update public.profiles p
  set
    login_link_sent_at = now(),
    login_link_count = case
      when p.login_link_window_start is null or p.login_link_window_start <= now() - c_window
        then 1
      else p.login_link_count + 1
    end,
    login_link_window_start = case
      when p.login_link_window_start is null or p.login_link_window_start <= now() - c_window
        then now()
      else p.login_link_window_start
    end
  where lower(p.email) = v_email
    and (p.login_link_sent_at is null or p.login_link_sent_at <= now() - c_min_interval)
    and (
      p.login_link_window_start is null
      or p.login_link_window_start <= now() - c_window
      or p.login_link_count < c_max_links
    )
  returning p.id into v_profile_id;

  return v_profile_id;
end;
$$;

revoke execute on function public.claim_login_link(text) from public, anon, authenticated;
grant execute on function public.claim_login_link(text) to service_role;

drop policy "profiles_update_own" on public.profiles;
revoke update on public.profiles from anon, authenticated;
