-- Complete the version lifecycle for governed agricultural datasets.
-- Published/default versions stay protected; deleted versions leave an audit tombstone.

alter table public.agricultural_dataset_events
  drop constraint if exists agricultural_dataset_events_action_check;
alter table public.agricultural_dataset_events
  add constraint agricultural_dataset_events_action_check check (
    action in (
      'create', 'edit', 'import', 'publish', 'unpublish',
      'archive', 'restore', 'set_default', 'delete'
    )
  );

create table if not exists public.agricultural_dataset_deleted_versions (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null,
  dataset_type text not null check (
    dataset_type in ('rice_price', 'flood', 'drought', 'storm')
  ),
  version_key text not null,
  label text not null,
  snapshot jsonb not null,
  record_count bigint not null default 0,
  import_file_count bigint not null default 0,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_by_name text not null,
  deleted_at timestamptz not null default now()
);

create index if not exists agricultural_dataset_deleted_versions_time_idx
  on public.agricultural_dataset_deleted_versions (deleted_at desc, dataset_type);

alter table public.agricultural_dataset_deleted_versions enable row level security;

drop policy if exists "Admins read deleted agricultural versions"
  on public.agricultural_dataset_deleted_versions;
create policy "Admins read deleted agricultural versions"
  on public.agricultural_dataset_deleted_versions for select to authenticated
  using ((select public.is_admin()));

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
  if p_action not in (
    'edit', 'publish', 'publish-default', 'default',
    'unpublish', 'archive', 'restore'
  ) then
    raise exception 'INVALID_ACTION';
  end if;
  if p_action in ('publish-default', 'default')
    and not coalesce(public.is_superadmin(), false) then
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

  if p_action = 'edit' then
    if p_label is null or char_length(trim(p_label)) not between 2 and 120 then
      raise exception 'INVALID_VERSION_DETAILS';
    end if;
  end if;
  if p_action in ('publish', 'publish-default') and version.status <> 'draft' then
    raise exception 'DRAFT_REQUIRED';
  end if;
  if p_action = 'unpublish' and version.status <> 'published' then
    raise exception 'PUBLISHED_REQUIRED';
  end if;
  if p_action = 'unpublish' and version.is_default then
    raise exception 'DEFAULT_PROTECTED';
  end if;
  if p_action = 'restore' and version.status <> 'archived' then
    raise exception 'ARCHIVED_REQUIRED';
  end if;
  if p_action = 'default' and version.status <> 'published' then
    raise exception 'PUBLISHED_REQUIRED';
  end if;
  if p_action = 'archive' and version.is_default then
    raise exception 'DEFAULT_PROTECTED';
  end if;

  if p_action in ('publish', 'publish-default')
    or (p_action = 'restore' and version.published_at is not null) then
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
    if coalesce(row_count, 0) = 0 then raise exception 'DATA_REQUIRED'; end if;
  end if;

  if p_action in ('publish-default', 'default') then
    update public.agricultural_dataset_versions
    set is_default = false, revision = revision + 1, updated_at = now()
    where dataset_type = version.dataset_type and is_default and id <> p_id;
  end if;

  update public.agricultural_dataset_versions set
    label = case when p_action = 'edit' then trim(p_label) else label end,
    description = case when p_action = 'edit' then coalesce(trim(p_description), '') else description end,
    source_name = case when p_action = 'edit' then coalesce(trim(p_source_name), '') else source_name end,
    source_url = case when p_action = 'edit' then nullif(trim(p_source_url), '') else source_url end,
    status = case
      when p_action in ('publish', 'publish-default') then 'published'
      when p_action = 'unpublish' then 'draft'
      when p_action = 'archive' then 'archived'
      when p_action = 'restore' and published_at is null then 'draft'
      when p_action = 'restore' then 'published'
      else status
    end,
    is_default = case
      when p_action in ('publish-default', 'default') then true
      when p_action = 'unpublish' then false
      else is_default
    end,
    published_at = case
      when p_action in ('publish', 'publish-default') then now()
      when p_action = 'unpublish' then null
      else published_at
    end,
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
    case p_action
      when 'publish-default' then 'publish'
      when 'default' then 'set_default'
      else p_action
    end,
    case p_action
      when 'edit' then 'แก้ไขรายละเอียดเวอร์ชัน'
      when 'publish' then 'เผยแพร่ชุดข้อมูล'
      when 'publish-default' then 'เผยแพร่และกำหนดเป็นค่าเริ่มต้น'
      when 'default' then 'กำหนดเป็นชุดข้อมูลเริ่มต้น'
      when 'unpublish' then 'ปิดการเผยแพร่เพื่อแก้ไขข้อมูล'
      when 'archive' then 'เก็บชุดข้อมูลเข้าคลัง'
      else 'คืนชุดข้อมูลจากคลัง'
    end,
    to_jsonb(previous),
    to_jsonb(version)
  );
  return to_jsonb(version);
end;
$$;

create or replace function public.agricultural_dataset_delete_version(
  p_id uuid,
  p_revision bigint
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  version public.agricultural_dataset_versions;
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
  if version.status = 'published' then
    raise exception 'PUBLISHED_DELETE_PROTECTED';
  end if;
  if version.is_default then
    raise exception 'DEFAULT_PROTECTED';
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
    'deleted_rows', row_count
  );
end;
$$;

revoke all on function public.agricultural_dataset_change_version(uuid, text, bigint, text, text, text, text) from public;
revoke all on function public.agricultural_dataset_delete_version(uuid, bigint) from public;
grant execute on function public.agricultural_dataset_change_version(uuid, text, bigint, text, text, text, text) to authenticated;
grant execute on function public.agricultural_dataset_delete_version(uuid, bigint) to authenticated;
