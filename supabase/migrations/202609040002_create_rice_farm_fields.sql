-- Farm fields belong to an individual user and provide the location/crop context
-- used by weather, alerts and farming guidance.
create table public.rice_farm_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  province text not null check (char_length(trim(province)) between 2 and 100),
  district text,
  subdistrict text,
  area_rai numeric(12, 2) not null check (area_rai > 0 and area_rai <= 1000000),
  rice_variety text not null check (char_length(trim(rice_variety)) between 2 and 120),
  planting_date date,
  expected_harvest_date date,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rice_farm_fields_coordinates_pair check (
    (latitude is null and longitude is null) or
    (latitude between -90 and 90 and longitude between -180 and 180)
  ),
  constraint rice_farm_fields_harvest_after_planting check (
    expected_harvest_date is null or planting_date is null or expected_harvest_date >= planting_date
  )
);

create index rice_farm_fields_user_updated_idx
  on public.rice_farm_fields (user_id, updated_at desc, id);
create unique index rice_farm_fields_one_primary_idx
  on public.rice_farm_fields (user_id) where is_primary;

-- The first saved field becomes the primary field. Selecting a new primary field
-- switches the old one off in the same transaction.
create function public.rice_farm_fields_keep_one_primary()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(hashtextextended(new.user_id::text, 918273));

  if new.is_primary then
    update public.rice_farm_fields
      set is_primary = false, updated_at = now()
      where user_id = new.user_id and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid) and is_primary;
  elsif tg_op = 'INSERT' and not exists (
    select 1 from public.rice_farm_fields where user_id = new.user_id and is_primary
  ) then
    new.is_primary := true;
  elsif tg_op = 'UPDATE' and old.is_primary and not exists (
    select 1 from public.rice_farm_fields where user_id = new.user_id and id <> old.id and is_primary
  ) then
    new.is_primary := true;
  end if;

  new.updated_at := now();
  return new;
end $$;

create trigger rice_farm_fields_keep_one_primary
  before insert or update on public.rice_farm_fields
  for each row execute function public.rice_farm_fields_keep_one_primary();

alter table public.rice_farm_fields enable row level security;

create policy "Users can view their farm fields"
  on public.rice_farm_fields for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their farm fields"
  on public.rice_farm_fields for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their farm fields"
  on public.rice_farm_fields for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their farm fields"
  on public.rice_farm_fields for delete to authenticated
  using ((select auth.uid()) = user_id);
