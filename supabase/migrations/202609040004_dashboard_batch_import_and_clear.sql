-- Batch import uses the existing single-file validator/importer inside one transaction.
create or replace function public.rice_dashboard_import_batch(
  p_id uuid,
  p_items jsonb,
  p_revision bigint
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  dataset text;
  file_name text;
  item_result jsonb;
  results jsonb := '[]'::jsonb;
  current_revision bigint := p_revision;
  seen_datasets text[] := '{}';
begin
  if not coalesce(public.is_admin(), false) then
    raise insufficient_privilege using message = 'ADMIN_REQUIRED';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 3 then
    raise exception 'INVALID_BATCH';
  end if;

  for item in select value from jsonb_array_elements(p_items) loop
    dataset := item ->> 'datasetType';
    if dataset not in ('yearly-yield', 'monthly-environment', 'yield-predictions')
      or dataset = any(seen_datasets) then
      raise exception 'INVALID_BATCH';
    end if;
    if item -> 'rows' is null or jsonb_typeof(item -> 'rows') <> 'array' then
      raise exception 'INVALID_ROWS';
    end if;

    file_name := left(coalesce(nullif(item ->> 'fileName', ''), 'import.csv'), 255);
    item_result := public.rice_dashboard_import(
      p_id,
      dataset,
      item -> 'rows',
      current_revision,
      file_name
    );
    results := results || jsonb_build_array(item_result);
    current_revision := current_revision + 1;
    seen_datasets := array_append(seen_datasets, dataset);
  end loop;

  return jsonb_build_object('imports', results);
end;
$$;

create or replace function public.rice_dashboard_clear_dataset(
  p_id uuid,
  p_dataset text,
  p_revision bigint
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v public.rice_dashboard_versions;
  table_name text;
  dataset_label text;
  deleted_count integer;
begin
  if not coalesce(public.is_admin(), false) then
    raise insufficient_privilege using message = 'ADMIN_REQUIRED';
  end if;

  select * into v from public.rice_dashboard_versions where id = p_id for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  if v.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if p_revision is null or v.revision <> p_revision then raise exception 'VERSION_CHANGED'; end if;

  case p_dataset
    when 'yearly-yield' then
      table_name := 'rice_yield_yearly'; dataset_label := 'ผลผลิตข้าวรายปี';
    when 'monthly-environment' then
      table_name := 'rice_environment_monthly'; dataset_label := 'สภาพแวดล้อมรายเดือน';
    when 'yield-predictions' then
      table_name := 'rice_yield_predictions'; dataset_label := 'ผลพยากรณ์ผลผลิต';
    else
      raise exception 'INVALID_DATASET';
  end case;

  execute format('delete from public.%I where dashboard_version_id = $1', table_name)
    using p_id;
  get diagnostics deleted_count = row_count;

  update public.rice_dashboard_versions
    set revision = revision + 1, updated_at = now()
    where id = p_id returning * into v;

  insert into public.rice_dashboard_events(
    version_id, actor_id, actor_name, action, summary, details
  ) values (
    p_id,
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', 'ผู้ดูแล'),
    'clear-dataset',
    'ลบข้อมูลทั้งหมวดจากฉบับร่าง',
    jsonb_build_object(
      'datasetType', p_dataset,
      'datasetLabel', dataset_label,
      'deletedRows', deleted_count,
      'revision', v.revision
    )
  );

  return jsonb_build_object(
    'version', to_jsonb(v),
    'deletedRows', deleted_count,
    'datasetType', p_dataset
  );
end;
$$;

create or replace function public.rice_dashboard_delete_record(
  p_id uuid,
  p_dataset text,
  p_record_id bigint,
  p_revision bigint
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v public.rice_dashboard_versions;
  table_name text;
  deleted_row jsonb;
begin
  if not coalesce(public.is_admin(), false) then
    raise insufficient_privilege using message = 'ADMIN_REQUIRED';
  end if;

  select * into v from public.rice_dashboard_versions where id = p_id for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  if v.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if p_revision is null or v.revision <> p_revision then raise exception 'VERSION_CHANGED'; end if;

  case p_dataset
    when 'yearly-yield' then table_name := 'rice_yield_yearly';
    when 'monthly-environment' then table_name := 'rice_environment_monthly';
    when 'yield-predictions' then table_name := 'rice_yield_predictions';
    else raise exception 'INVALID_DATASET';
  end case;

  execute format(
    'delete from public.%I as d where d.id = $1 and d.dashboard_version_id = $2 returning to_jsonb(d)',
    table_name
  ) into deleted_row using p_record_id, p_id;
  if deleted_row is null then raise exception 'RECORD_NOT_FOUND'; end if;

  update public.rice_dashboard_versions
    set revision = revision + 1, updated_at = now()
    where id = p_id returning * into v;

  insert into public.rice_dashboard_events(
    version_id, actor_id, actor_name, action, summary, details
  ) values (
    p_id,
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', 'ผู้ดูแล'),
    'delete-row',
    'ลบข้อมูลรายแถวจากฉบับร่าง',
    jsonb_build_object(
      'datasetType', p_dataset,
      'recordId', p_record_id,
      'deletedRow', deleted_row,
      'revision', v.revision
    )
  );

  return jsonb_build_object('version', to_jsonb(v), 'deletedRow', deleted_row);
end;
$$;

revoke all on function public.rice_dashboard_import_batch(uuid, jsonb, bigint) from public;
revoke all on function public.rice_dashboard_clear_dataset(uuid, text, bigint) from public;
revoke all on function public.rice_dashboard_delete_record(uuid, text, bigint, bigint) from public;
grant execute on function public.rice_dashboard_import_batch(uuid, jsonb, bigint) to authenticated;
grant execute on function public.rice_dashboard_clear_dataset(uuid, text, bigint) to authenticated;
grant execute on function public.rice_dashboard_delete_record(uuid, text, bigint, bigint) to authenticated;
