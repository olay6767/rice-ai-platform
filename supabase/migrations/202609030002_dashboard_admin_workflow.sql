-- Detailed Dashboard administration: draft lifecycle, atomic imports and audit trail.
-- Keeps all existing versions and data. No version is automatically unpublished.
alter table public.rice_dashboard_versions
  add column revision bigint not null default 0;
alter table public.rice_dashboard_versions alter column status set default 'draft';
alter table public.rice_dashboard_versions
  add constraint rice_dashboard_default_must_be_published check (not is_default or status = 'published');

create table public.rice_dashboard_events (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.rice_dashboard_versions(id),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  action text not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index rice_dashboard_events_version_time_idx
  on public.rice_dashboard_events(version_id, created_at desc, id);
alter table public.rice_dashboard_events enable row level security;
create policy "Admins read dashboard audit" on public.rice_dashboard_events
  for select to authenticated using ((select public.is_admin()));
create policy "Admins append dashboard audit" on public.rice_dashboard_events
  for insert to authenticated with check ((select public.is_admin()) and actor_id = (select auth.uid()));

-- Drafts and archived data must not be readable through the public REST API.
drop policy "Published dashboard versions are public read" on public.rice_dashboard_versions;
create policy "Published dashboard versions are public read"
  on public.rice_dashboard_versions for select to public using (status = 'published');
drop policy "Rice monthly environment is public read" on public.rice_environment_monthly;
drop policy "Rice yearly yield is public read" on public.rice_yield_yearly;
drop policy "Rice predictions are public read" on public.rice_yield_predictions;
create policy "Published yearly-yield data is public read"
  on public.rice_yield_yearly for select to public
  using (exists (select 1 from public.rice_dashboard_versions v
    where v.id = dashboard_version_id and v.status = 'published'));
create policy "Published monthly-environment data is public read"
  on public.rice_environment_monthly for select to public
  using (exists (select 1 from public.rice_dashboard_versions v
    where v.id = dashboard_version_id and v.status = 'published'));
create policy "Published yield-predictions data is public read"
  on public.rice_yield_predictions for select to public
  using (exists (select 1 from public.rice_dashboard_versions v
    where v.id = dashboard_version_id and v.status = 'published'));

create function public.rice_dashboard_create_version(
  p_key text, p_label text, p_description text, p_source_id uuid default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v public.rice_dashboard_versions; source public.rice_dashboard_versions;
begin
  if not coalesce(public.is_admin(), false) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  if p_source_id is not null then
    select * into source from public.rice_dashboard_versions where id = p_source_id for share;
    if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  end if;
  insert into public.rice_dashboard_versions(version_key,label,description,status,is_default,created_by)
    values(lower(trim(p_key)),trim(p_label),trim(p_description),'draft',false,auth.uid()) returning * into v;
  if p_source_id is not null then
    insert into public.rice_yield_yearly(dashboard_version_id,province_id,crop_start_year,crop_year,actual_yield,yield_per_harvested_rai,production_ton,harvested_area_rai,planted_area_rai)
      select v.id,province_id,crop_start_year,crop_year,actual_yield,yield_per_harvested_rai,production_ton,harvested_area_rai,planted_area_rai from public.rice_yield_yearly where dashboard_version_id = p_source_id;
    insert into public.rice_environment_monthly(dashboard_version_id,province_id,year,month,temperature_mean_c,dewpoint_mean_c,soil_moisture_mean,rainfall_total_mm,evaporation_total_mm,solar_total_mj_m2,ndvi_mean,ndvi_median,ndvi_std,ndvi_min,ndvi_max,rice_valid_ratio_mean,rice_ndvi_imputed,rice_ndvi_structural_missing,rice_ndvi_final_quality,grid_cell_count)
      select v.id,province_id,year,month,temperature_mean_c,dewpoint_mean_c,soil_moisture_mean,rainfall_total_mm,evaporation_total_mm,solar_total_mj_m2,ndvi_mean,ndvi_median,ndvi_std,ndvi_min,ndvi_max,rice_valid_ratio_mean,rice_ndvi_imputed,rice_ndvi_structural_missing,rice_ndvi_final_quality,grid_cell_count from public.rice_environment_monthly where dashboard_version_id = p_source_id;
    insert into public.rice_yield_predictions(dashboard_version_id,province_id,crop_start_year,crop_year,actual_yield,predicted_yield,residual,absolute_error,percentage_error,model_version)
      select v.id,province_id,crop_start_year,crop_year,actual_yield,predicted_yield,residual,absolute_error,percentage_error,model_version from public.rice_yield_predictions where dashboard_version_id = p_source_id;
  end if;
  insert into public.rice_dashboard_events(version_id,actor_id,actor_name,action,summary,details)
    values(v.id,auth.uid(),coalesce(auth.jwt()->>'email','ผู้ดูแล'),
      case when p_source_id is null then 'create' else 'clone' end,
      case when p_source_id is null then 'สร้างฉบับร่างใหม่' else 'คัดลอกข้อมูลเป็นฉบับร่าง' end,
      jsonb_build_object('sourceVersionId',p_source_id,'sourceLabel',source.label));
  return to_jsonb(v);
end $$;

create function public.rice_dashboard_change_version(
  p_id uuid, p_action text, p_revision bigint,
  p_label text default null, p_description text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v public.rice_dashboard_versions; previous_default uuid;
begin
  if not coalesce(public.is_admin(), false) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  -- Serialize lifecycle changes to keep exactly one published default.
  perform pg_catalog.pg_advisory_xact_lock(824117);
  select * into v from public.rice_dashboard_versions where id = p_id for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  if p_revision is null or v.revision <> p_revision then raise exception 'VERSION_CHANGED'; end if;
  if p_action not in ('edit','publish','publish-default','default','archive','restore') then raise exception 'INVALID_ACTION'; end if;
  if p_action in ('publish','publish-default') and v.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if p_action = 'restore' and v.status <> 'archived' then raise exception 'ARCHIVED_REQUIRED'; end if;
  if p_action = 'default' and v.status <> 'published' then raise exception 'PUBLISHED_REQUIRED'; end if;
  if p_action = 'archive' then
    if v.is_default then raise exception 'DEFAULT_PROTECTED'; end if;
    if v.status = 'published' and not exists(select 1 from public.rice_dashboard_versions where status = 'published' and id <> p_id) then raise exception 'LAST_PUBLISHED_PROTECTED'; end if;
  end if;
  if p_action in ('publish','publish-default','restore') then
    if not exists(select 1 from public.rice_yield_yearly where dashboard_version_id = p_id) then raise exception 'YEARLY_DATA_REQUIRED'; end if;
    if (select count(distinct model_version) from public.rice_yield_predictions where dashboard_version_id = p_id) > 1 then raise exception 'MULTIPLE_MODELS'; end if;
    if exists(
      select 1 from public.rice_yield_predictions p
      left join public.rice_yield_yearly y on y.dashboard_version_id = p.dashboard_version_id
        and y.province_id = p.province_id and y.crop_start_year = p.crop_start_year
      where p.dashboard_version_id = p_id and (y.id is null or abs(y.actual_yield - p.actual_yield) > 0.05)
    ) then raise exception 'PREDICTIONS_MISMATCH'; end if;
  end if;
  if p_action in ('default','publish-default') then
    select id into previous_default from public.rice_dashboard_versions where is_default;
    update public.rice_dashboard_versions set is_default = false, revision = revision + 1, updated_at = now()
      where is_default and id <> p_id;
  end if;
  update public.rice_dashboard_versions set
    label = case when p_action = 'edit' then trim(p_label) else label end,
    description = case when p_action = 'edit' then trim(p_description) else description end,
    status = case when p_action in ('publish','publish-default','restore') then 'published'
      when p_action = 'archive' then 'archived' else status end,
    is_default = case when p_action in ('default','publish-default') then true else is_default end,
    published_at = case when p_action in ('publish','publish-default') then now() else published_at end,
    revision = revision + 1, updated_at = now()
    where id = p_id returning * into v;
  insert into public.rice_dashboard_events(version_id,actor_id,actor_name,action,summary,details)
    values(p_id,auth.uid(),coalesce(auth.jwt()->>'email','ผู้ดูแล'),p_action,
      case p_action when 'edit' then 'แก้ไขรายละเอียดเวอร์ชัน'
        when 'publish' then 'เผยแพร่ให้ผู้ใช้เลือก'
        when 'publish-default' then 'เผยแพร่และกำหนดเป็นค่าเริ่มต้น'
        when 'default' then 'กำหนดเป็นเวอร์ชันเริ่มต้น'
        when 'archive' then 'เก็บเวอร์ชันเข้าคลัง (ไม่ลบข้อมูล)'
        else 'คืนเวอร์ชันจากคลังเพื่อให้ผู้ใช้เลือก' end,
      jsonb_build_object('previousDefaultId',previous_default,'revision',v.revision));
  return to_jsonb(v);
end $$;

create function public.rice_dashboard_import(
  p_id uuid, p_dataset text, p_rows jsonb, p_revision bigint, p_file_name text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v public.rice_dashboard_versions; updated_count integer; total_count integer;
begin
  if not coalesce(public.is_admin(), false) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  select * into v from public.rice_dashboard_versions where id = p_id for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  if v.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if p_revision is null or v.revision <> p_revision then raise exception 'VERSION_CHANGED'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'INVALID_ROWS'; end if;
  total_count := jsonb_array_length(p_rows);
  if total_count < 1 or total_count > 20000 then raise exception 'INVALID_ROWS'; end if;
  -- Each file and its audit entry are committed in one database transaction.
  case p_dataset
    when 'yearly-yield' then
      select count(*) into updated_count from jsonb_populate_recordset(null::public.rice_yield_yearly, p_rows) r
        join public.rice_yield_yearly current on current.dashboard_version_id = p_id
          and current.province_id = r.province_id and current.crop_start_year = r.crop_start_year;
      insert into public.rice_yield_yearly(dashboard_version_id,province_id,crop_start_year,crop_year,actual_yield,yield_per_harvested_rai,production_ton,harvested_area_rai,planted_area_rai)
        select p_id,r.province_id,r.crop_start_year,r.crop_year,r.actual_yield,r.yield_per_harvested_rai,r.production_ton,r.harvested_area_rai,r.planted_area_rai from jsonb_populate_recordset(null::public.rice_yield_yearly, p_rows) r
        on conflict (dashboard_version_id,province_id,crop_start_year)
        do update set crop_year = excluded.crop_year,actual_yield = excluded.actual_yield,yield_per_harvested_rai = excluded.yield_per_harvested_rai,production_ton = excluded.production_ton,harvested_area_rai = excluded.harvested_area_rai,planted_area_rai = excluded.planted_area_rai;
    when 'monthly-environment' then
      select count(*) into updated_count from jsonb_populate_recordset(null::public.rice_environment_monthly, p_rows) r
        join public.rice_environment_monthly current on current.dashboard_version_id = p_id
          and current.province_id = r.province_id and current.year = r.year and current.month = r.month;
      insert into public.rice_environment_monthly(dashboard_version_id,province_id,year,month,temperature_mean_c,dewpoint_mean_c,soil_moisture_mean,rainfall_total_mm,evaporation_total_mm,solar_total_mj_m2,ndvi_mean,ndvi_median,ndvi_std,ndvi_min,ndvi_max,rice_valid_ratio_mean,rice_ndvi_imputed,rice_ndvi_structural_missing,rice_ndvi_final_quality,grid_cell_count)
        select p_id,r.province_id,r.year,r.month,r.temperature_mean_c,r.dewpoint_mean_c,r.soil_moisture_mean,r.rainfall_total_mm,r.evaporation_total_mm,r.solar_total_mj_m2,r.ndvi_mean,r.ndvi_median,r.ndvi_std,r.ndvi_min,r.ndvi_max,r.rice_valid_ratio_mean,r.rice_ndvi_imputed,r.rice_ndvi_structural_missing,r.rice_ndvi_final_quality,r.grid_cell_count from jsonb_populate_recordset(null::public.rice_environment_monthly, p_rows) r
        on conflict (dashboard_version_id,province_id,year,month)
        do update set temperature_mean_c = excluded.temperature_mean_c,dewpoint_mean_c = excluded.dewpoint_mean_c,soil_moisture_mean = excluded.soil_moisture_mean,rainfall_total_mm = excluded.rainfall_total_mm,evaporation_total_mm = excluded.evaporation_total_mm,solar_total_mj_m2 = excluded.solar_total_mj_m2,ndvi_mean = excluded.ndvi_mean,ndvi_median = excluded.ndvi_median,ndvi_std = excluded.ndvi_std,ndvi_min = excluded.ndvi_min,ndvi_max = excluded.ndvi_max,rice_valid_ratio_mean = excluded.rice_valid_ratio_mean,rice_ndvi_imputed = excluded.rice_ndvi_imputed,rice_ndvi_structural_missing = excluded.rice_ndvi_structural_missing,rice_ndvi_final_quality = excluded.rice_ndvi_final_quality,grid_cell_count = excluded.grid_cell_count;
    when 'yield-predictions' then
      select count(*) into updated_count from jsonb_populate_recordset(null::public.rice_yield_predictions, p_rows) r
        join public.rice_yield_predictions current on current.dashboard_version_id = p_id
          and current.province_id = r.province_id and current.crop_start_year = r.crop_start_year and current.model_version = r.model_version;
      insert into public.rice_yield_predictions(dashboard_version_id,province_id,crop_start_year,crop_year,actual_yield,predicted_yield,residual,absolute_error,percentage_error,model_version)
        select p_id,r.province_id,r.crop_start_year,r.crop_year,r.actual_yield,r.predicted_yield,r.residual,r.absolute_error,r.percentage_error,r.model_version from jsonb_populate_recordset(null::public.rice_yield_predictions, p_rows) r
        on conflict (dashboard_version_id,province_id,crop_start_year,model_version)
        do update set crop_year = excluded.crop_year,actual_yield = excluded.actual_yield,predicted_yield = excluded.predicted_yield,residual = excluded.residual,absolute_error = excluded.absolute_error,percentage_error = excluded.percentage_error;
    else raise exception 'INVALID_DATASET';
  end case;
  update public.rice_dashboard_versions set revision = revision + 1, updated_at = now()
    where id = p_id returning * into v;
  insert into public.rice_dashboard_events(version_id,actor_id,actor_name,action,summary,details)
    values(p_id,auth.uid(),coalesce(auth.jwt()->>'email','ผู้ดูแล'),'import','นำเข้าข้อมูล CSV สำเร็จ',
      jsonb_build_object('datasetType',p_dataset,'fileName',left(p_file_name,255),
        'importedRows',total_count,'inserts',total_count-updated_count,'updates',updated_count,'revision',v.revision));
  return jsonb_build_object('version',to_jsonb(v),'importedRows',total_count,
    'inserts',total_count-updated_count,'updates',updated_count);
end $$;

revoke all on function public.rice_dashboard_create_version(text,text,text,uuid) from public;
revoke all on function public.rice_dashboard_change_version(uuid,text,bigint,text,text) from public;
revoke all on function public.rice_dashboard_import(uuid,text,jsonb,bigint,text) from public;
grant execute on function public.rice_dashboard_create_version(text,text,text,uuid) to authenticated;
grant execute on function public.rice_dashboard_change_version(uuid,text,bigint,text,text) to authenticated;
grant execute on function public.rice_dashboard_import(uuid,text,jsonb,bigint,text) to authenticated;

-- Aggregate in Postgres, never silently truncate coverage at PostgREST's row limit.
create function public.rice_dashboard_admin_summary()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not coalesce(public.is_admin(), false) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  select coalesce(jsonb_agg(to_jsonb(v) || jsonb_build_object(
    'datasets',jsonb_build_array(
(select jsonb_build_object('type','yearly-yield','count',count(*),'provinceCount',count(distinct d.province_id),
  'years',coalesce(jsonb_agg(distinct d.crop_start_year order by d.crop_start_year), '[]'::jsonb),
  'models','[]'::jsonb,
  'missingMonths',0)
  from public.rice_yield_yearly d where d.dashboard_version_id = v.id),
(select jsonb_build_object('type','monthly-environment','count',count(*),'provinceCount',count(distinct d.province_id),
  'years',coalesce(jsonb_agg(distinct d.year order by d.year), '[]'::jsonb),
  'models','[]'::jsonb,
  'missingMonths',(select coalesce(sum(12 - n),0) from (select count(distinct m.month) as n
    from public.rice_environment_monthly m where m.dashboard_version_id = v.id group by m.province_id,m.year) coverage))
  from public.rice_environment_monthly d where d.dashboard_version_id = v.id),
(select jsonb_build_object('type','yield-predictions','count',count(*),'provinceCount',count(distinct d.province_id),
  'years',coalesce(jsonb_agg(distinct d.crop_start_year order by d.crop_start_year), '[]'::jsonb),
  'models',coalesce(jsonb_agg(distinct d.model_version), '[]'::jsonb),
  'missingMonths',0)
  from public.rice_yield_predictions d where d.dashboard_version_id = v.id)),
    'predictionMismatchCount',(select count(*) from public.rice_yield_predictions p
      left join public.rice_yield_yearly y on y.dashboard_version_id = p.dashboard_version_id
        and y.province_id = p.province_id and y.crop_start_year = p.crop_start_year
      where p.dashboard_version_id = v.id and (y.id is null or abs(p.actual_yield - y.actual_yield) > 0.05))
    ) order by v.is_default desc,v.created_at desc),'[]'::jsonb)
    into result from public.rice_dashboard_versions v;
  return result;
end $$;
revoke all on function public.rice_dashboard_admin_summary() from public;
grant execute on function public.rice_dashboard_admin_summary() to authenticated;

create function public.rice_dashboard_years(p_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'cropYears',coalesce((select jsonb_agg(y order by y) from
      (select distinct crop_start_year y from public.rice_yield_yearly where dashboard_version_id = p_id) years),'[]'::jsonb),
    'environmentYears',coalesce((select jsonb_agg(y order by y) from
      (select distinct year y from public.rice_environment_monthly where dashboard_version_id = p_id) years),'[]'::jsonb)
  );
$$;
revoke all on function public.rice_dashboard_years(uuid) from public;
grant execute on function public.rice_dashboard_years(uuid) to anon, authenticated;
