-- Shared governance for price and disaster datasets.
-- This migration only adds new structures and policies. Existing static files and
-- admin_agricultural_records remain untouched for fallback/reference use.

-- Admin activity logs keep before/after values and stay append-only through RLS.
alter table public.admin_activity_logs
  add column if not exists old_value jsonb,
  add column if not exists new_value jsonb;

alter table public.admin_activity_logs
  drop constraint if exists admin_activity_logs_action_check;
alter table public.admin_activity_logs
  add constraint admin_activity_logs_action_check check (
    action in (
      'create', 'update', 'delete', 'role_update', 'upload',
      'publish', 'archive', 'set_default', 'enable', 'disable'
    )
  );

-- Disease codes are model classes, not editorial content. Admins may edit only
-- the descriptions, labels, image and active state through the API.
alter table public.rice_diseases
  drop constraint if exists rice_diseases_model_class_code_check;
alter table public.rice_diseases
  add constraint rice_diseases_model_class_code_check check (
    disease_code in (
      'Healthy',
      'Sheath Blight',
      'Bacterial Leaf Blight',
      'Brown Spot',
      'Rice Blast',
      'Neck Blast'
    )
  );

-- Prediction history is evidence for usage and model monitoring. It is not
-- permanently deletable through the client API.
drop policy if exists "Users can delete their disease predictions"
  on public.disease_predictions;

create table if not exists public.agricultural_dataset_versions (
  id uuid primary key default gen_random_uuid(),
  dataset_type text not null check (
    dataset_type in ('rice_price', 'flood', 'drought', 'storm')
  ),
  version_key text not null check (
    version_key ~ '^[a-z0-9][a-z0-9._-]{1,49}$'
  ),
  label text not null check (char_length(label) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  status text not null default 'draft' check (
    status in ('draft', 'published', 'archived')
  ),
  is_default boolean not null default false,
  source_name text not null default '',
  source_url text,
  file_name text,
  imported_at timestamptz,
  imported_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  revision bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dataset_type, version_key),
  check (not is_default or status = 'published')
);

create unique index if not exists agricultural_dataset_one_default_idx
  on public.agricultural_dataset_versions (dataset_type)
  where is_default;
create index if not exists agricultural_dataset_versions_list_idx
  on public.agricultural_dataset_versions (
    dataset_type, is_default desc, created_at desc
  );

create table if not exists public.agricultural_dataset_events (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.agricultural_dataset_versions(id),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  action text not null check (
    action in ('create', 'edit', 'import', 'publish', 'archive', 'restore', 'set_default')
  ),
  summary text not null,
  old_value jsonb,
  new_value jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists agricultural_dataset_events_version_time_idx
  on public.agricultural_dataset_events (version_id, created_at desc);

create table if not exists public.agricultural_import_files (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.agricultural_dataset_versions(id) on delete cascade,
  dataset_type text not null check (
    dataset_type in ('rice_price', 'flood', 'drought', 'storm')
  ),
  file_name text not null,
  file_type text not null check (file_type in ('csv', 'xlsx', 'json')),
  source_name text not null default '',
  source_url text,
  row_count integer not null default 0 check (row_count >= 0),
  validation_summary jsonb not null default '{}'::jsonb,
  imported_by uuid references auth.users(id) on delete set null,
  imported_at timestamptz not null default now()
);
create index if not exists agricultural_import_files_version_idx
  on public.agricultural_import_files (version_id, imported_at desc);

create table if not exists public.rice_price_series (
  id bigint generated always as identity primary key,
  version_id uuid not null references public.agricultural_dataset_versions(id) on delete cascade,
  observed_on date not null,
  year integer not null check (year between 1900 and 2200),
  month integer not null check (month between 1 and 12),
  rice_type text not null check (char_length(rice_type) between 2 and 160),
  rice_type_code text not null check (char_length(rice_type_code) between 1 and 80),
  price numeric(14, 2) not null check (price >= 0),
  unit text not null default 'บาท/ตัน',
  data_type text not null default 'actual' check (data_type in ('actual', 'forecast')),
  source text not null default '',
  is_imputed boolean not null default false,
  model_name text,
  model_version text,
  forecast_date date,
  reliability numeric(7, 4) check (reliability between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (extract(year from observed_on)::integer = year),
  check (extract(month from observed_on)::integer = month)
);
create unique index if not exists rice_price_series_unique_idx
  on public.rice_price_series (
    version_id, rice_type_code, observed_on, data_type, coalesce(model_version, '')
  );
create index if not exists rice_price_series_filter_idx
  on public.rice_price_series (version_id, year, month, rice_type_code);

create table if not exists public.flood_records (
  id bigint generated always as identity primary key,
  version_id uuid not null references public.agricultural_dataset_versions(id) on delete cascade,
  year integer not null check (year between 1900 and 2200),
  month integer not null check (month between 1 and 12),
  province_id integer not null references public.rice_provinces(id),
  flood_events integer not null default 0 check (flood_events >= 0),
  affected_area_rai numeric check (affected_area_rai is null or affected_area_rai >= 0),
  affected_households integer check (affected_households is null or affected_households >= 0),
  affected_people integer check (affected_people is null or affected_people >= 0),
  agricultural_damage_rai numeric check (agricultural_damage_rai is null or agricultural_damage_rai >= 0),
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version_id, year, month, province_id)
);
create index if not exists flood_records_filter_idx
  on public.flood_records (version_id, year, month, province_id);

create table if not exists public.drought_records (
  id bigint generated always as identity primary key,
  version_id uuid not null references public.agricultural_dataset_versions(id) on delete cascade,
  year integer not null check (year between 1900 and 2200),
  month integer not null check (month between 1 and 12),
  province_id integer not null references public.rice_provinces(id),
  drought_events integer not null default 0 check (drought_events >= 0),
  affected_area_rai numeric check (affected_area_rai is null or affected_area_rai >= 0),
  affected_households integer check (affected_households is null or affected_households >= 0),
  agricultural_damage_rai numeric check (agricultural_damage_rai is null or agricultural_damage_rai >= 0),
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version_id, year, month, province_id)
);
create index if not exists drought_records_filter_idx
  on public.drought_records (version_id, year, month, province_id);

create table if not exists public.storm_records (
  id bigint generated always as identity primary key,
  version_id uuid not null references public.agricultural_dataset_versions(id) on delete cascade,
  occurred_on date not null,
  year integer not null check (year between 1900 and 2200),
  month integer not null check (month between 1 and 12),
  province_id integer not null references public.rice_provinces(id),
  storm_type text not null default '',
  storm_events integer not null default 0 check (storm_events >= 0),
  affected_people integer check (affected_people is null or affected_people >= 0),
  affected_households integer check (affected_households is null or affected_households >= 0),
  damaged_houses integer check (damaged_houses is null or damaged_houses >= 0),
  agricultural_damage_rai numeric check (agricultural_damage_rai is null or agricultural_damage_rai >= 0),
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (extract(year from occurred_on)::integer = year),
  check (extract(month from occurred_on)::integer = month),
  unique (version_id, occurred_on, province_id, storm_type)
);
create index if not exists storm_records_filter_idx
  on public.storm_records (version_id, year, month, province_id);

create or replace function public.set_agricultural_dataset_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agricultural_dataset_versions_updated_at on public.agricultural_dataset_versions;
create trigger set_agricultural_dataset_versions_updated_at
before update on public.agricultural_dataset_versions
for each row execute function public.set_agricultural_dataset_updated_at();
drop trigger if exists set_rice_price_series_updated_at on public.rice_price_series;
create trigger set_rice_price_series_updated_at
before update on public.rice_price_series
for each row execute function public.set_agricultural_dataset_updated_at();
drop trigger if exists set_flood_records_updated_at on public.flood_records;
create trigger set_flood_records_updated_at
before update on public.flood_records
for each row execute function public.set_agricultural_dataset_updated_at();
drop trigger if exists set_drought_records_updated_at on public.drought_records;
create trigger set_drought_records_updated_at
before update on public.drought_records
for each row execute function public.set_agricultural_dataset_updated_at();
drop trigger if exists set_storm_records_updated_at on public.storm_records;
create trigger set_storm_records_updated_at
before update on public.storm_records
for each row execute function public.set_agricultural_dataset_updated_at();

alter table public.agricultural_dataset_versions enable row level security;
alter table public.agricultural_dataset_events enable row level security;
alter table public.agricultural_import_files enable row level security;
alter table public.rice_price_series enable row level security;
alter table public.flood_records enable row level security;
alter table public.drought_records enable row level security;
alter table public.storm_records enable row level security;

create policy "Published agricultural versions are public read"
  on public.agricultural_dataset_versions for select to public
  using (status = 'published');
create policy "Admins read all agricultural versions"
  on public.agricultural_dataset_versions for select to authenticated
  using ((select public.is_admin()));
create policy "Admins create agricultural drafts"
  on public.agricultural_dataset_versions for insert to authenticated
  with check (
    (select public.is_admin())
    and status = 'draft'
    and not is_default
    and created_by = (select auth.uid())
  );

create policy "Admins read agricultural events"
  on public.agricultural_dataset_events for select to authenticated
  using ((select public.is_admin()));

create policy "Admins read agricultural import files"
  on public.agricultural_import_files for select to authenticated
  using ((select public.is_admin()));
create policy "Admins add agricultural import files to drafts"
  on public.agricultural_import_files for insert to authenticated
  with check (
    (select public.is_admin())
    and imported_by = (select auth.uid())
    and exists (
      select 1 from public.agricultural_dataset_versions version
      where version.id = version_id and version.status = 'draft'
    )
  );

create policy "Published rice prices are public read"
  on public.rice_price_series for select to public
  using (exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'rice_price'
      and version.status = 'published'
  ));
create policy "Admins manage draft rice prices"
  on public.rice_price_series for all to authenticated
  using ((select public.is_admin()) and exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'rice_price'
      and version.status = 'draft'
  ))
  with check ((select public.is_admin()) and exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'rice_price'
      and version.status = 'draft'
  ));

create policy "Published flood records are public read"
  on public.flood_records for select to public
  using (exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'flood'
      and version.status = 'published'
  ));
create policy "Admins manage draft flood records"
  on public.flood_records for all to authenticated
  using ((select public.is_admin()) and exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'flood'
      and version.status = 'draft'
  ))
  with check ((select public.is_admin()) and exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'flood'
      and version.status = 'draft'
  ));

create policy "Published drought records are public read"
  on public.drought_records for select to public
  using (exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'drought'
      and version.status = 'published'
  ));
create policy "Admins manage draft drought records"
  on public.drought_records for all to authenticated
  using ((select public.is_admin()) and exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'drought'
      and version.status = 'draft'
  ))
  with check ((select public.is_admin()) and exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'drought'
      and version.status = 'draft'
  ));

create policy "Published storm records are public read"
  on public.storm_records for select to public
  using (exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'storm'
      and version.status = 'published'
  ));
create policy "Admins manage draft storm records"
  on public.storm_records for all to authenticated
  using ((select public.is_admin()) and exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'storm'
      and version.status = 'draft'
  ))
  with check ((select public.is_admin()) and exists (
    select 1 from public.agricultural_dataset_versions version
    where version.id = version_id and version.dataset_type = 'storm'
      and version.status = 'draft'
  ));

create or replace function public.agricultural_dataset_create_version(
  p_dataset_type text,
  p_key text,
  p_label text,
  p_description text default '',
  p_source_name text default '',
  p_source_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  version public.agricultural_dataset_versions;
begin
  if not coalesce(public.is_admin(), false) then
    raise insufficient_privilege using message = 'ADMIN_REQUIRED';
  end if;
  if p_dataset_type not in ('rice_price', 'flood', 'drought', 'storm') then
    raise exception 'INVALID_DATASET_TYPE';
  end if;
  insert into public.agricultural_dataset_versions (
    dataset_type, version_key, label, description, source_name, source_url,
    status, is_default, created_by
  ) values (
    p_dataset_type, lower(trim(p_key)), trim(p_label), trim(p_description),
    trim(p_source_name), nullif(trim(p_source_url), ''), 'draft', false, auth.uid()
  ) returning * into version;
  insert into public.agricultural_dataset_events (
    version_id, actor_id, actor_name, action, summary, new_value
  ) values (
    version.id, auth.uid(), coalesce(auth.jwt() ->> 'email', 'ผู้ดูแล'),
    'create', 'สร้างฉบับร่างใหม่', to_jsonb(version)
  );
  return to_jsonb(version);
end;
$$;

create or replace function public.agricultural_dataset_change_version(
  p_id uuid,
  p_action text,
  p_revision bigint,
  p_label text default null,
  p_description text default null,
  p_source_name text default null,
  p_source_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  version public.agricultural_dataset_versions;
  previous public.agricultural_dataset_versions;
  row_count bigint;
begin
  if not coalesce(public.is_admin(), false) then
    raise insufficient_privilege using message = 'ADMIN_REQUIRED';
  end if;
  if p_action not in ('edit', 'publish', 'publish-default', 'default', 'archive', 'restore') then
    raise exception 'INVALID_ACTION';
  end if;
  if p_action in ('publish-default', 'default') and not coalesce(public.is_superadmin(), false) then
    raise insufficient_privilege using message = 'SUPERADMIN_REQUIRED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(824118);
  select * into version
  from public.agricultural_dataset_versions
  where id = p_id for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  previous := version;
  if p_revision is null or version.revision <> p_revision then
    raise exception 'VERSION_CHANGED';
  end if;
  if p_action = 'edit' and version.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if p_action in ('publish', 'publish-default') and version.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if p_action = 'restore' and version.status <> 'archived' then raise exception 'ARCHIVED_REQUIRED'; end if;
  if p_action = 'default' and version.status <> 'published' then raise exception 'PUBLISHED_REQUIRED'; end if;
  if p_action = 'archive' and version.is_default then raise exception 'DEFAULT_PROTECTED'; end if;

  if p_action in ('publish', 'publish-default', 'restore') then
    case version.dataset_type
      when 'rice_price' then select count(*) into row_count from public.rice_price_series where version_id = p_id;
      when 'flood' then select count(*) into row_count from public.flood_records where version_id = p_id;
      when 'drought' then select count(*) into row_count from public.drought_records where version_id = p_id;
      when 'storm' then select count(*) into row_count from public.storm_records where version_id = p_id;
    end case;
    if coalesce(row_count, 0) = 0 then raise exception 'DATA_REQUIRED'; end if;
  end if;

  if p_action in ('publish-default', 'default') then
    update public.agricultural_dataset_versions
    set is_default = false, revision = revision + 1, updated_at = now()
    where dataset_type = version.dataset_type and is_default and id <> p_id;
  end if;

  update public.agricultural_dataset_versions set
    label = case when p_action = 'edit' then trim(p_label) else label end,
    description = case when p_action = 'edit' then trim(p_description) else description end,
    source_name = case when p_action = 'edit' then trim(p_source_name) else source_name end,
    source_url = case when p_action = 'edit' then nullif(trim(p_source_url), '') else source_url end,
    status = case
      when p_action in ('publish', 'publish-default', 'restore') then 'published'
      when p_action = 'archive' then 'archived'
      else status
    end,
    is_default = case when p_action in ('publish-default', 'default') then true else is_default end,
    published_at = case when p_action in ('publish', 'publish-default') then now() else published_at end,
    revision = revision + 1,
    updated_at = now()
  where id = p_id
  returning * into version;

  insert into public.agricultural_dataset_events (
    version_id, actor_id, actor_name, action, summary, old_value, new_value
  ) values (
    p_id,
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', 'ผู้ดูแล'),
    case p_action when 'publish-default' then 'publish' when 'default' then 'set_default' else p_action end,
    case p_action
      when 'edit' then 'แก้ไขรายละเอียดฉบับร่าง'
      when 'publish' then 'เผยแพร่ชุดข้อมูล'
      when 'publish-default' then 'เผยแพร่และกำหนดเป็นค่าเริ่มต้น'
      when 'default' then 'กำหนดเป็นชุดข้อมูลเริ่มต้น'
      when 'archive' then 'เก็บชุดข้อมูลเข้าคลัง'
      else 'คืนชุดข้อมูลจากคลัง'
    end,
    to_jsonb(previous),
    to_jsonb(version)
  );
  return to_jsonb(version);
end;
$$;

revoke all on function public.agricultural_dataset_create_version(text, text, text, text, text, text) from public;
revoke all on function public.agricultural_dataset_change_version(uuid, text, bigint, text, text, text, text) from public;
grant execute on function public.agricultural_dataset_create_version(text, text, text, text, text, text) to authenticated;
grant execute on function public.agricultural_dataset_change_version(uuid, text, bigint, text, text, text, text) to authenticated;
