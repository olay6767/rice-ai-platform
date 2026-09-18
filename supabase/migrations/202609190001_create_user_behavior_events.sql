-- Immutable per-user feature events used to personalize chatbot recommendations.
-- Profile data remains in auth.users.user_metadata and farm context remains in
-- public.rice_farm_fields; this table stores behavior only.
create table if not exists public.user_behavior_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'chat')),
  feature text not null check (feature in ('weather', 'disease', 'yield', 'chat')),
  path text check (path is null or (char_length(path) between 1 and 200 and path like '/%')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists user_behavior_events_user_created_idx
  on public.user_behavior_events (user_id, created_at desc);

create index if not exists user_behavior_events_user_feature_idx
  on public.user_behavior_events (user_id, feature, created_at desc);

alter table public.user_behavior_events enable row level security;

drop policy if exists "Users can view their behavior events"
  on public.user_behavior_events;
create policy "Users can view their behavior events"
  on public.user_behavior_events for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their behavior events"
  on public.user_behavior_events;
create policy "Users can create their behavior events"
  on public.user_behavior_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
