-- Allow an explicitly confirmed version deletion from every lifecycle state.
-- A default version can only be deleted when a super admin atomically selects
-- another published version of the same dataset as its replacement.

create or replace function public.agricultural_dataset_delete_version_v2(
  p_id uuid,
  p_revision bigint,
  p_replacement_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  version public.agricultural_dataset_versions;
  replacement public.agricultural_dataset_versions;
  previous_replacement public.agricultural_dataset_versions;
  row_count bigint := 0;
  import_count bigint := 0;
begin
  if not coalesce(public.is_admin(), false) then
    raise insufficient_privilege using message = 'ADMIN_REQUIRED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(824118);
  select * into version
  from public.agricultural_dataset_versions
  where id = p_id for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  if p_revision is null or version.revision <> p_revision then
    raise exception 'VERSION_CHANGED';
  end if;

  if version.is_default then
    if not coalesce(public.is_superadmin(), false) then
      raise insufficient_privilege using message = 'SUPERADMIN_REQUIRED';
    end if;
    if p_replacement_id is null or p_replacement_id = p_id then
      raise exception 'REPLACEMENT_REQUIRED';
    end if;
    select * into replacement
    from public.agricultural_dataset_versions
    where id = p_replacement_id for update;
    if not found
      or replacement.dataset_type <> version.dataset_type
      or replacement.status <> 'published' then
      raise exception 'INVALID_REPLACEMENT';
    end if;

    previous_replacement := replacement;

    -- Clear the current default before promoting its replacement. Both writes
    -- happen in this transaction, so readers only observe the old complete
    -- state or the new complete state, while the partial unique index is never
    -- asked to contain two defaults for the same dataset type.
    update public.agricultural_dataset_versions
    set is_default = false, updated_at = now()
    where id = version.id;

    update public.agricultural_dataset_versions
    set is_default = true, revision = revision + 1, updated_at = now()
    where id = replacement.id
    returning * into replacement;

    insert into public.agricultural_dataset_events (
      version_id, actor_id, actor_name, action, summary, old_value, new_value,
      details
    ) values (
      replacement.id,
      auth.uid(),
      coalesce(auth.jwt() ->> 'email', 'ผู้ดูแล'),
      'set_default',
      'กำหนดเป็นชุดข้อมูลเริ่มต้นแทนเวอร์ชันที่ลบ',
      to_jsonb(previous_replacement),
      to_jsonb(replacement),
      jsonb_build_object(
        'deleted_version_id', version.id,
        'deleted_version_key', version.version_key
      )
    );
  end if;

  case version.dataset_type
    when 'rice_price' then
      select count(*) into row_count from public.rice_price_series where version_id = p_id;
    when 'flood' then
      select count(*) into row_count from public.flood_records where version_id = p_id;
    when 'drought' then
      select count(*) into row_count from public.drought_records where version_id = p_id;
    when 'storm' then
      select count(*) into row_count from public.storm_records where version_id = p_id;
  end case;
  select count(*) into import_count
  from public.agricultural_import_files where version_id = p_id;

  insert into public.agricultural_dataset_deleted_versions (
    version_id, dataset_type, version_key, label, snapshot,
    record_count, import_file_count, deleted_by, deleted_by_name
  ) values (
    version.id, version.dataset_type, version.version_key, version.label,
    to_jsonb(version), row_count, import_count, auth.uid(),
    coalesce(auth.jwt() ->> 'email', 'ผู้ดูแล')
  );

  delete from public.agricultural_dataset_events where version_id = p_id;
  delete from public.agricultural_dataset_versions where id = p_id;

  return jsonb_build_object(
    'id', version.id,
    'dataset_type', version.dataset_type,
    'version_key', version.version_key,
    'deleted_rows', row_count,
    'replacement_id', replacement.id
  );
end;
$$;

revoke all on function public.agricultural_dataset_delete_version_v2(uuid, bigint, uuid) from public;
grant execute on function public.agricultural_dataset_delete_version_v2(uuid, bigint, uuid) to authenticated;
