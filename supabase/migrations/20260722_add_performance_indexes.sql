-- Migration: 20260722_add_performance_indexes.sql
-- Description: Composite B-Tree indexes for ultra-fast query performance in Arca

-- 1. Transactions Index: Optimizes monthly transactions, history filtering, and balance aggregation
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_date 
ON public.transactions (workspace_id, date DESC);

-- 2. Scheduled Events Index: Optimizes agenda calendar, upcoming payments, and cron notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_events_workspace_status_duedate 
ON public.scheduled_events (workspace_id, status, due_date ASC);

-- 3. Active Accounts Index: Optimizes account listing and active balance calculations
CREATE INDEX IF NOT EXISTS idx_accounts_workspace_active_archived 
ON public.accounts (workspace_id, active, archived);

-- 4. Savings Goals Index: Optimizes active goals and pockets display
CREATE INDEX IF NOT EXISTS idx_savings_goals_workspace_archived 
ON public.savings_goals (workspace_id, archived);

-- 5. Credit Cards Index: Optimizes active credit card limits and balance tracking
CREATE INDEX IF NOT EXISTS idx_credit_cards_workspace_archived 
ON public.credit_cards (workspace_id, archived);

-- 6. Receivables Index: Optimizes receivables tracking
CREATE INDEX IF NOT EXISTS idx_receivables_workspace_status 
ON public.receivables (workspace_id, status);

-- 7. Payables Index: Optimizes payables tracking
CREATE INDEX IF NOT EXISTS idx_payables_workspace_status 
ON public.payables (workspace_id, status);
