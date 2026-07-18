import { requireWorkspaceContext } from '@/src/lib/auth';
import { getSupabaseAdminClient } from '@/src/lib/supabase';
import { DEFAULT_BILLING_PLANS, normalizeBillingPlan, type BillingPlan } from '@/src/lib/billing';
import type { AdminPlanCode, AdminSubscriptionInvoice, AdminSubscriptionStatus, SuperAdminViewModel } from '@/src/lib/superadmin-types';

type Row = Record<string, unknown>;

function dateValue(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}

function metadataValue(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function planCode(value: unknown): AdminPlanCode {
  return value === 'business' || value === 'personal_pro' ? value : 'free';
}

function subscriptionStatus(value: unknown): AdminSubscriptionStatus {
  return value === 'trialing' || value === 'past_due' || value === 'canceled' || value === 'paused' ? value : 'active';
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - ((day + 6) % 7));
  return copy;
}

async function loadWorkspaceRows(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
): Promise<{ data: Row[]; errorMessage: string | null }> {
  const currentSchemaResult = await admin
    .from('workspaces')
    .select('id, owner_user_id, name, status, onboarding_completed, created_at');

  if (!currentSchemaResult.error) {
    return {
      data: (currentSchemaResult.data ?? []) as Row[],
      errorMessage: null,
    };
  }

  // Algunos entornos existentes todavía no tienen la columna añadida por la
  // migración de onboarding. Esos espacios son anteriores al nuevo flujo, así
  // que se consideran ya incorporados y el panel puede seguir funcionando.
  if (!currentSchemaResult.error.message.includes('onboarding_completed')) {
    return {
      data: [] as Row[],
      errorMessage: currentSchemaResult.error.message,
    };
  }

  const legacySchemaResult = await admin
    .from('workspaces')
    .select('id, owner_user_id, name, status, created_at');

  return {
    data: ((legacySchemaResult.data ?? []) as Row[]).map((workspace): Row => ({
      ...workspace,
      onboarding_completed: true,
    })),
    errorMessage: legacySchemaResult.error?.message ?? null,
  };
}

export async function loadSuperAdminViewModel(): Promise<SuperAdminViewModel | null> {
  const context = await requireWorkspaceContext();
  if (!context.profile.isSuperAdmin) return null;

  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error('Supabase admin client no disponible.');

  const [profilesResult, workspacesResult, subscriptionsResult, plansResult, invoicesResult, sessionsResult, aiResult] = await Promise.all([
    admin.from('profiles').select('id, email, full_name, is_superadmin, created_at, updated_at').order('created_at', { ascending: false }),
    loadWorkspaceRows(admin),
    admin.from('workspace_subscriptions').select('id, workspace_id, plan_code, status, trial_ends_at, metadata, created_at').order('created_at', { ascending: false }),
    admin.from('subscription_plans').select('code, name, monthly_price_cop, active, metadata').order('monthly_price_cop', { ascending: true }),
    admin.from('subscription_invoices').select('id, workspace_id, plan_code, amount_cop, status, due_at, paid_at, created_at').order('created_at', { ascending: false }).limit(100),
    admin.from('app_usage_sessions').select('workspace_id, user_id, started_at, last_seen_at, duration_seconds').gte('last_seen_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
    admin.from('ai_usage_events').select('workspace_id, user_id, input_tokens, output_tokens, total_tokens, status, created_at').gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  if (profilesResult.error) throw new Error(`No se pudieron leer los clientes: ${profilesResult.error.message}`);
  if (workspacesResult.errorMessage) throw new Error(`No se pudieron leer los espacios: ${workspacesResult.errorMessage}`);
  if (subscriptionsResult.error) throw new Error(`No se pudieron leer las suscripciones: ${subscriptionsResult.error.message}`);

  const profiles = (profilesResult.data ?? []) as Row[];
  const workspaces = workspacesResult.data;
  const subscriptions = (subscriptionsResult.data ?? []) as Row[];
  const loadedPlans = plansResult.error ? [] : ((plansResult.data ?? []) as Row[])
    .map((row) => normalizeBillingPlan(row))
    .filter((plan): plan is BillingPlan => Boolean(plan));
  const plans = loadedPlans.length ? loadedPlans : DEFAULT_BILLING_PLANS;
  const sessions = sessionsResult.error ? [] : (sessionsResult.data ?? []) as Row[];
  const aiEvents = aiResult.error ? [] : (aiResult.data ?? []) as Row[];
  const telemetryReady = !sessionsResult.error && !aiResult.error;
  const billingReady = !invoicesResult.error;

  const workspaceByOwner = new Map(workspaces.map((row) => [String(row.owner_user_id), row]));
  const subscriptionByWorkspace = new Map<string, Row>();
  for (const row of subscriptions) {
    const key = String(row.workspace_id);
    if (!subscriptionByWorkspace.has(key)) subscriptionByWorkspace.set(key, row);
  }

  const sessionsByUser = new Map<string, Row[]>();
  for (const row of sessions) {
    const key = String(row.user_id);
    sessionsByUser.set(key, [...(sessionsByUser.get(key) ?? []), row]);
  }
  const aiByUser = new Map<string, Row[]>();
  for (const row of aiEvents) {
    const key = String(row.user_id);
    aiByUser.set(key, [...(aiByUser.get(key) ?? []), row]);
  }

  const now = Date.now();
  const clients = profiles.flatMap((profile) => {
    const userId = String(profile.id);
    const workspace = workspaceByOwner.get(userId);
    if (!workspace) return [];
    const workspaceId = String(workspace.id);
    const subscription = subscriptionByWorkspace.get(workspaceId);
    const metadata = metadataValue(subscription?.metadata);
    const userSessions = sessionsByUser.get(userId) ?? [];
    const userAi = aiByUser.get(userId) ?? [];
    const lastSession = userSessions.map((row) => dateValue(row.last_seen_at)).filter(Boolean).sort().at(-1) ?? null;
    const fallbackActivity = dateValue(profile.updated_at) ?? dateValue(profile.created_at);

    return [{
      userId,
      workspaceId,
      fullName: String(profile.full_name ?? profile.email ?? 'Usuario de Arca'),
      email: String(profile.email ?? ''),
      isSuperAdmin: Boolean(profile.is_superadmin),
      joinedAt: dateValue(profile.created_at) ?? new Date(0).toISOString(),
      lastActiveAt: lastSession ?? fallbackActivity,
      activeMinutes: Math.round(userSessions.reduce((sum, row) => sum + Number(row.duration_seconds ?? 0), 0) / 60),
      sessionCount: userSessions.length,
      aiRequests: userAi.length,
      onboardingCompleted: Boolean(workspace.onboarding_completed),
      workspaceStatus: String(workspace.status ?? 'active'),
      planCode: planCode(subscription?.plan_code),
      subscriptionStatus: subscriptionStatus(subscription?.status),
      trialEndsAt: dateValue(subscription?.trial_ends_at),
      vipFullAccess: Boolean(metadata.vip_full_access) && (!dateValue(metadata.vip_expires_at) || new Date(String(metadata.vip_expires_at)).getTime() > now),
      vipReason: typeof metadata.vip_reason === 'string' ? metadata.vip_reason : null,
      vipExpiresAt: dateValue(metadata.vip_expires_at),
    }];
  });
  const clientByWorkspace = new Map(clients.map((client) => [client.workspaceId, client]));
  const invoices = (billingReady ? (invoicesResult.data ?? []) as Row[] : []).map((row) => {
    const client = clientByWorkspace.get(String(row.workspace_id));
    const rawStatus = String(row.status);
    const status: AdminSubscriptionInvoice['status'] = rawStatus === 'paid' || rawStatus === 'overdue' || rawStatus === 'void' ? rawStatus : 'pending';
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      clientName: client?.fullName ?? 'Cliente de Arca',
      clientEmail: client?.email ?? '',
      planCode: planCode(row.plan_code),
      amountCop: Number(row.amount_cop ?? 0),
      status,
      dueAt: dateValue(row.due_at) ?? new Date(0).toISOString(),
      paidAt: dateValue(row.paid_at),
      createdAt: dateValue(row.created_at) ?? new Date(0).toISOString(),
    };
  });

  const cutoff7d = now - 7 * 24 * 60 * 60 * 1000;
  const cutoff30d = now - 30 * 24 * 60 * 60 * 1000;
  const ai30d = aiEvents.filter((row) => new Date(String(row.created_at)).getTime() >= cutoff30d);
  const sessions30d = sessions.filter((row) => new Date(String(row.last_seen_at)).getTime() >= cutoff30d);
  const planPriceByCode = new Map(plans.map((plan) => [plan.code, plan.monthlyPriceCop]));
  const payingClients = clients.filter((client) => (
    client.subscriptionStatus === 'active'
    && client.planCode !== 'free'
    && !client.vipFullAccess
    && !client.isSuperAdmin
  ));
  const commercialClients = clients.filter((client) => !client.isSuperAdmin);
  const monthlyRecurringRevenue = payingClients.reduce((sum, client) => sum + (planPriceByCode.get(client.planCode) ?? 0), 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const collectedThisMonth = invoices.filter((invoice) => invoice.status === 'paid' && invoice.paidAt && new Date(invoice.paidAt) >= monthStart).reduce((sum, invoice) => sum + invoice.amountCop, 0);
  const openInvoices = invoices.filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue');

  const growth = Array.from({ length: 6 }, (_, index) => {
    const weekStart = startOfWeek(new Date(now - (5 - index) * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const activeUsers = new Set(sessions.filter((row) => {
      const date = new Date(String(row.last_seen_at));
      return date >= weekStart && date < weekEnd;
    }).map((row) => String(row.user_id)));
    return {
      label: new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(weekStart),
      newClients: clients.filter((client) => {
        const joined = new Date(client.joinedAt);
        return joined >= weekStart && joined < weekEnd;
      }).length,
      activeClients: activeUsers.size,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    telemetryReady,
    billingReady,
    summary: {
      totalClients: clients.length,
      newClients30d: clients.filter((client) => new Date(client.joinedAt).getTime() >= cutoff30d).length,
      activeClients7d: clients.filter((client) => client.lastActiveAt && new Date(client.lastActiveAt).getTime() >= cutoff7d).length,
      recurringClients30d: clients.filter((client) => client.sessionCount >= 2 && client.lastActiveAt && new Date(client.lastActiveAt).getTime() >= cutoff30d).length,
      trialingClients: commercialClients.filter((client) => client.subscriptionStatus === 'trialing').length,
      vipClients: commercialClients.filter((client) => client.vipFullAccess).length,
      pastDueClients: commercialClients.filter((client) => client.subscriptionStatus === 'past_due').length,
      aiRequests30d: ai30d.length,
      aiTokens30d: ai30d.reduce((sum, row) => sum + Number(row.total_tokens ?? Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0)), 0),
      aiErrors30d: ai30d.filter((row) => String(row.status) === 'error').length,
      activeMinutes30d: Math.round(sessions30d.reduce((sum, row) => sum + Number(row.duration_seconds ?? 0), 0) / 60),
      monthlyRecurringRevenue,
      annualRunRate: monthlyRecurringRevenue * 12,
      payingClients: payingClients.length,
      averageRevenuePerPayingClient: payingClients.length ? Math.round(monthlyRecurringRevenue / payingClients.length) : 0,
      collectedThisMonth,
      pendingRevenue: openInvoices.reduce((sum, invoice) => sum + invoice.amountCop, 0),
      overdueInvoices: openInvoices.filter((invoice) => invoice.status === 'overdue' || new Date(invoice.dueAt).getTime() < now).length,
    },
    clients,
    plans,
    invoices,
    growth,
  };
}
