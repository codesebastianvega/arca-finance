import { createSupabaseServerComponentClient, getSupabaseAdminClient } from '@/src/lib/supabase';
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

export type NovaAllowance = {
  monthlyLimit: number | null;
  used: number;
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

export async function loadNovaAllowance(
  context: WorkspaceContext,
  plans: BillingPlan[],
): Promise<NovaAllowance> {
  const vipExpiresAt = typeof context.subscription?.metadata?.vip_expires_at === 'string'
    ? new Date(context.subscription.metadata.vip_expires_at).getTime()
    : null;
  const hasVipAccess = Boolean(context.subscription?.metadata?.vip_full_access)
    && (!vipExpiresAt || vipExpiresAt > Date.now());
  if (context.profile.isSuperAdmin || hasVipAccess) return { monthlyLimit: null, used: 0 };

  const hasPaidAccess = Boolean(
    context.subscription
    && context.subscription.planCode !== 'free'
    && (context.subscription.status === 'active' || context.subscription.status === 'trialing'),
  );
  const effectivePlanCode = hasPaidAccess ? context.subscription!.planCode : 'free';
  const plan = plans.find((item) => item.code === effectivePlanCode)
    ?? DEFAULT_BILLING_PLANS.find((item) => item.code === effectivePlanCode);
  const monthlyLimit = plan?.aiMonthlyLimit ?? 20;
  const admin = getSupabaseAdminClient();
  if (!admin) return { monthlyLimit, used: 0 };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const usageResult = await admin
    .from('ai_usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', context.workspace.id)
    .gte('created_at', monthStart.toISOString());

  return {
    monthlyLimit,
    used: usageResult.error ? 0 : Math.min(monthlyLimit, usageResult.count ?? 0),
  };
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
