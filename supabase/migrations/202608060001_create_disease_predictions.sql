create table public.disease_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prediction_status text not null
    check (prediction_status in ('Unknown', 'Uncertain', 'Rice Leaf')),
  rice_probability numeric(5, 4) not null
    check (rice_probability between 0 and 1),
  disease text,
  disease_th text,
  confidence numeric(5, 4)
    check (confidence between 0 and 1),
  all_probabilities jsonb not null default '{}'::jsonb,
  model_version text not null,
  created_at timestamptz not null default now(),
  constraint disease_prediction_fields_match_status check (
    (
      prediction_status = 'Unknown'
      and disease is null
      and disease_th is null
      and confidence is null
    )
    or
    (
      prediction_status in ('Uncertain', 'Rice Leaf')
      and disease is not null
      and disease_th is not null
      and confidence is not null
    )
  )
);

create index disease_predictions_user_created_at_idx
  on public.disease_predictions (user_id, created_at desc);

alter table public.disease_predictions enable row level security;

create policy "Users can view their disease predictions"
on public.disease_predictions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their disease predictions"
on public.disease_predictions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their disease predictions"
on public.disease_predictions
for delete
to authenticated
using ((select auth.uid()) = user_id);
