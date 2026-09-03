-- Allow an administrator to permanently remove a non-public Dashboard version.
-- The version payload and deletion metadata remain in a separate audit table.
create table if not exists public.rice_dashboard_deleted_versions (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null,
  version_key text not null,
  label text not null,
  revision bigint not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_by_name text not null,
  deleted_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create index if not exists rice_dashboard_deleted_versions_time_idx
  on public.rice_dashboard_deleted_versions (deleted_at desc, id);

alter table public.rice_dashboard_deleted_versions enable row level security;
create policy "Admins read deleted dashboard audit" on public.rice_dashboard_deleted_versions
  for select to authenticated using ((select public.is_admin()));
create policy "Admins append deleted dashboard audit" on public.rice_dashboard_deleted_versions
  for insert to authenticated with check ((select public.is_admin()) and deleted_by = (select auth.uid()));

create function public.rice_dashboard_delete_version(p_id uuid, p_revision bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v public.rice_dashboard_versions;
  yearly_count integer;
  monthly_count integer;
  prediction_count integer;
begin
  if not coalesce(public.is_admin(), false) then
    raise insufficient_privilege using message = 'ADMIN_REQUIRED';
  end if;

  -- Serialize lifecycle changes so a version cannot be published while it is being deleted.
  perform pg_catalog.pg_advisory_xact_lock(824117);
  select * into v from public.rice_dashboard_versions where id = p_id for update;
  if not found then raise exception 'VERSION_NOT_FOUND'; end if;
  if p_revision is null or v.revision <> p_revision then raise exception 'VERSION_CHANGED'; end if;
  if v.status = 'published' then raise exception 'PUBLISHED_DELETE_PROTECTED'; end if;
  if v.is_default then raise exception 'DEFAULT_PROTECTED'; end if;

  select count(*) into yearly_count from public.rice_yield_yearly where dashboard_version_id = p_id;
  select count(*) into monthly_count from public.rice_environment_monthly where dashboard_version_id = p_id;
  select count(*) into prediction_count from public.rice_yield_predictions where dashboard_version_id = p_id;

  insert into public.rice_dashboard_deleted_versions(
    version_id, version_key, label, revision, deleted_by, deleted_by_name, details
  ) values (
    v.id, v.version_key, v.label, v.revision, auth.uid(),
    coalesce(auth.jwt()->>'email','ผู้ดูแล'),
    jsonb_build_object(
      'version', to_jsonb(v),
      'deletedRows', jsonb_build_object(
        'yearlyYield', yearly_count,
        'monthlyEnvironment', monthly_count,
        'yieldPredictions', prediction_count
      )
    )
  );

  -- Events refer to the version directly, so remove them before the version row.
  delete from public.rice_dashboard_events where version_id = p_id;
  delete from public.rice_yield_predictions where dashboard_version_id = p_id;
  delete from public.rice_environment_monthly where dashboard_version_id = p_id;
  delete from public.rice_yield_yearly where dashboard_version_id = p_id;
  delete from public.rice_dashboard_versions where id = p_id;

  return jsonb_build_object(
    'id', v.id,
    'versionKey', v.version_key,
    'label', v.label,
    'deletedRows', jsonb_build_object(
      'yearlyYield', yearly_count,
      'monthlyEnvironment', monthly_count,
      'yieldPredictions', prediction_count
    )
  );
end $$;

revoke all on function public.rice_dashboard_delete_version(uuid,bigint) from public;
grant execute on function public.rice_dashboard_delete_version(uuid,bigint) to authenticated;
