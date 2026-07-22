-- Migration: 20260722_add_performance_indexes.sql
-- Description: Composite B-Tree indexes for ultra-fast query performance in Arca

-- 1. Transactions Index: Optimizes monthly transactions, history filtering, and balance aggregation
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_status_date 
ON public.transactions (workspace_id, status, date DESC);

-- 2. Scheduled Events Index: Optimizes agenda calendar, upcoming payments, and cron notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_events_workspace_status_duedate 
ON public.scheduled_events (workspace_id, status, due_date ASC);

-- 3. Active Accounts Index: Optimizes account listing and active balance calculations
CREATE INDEX IF NOT EXISTS idx_accounts_workspace_active 
ON public.accounts (workspace_id, active);

-- 4. Savings Goals Index: Optimizes active goals and pockets display
CREATE INDEX IF NOT EXISTS idx_savings_goals_workspace_status 
ON public.savings_goals (workspace_id, status);

-- 5. Credit Cards Index: Optimizes active credit card limits and balance tracking
CREATE INDEX IF NOT EXISTS idx_credit_cards_workspace_active 
ON public.credit_cards (workspace_id, active);

-- 6. Loans (Receivables & Payables) Index: Optimizes pending loans and receivables tracking
CREATE INDEX IF NOT EXISTS idx_receivables_workspace_status 
ON public.receivables (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_payables_workspace_status 
ON public.payables (workspace_id, status);
