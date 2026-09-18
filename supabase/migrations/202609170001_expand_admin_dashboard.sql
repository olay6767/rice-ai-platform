-- Admin Dashboard: AI models, disease catalogue, agricultural records and usage counters.

alter table public.rice_model_metadata
  add column if not exists is_active boolean not null default false,
  add column if not exists is_visible boolean not null default true;

create unique index if not exists rice_model_metadata_one_active_idx
  on public.rice_model_metadata (is_active) where is_active;

update public.rice_model_metadata
set is_active = true
where model_version = (
  select model_version from public.rice_model_metadata
  order by updated_at desc nulls last, created_at desc
  limit 1
)
and not exists (select 1 from public.rice_model_metadata where is_active);

create table if not exists public.rice_diseases (
  id uuid primary key default gen_random_uuid(),
  disease_code text not null unique check (char_length(disease_code) between 2 and 100),
  name_th text not null check (char_length(name_th) between 2 and 160),
  name_en text not null check (char_length(name_en) between 2 and 160),
  image_url text,
  symptoms text not null default '',
  causes text not null default '',
  prevention text not null default '',
  treatment text not null default '',
  detection_count bigint not null default 0 check (detection_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_agricultural_records (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('price', 'flood', 'drought', 'storm')),
  year integer not null check (year between 1900 and 2200),
  province_id integer references public.rice_provinces(id) on delete set null,
  label text not null check (char_length(label) between 2 and 180),
  value numeric,
  unit text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_agricultural_records_filter_idx
  on public.admin_agricultural_records(category, year desc, province_id);

create table if not exists public.assistant_usage_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  scope text not null default 'nong-serm',
  created_at timestamptz not null default now()
);

create index if not exists assistant_usage_logs_created_at_idx
  on public.assistant_usage_logs(created_at desc);

alter table public.rice_diseases enable row level security;
alter table public.admin_agricultural_records enable row level security;
alter table public.assistant_usage_logs enable row level security;

drop policy if exists "Admins read disease predictions" on public.disease_predictions;
create policy "Admins read disease predictions" on public.disease_predictions
  for select to authenticated using ((select public.is_admin()));

drop policy if exists "Active rice diseases are public read" on public.rice_diseases;
create policy "Active rice diseases are public read" on public.rice_diseases
  for select to public using (is_active or (select public.is_admin()));
drop policy if exists "Admins manage rice diseases" on public.rice_diseases;
create policy "Admins manage rice diseases" on public.rice_diseases
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins manage agricultural records" on public.admin_agricultural_records;
create policy "Admins manage agricultural records" on public.admin_agricultural_records
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Users create assistant usage" on public.assistant_usage_logs;
create policy "Users create assistant usage" on public.assistant_usage_logs
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Admins read assistant usage" on public.assistant_usage_logs;
create policy "Admins read assistant usage" on public.assistant_usage_logs
  for select to authenticated using ((select public.is_admin()));

insert into public.rice_diseases (disease_code, name_th, name_en)
values
  ('Healthy', 'ใบข้าวปกติ', 'Healthy'),
  ('Sheath Blight', 'โรคกาบใบแห้ง', 'Sheath Blight'),
  ('Bacterial Leaf Blight', 'โรคขอบใบแห้ง', 'Bacterial Leaf Blight'),
  ('Brown Spot', 'โรคใบจุดสีน้ำตาล', 'Brown Spot'),
  ('Rice Blast', 'โรคไหม้', 'Rice Blast'),
  ('Neck Blast', 'โรคไหม้คอรวง', 'Neck Blast')
on conflict (disease_code) do nothing;

create or replace function public.increment_rice_disease_detection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.disease is not null then
    update public.rice_diseases
    set detection_count = detection_count + 1, updated_at = now()
    where disease_code = new.disease;
  end if;
  return new;
end $$;

drop trigger if exists count_rice_disease_detection on public.disease_predictions;
create trigger count_rice_disease_detection
after insert on public.disease_predictions
for each row execute function public.increment_rice_disease_detection();
