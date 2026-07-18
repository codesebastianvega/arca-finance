import { createSupabaseServerComponentClient } from '@/src/lib/supabase';
import { DEFAULT_BILLING_PLANS, normalizeBillingPlan, type BillingPlan } from '@/src/lib/billing';
import type { WorkspaceContext } from '@/src/lib/auth-types';

export type BillingNotice = {
  invoiceId: string;
  planName: string;
  amountCop: number;
  dueAt: string;
  daysUntilDue: number;
  overdue: boolean;
};

export async function loadBillingPlans(): Promise<BillingPlan[]> {
  const supabase = await createSupabaseServerComponentClient();
  if (!supabase) return DEFAULT_BILLING_PLANS;

  const result = await supabase
    .from('subscription_plans')
    .select('code, name, monthly_price_cop, active, metadata')
    .order('monthly_price_cop', { ascending: true });

  if (result.error) return DEFAULT_BILLING_PLANS;
  const plans = (result.data ?? [])
    .map((row) => normalizeBillingPlan(row))
    .filter((plan): plan is BillingPlan => Boolean(plan));
  return plans.length ? plans : DEFAULT_BILLING_PLANS;
}

export async function loadBillingNotice(context: WorkspaceContext): Promise<BillingNotice | null> {
  const supabase = await createSupabaseServerComponentClient();
  if (!supabase) return null;
  const invoiceResult = await supabase
    .from('subscription_invoices')
    .select('id, plan_code, amount_cop, due_at, status')
    .eq('workspace_id', context.workspace.id)
    .in('status', ['pending', 'overdue'])
    .order('due_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (invoiceResult.error || !invoiceResult.data) return null;
  const dueAt = new Date(String(invoiceResult.data.due_at));
  const daysUntilDue = Math.ceil((dueAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysUntilDue > 3) return null;
  const plan = DEFAULT_BILLING_PLANS.find((item) => item.code === invoiceResult.data?.plan_code);
  return {
    invoiceId: String(invoiceResult.data.id),
    planName: plan?.name ?? 'Plan de Arca',
    amountCop: Number(invoiceResult.data.amount_cop ?? 0),
    dueAt: dueAt.toISOString(),
    daysUntilDue,
    overdue: invoiceResult.data.status === 'overdue' || daysUntilDue < 0,
  };
}
