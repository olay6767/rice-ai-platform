-- Expand the original farm-finance ledger into a complete personal + farm
-- finance workspace. Existing transactions and budgets are preserved.

alter table public.finance_transactions
  drop constraint if exists finance_transactions_category_matches_type;

alter table public.finance_transactions
  add column if not exists transaction_time time,
  add column if not exists notes text not null default ''
    check (char_length(notes) <= 1000),
  add column if not exists source text not null default 'chat'
    check (source in ('chat', 'manual', 'recurring', 'receipt', 'voice', 'pdf')),
  add column if not exists receipt_url text,
  add column if not exists account_id uuid;

alter table public.finance_transactions
  add constraint finance_transactions_category_not_empty
  check (char_length(btrim(category)) between 1 and 80) not valid;

alter table public.finance_transactions
  validate constraint finance_transactions_category_not_empty;

alter table public.finance_budgets
  drop constraint if exists finance_budgets_category_check;

create table if not exists public.finance_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_completed_at timestamptz,
  budget_cycle_start_day smallint not null default 1
    check (budget_cycle_start_day between 1 and 28),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_key text not null check (char_length(category_key) between 1 and 80),
  name text not null check (char_length(name) between 1 and 80),
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  icon text not null default 'receipt',
  is_custom boolean not null default false,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_categories_user_key_unique unique (user_id, category_key)
);

create index if not exists finance_categories_user_type_idx
  on public.finance_categories (user_id, transaction_type, sort_order);

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  account_type text not null default 'cash'
    check (account_type in ('cash', 'personal', 'business', 'family', 'other')),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_accounts_user_name_unique unique (user_id, name)
);

create table if not exists public.finance_recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  category text not null check (char_length(btrim(category)) between 1 and 80),
  description text not null check (char_length(description) between 1 and 200),
  amount numeric(14, 2) not null check (amount > 0),
  day_of_month smallint not null check (day_of_month between 1 and 28),
  account_id uuid references public.finance_accounts(id) on delete set null,
  notes text not null default '' check (char_length(notes) <= 1000),
  is_enabled boolean not null default true,
  last_generated_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_recurring_transactions_user_idx
  on public.finance_recurring_transactions (user_id, is_enabled, day_of_month);

alter table public.finance_transactions
  drop constraint if exists finance_transactions_account_id_fkey,
  add constraint finance_transactions_account_id_fkey
    foreign key (account_id) references public.finance_accounts(id) on delete set null;

alter table public.finance_transactions
  add column if not exists recurring_transaction_id uuid references public.finance_recurring_transactions(id) on delete set null;

create index if not exists finance_transactions_user_source_idx
  on public.finance_transactions (user_id, source, transaction_date desc);

create index if not exists finance_transactions_user_category_idx
  on public.finance_transactions (user_id, category, transaction_date desc);

create or replace function public.set_finance_workspace_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_finance_user_settings_updated_at on public.finance_user_settings;
create trigger set_finance_user_settings_updated_at
before update on public.finance_user_settings
for each row execute function public.set_finance_workspace_updated_at();

drop trigger if exists set_finance_categories_updated_at on public.finance_categories;
create trigger set_finance_categories_updated_at
before update on public.finance_categories
for each row execute function public.set_finance_workspace_updated_at();

drop trigger if exists set_finance_accounts_updated_at on public.finance_accounts;
create trigger set_finance_accounts_updated_at
before update on public.finance_accounts
for each row execute function public.set_finance_workspace_updated_at();

drop trigger if exists set_finance_recurring_transactions_updated_at on public.finance_recurring_transactions;
create trigger set_finance_recurring_transactions_updated_at
before update on public.finance_recurring_transactions
for each row execute function public.set_finance_workspace_updated_at();

alter table public.finance_user_settings enable row level security;
alter table public.finance_categories enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_recurring_transactions enable row level security;

create policy "Users manage own finance settings"
on public.finance_user_settings for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage own finance categories"
on public.finance_categories for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage own finance accounts"
on public.finance_accounts for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage own recurring finance transactions"
on public.finance_recurring_transactions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
