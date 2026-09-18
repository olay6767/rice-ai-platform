-- ระบบจัดการเนื้อหา Rice AI: ข่าว อินโฟกราฟิก การแจ้งเตือน ราคา และคำแนะนำ
-- ผู้ใช้ที่เป็น admin ต้องมี auth.users.raw_app_meta_data = { "role": "admin" }

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 180),
  summary text not null check (char_length(summary) between 3 and 600),
  body text not null default '',
  category text not null check (
    category in ('weather', 'disease', 'pest', 'price', 'knowledge', 'disaster')
  ),
  source_name text not null default 'Rice AI',
  image_url text,
  image_alt text not null default '',
  is_featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'draft')
    or (status = 'published' and published_at is not null)
  )
);

create table public.management_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 180),
  description text not null check (char_length(description) between 3 and 600),
  alert_type text not null check (
    alert_type in ('weather', 'disease', 'pest', 'disaster', 'price', 'general')
  ),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  area_name text not null default 'ประเทศไทย',
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at)
);

create table public.rice_price_updates (
  id uuid primary key default gen_random_uuid(),
  rice_type text not null check (char_length(rice_type) between 2 and 100),
  price_per_ton numeric(14, 2) not null check (price_per_ton > 0),
  trend text not null default 'steady' check (trend in ('up', 'down', 'steady')),
  change_percent numeric(7, 2) not null default 0 check (change_percent between -100 and 100),
  market_name text not null default 'ราคาอ้างอิง Rice AI',
  observed_at timestamptz not null default now(),
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farmer_recommendations (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 180),
  description text not null check (char_length(description) between 3 and 1200),
  category text not null check (
    category in ('water', 'fertilizer', 'disease', 'harvest', 'cost', 'general')
  ),
  priority text not null default 'normal' check (priority in ('normal', 'important')),
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at)
);

create table public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('create', 'update', 'delete', 'role_update', 'upload')),
  resource_type text not null,
  resource_id uuid,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_admin_content_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_news_posts_updated_at
before update on public.news_posts
for each row execute function public.set_admin_content_updated_at();

create trigger set_management_alerts_updated_at
before update on public.management_alerts
for each row execute function public.set_admin_content_updated_at();

create trigger set_rice_price_updates_updated_at
before update on public.rice_price_updates
for each row execute function public.set_admin_content_updated_at();

create trigger set_farmer_recommendations_updated_at
before update on public.farmer_recommendations
for each row execute function public.set_admin_content_updated_at();

create index news_posts_published_at_idx
  on public.news_posts (published_at desc)
  where status = 'published';

create index management_alerts_active_idx
  on public.management_alerts (starts_at desc)
  where is_active;

create index rice_price_updates_observed_at_idx
  on public.rice_price_updates (observed_at desc)
  where is_published;

create index farmer_recommendations_active_idx
  on public.farmer_recommendations (starts_at desc)
  where is_active;

create index admin_activity_logs_created_at_idx
  on public.admin_activity_logs (created_at desc);

alter table public.news_posts enable row level security;
alter table public.management_alerts enable row level security;
alter table public.rice_price_updates enable row level security;
alter table public.farmer_recommendations enable row level security;
alter table public.admin_activity_logs enable row level security;

create policy "Published news is visible to everyone"
on public.news_posts for select to public
using (status = 'published' and published_at <= now());

create policy "Admins manage all news"
on public.news_posts for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Active alerts are visible to everyone"
on public.management_alerts for select to public
using (
  is_active
  and starts_at <= now()
  and (expires_at is null or expires_at > now())
);

create policy "Admins manage all alerts"
on public.management_alerts for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Published rice prices are visible to everyone"
on public.rice_price_updates for select to public
using (is_published);

create policy "Admins manage all rice prices"
on public.rice_price_updates for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Active recommendations are visible to everyone"
on public.farmer_recommendations for select to public
using (
  is_active
  and starts_at <= now()
  and (expires_at is null or expires_at > now())
);

create policy "Admins manage all recommendations"
on public.farmer_recommendations for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can read activity logs"
on public.admin_activity_logs for select to authenticated
using ((select public.is_admin()));

create policy "Admins can create activity logs"
on public.admin_activity_logs for insert to authenticated
with check ((select public.is_admin()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'admin-media',
  'admin-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read admin media"
on storage.objects for select to public
using (bucket_id = 'admin-media');

create policy "Admins manage admin media"
on storage.objects for all to authenticated
using (
  bucket_id = 'admin-media'
  and (select public.is_admin())
)
with check (
  bucket_id = 'admin-media'
  and (select public.is_admin())
);
