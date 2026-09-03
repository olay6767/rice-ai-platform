-- Execute in a transaction and always ROLLBACK. No users or persistent fixtures are created.
-- Requires a pre-existing admin account; uses its identity only inside this SQL transaction.
-- TRANSACTION START
begin;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub',(select id from auth.users where raw_app_meta_data->>'role' = 'admin' limit 1),
  'email','SQL regression test (rolled back)','app_metadata',jsonb_build_object('role','admin'))::text,true);
create temporary table dashboard_test_ids(id uuid);
grant all on dashboard_test_ids to authenticated;
grant select on dashboard_test_ids to anon;
set local role authenticated;
do $$
declare v jsonb; cloned jsonb; result jsonb; rows jsonb; version_id uuid; clone_id uuid; restored_draft_id uuid;
begin
  if auth.uid() is null then raise exception 'An existing admin account is required'; end if;
  v := public.rice_dashboard_create_version('qa-'||substr(gen_random_uuid()::text,1,8),'QA restore draft','Rolled back');
  restored_draft_id := (v->>'id')::uuid;
  v := public.rice_dashboard_change_version(restored_draft_id,'archive',0);
  v := public.rice_dashboard_change_version(restored_draft_id,'restore',1);
  if v->>'status' <> 'draft' then raise exception 'RESTORED_DRAFT_WAS_PUBLISHED'; end if;
  -- A legacy version may have been published empty before the draft workflow.
  update public.rice_dashboard_versions set status = 'published', published_at = now() where id = restored_draft_id;
  begin
    perform public.rice_dashboard_change_version(restored_draft_id,'default',2);
    raise exception 'EMPTY_DEFAULT_ACCEPTED';
  exception when raise_exception then if sqlerrm <> 'YEARLY_DATA_REQUIRED' then raise; end if; end;
  update public.rice_dashboard_versions set status = 'draft', published_at = null where id = restored_draft_id;
  perform public.rice_dashboard_import(restored_draft_id,'yield-predictions','[{"province_id":1,"crop_start_year":2028,"crop_year":"2571/72","actual_yield":400,"predicted_yield":410,"residual":-10,"absolute_error":10,"model_version":"QA"}]'::jsonb,2,'prediction-only.csv');
  if not (public.rice_dashboard_years(restored_draft_id)->'cropYears' @> '[2028]'::jsonb) then raise exception 'PREDICTION_ONLY_YEAR_MISSING'; end if;
  v := public.rice_dashboard_create_version('qa-'||substr(gen_random_uuid()::text,1,8),'QA draft','Rolled back');
  version_id := (v->>'id')::uuid;
  insert into dashboard_test_ids values(version_id);
  if v->>'status' <> 'draft' or (v->>'is_default')::boolean then raise exception 'CREATE_DRAFT_FAILED'; end if;
  rows := '[{"province_id":1,"crop_start_year":2026,"crop_year":"2569/70","actual_yield":400}]'::jsonb;
  begin
    perform public.rice_dashboard_import(version_id,'yearly-yield',rows || '[{"province_id":-999,"crop_start_year":2026,"crop_year":"2569/70","actual_yield":400}]'::jsonb,0,'bad.csv');
    raise exception 'EXPECTED_FK_FAILURE';
  exception when foreign_key_violation then null;
  end;
  if exists(select 1 from public.rice_yield_yearly where dashboard_version_id = version_id) then raise exception 'PARTIAL_WRITE_FOUND'; end if;
  result := public.rice_dashboard_import(version_id,'yearly-yield',rows,0,'valid.csv');
  if (result->>'inserts')::int <> 1 then raise exception 'INSERT_COUNT_FAILED'; end if;
  begin
    perform public.rice_dashboard_import(version_id,'yearly-yield',rows,0,'stale.csv');
    raise exception 'STALE_REVISION_ACCEPTED';
  exception when raise_exception then if sqlerrm <> 'VERSION_CHANGED' then raise; end if; end;
  v := public.rice_dashboard_change_version(version_id,'publish',1);
  begin
    perform public.rice_dashboard_import(version_id,'yearly-yield',rows,2,'published.csv');
    raise exception 'PUBLISHED_UPLOAD_ACCEPTED';
  exception when raise_exception then if sqlerrm <> 'DRAFT_REQUIRED' then raise; end if; end;
  cloned := public.rice_dashboard_create_version('qa-'||substr(gen_random_uuid()::text,1,8),'QA clone','Rolled back',version_id);
  clone_id := (cloned->>'id')::uuid;
  insert into dashboard_test_ids values(clone_id);
  if (select count(*) from public.rice_yield_yearly where dashboard_version_id = clone_id) <> 1 then raise exception 'CLONE_FAILED'; end if;
  rows := '[{"province_id":1,"crop_start_year":2026,"crop_year":"2569/70","actual_yield":500,"predicted_yield":410,"residual":90,"absolute_error":90,"model_version":"QA"}]'::jsonb;
  perform public.rice_dashboard_import(clone_id,'yield-predictions',rows,0,'mismatch.csv');
  begin
    perform public.rice_dashboard_change_version(clone_id,'publish',1);
    raise exception 'MISMATCH_PUBLISHED';
  exception when raise_exception then if sqlerrm <> 'PREDICTIONS_MISMATCH' then raise; end if; end;
  rows := '[{"province_id":1,"crop_start_year":2026,"crop_year":"2569/70","actual_yield":400,"predicted_yield":410,"residual":-10,"absolute_error":10,"model_version":"QA"}]'::jsonb;
  result := public.rice_dashboard_import(clone_id,'yield-predictions',rows,1,'fixed.csv');
  if (result->>'updates')::int <> 1 then raise exception 'UPDATE_COUNT_FAILED'; end if;
  v := public.rice_dashboard_change_version(clone_id,'publish-default',2);
  if (select count(*) from public.rice_dashboard_versions where is_default) <> 1 then raise exception 'DEFAULT_NOT_ATOMIC'; end if;
  begin
    perform public.rice_dashboard_change_version(clone_id,'archive',3);
    raise exception 'DEFAULT_ARCHIVED';
  exception when raise_exception then if sqlerrm <> 'DEFAULT_PROTECTED' then raise; end if; end;
  v := public.rice_dashboard_change_version(version_id,'archive',2);
  v := public.rice_dashboard_change_version(version_id,'restore',3);
  v := public.rice_dashboard_change_version(version_id,'archive',4);
  if not exists(select 1 from public.rice_dashboard_events e where e.version_id = clone_id and e.action = 'import') then raise exception 'AUDIT_MISSING'; end if;
  if public.rice_dashboard_admin_summary() is null then raise exception 'SUMMARY_FAILED'; end if;
  if not (public.rice_dashboard_years(clone_id)->'cropYears' @> '[2026]'::jsonb) then raise exception 'YEARS_FAILED'; end if;
end $$;
-- Non-admin authenticated users cannot mutate versions or read audit records.
select set_config('request.jwt.claims',jsonb_build_object('app_metadata',jsonb_build_object('role','user'))::text,true);
do $$ begin
  begin perform public.rice_dashboard_create_version('blocked-test','Blocked',''); raise exception 'NON_ADMIN_ACCEPTED';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.rice_dashboard_events) then raise exception 'AUDIT_LEAK'; end if;
end $$;
set local role anon;
do $$ begin
  if exists(select 1 from public.rice_dashboard_versions where status <> 'published') then raise exception 'PRIVATE_VERSION_LEAK'; end if;
  if (select count(*) from public.rice_yield_yearly where dashboard_version_id in (select id from dashboard_test_ids)) <> 1 then raise exception 'PRIVATE_DATA_LEAK'; end if;
end $$;
reset role;
select 'PASS: rollback, draft lock, revision, clone, publication, default, history, RLS, years' as result;
rollback;
