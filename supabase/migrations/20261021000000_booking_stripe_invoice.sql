-- Stripe invoice of a paid booking (Checkout invoice_creation). Nullable: bookings paid before
-- invoicing keep their Stripe receipt. Written by the server (service role) once Stripe has
-- created the invoice; read by the customer through the existing own-rows select policy.

alter table public.bookings
  add column stripe_invoice_id text;

alter table public.bookings
  add constraint bookings_stripe_invoice_id_format
  check (stripe_invoice_id is null or left(stripe_invoice_id, 3) = 'in_');

create unique index bookings_stripe_invoice_id_key
  on public.bookings (stripe_invoice_id)
  where stripe_invoice_id is not null;

comment on column public.bookings.stripe_invoice_id is
  'Stripe invoice id (in_...) created after the Checkout payment; null for bookings paid before invoicing.';
