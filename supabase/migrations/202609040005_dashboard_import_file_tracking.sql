-- Keep the origin of each new CSV import so a draft can remove that file's
-- remaining rows without touching data supplied by another file.
create table public.rice_dashboard_import_files (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.rice_dashboard_versions(id) on delete cascade,
  dataset_type text not null check (dataset_type in ('yearly-yield', 'monthly-environment', 'yield-predictions')),
  file_name text not null check (length(trim(file_name)) between 1 and 255),
  original_row_count integer not null check (original_row_count > 0),
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index rice_dashboard_import_files_version_created_idx
  on public.rice_dashboard_import_files(version_id, created_at desc, id);

alter table public.rice_yield_yearly
  add column source_import_file_id uuid references public.rice_dashboard_import_files(id) on delete set null;
alter table public.rice_environment_monthly
  add column source_import_file_id uuid references public.rice_dashboard_import_files(id) on delete set null;
alter table public.rice_yield_predictions
  add column source_import_file_id uuid references public.rice_dashboard_import_files(id) on delete set null;
create index rice_yield_yearly_source_import_file_idx
  on public.rice_yield_yearly(source_import_file_id) where source_import_file_id is not null;
create index rice_environment_monthly_source_import_file_idx
  on public.rice_environment_monthly(source_import_file_id) where source_import_file_id is not null;
create index rice_yield_predictions_source_import_file_idx
  on public.rice_yield_predictions(source_import_file_id) where source_import_file_id is not null;

alter table public.rice_dashboard_import_files enable row level security;
create policy "Admins read dashboard import files" on public.rice_dashboard_import_files
  for select to authenticated using ((select public.is_admin()));
create policy "Admins write dashboard import files" on public.rice_dashboard_import_files
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Replace the original import function. The public signature does not change,
-- so the existing single-file and batch upload paths both become traceable.
create or replace function public.rice_dashboard_import(
  p_id uuid, p_dataset text, p_rows jsonb, p_revision bigint, p_file_name text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v public.rice_dashboard_versions;
  updated_count integer;
  total_count integer;
  import_file_id uuid;
begin
  if not coalesce(public.is_admin(), false) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  select * into v from public.rice_dashboard_versions where id = p_id for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  if v.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if p_revision is null or v.revision <> p_revision then raise exception 'VERSION_CHANGED'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'INVALID_ROWS'; end if;
  total_count := jsonb_array_length(p_rows);
  if total_count < 1 or total_count > 20000 then raise exception 'INVALID_ROWS'; end if;
  if p_dataset not in ('yearly-yield', 'monthly-environment', 'yield-predictions') then raise exception 'INVALID_DATASET'; end if;

  insert into public.rice_dashboard_import_files(version_id,dataset_type,file_name,original_row_count,actor_id)
    values (p_id,p_dataset,left(coalesce(nullif(trim(p_file_name),''),'import.csv'),255),total_count,auth.uid())
    returning id into import_file_id;

  case p_dataset
    when 'yearly-yield' then
      select count(*) into updated_count from jsonb_populate_recordset(null::public.rice_yield_yearly, p_rows) r
        join public.rice_yield_yearly current on current.dashboard_version_id = p_id
          and current.province_id = r.province_id and current.crop_start_year = r.crop_start_year;
      insert into public.rice_yield_yearly(dashboard_version_id,province_id,crop_start_year,crop_year,actual_yield,yield_per_harvested_rai,production_ton,harvested_area_rai,planted_area_rai,source_import_file_id)
        select p_id,r.province_id,r.crop_start_year,r.crop_year,r.actual_yield,r.yield_per_harvested_rai,r.production_ton,r.harvested_area_rai,r.planted_area_rai,import_file_id from jsonb_populate_recordset(null::public.rice_yield_yearly, p_rows) r
        on conflict (dashboard_version_id,province_id,crop_start_year)
        do update set crop_year = excluded.crop_year,actual_yield = excluded.actual_yield,yield_per_harvested_rai = excluded.yield_per_harvested_rai,production_ton = excluded.production_ton,harvested_area_rai = excluded.harvested_area_rai,planted_area_rai = excluded.planted_area_rai,source_import_file_id = excluded.source_import_file_id;
    when 'monthly-environment' then
      select count(*) into updated_count from jsonb_populate_recordset(null::public.rice_environment_monthly, p_rows) r
        join public.rice_environment_monthly current on current.dashboard_version_id = p_id
          and current.province_id = r.province_id and current.year = r.year and current.month = r.month;
      insert into public.rice_environment_monthly(dashboard_version_id,province_id,year,month,temperature_mean_c,dewpoint_mean_c,soil_moisture_mean,rainfall_total_mm,evaporation_total_mm,solar_total_mj_m2,ndvi_mean,ndvi_median,ndvi_std,ndvi_min,ndvi_max,rice_valid_ratio_mean,rice_ndvi_imputed,rice_ndvi_structural_missing,rice_ndvi_final_quality,grid_cell_count,source_import_file_id)
        select p_id,r.province_id,r.year,r.month,r.temperature_mean_c,r.dewpoint_mean_c,r.soil_moisture_mean,r.rainfall_total_mm,r.evaporation_total_mm,r.solar_total_mj_m2,r.ndvi_mean,r.ndvi_median,r.ndvi_std,r.ndvi_min,r.ndvi_max,r.rice_valid_ratio_mean,r.rice_ndvi_imputed,r.rice_ndvi_structural_missing,r.rice_ndvi_final_quality,r.grid_cell_count,import_file_id from jsonb_populate_recordset(null::public.rice_environment_monthly, p_rows) r
        on conflict (dashboard_version_id,province_id,year,month)
        do update set temperature_mean_c = excluded.temperature_mean_c,dewpoint_mean_c = excluded.dewpoint_mean_c,soil_moisture_mean = excluded.soil_moisture_mean,rainfall_total_mm = excluded.rainfall_total_mm,evaporation_total_mm = excluded.evaporation_total_mm,solar_total_mj_m2 = excluded.solar_total_mj_m2,ndvi_mean = excluded.ndvi_mean,ndvi_median = excluded.ndvi_median,ndvi_std = excluded.ndvi_std,ndvi_min = excluded.ndvi_min,ndvi_max = excluded.ndvi_max,rice_valid_ratio_mean = excluded.rice_valid_ratio_mean,rice_ndvi_imputed = excluded.rice_ndvi_imputed,rice_ndvi_structural_missing = excluded.rice_ndvi_structural_missing,rice_ndvi_final_quality = excluded.rice_ndvi_final_quality,grid_cell_count = excluded.grid_cell_count,source_import_file_id = excluded.source_import_file_id;
    when 'yield-predictions' then
      select count(*) into updated_count from jsonb_populate_recordset(null::public.rice_yield_predictions, p_rows) r
        join public.rice_yield_predictions current on current.dashboard_version_id = p_id
          and current.province_id = r.province_id and current.crop_start_year = r.crop_start_year and current.model_version = r.model_version;
      insert into public.rice_yield_predictions(dashboard_version_id,province_id,crop_start_year,crop_year,actual_yield,predicted_yield,residual,absolute_error,percentage_error,model_version,source_import_file_id)
        select p_id,r.province_id,r.crop_start_year,r.crop_year,r.actual_yield,r.predicted_yield,r.residual,r.absolute_error,r.percentage_error,r.model_version,import_file_id from jsonb_populate_recordset(null::public.rice_yield_predictions, p_rows) r
        on conflict (dashboard_version_id,province_id,crop_start_year,model_version)
        do update set crop_year = excluded.crop_year,actual_yield = excluded.actual_yield,predicted_yield = excluded.predicted_yield,residual = excluded.residual,absolute_error = excluded.absolute_error,percentage_error = excluded.percentage_error,source_import_file_id = excluded.source_import_file_id;
  end case;

  update public.rice_dashboard_versions set revision = revision + 1, updated_at = now()
    where id = p_id returning * into v;
  insert into public.rice_dashboard_events(version_id,actor_id,actor_name,action,summary,details)
    values(p_id,auth.uid(),coalesce(auth.jwt()->>'email','ผู้ดูแล'),'import','นำเข้าข้อมูล CSV สำเร็จ',
      jsonb_build_object('datasetType',p_dataset,'fileName',left(p_file_name,255),'importFileId',import_file_id,
        'importedRows',total_count,'inserts',total_count-updated_count,'updates',updated_count,'revision',v.revision));
  return jsonb_build_object('version',to_jsonb(v),'importFileId',import_file_id,'importedRows',total_count,
    'inserts',total_count-updated_count,'updates',updated_count);
end $$;

-- A row edited by hand stops belonging to the uploaded file, preventing a
-- later file deletion from discarding intentional manual changes.
create or replace function public.rice_dashboard_update_record(
  p_id uuid, p_dataset text, p_record_id bigint, p_row jsonb, p_revision bigint
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v public.rice_dashboard_versions; table_name text; key_columns text[];
  editable_columns text[]; assignments text; field_name text; before_row jsonb; after_row jsonb;
begin
  if not coalesce(public.is_admin(), false) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  select * into v from public.rice_dashboard_versions where id = p_id for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  if p_revision is null or v.revision <> p_revision then raise exception 'VERSION_CHANGED'; end if;
  if v.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if p_row is null or jsonb_typeof(p_row) <> 'object' then raise exception 'INVALID_ROW'; end if;
  case p_dataset
    when 'yearly-yield' then table_name := 'rice_yield_yearly'; key_columns := array['province_id','crop_start_year']; editable_columns := array['crop_year','actual_yield','yield_per_harvested_rai','production_ton','harvested_area_rai','planted_area_rai'];
    when 'monthly-environment' then table_name := 'rice_environment_monthly'; key_columns := array['province_id','year','month']; editable_columns := array['temperature_mean_c','dewpoint_mean_c','soil_moisture_mean','rainfall_total_mm','evaporation_total_mm','solar_total_mj_m2','ndvi_mean','ndvi_median','ndvi_std','ndvi_min','ndvi_max','rice_valid_ratio_mean','rice_ndvi_imputed','rice_ndvi_structural_missing','rice_ndvi_final_quality','grid_cell_count'];
    when 'yield-predictions' then table_name := 'rice_yield_predictions'; key_columns := array['province_id','crop_start_year','model_version']; editable_columns := array['crop_year','actual_yield','predicted_yield','residual','absolute_error','percentage_error'];
    else raise exception 'INVALID_DATASET';
  end case;
  if not (p_row ?& (key_columns || editable_columns)) then raise exception 'INVALID_ROW'; end if;
  for field_name in select jsonb_object_keys(p_row) loop
    if not (field_name = any(key_columns || editable_columns)) then raise exception 'INVALID_ROW'; end if;
  end loop;
  execute format('select to_jsonb(d) from public.%I d where id = $1 and dashboard_version_id = $2 for update',table_name) into before_row using p_record_id,p_id;
  if before_row is null then raise exception 'RECORD_NOT_FOUND'; end if;
  foreach field_name in array key_columns loop
    if p_row->field_name is distinct from before_row->field_name then raise exception 'RECORD_KEY_CHANGED'; end if;
  end loop;
  select string_agg(format('%1$I = edited.%1$I',name), ', ') || ', source_import_file_id = null' into assignments from unnest(editable_columns) name;
  execute format('update public.%1$I original set %2$s from jsonb_populate_record(null::public.%1$I, $1) edited where original.id = $2 and original.dashboard_version_id = $3 returning to_jsonb(original)',table_name,assignments) into after_row using p_row,p_record_id,p_id;
  update public.rice_dashboard_versions set revision = revision + 1, updated_at = now() where id = p_id returning * into v;
  insert into public.rice_dashboard_events(version_id,actor_id,actor_name,action,summary,details)
    values(p_id,auth.uid(),coalesce(auth.jwt()->>'email','ผู้ดูแล'),'edit-row','แก้ไขข้อมูลรายแถว',jsonb_build_object('datasetType',p_dataset,'recordId',p_record_id,'before',before_row,'after',after_row,'revision',v.revision));
  return jsonb_build_object('version',to_jsonb(v),'row',after_row);
end $$;

create or replace function public.rice_dashboard_delete_import_file(
  p_id uuid, p_import_file_id uuid, p_revision bigint
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v public.rice_dashboard_versions; f public.rice_dashboard_import_files; table_name text; deleted_count integer;
begin
  if not coalesce(public.is_admin(), false) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  select * into v from public.rice_dashboard_versions where id = p_id for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  if v.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if p_revision is null or v.revision <> p_revision then raise exception 'VERSION_CHANGED'; end if;
  select * into f from public.rice_dashboard_import_files where id = p_import_file_id and version_id = p_id for update;
  if not found then raise exception 'IMPORT_FILE_NOT_FOUND'; end if;
  case f.dataset_type
    when 'yearly-yield' then table_name := 'rice_yield_yearly';
    when 'monthly-environment' then table_name := 'rice_environment_monthly';
    when 'yield-predictions' then table_name := 'rice_yield_predictions';
    else raise exception 'INVALID_DATASET';
  end case;
  execute format('delete from public.%I where dashboard_version_id = $1 and source_import_file_id = $2',table_name) using p_id,p_import_file_id;
  get diagnostics deleted_count = row_count;
  delete from public.rice_dashboard_import_files where id = p_import_file_id;
  update public.rice_dashboard_versions set revision = revision + 1, updated_at = now() where id = p_id returning * into v;
  insert into public.rice_dashboard_events(version_id,actor_id,actor_name,action,summary,details)
    values(p_id,auth.uid(),coalesce(auth.jwt()->>'email','ผู้ดูแล'),'delete-import-file','ลบไฟล์ที่นำเข้าออกจากฉบับร่าง',jsonb_build_object('importFileId',p_import_file_id,'fileName',f.file_name,'datasetType',f.dataset_type,'deletedRows',deleted_count,'revision',v.revision));
  return jsonb_build_object('version',to_jsonb(v),'fileName',f.file_name,'datasetType',f.dataset_type,'deletedRows',deleted_count);
end $$;

create or replace function public.rice_dashboard_list_import_files(p_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not coalesce(public.is_admin(), false) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  if not exists(select 1 from public.rice_dashboard_versions where id = p_id) then raise exception 'VERSION_NOT_FOUND'; end if;
  with source_counts as (
    select source_import_file_id as file_id, count(*)::integer as row_count from public.rice_yield_yearly where dashboard_version_id = p_id and source_import_file_id is not null group by source_import_file_id
    union all
    select source_import_file_id, count(*)::integer from public.rice_environment_monthly where dashboard_version_id = p_id and source_import_file_id is not null group by source_import_file_id
    union all
    select source_import_file_id, count(*)::integer from public.rice_yield_predictions where dashboard_version_id = p_id and source_import_file_id is not null group by source_import_file_id
  ), current_counts as (
    select file_id, sum(row_count)::integer as row_count from source_counts group by file_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,'version_id',f.version_id,'dataset_type',f.dataset_type,'file_name',f.file_name,
    'original_row_count',f.original_row_count,'current_row_count',coalesce(c.row_count,0),'created_at',f.created_at
  ) order by f.created_at desc, f.id), '[]'::jsonb)
  into result
  from public.rice_dashboard_import_files f
  left join current_counts c on c.file_id = f.id
  where f.version_id = p_id;
  return result;
end $$;

revoke all on function public.rice_dashboard_delete_import_file(uuid,uuid,bigint) from public;
revoke all on function public.rice_dashboard_list_import_files(uuid) from public;
grant execute on function public.rice_dashboard_delete_import_file(uuid,uuid,bigint) to authenticated;
grant execute on function public.rice_dashboard_list_import_files(uuid) to authenticated;
