-- Supabase never sends its own auth mails (send email hook returning nothing: our server sends
-- every mail through generateLink + Resend), the session rule of has_recent_sign_in() now
-- uses the oldest sign-in entry like the server, and claim_login_link() uses the unique index
-- on profiles.email.

create function public.suppress_auth_emails(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
revoke execute on function public.suppress_auth_emails(jsonb) from public, anon, authenticated;
grant execute on function public.suppress_auth_emails(jsonb) to supabase_auth_admin;

create or replace function public.has_recent_sign_in()
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  c_max_age constant interval := interval '7 days';
  v_amr jsonb := auth.jwt() -> 'amr';
  v_oldest numeric;
begin
  if v_amr is null or jsonb_typeof(v_amr) <> 'array' then
    return false;
  end if;

  select min((e.entry ->> 'timestamp')::numeric)
  into v_oldest
  from jsonb_array_elements(v_amr) as e (entry)
  where jsonb_typeof(e.entry) = 'object'
    and e.entry ->> 'method' in ('otp', 'magiclink')
    and (e.entry ->> 'timestamp') ~ '^[0-9]{1,12}(\.[0-9]+)?$';

  return coalesce(v_oldest >= extract(epoch from now() - c_max_age), false);
end;
$$;

create or replace function public.claim_login_link(p_email text)
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
  where p.email = v_email
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
