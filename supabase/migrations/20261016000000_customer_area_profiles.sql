-- Customer area: throttling of magic link mails, account deletion requests, and a customer
-- limited to editing their own first_name, last_name and phone.
-- See docs/specs/booking-system.md.

alter table public.profiles
  add column login_link_sent_at timestamptz,
  add column deletion_requested_at timestamptz;

comment on column public.profiles.login_link_sent_at is
  'Last magic link mail sent by the server, used to throttle requests per email.';
comment on column public.profiles.deletion_requested_at is
  'Set by the server when the customer requests account deletion, handled manually by BINOVYA.';

revoke update on public.profiles from anon, authenticated;
grant update (first_name, last_name, phone) on public.profiles to authenticated;
