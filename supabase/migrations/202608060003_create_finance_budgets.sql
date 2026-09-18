create table public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_month date not null check (extract(day from budget_month) = 1),
  category text not null check (
    category in (
      'seed',
      'fertilizer',
      'pesticide',
      'labor',
      'irrigation',
      'fuel_transport',
      'land_rent',
      'machinery',
      'other_farm_expense',
      'food',
      'transport',
      'housing',
      'health',
      'education',
      'shopping',
      'entertainment',
      'other_expense'
    )
  ),
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_budgets_user_month_category_unique
    unique (user_id, budget_month, category)
);

create index finance_budgets_user_month_idx
  on public.finance_budgets (user_id, budget_month desc);

create trigger set_finance_budgets_updated_at
before update on public.finance_budgets
for each row
execute function public.set_finance_transaction_updated_at();

alter table public.finance_budgets enable row level security;

create policy "Users can view their finance budgets"
on public.finance_budgets
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their finance budgets"
on public.finance_budgets
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their finance budgets"
on public.finance_budgets
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their finance budgets"
on public.finance_budgets
for delete to authenticated
using ((select auth.uid()) = user_id);
