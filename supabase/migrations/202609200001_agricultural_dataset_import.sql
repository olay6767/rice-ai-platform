-- Atomic Admin upload for the existing governed agricultural datasets.
-- Reuses all tables introduced by 202609190003; no duplicate schema is created.
create or replace function public.agricultural_dataset_import(
  p_id uuid,
  p_dataset_type text,
  p_rows jsonb,
  p_revision bigint,
  p_file_name text,
  p_file_type text,
  p_validation jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  version public.agricultural_dataset_versions;
  imported_count integer;
begin
  if not coalesce(public.is_admin(), false) then
    raise insufficient_privilege using message = 'ADMIN_REQUIRED';
  end if;
  if p_dataset_type not in ('rice_price', 'flood', 'drought', 'storm') then
    raise exception 'INVALID_DATASET_TYPE';
  end if;
  if p_file_type not in ('csv', 'xlsx', 'json') then
    raise exception 'INVALID_FILE_TYPE';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'DATA_REQUIRED';
  end if;
  if jsonb_array_length(p_rows) > 20000 then
    raise exception 'ROW_LIMIT_EXCEEDED';
  end if;

  if p_file_name is null or btrim(p_file_name) = '' then
    raise exception 'INVALID_FILE_NAME';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 901205));
  select * into version
  from public.agricultural_dataset_versions
  where id = p_id and dataset_type = p_dataset_type
  for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  if version.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if p_revision is null or version.revision <> p_revision then
    raise exception 'VERSION_CHANGED';
  end if;

  case p_dataset_type
    when 'rice_price' then
      delete from public.rice_price_series where version_id = p_id;
      insert into public.rice_price_series (
        version_id, observed_on, year, month, rice_type, rice_type_code,
        price, unit, data_type, source, is_imputed, model_name,
        model_version, forecast_date, reliability, reliability_label, metadata
      )
      select
        p_id, row.observed_on, row.year, row.month, row.rice_type,
        row.rice_type_code, row.price, coalesce(row.unit, 'บาท/ตัน'),
        coalesce(row.data_type, 'actual'), coalesce(row.source, ''),
        coalesce(row.is_imputed, false), row.model_name, row.model_version,
        row.forecast_date, row.reliability, row.reliability_label,
        coalesce(row.metadata, '{}'::jsonb)
      from jsonb_to_recordset(p_rows) as row(
        observed_on date, year integer, month integer, rice_type text,
        rice_type_code text, price numeric, unit text, data_type text,
        source text, is_imputed boolean, model_name text, model_version text,
        forecast_date date, reliability numeric, reliability_label text,
        metadata jsonb
      );
    when 'flood' then
      delete from public.flood_records where version_id = p_id;
      insert into public.flood_records (
        version_id, year, month, province_id, flood_events,
        affected_area_rai, affected_households, affected_people,
        agricultural_damage_rai, source
      )
      select
        p_id, row.year, row.month, row.province_id, row.flood_events,
        row.affected_area_rai, row.affected_households, row.affected_people,
        row.agricultural_damage_rai, coalesce(row.source, '')
      from jsonb_to_recordset(p_rows) as row(
        year integer, month integer, province_id integer, flood_events integer,
        affected_area_rai numeric, affected_households integer,
        affected_people integer, agricultural_damage_rai numeric, source text
      );
    when 'drought' then
      delete from public.drought_records where version_id = p_id;
      insert into public.drought_records (
        version_id, year, month, province_id, drought_events,
        affected_area_rai, affected_households, agricultural_damage_rai, source
      )
      select
        p_id, row.year, row.month, row.province_id, row.drought_events,
        row.affected_area_rai, row.affected_households,
        row.agricultural_damage_rai, coalesce(row.source, '')
      from jsonb_to_recordset(p_rows) as row(
        year integer, month integer, province_id integer, drought_events integer,
        affected_area_rai numeric, affected_households integer,
        agricultural_damage_rai numeric, source text
      );
    when 'storm' then
      delete from public.storm_records where version_id = p_id;
      insert into public.storm_records (
        version_id, occurred_on, year, month, province_id, storm_type,
        storm_events, affected_people, affected_households, damaged_houses,
        agricultural_damage_rai, source
      )
      select
        p_id, row.occurred_on, row.year, row.month, row.province_id,
        coalesce(row.storm_type, ''), row.storm_events, row.affected_people,
        row.affected_households, row.damaged_houses,
        row.agricultural_damage_rai, coalesce(row.source, '')
      from jsonb_to_recordset(p_rows) as row(
        occurred_on date, year integer, month integer, province_id integer,
        storm_type text, storm_events integer, affected_people integer,
        affected_households integer, damaged_houses integer,
        agricultural_damage_rai numeric, source text
      );
  end case;

  imported_count := jsonb_array_length(p_rows);
  insert into public.agricultural_import_files (
    version_id, dataset_type, file_name, file_type, source_name, source_url,
    row_count, validation_summary, imported_by
  ) values (
    p_id, p_dataset_type, left(trim(p_file_name), 255), p_file_type,
    version.source_name, version.source_url, imported_count,
    coalesce(p_validation, '{}'::jsonb), auth.uid()
  );

  update public.agricultural_dataset_versions
  set file_name = left(trim(p_file_name), 255), imported_at = now(),
      imported_by = auth.uid(), revision = revision + 1, updated_at = now()
  where id = p_id
  returning * into version;

  insert into public.agricultural_dataset_events (
    version_id, actor_id, actor_name, action, summary, new_value, details
  ) values (
    p_id, auth.uid(), coalesce(auth.jwt() ->> 'email', 'ผู้ดูแล'), 'import',
    'นำเข้าข้อมูล ' || imported_count::text || ' แถวเป็นฉบับร่าง',
    coalesce(p_validation, '{}'::jsonb),
    jsonb_build_object('fileName', p_file_name, 'fileType', p_file_type)
  );

  return jsonb_build_object(
    'importedRows', imported_count,
    'revision', version.revision,
    'versionId', version.id
  );
end;
$$;

revoke all on function public.agricultural_dataset_import(uuid, text, jsonb, bigint, text, text, jsonb) from public;
grant execute on function public.agricultural_dataset_import(uuid, text, jsonb, bigint, text, text, jsonb) to authenticated;
