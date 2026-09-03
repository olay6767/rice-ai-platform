-- Tests run as an existing admin, with all changes rolled back (no persisted fixtures).
begin;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub',(select id from auth.users where raw_app_meta_data->>'role' = 'admin' limit 1),
  'email','SQL regression test (rolled back)','app_metadata',jsonb_build_object('role','admin'))::text,true);
create temporary table edit_test_ids(id uuid);
grant all on edit_test_ids to authenticated;
grant select on edit_test_ids to anon;
set local role authenticated;
do $$
declare a uuid; b uuid; v jsonb; r jsonb; original jsonb; edited jsonb; record_id bigint;
  rev bigint; other record;
begin
  if auth.uid() is null then raise exception 'Existing admin required'; end if;
  v := public.rice_dashboard_create_version('qa-edit-'||substr(gen_random_uuid()::text,1,8),'QA editing','Rolled back');
  a := (v->>'id')::uuid;
  insert into edit_test_ids values(a);
  perform public.rice_dashboard_import(a,'yearly-yield','[{"province_id":1,"crop_start_year":2026,"crop_year":"2569/70","actual_yield":400}]',0,'qa.csv');
  select id,to_jsonb(y)-'id'-'dashboard_version_id'-'created_at' into record_id,original from public.rice_yield_yearly y where dashboard_version_id=a;
  edited := original || '{"actual_yield":430}'::jsonb;
  r := public.rice_dashboard_update_record(a,'yearly-yield',record_id,edited,1);
  if (r->'row'->>'actual_yield')::numeric <> 430 then raise exception 'EDIT_NOT_SAVED'; end if;
  if not exists(select 1 from public.rice_dashboard_events where version_id=a and action='edit-row' and details->'before'->>'actual_yield'='400' and details->'after'->>'actual_yield'='430') then raise exception 'EDIT_AUDIT_MISSING'; end if;
  begin
    perform public.rice_dashboard_update_record(a,'yearly-yield',record_id,original,1);
    raise exception 'STALE_EDIT_ACCEPTED';
  exception when raise_exception then if sqlerrm <> 'VERSION_CHANGED' then raise; end if; end;
  begin
    perform public.rice_dashboard_update_record(a,'yearly-yield',record_id,edited||'{"province_id":3}',2);
    raise exception 'KEY_CHANGE_ACCEPTED';
  exception when raise_exception then if sqlerrm <> 'RECORD_KEY_CHANGED' then raise; end if; end;
  begin
    perform public.rice_dashboard_update_record(a,'yearly-yield',record_id,edited-'actual_yield',2);
    raise exception 'PARTIAL_ROW_ACCEPTED';
  exception when raise_exception then if sqlerrm <> 'INVALID_ROW' then raise; end if; end;
  perform public.rice_dashboard_import(a,'monthly-environment','[{"province_id":1,"year":2026,"month":1,"rainfall_total_mm":100,"rice_ndvi_imputed":false,"rice_ndvi_structural_missing":false}]',2,'qa.csv');
  select id,to_jsonb(m)-'id'-'dashboard_version_id'-'created_at' into record_id,original from public.rice_environment_monthly m where dashboard_version_id=a;
  r := public.rice_dashboard_update_record(a,'monthly-environment',record_id,original||'{"rainfall_total_mm":120,"rice_ndvi_imputed":true}',3);
  if r->'row'->>'rainfall_total_mm' <> '120' or r->'row'->>'rice_ndvi_imputed' <> 'true' then raise exception 'MONTHLY_EDIT_FAILED'; end if;
  perform public.rice_dashboard_import(a,'yield-predictions','[{"province_id":1,"crop_start_year":2026,"crop_year":"2569/70","actual_yield":430,"predicted_yield":420,"residual":10,"absolute_error":10,"model_version":"QA"}]',4,'qa.csv');
  select id,to_jsonb(p)-'id'-'dashboard_version_id'-'created_at' into record_id,original from public.rice_yield_predictions p where dashboard_version_id=a;
  r := public.rice_dashboard_update_record(a,'yield-predictions',record_id,original||'{"predicted_yield":425,"residual":5,"absolute_error":5}',5);
  if r->'row'->>'predicted_yield' <> '425' then raise exception 'PREDICTION_EDIT_FAILED'; end if;
  v := public.rice_dashboard_change_version(a,'publish',6);
  begin
    perform public.rice_dashboard_update_record(a,'yield-predictions',record_id,original,7);
    raise exception 'PUBLISHED_EDIT_ACCEPTED';
  exception when raise_exception then if sqlerrm <> 'DRAFT_REQUIRED' then raise; end if; end;
  v := public.rice_dashboard_unpublish_version(a,7);
  if v->>'status' <> 'draft' or v->>'published_at' is not null then raise exception 'UNPUBLISH_FAILED'; end if;
  v := public.rice_dashboard_change_version(a,'archive',8);
  v := public.rice_dashboard_change_version(a,'restore',9);
  if v->>'status' <> 'draft' then raise exception 'EDITED_DRAFT_RESTORED_PUBLIC'; end if;
  v := public.rice_dashboard_change_version(a,'publish-default',10);
  v := public.rice_dashboard_create_version('qa-copy-'||substr(gen_random_uuid()::text,1,8),'QA replacement','Rolled back',a);
  b := (v->>'id')::uuid;
  insert into edit_test_ids values(b);
  begin
    perform public.rice_dashboard_update_record(b,'yield-predictions',record_id,original,0);
    raise exception 'CROSS_VERSION_EDIT_ACCEPTED';
  exception when raise_exception then if sqlerrm <> 'RECORD_NOT_FOUND' then raise; end if; end;
  v := public.rice_dashboard_change_version(b,'publish',0);
  begin
    perform public.rice_dashboard_unpublish_version(a,11);
    raise exception 'DEFAULT_WITHOUT_REPLACEMENT_ACCEPTED';
  exception when raise_exception then if sqlerrm <> 'REPLACEMENT_REQUIRED' then raise; end if; end;
  v := public.rice_dashboard_unpublish_version(a,11,b);
  if (v->>'is_default')::boolean or v->>'status'<>'draft' then raise exception 'DEFAULT_HANDOVER_FAILED'; end if;
  if not exists(select 1 from public.rice_dashboard_versions where id=b and is_default) then raise exception 'REPLACEMENT_NOT_DEFAULT'; end if;
  -- Exercise the last-publication case; all existing rows are restored by ROLLBACK.
  for other in select id,revision from public.rice_dashboard_versions where status='published' and id<>b loop
    perform public.rice_dashboard_unpublish_version(other.id,other.revision);
  end loop;
  select revision into rev from public.rice_dashboard_versions where id=b;
  perform public.rice_dashboard_unpublish_version(b,rev);
  if exists(select 1 from public.rice_dashboard_versions where status='published' or is_default) then raise exception 'LAST_UNPUBLISH_FAILED'; end if;
  select revision into rev from public.rice_dashboard_versions where id=a;
  v := public.rice_dashboard_change_version(a,'publish',rev);
  if not (v->>'is_default')::boolean then raise exception 'FIRST_REPUBLICATION_NEEDS_DEFAULT'; end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('app_metadata',jsonb_build_object('role','user'))::text,true);
do $$ begin
  begin perform public.rice_dashboard_unpublish_version((select id from edit_test_ids limit 1),0); raise exception 'NON_ADMIN_UNPUBLISH_ACCEPTED';
  exception when insufficient_privilege then null; end;
  begin perform public.rice_dashboard_update_record((select id from edit_test_ids limit 1),'yearly-yield',1,'{}',0); raise exception 'NON_ADMIN_EDIT_ACCEPTED';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.rice_dashboard_versions where status <> 'published') then raise exception 'HIDDEN_VERSION_USER_LEAK'; end if;
end $$;
set local role anon;
do $$ begin
  if exists(select 1 from public.rice_dashboard_versions where status <> 'published') then raise exception 'HIDDEN_VERSION_ANON_LEAK'; end if;
  if (select count(*) from public.rice_yield_yearly where dashboard_version_id in (select id from edit_test_ids)) <> 1 then raise exception 'HIDDEN_ROWS_LEAK'; end if;
end $$;
reset role;
select 'PASS: three row editors, before/after audit, locks, revision, key protection, version scope, unpublish, default replacement, last publication, republish, RLS' as result;
rollback;
