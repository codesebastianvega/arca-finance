-- Migration: Create savings_chains and savings_chain_members tables with RLS policies

CREATE TABLE IF NOT EXISTS public.savings_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  contribution_amount numeric(15, 2) NOT NULL DEFAULT 0,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly_8d', 'biweekly_15d', 'monthly')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  total_rounds integer NOT NULL DEFAULT 10,
  user_turn_number integer NOT NULL DEFAULT 1,
  status text NOT NULL CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.savings_chain_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id uuid NOT NULL REFERENCES public.savings_chains(id) ON DELETE CASCADE,
  turn_number integer NOT NULL,
  member_name text NOT NULL,
  phone text,
  is_current_user boolean NOT NULL DEFAULT false,
  payout_status text NOT NULL CHECK (payout_status IN ('pending', 'paid')) DEFAULT 'pending',
  payout_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.savings_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_chain_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for savings_chains
CREATE POLICY savings_chains_workspace_select ON public.savings_chains
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY savings_chains_workspace_insert ON public.savings_chains
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY savings_chains_workspace_update ON public.savings_chains
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY savings_chains_workspace_delete ON public.savings_chains
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for savings_chain_members
CREATE POLICY savings_chain_members_select ON public.savings_chain_members
  FOR SELECT USING (
    chain_id IN (
      SELECT id FROM public.savings_chains WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY savings_chain_members_insert ON public.savings_chain_members
  FOR INSERT WITH CHECK (
    chain_id IN (
      SELECT id FROM public.savings_chains WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY savings_chain_members_update ON public.savings_chain_members
  FOR UPDATE USING (
    chain_id IN (
      SELECT id FROM public.savings_chains WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY savings_chain_members_delete ON public.savings_chain_members
  FOR DELETE USING (
    chain_id IN (
      SELECT id FROM public.savings_chains WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_savings_chains_workspace ON public.savings_chains(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_savings_chain_members_chain ON public.savings_chain_members(chain_id, turn_number);
