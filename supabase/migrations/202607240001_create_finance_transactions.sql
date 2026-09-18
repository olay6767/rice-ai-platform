create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_request_id uuid not null,
  transaction_type text not null
    check (transaction_type in ('income', 'expense')),
  category text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency char(3) not null default 'THB'
    check (currency = 'THB'),
  description text not null check (char_length(description) between 1 and 200),
  transaction_date date not null,
  source_text text not null check (char_length(source_text) between 1 and 1000),
  ai_model text,
  ai_confidence numeric(5, 4)
    check (ai_confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_transactions_category_matches_type check (
    (
      transaction_type = 'expense'
      and category in (
        'food',
        'transport',
        'housing',
        'health',
        'education',
        'shopping',
        'entertainment',
        'other_expense'
      )
    )
    or
    (
      transaction_type = 'income'
      and category in (
        'salary',
        'business',
        'bonus',
        'transfer',
        'other_income'
      )
    )
  ),
  constraint finance_transactions_user_request_unique
    unique (user_id, client_request_id)
);

create index finance_transactions_user_date_idx
  on public.finance_transactions (
    user_id,
    transaction_date desc,
    created_at desc
  );

create or replace function public.set_finance_transaction_updated_at()
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

create trigger set_finance_transactions_updated_at
before update on public.finance_transactions
for each row
execute function public.set_finance_transaction_updated_at();

alter table public.finance_transactions enable row level security;

create policy "Users can view their finance transactions"
on public.finance_transactions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their finance transactions"
on public.finance_transactions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their finance transactions"
on public.finance_transactions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their finance transactions"
on public.finance_transactions
for delete
to authenticated
using ((select auth.uid()) = user_id);
