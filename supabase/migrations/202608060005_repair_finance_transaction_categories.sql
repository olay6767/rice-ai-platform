-- Repairs projects where the original agricultural-category migration was not applied.
-- Existing legacy categories remain valid, while farm-specific categories can now be saved.
alter table public.finance_transactions
  drop constraint if exists finance_transactions_category_matches_type;

alter table public.finance_transactions
  add constraint finance_transactions_category_matches_type check (
    (
      transaction_type = 'expense'
      and category in (
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
    )
    or
    (
      transaction_type = 'income'
      and category in (
        'rice_sales',
        'farm_support',
        'other_farm_income',
        'salary',
        'business',
        'bonus',
        'transfer',
        'other_income'
      )
    )
  );
