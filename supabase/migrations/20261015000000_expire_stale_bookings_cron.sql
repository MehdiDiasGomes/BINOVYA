create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-stale-bookings') then
    perform cron.unschedule('expire-stale-bookings');
  end if;
end;
$$;

select cron.schedule(
  'expire-stale-bookings',
  '*/5 * * * *',
  'select public.expire_stale_bookings();'
);
