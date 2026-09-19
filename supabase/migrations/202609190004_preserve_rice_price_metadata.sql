-- Preserve source fields that are qualitative or model-specific without
-- inventing numeric confidence values during the static-data migration.
alter table public.rice_price_series
  add column if not exists reliability_label text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.rice_price_series
  add constraint rice_price_series_reliability_label_length_check
  check (reliability_label is null or char_length(reliability_label) <= 80);
