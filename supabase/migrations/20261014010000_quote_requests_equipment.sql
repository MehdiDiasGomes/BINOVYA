create type public.quote_equipment as enum ('bins', 'pav', 'urban_furniture', 'signage');

comment on type public.quote_equipment is
  'bins: wheelie bins, pav: voluntary drop-off points, urban_furniture: street furniture, signage: signs.';

alter table public.quote_requests
  add column equipment public.quote_equipment[] not null default '{bins}';

comment on column public.quote_requests.equipment is
  'Equipment types the quote covers. Bin counts are only meaningful when it contains bins.';

do $$
declare
  v_constraint_name text;
begin
  for v_constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.quote_requests'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%small_bin_count + large_bin_count%>= 1%'
  loop
    execute format('alter table public.quote_requests drop constraint %I', v_constraint_name);
  end loop;
end;
$$;

alter table public.quote_requests
  add constraint quote_requests_equipment_not_empty check (cardinality(equipment) >= 1),
  add constraint quote_requests_bins_required check (
    case
      when 'bins' = any (equipment) then small_bin_count + large_bin_count >= 1
      else small_bin_count = 0 and large_bin_count = 0
    end
  );
