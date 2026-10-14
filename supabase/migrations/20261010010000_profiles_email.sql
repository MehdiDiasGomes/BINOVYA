-- Keeps the customer email on the profile so the server can find an existing customer
-- at booking time and reach them without reading auth.users.

alter table public.profiles add column email text not null unique;
