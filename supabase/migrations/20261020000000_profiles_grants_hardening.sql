-- Removes the table privileges Supabase's default grants leave on profiles, bookings and the
-- availability tables. Every write on profiles goes through the service role or a security
-- definer function; truncate bypasses RLS, references and trigger are never needed by clients.

revoke insert, delete, truncate, references, trigger on public.profiles from anon, authenticated;

revoke references, trigger on public.bookings from anon, authenticated;
revoke references, trigger on public.availability_rules from anon, authenticated;
revoke references, trigger on public.availability_overrides from anon, authenticated;
