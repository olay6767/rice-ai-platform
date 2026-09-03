-- Per-user controls for automatic weather and farm-plan notifications.
create table public.user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  heavy_rain_enabled boolean not null default true,
  heavy_rain_threshold_mm numeric(6, 1) not null default 35
    check (heavy_rain_threshold_mm between 5 and 250),
  high_humidity_disease_enabled boolean not null default true,
  high_humidity_threshold_percent smallint not null default 85
    check (high_humidity_threshold_percent between 50 and 100),
  fertilizer_reminder_enabled boolean not null default false,
  next_fertilizer_date date,
  fertilizer_reminder_days_before smallint not null default 3
    check (fertilizer_reminder_days_before between 0 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_notification_preferences_updated_at()
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

create trigger set_user_notification_preferences_updated_at
before update on public.user_notification_preferences
for each row execute function public.set_user_notification_preferences_updated_at();

alter table public.user_notification_preferences enable row level security;

create policy "Users can read their notification preferences"
on public.user_notification_preferences for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their notification preferences"
on public.user_notification_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their notification preferences"
on public.user_notification_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
