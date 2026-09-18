-- Versioned datasets for the Rice Yield Dashboard.
-- Existing records are preserved under the baseline version.

create table if not exists public.rice_dashboard_versions (
  id uuid primary key default gen_random_uuid(),
  version_key text not null unique
    check (version_key ~ '^[a-z0-9][a-z0-9._-]{1,49}$'),
  label text not null check (char_length(label) between 2 and 120),
  description text not null default '' check (char_length(description) <= 500),
  status text not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rice_dashboard_versions_one_default_idx
  on public.rice_dashboard_versions (is_default)
  where is_default = true;

insert into public.rice_dashboard_versions (
  id,
  version_key,
  label,
  description,
  status,
  is_default,
  published_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  'baseline-2026',
  'ข้อมูลเริ่มต้น 2026',
  'ข้อมูลเดิมก่อนเปิดใช้ระบบเวอร์ชัน',
  'published',
  true,
  now()
)
on conflict (version_key) do nothing;

alter table public.rice_environment_monthly
  add column if not exists dashboard_version_id uuid;
alter table public.rice_yield_yearly
  add column if not exists dashboard_version_id uuid;
alter table public.rice_yield_predictions
  add column if not exists dashboard_version_id uuid;

update public.rice_environment_monthly
set dashboard_version_id = '00000000-0000-4000-8000-000000000001'
where dashboard_version_id is null;
update public.rice_yield_yearly
set dashboard_version_id = '00000000-0000-4000-8000-000000000001'
where dashboard_version_id is null;
update public.rice_yield_predictions
set dashboard_version_id = '00000000-0000-4000-8000-000000000001'
where dashboard_version_id is null;

alter table public.rice_environment_monthly
  alter column dashboard_version_id set default '00000000-0000-4000-8000-000000000001',
  alter column dashboard_version_id set not null;
alter table public.rice_yield_yearly
  alter column dashboard_version_id set default '00000000-0000-4000-8000-000000000001',
  alter column dashboard_version_id set not null;
alter table public.rice_yield_predictions
  alter column dashboard_version_id set default '00000000-0000-4000-8000-000000000001',
  alter column dashboard_version_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rice_environment_monthly_version_fk'
  ) then
    alter table public.rice_environment_monthly
      add constraint rice_environment_monthly_version_fk
      foreign key (dashboard_version_id)
      references public.rice_dashboard_versions(id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'rice_yield_yearly_version_fk'
  ) then
    alter table public.rice_yield_yearly
      add constraint rice_yield_yearly_version_fk
      foreign key (dashboard_version_id)
      references public.rice_dashboard_versions(id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'rice_yield_predictions_version_fk'
  ) then
    alter table public.rice_yield_predictions
      add constraint rice_yield_predictions_version_fk
      foreign key (dashboard_version_id)
      references public.rice_dashboard_versions(id)
      on delete cascade;
  end if;
end $$;

alter table public.rice_environment_monthly
  drop constraint if exists rice_environment_monthly_unique;
alter table public.rice_yield_yearly
  drop constraint if exists rice_yield_yearly_unique;
alter table public.rice_yield_predictions
  drop constraint if exists rice_yield_predictions_unique;

alter table public.rice_environment_monthly
  add constraint rice_environment_monthly_unique
  unique (dashboard_version_id, province_id, year, month);
alter table public.rice_yield_yearly
  add constraint rice_yield_yearly_unique
  unique (dashboard_version_id, province_id, crop_start_year);
alter table public.rice_yield_predictions
  add constraint rice_yield_predictions_unique
  unique (dashboard_version_id, province_id, crop_start_year, model_version);

create index if not exists rice_environment_monthly_version_idx
  on public.rice_environment_monthly (dashboard_version_id, year, month, province_id);
create index if not exists rice_yield_yearly_version_idx
  on public.rice_yield_yearly (dashboard_version_id, crop_start_year, province_id);
create index if not exists rice_yield_predictions_version_idx
  on public.rice_yield_predictions (dashboard_version_id, crop_start_year, province_id);

alter table public.rice_dashboard_versions enable row level security;

create policy "Published dashboard versions are public read"
on public.rice_dashboard_versions for select to public
using (status = 'published' or (select public.is_admin()));

create policy "Admins manage dashboard versions"
on public.rice_dashboard_versions for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
