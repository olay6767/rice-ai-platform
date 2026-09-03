-- Preserve draft visibility when restoring from the archive.
-- Include historical prediction-only years without treating them as actual yield.
-- Do not change the current default or any existing dataset.
create or replace function public.rice_dashboard_change_version(
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
  if p_action in ('publish','publish-default','default') or (p_action = 'restore' and v.published_at is not null) then
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
    status = case when p_action = 'restore' and published_at is null then 'draft'
      when p_action in ('publish','publish-default','restore') then 'published'
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
        else case when v.status = 'draft' then 'คืนฉบับร่างจากคลังเพื่อแก้ไขต่อ' else 'คืนเวอร์ชันจากคลังเพื่อให้ผู้ใช้เลือก' end end,
      jsonb_build_object('previousDefaultId',previous_default,'revision',v.revision));
  return to_jsonb(v);
end $$;

create or replace function public.rice_dashboard_years(p_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'cropYears',coalesce((select jsonb_agg(y order by y) from (
      select crop_start_year y from public.rice_yield_yearly where dashboard_version_id = p_id
      union
      select crop_start_year y from public.rice_yield_predictions where dashboard_version_id = p_id
    ) years),'[]'::jsonb),
    'environmentYears',coalesce((select jsonb_agg(y order by y) from (
      select distinct year y from public.rice_environment_monthly where dashboard_version_id = p_id
    ) years),'[]'::jsonb)
  );
$$;

