alter table public.debts add column if not exists principal_amount numeric;
alter table public.debts add column if not exists annual_interest_rate numeric;
alter table public.debts add column if not exists interest_type text not null default 'unknown';
alter table public.debts add column if not exists term_months integer;
alter table public.debts add column if not exists estimated_total_payment numeric;

alter table public.credit_cards add column if not exists annual_interest_rate numeric;
alter table public.credit_cards add column if not exists interest_type text not null default 'unknown';
alter table public.credit_cards add column if not exists estimated_payoff_months integer;
alter table public.credit_cards add column if not exists estimated_total_payment numeric;
alter table public.credit_cards add column if not exists payment_strategy text not null default 'minimum';
alter table public.credit_cards add column if not exists notes text;
