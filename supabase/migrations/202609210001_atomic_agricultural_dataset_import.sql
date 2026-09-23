-- Replace one draft dataset atomically after a validated file preview.
alter table public.agricultural_import_files
  drop constraint if exists agricultural_import_files_file_type_check;
alter table public.agricultural_import_files
  add constraint agricultural_import_files_file_type_check
  check (file_type in ('csv', 'json', 'xlsx', 'xls'));

create or replace function public.agricultural_dataset_import(
  p_id uuid,
  p_dataset_type text,
  p_revision bigint,
  p_rows jsonb,
  p_file_name text,
  p_file_type text,
  p_validation_summary jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  version public.agricultural_dataset_versions;
  table_name text;
  column_list text;
  prior_count bigint;
  imported_count bigint;
begin
  if not coalesce(public.is_admin(), false) then
    raise insufficient_privilege using message = 'ADMIN_REQUIRED';
  end if;
  if p_dataset_type not in ('rice_price', 'flood', 'drought', 'storm') then
    raise exception 'INVALID_DATASET_TYPE';
  end if;
  if p_file_type not in ('csv', 'json', 'xlsx', 'xls') or
     nullif(trim(p_file_name), '') is null or length(p_file_name) > 255 then
    raise exception 'INVALID_FILE';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or
     jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 20000 then
    raise exception 'INVALID_ROWS';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(824118);
  select * into version from public.agricultural_dataset_versions
    where id = p_id for update;
  if not found or version.dataset_type <> p_dataset_type then
    raise exception 'VERSION_NOT_FOUND';
  end if;
  if version.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if version.revision <> p_revision then raise exception 'VERSION_CHANGED'; end if;

  table_name := case p_dataset_type
    when 'rice_price' then 'rice_price_series'
    when 'flood' then 'flood_records'
    when 'drought' then 'drought_records'
    else 'storm_records' end;

  select pg_catalog.string_agg(pg_catalog.quote_ident(attname), ', ' order by attnum)
    into column_list
    from pg_catalog.pg_attribute
    where attrelid = pg_catalog.format('public.%I', table_name)::pg_catalog.regclass
      and attnum > 0 and not attisdropped
      and attname not in ('id', 'version_id', 'created_at', 'updated_at');

  execute pg_catalog.format('select count(*) from public.%I where version_id = $1', table_name)
    into prior_count using p_id;
  execute pg_catalog.format('delete from public.%I where version_id = $1', table_name)
    using p_id;
  execute pg_catalog.format(
    'insert into public.%1$I (version_id, %2$s) select $1, %2$s from pg_catalog.jsonb_populate_recordset(null::public.%1$I, $2)',
    table_name, column_list
  ) using p_id, p_rows;
  get diagnostics imported_count = row_count;

  update public.agricultural_dataset_versions
    set revision = revision + 1, updated_at = now()
    where id = p_id;

  insert into public.agricultural_import_files
    (version_id, dataset_type, file_name, file_type, source_name, source_url,
     row_count, validation_summary, imported_by)
    values (p_id, p_dataset_type, p_file_name, p_file_type,
      version.source_name, version.source_url, imported_count,
      coalesce(p_validation_summary, '{}'::jsonb), auth.uid());
  insert into public.agricultural_dataset_events
    (version_id, actor_id, actor_name, action, summary, old_value, new_value)
    values (p_id, auth.uid(), coalesce(auth.jwt() ->> 'email', 'ผู้ดูแล'),
      'import', 'นำเข้าไฟล์ข้อมูลฉบับร่าง',
      pg_catalog.jsonb_build_object('row_count', prior_count),
      pg_catalog.jsonb_build_object('row_count', imported_count, 'file_name', p_file_name));

  return pg_catalog.jsonb_build_object('importedRows', imported_count, 'replacedRows', prior_count);
end;
$$;
revoke all on function public.agricultural_dataset_import(uuid,text,bigint,jsonb,text,text,jsonb) from public;
grant execute on function public.agricultural_dataset_import(uuid,text,bigint,jsonb,text,text,jsonb) to authenticated;
