-- Governed release registry for the rice disease classifier.
-- Model artifacts stay in private Vercel Blob; only server-side services receive
-- the private URL and the Blob token remains in environment variables.

create table if not exists public.rice_disease_model_releases (
  id uuid primary key default gen_random_uuid(),
  model_version text not null unique
    check (model_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,99}$'),
  model_name text not null
    check (char_length(model_name) between 2 and 160),
  classifier_model_url text,
  artifact_size_bytes bigint
    check (artifact_size_bytes is null or artifact_size_bytes between 1 and 314572800),
  artifact_sha256 text
    check (artifact_sha256 is null or artifact_sha256 ~ '^[0-9a-f]{64}$'),
  class_count smallint not null default 6 check (class_count = 6),
  class_names text[] not null default array[
    'Healthy',
    'Sheath Blight',
    'Bacterial Leaf Blight',
    'Brown Spot',
    'Rice Blast',
    'Neck Blast'
  ]::text[],
  input_shape smallint[] not null default array[224, 224, 3]::smallint[]
    check (input_shape = array[224, 224, 3]::smallint[]),
  preprocess_mode text not null default 'raw'
    check (preprocess_mode in ('raw', 'rescale_01', 'resnet50')),
  is_active boolean not null default false,
  validated_at timestamptz not null,
  activated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rice_disease_model_classifier_url_check check (
    classifier_model_url is null or classifier_model_url ~
      '^https://[a-z0-9-]+\.private\.blob\.vercel-storage\.com/[^?#]+\.keras$'
  ),
  constraint rice_disease_model_artifact_binding_check check (
    (
      classifier_model_url is null
      and artifact_size_bytes is null
      and artifact_sha256 is null
    )
    or (
      classifier_model_url is not null
      and artifact_size_bytes is not null
      and artifact_sha256 is not null
    )
  ),
  constraint rice_disease_model_class_manifest_check check (
    class_names = array[
      'Healthy',
      'Sheath Blight',
      'Bacterial Leaf Blight',
      'Brown Spot',
      'Rice Blast',
      'Neck Blast'
    ]::text[]
  )
);

create unique index if not exists rice_disease_model_one_active_idx
  on public.rice_disease_model_releases (is_active)
  where is_active;

alter table public.rice_disease_model_releases enable row level security;

-- The registry contains private artifact URLs. It has no browser-facing RLS
-- policy; all reads and mutations go through authenticated server routes using
-- the service role. Super Admin browser sessions cannot query it directly.

-- Preserve the model that is already configured through CLASSIFIER_MODEL_URL as
-- the initial active release. A null URL means the inference service uses its
-- existing environment-backed classifier.
insert into public.rice_disease_model_releases (
  model_version,
  model_name,
  classifier_model_url,
  artifact_size_bytes,
  artifact_sha256,
  class_count,
  class_names,
  input_shape,
  preprocess_mode,
  is_active,
  validated_at,
  activated_at
)
values (
  'set2-resnet50-finetuned',
  'Set2 ResNet50 Finetuned',
  null,
  null,
  null,
  6,
  array[
    'Healthy',
    'Sheath Blight',
    'Bacterial Leaf Blight',
    'Brown Spot',
    'Rice Blast',
    'Neck Blast'
  ]::text[],
  array[224, 224, 3]::smallint[],
  'raw',
  true,
  now(),
  now()
)
on conflict (model_version) do nothing;

create or replace function public.register_rice_disease_model(
  p_model_version text,
  p_model_name text,
  p_classifier_model_url text,
  p_artifact_size_bytes bigint,
  p_class_names text[],
  p_artifact_sha256 text,
  p_preprocess_mode text,
  p_actor_id uuid,
  p_activate boolean default true
)
returns public.rice_disease_model_releases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_release public.rice_disease_model_releases;
begin
  if not exists (
    select 1 from auth.users
    where id = p_actor_id
      and raw_app_meta_data ->> 'role' = 'superadmin'
  ) then
    raise exception 'Only super admins can register disease models';
  end if;

  insert into public.rice_disease_model_releases (
    model_version,
    model_name,
    classifier_model_url,
    artifact_size_bytes,
    artifact_sha256,
    class_count,
    class_names,
    input_shape,
    preprocess_mode,
    is_active,
    validated_at,
    created_by
  ) values (
    trim(p_model_version),
    trim(p_model_name),
    trim(p_classifier_model_url),
    p_artifact_size_bytes,
    p_artifact_sha256,
    6,
    p_class_names,
    array[224, 224, 3]::smallint[],
    p_preprocess_mode,
    false,
    now(),
    p_actor_id
  )
  returning * into v_release;

  if p_activate then
    update public.rice_disease_model_releases
    set is_active = false,
        updated_at = now()
    where is_active;

    update public.rice_disease_model_releases
    set is_active = true,
        activated_at = now(),
        updated_at = now()
    where id = v_release.id
    returning * into v_release;
  end if;

  insert into public.admin_activity_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    summary,
    new_value
  ) values (
    p_actor_id,
    'create',
    'disease_model',
    v_release.id,
    case when p_activate
      then 'เพิ่มและเปิดใช้โมเดลโรค ' || v_release.model_version
      else 'เพิ่มโมเดลโรค ' || v_release.model_version
    end,
    to_jsonb(v_release)
  );

  return v_release;
end;
$$;

revoke all on function public.register_rice_disease_model(text, text, text, bigint, text[], text, text, uuid, boolean)
  from public;
grant execute on function public.register_rice_disease_model(text, text, text, bigint, text[], text, text, uuid, boolean)
  to service_role;

create or replace function public.activate_rice_disease_model(
  p_id uuid,
  p_actor_id uuid
)
returns public.rice_disease_model_releases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_release public.rice_disease_model_releases;
begin
  if not exists (
    select 1 from auth.users
    where id = p_actor_id
      and raw_app_meta_data ->> 'role' = 'superadmin'
  ) then
    raise exception 'Only super admins can activate disease models';
  end if;

  select * into v_release
  from public.rice_disease_model_releases
  where id = p_id;

  if v_release.id is null then
    raise exception 'Disease model release not found';
  end if;

  update public.rice_disease_model_releases
  set is_active = false,
      updated_at = now()
  where is_active and id <> p_id;

  update public.rice_disease_model_releases
  set is_active = true,
      activated_at = now(),
      updated_at = now()
  where id = p_id
  returning * into v_release;

  insert into public.admin_activity_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    summary,
    new_value
  ) values (
    p_actor_id,
    'enable',
    'disease_model',
    v_release.id,
    'ตั้งโมเดลโรคที่ใช้งานเป็น ' || v_release.model_version,
    to_jsonb(v_release)
  );

  return v_release;
end;
$$;

revoke all on function public.activate_rice_disease_model(uuid, uuid) from public;
grant execute on function public.activate_rice_disease_model(uuid, uuid) to service_role;

-- Disease classes are now read-only catalogue entries in the Admin product.
-- The security-definer detection trigger can continue updating counters.
drop policy if exists "Admins manage rice diseases" on public.rice_diseases;
