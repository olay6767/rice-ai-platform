-- Add explicit unpublishing and audited row editing. Existing data stays unchanged.
create function public.rice_dashboard_unpublish_version(
  p_id uuid, p_revision bigint, p_replacement_id uuid default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v public.rice_dashboard_versions; replacement public.rice_dashboard_versions;
  before_version jsonb;
begin
  if not coalesce(public.is_admin(), false) then raise insufficient_privilege using message = 'ADMIN_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(824117);
  select * into v from public.rice_dashboard_versions where id = p_id for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  if p_revision is null or v.revision <> p_revision then raise exception 'VERSION_CHANGED'; end if;
  if v.status <> 'published' then raise exception 'PUBLISHED_REQUIRED'; end if;
  before_version := to_jsonb(v);
  if v.is_default and exists(select 1 from public.rice_dashboard_versions where status = 'published' and id <> p_id) then
    if p_replacement_id is null or p_replacement_id = p_id then raise exception 'REPLACEMENT_REQUIRED'; end if;
    select * into replacement from public.rice_dashboard_versions where id = p_replacement_id for update;
    if not found or replacement.status <> 'published' then raise exception 'REPLACEMENT_REQUIRED'; end if;
    -- Reuse the existing publication checks and atomic default handover.
    perform public.rice_dashboard_change_version(replacement.id, 'default', replacement.revision);
  elsif p_replacement_id is not null then
    raise exception 'INVALID_REPLACEMENT';
  end if;
  -- Clearing published_at keeps archive/restore from republishing an edited draft.
  -- The previous publication date remains in the audit record.
  update public.rice_dashboard_versions set status = 'draft', is_default = false,
    published_at = null, revision = revision + 1, updated_at = now()
    where id = p_id returning * into v;
  insert into public.rice_dashboard_events(version_id,actor_id,actor_name,action,summary,details)
    values(p_id,auth.uid(),coalesce(auth.jwt()->>'email','ผู้ดูแล'),'unpublish',
      'ปิดการเผยแพร่และคืนเป็นฉบับร่างเพื่อแก้ไข',
      jsonb_build_object('before',before_version,'replacementVersionId',p_replacement_id,'revision',v.revision));
  return to_jsonb(v);
end $$;

create function public.rice_dashboard_update_record(
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
    when 'yearly-yield' then
      table_name := 'rice_yield_yearly'; key_columns := array['province_id','crop_start_year'];
      editable_columns := array['crop_year','actual_yield','yield_per_harvested_rai','production_ton','harvested_area_rai','planted_area_rai'];
    when 'monthly-environment' then
      table_name := 'rice_environment_monthly'; key_columns := array['province_id','year','month'];
      editable_columns := array['temperature_mean_c','dewpoint_mean_c','soil_moisture_mean','rainfall_total_mm','evaporation_total_mm','solar_total_mj_m2','ndvi_mean','ndvi_median','ndvi_std','ndvi_min','ndvi_max','rice_valid_ratio_mean','rice_ndvi_imputed','rice_ndvi_structural_missing','rice_ndvi_final_quality','grid_cell_count'];
    when 'yield-predictions' then
      table_name := 'rice_yield_predictions'; key_columns := array['province_id','crop_start_year','model_version'];
      editable_columns := array['crop_year','actual_yield','predicted_yield','residual','absolute_error','percentage_error'];
    else raise exception 'INVALID_DATASET';
  end case;
  if not (p_row ?& (key_columns || editable_columns)) then raise exception 'INVALID_ROW'; end if;
  for field_name in select jsonb_object_keys(p_row) loop
    if not (field_name = any(key_columns || editable_columns)) then raise exception 'INVALID_ROW'; end if;
  end loop;
  execute format('select to_jsonb(d) from public.%I d where id = $1 and dashboard_version_id = $2 for update',table_name)
    into before_row using p_record_id,p_id;
  if before_row is null then raise exception 'RECORD_NOT_FOUND'; end if;
  foreach field_name in array key_columns loop
    if p_row->field_name is distinct from before_row->field_name then raise exception 'RECORD_KEY_CHANGED'; end if;
  end loop;
  -- Only whitelisted table/column identifiers enter SQL. All user values are bound.
  select string_agg(format('%1$I = edited.%1$I',name), ', ') into assignments from unnest(editable_columns) name;
  execute format('update public.%1$I original set %2$s from jsonb_populate_record(null::public.%1$I, $1) edited where original.id = $2 and original.dashboard_version_id = $3 returning to_jsonb(original)',table_name,assignments)
    into after_row using p_row,p_record_id,p_id;
  update public.rice_dashboard_versions set revision = revision + 1, updated_at = now()
    where id = p_id returning * into v;
  insert into public.rice_dashboard_events(version_id,actor_id,actor_name,action,summary,details)
    values(p_id,auth.uid(),coalesce(auth.jwt()->>'email','ผู้ดูแล'),'edit-row','แก้ไขข้อมูลรายแถว',
      jsonb_build_object('datasetType',p_dataset,'recordId',p_record_id,
        'before',before_row,'after',after_row,'revision',v.revision));
  return jsonb_build_object('version',to_jsonb(v),'row',after_row);
end $$;

revoke all on function public.rice_dashboard_unpublish_version(uuid,bigint,uuid) from public;
revoke all on function public.rice_dashboard_update_record(uuid,text,bigint,jsonb,bigint) from public;
grant execute on function public.rice_dashboard_unpublish_version(uuid,bigint,uuid) to authenticated;
grant execute on function public.rice_dashboard_update_record(uuid,text,bigint,jsonb,bigint) to authenticated;

-- If every version is hidden, the first republished version becomes the default.
-- This runs inside the existing lifecycle transaction/advisory lock.
create function public.rice_dashboard_first_published_default()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'published' and old.status <> 'published'
    and not exists(select 1 from public.rice_dashboard_versions where is_default and id <> new.id) then
    new.is_default := true;
  end if;
  return new;
end $$;
create trigger rice_dashboard_first_published_default
  before update on public.rice_dashboard_versions
  for each row execute function public.rice_dashboard_first_published_default();
