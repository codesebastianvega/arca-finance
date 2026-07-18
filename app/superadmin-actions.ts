'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspaceContext } from '@/src/lib/auth';
import { getSupabaseAdminClient } from '@/src/lib/supabase';
import type { AdminPlanCode, AdminSubscriptionStatus } from '@/src/lib/superadmin-types';

async function requireSuperAdmin() {
  const context = await requireWorkspaceContext();
  if (!context.profile.isSuperAdmin) throw new Error('No tienes permisos de SuperAdmin.');
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error('Supabase admin client no disponible.');
  return { context, admin };
}

async function latestSubscription(admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, workspaceId: string) {
  const result = await admin
    .from('workspace_subscriptions')
    .select('id, plan_code, status, metadata')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(`No se pudo leer la suscripción: ${result.error.message}`);
  return result.data;
}

async function audit(admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, input: { actorUserId: string; workspaceId: string; action: string; previous: unknown; next: unknown; note?: string }) {
  await admin.from('admin_audit_log').insert({
    actor_user_id: input.actorUserId,
    workspace_id: input.workspaceId,
    action: input.action,
    previous_value: input.previous ?? {},
    next_value: input.next ?? {},
    note: input.note?.trim() || null,
  });
}

export async function adminChangePlan(input: { workspaceId: string; planCode: AdminPlanCode; note?: string }) {
  const { context, admin } = await requireSuperAdmin();
  const subscription = await latestSubscription(admin, input.workspaceId);
  const next = { plan_code: input.planCode, status: 'active' as AdminSubscriptionStatus, updated_at: new Date().toISOString() };

  if (subscription) {
    const result = await admin.from('workspace_subscriptions').update(next).eq('id', subscription.id).eq('workspace_id', input.workspaceId);
    if (result.error) throw new Error(`No se pudo cambiar el plan: ${result.error.message}`);
  } else {
    const result = await admin.from('workspace_subscriptions').insert({ workspace_id: input.workspaceId, ...next, provider: 'manual', starts_at: new Date().toISOString() });
    if (result.error) throw new Error(`No se pudo crear el plan: ${result.error.message}`);
  }

  await audit(admin, { actorUserId: context.profile.id, workspaceId: input.workspaceId, action: 'change_plan', previous: subscription, next, note: input.note });
  revalidatePath('/app');
  return { ok: true };
}

export async function adminSetSubscriptionStatus(input: { workspaceId: string; status: AdminSubscriptionStatus; note?: string }) {
  const { context, admin } = await requireSuperAdmin();
  const subscription = await latestSubscription(admin, input.workspaceId);
  if (!subscription) throw new Error('Este cliente no tiene una suscripción para actualizar.');
  const next = { status: input.status, ends_at: input.status === 'canceled' ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
  const result = await admin.from('workspace_subscriptions').update(next).eq('id', subscription.id).eq('workspace_id', input.workspaceId);
  if (result.error) throw new Error(`No se pudo actualizar la suscripción: ${result.error.message}`);
  await audit(admin, { actorUserId: context.profile.id, workspaceId: input.workspaceId, action: 'change_subscription_status', previous: subscription, next, note: input.note });
  revalidatePath('/app');
  return { ok: true };
}

export async function adminSetVipAccess(input: { workspaceId: string; enabled: boolean; reason?: string; expiresAt?: string | null }) {
  const { context, admin } = await requireSuperAdmin();
  const subscription = await latestSubscription(admin, input.workspaceId);
  if (!subscription) throw new Error('Este cliente no tiene una suscripción base.');
  const currentMetadata = subscription.metadata && typeof subscription.metadata === 'object' ? subscription.metadata as Record<string, unknown> : {};
  const metadata = {
    ...currentMetadata,
    vip_full_access: input.enabled,
    vip_reason: input.enabled ? input.reason?.trim() || 'Cortesía SuperAdmin' : null,
    vip_expires_at: input.enabled && input.expiresAt ? new Date(`${input.expiresAt}T23:59:59-05:00`).toISOString() : null,
    vip_granted_by: input.enabled ? context.profile.id : null,
    vip_updated_at: new Date().toISOString(),
  };
  const result = await admin.from('workspace_subscriptions').update({ metadata, updated_at: new Date().toISOString() }).eq('id', subscription.id).eq('workspace_id', input.workspaceId);
  if (result.error) throw new Error(`No se pudo actualizar el acceso VIP: ${result.error.message}`);
  await audit(admin, { actorUserId: context.profile.id, workspaceId: input.workspaceId, action: input.enabled ? 'grant_vip' : 'revoke_vip', previous: currentMetadata, next: metadata, note: input.reason });
  revalidatePath('/app');
  return { ok: true };
}

export async function adminSetWorkspaceStatus(input: { workspaceId: string; status: 'active' | 'paused'; note?: string }) {
  const { context, admin } = await requireSuperAdmin();
  const previous = await admin.from('workspaces').select('id, status').eq('id', input.workspaceId).maybeSingle();
  if (previous.error || !previous.data) throw new Error('No se encontró el espacio del cliente.');
  const result = await admin.from('workspaces').update({ status: input.status, updated_at: new Date().toISOString() }).eq('id', input.workspaceId);
  if (result.error) throw new Error(`No se pudo actualizar la cuenta: ${result.error.message}`);
  await audit(admin, { actorUserId: context.profile.id, workspaceId: input.workspaceId, action: input.status === 'paused' ? 'pause_workspace' : 'activate_workspace', previous: previous.data, next: { status: input.status }, note: input.note });
  revalidatePath('/app');
  return { ok: true };
}

export async function adminUpdateBillingPlan(input: {
  planCode: AdminPlanCode;
  monthlyPriceCop: number;
  aiMonthlyLimit: number;
  active: boolean;
}) {
  const { context, admin } = await requireSuperAdmin();
  if (!Number.isInteger(input.monthlyPriceCop) || input.monthlyPriceCop < 0 || input.monthlyPriceCop > 10_000_000) {
    throw new Error('El precio mensual no es válido.');
  }
  if (!Number.isInteger(input.aiMonthlyLimit) || input.aiMonthlyLimit < 0 || input.aiMonthlyLimit > 100_000) {
    throw new Error('El límite mensual de Nova no es válido.');
  }

  const previous = await admin
    .from('subscription_plans')
    .select('code, name, monthly_price_cop, active, metadata')
    .eq('code', input.planCode)
    .maybeSingle();
  if (previous.error || !previous.data) throw new Error('No se encontró el plan comercial.');

  const currentMetadata = previous.data.metadata && typeof previous.data.metadata === 'object'
    ? previous.data.metadata as Record<string, unknown>
    : {};
  const next = {
    monthly_price_cop: input.monthlyPriceCop,
    active: input.planCode === 'free' ? true : input.active,
    metadata: { ...currentMetadata, ai_monthly_limit: input.aiMonthlyLimit },
    updated_at: new Date().toISOString(),
  };
  const result = await admin.from('subscription_plans').update(next).eq('code', input.planCode);
  if (result.error) throw new Error(`No se pudo actualizar el plan: ${result.error.message}`);
  await audit(admin, {
    actorUserId: context.profile.id,
    workspaceId: context.workspace.id,
    action: 'update_billing_plan',
    previous: previous.data,
    next: { plan_code: input.planCode, ...next },
  });
  revalidatePath('/app');
  return { ok: true };
}

export async function adminConfirmSubscriptionPayment(input: { invoiceId: string; reference?: string }) {
  const { context, admin } = await requireSuperAdmin();
  const invoiceResult = await admin
    .from('subscription_invoices')
    .select('id, workspace_id, subscription_id, plan_code, amount_cop, status, period_start, period_end, due_at')
    .eq('id', input.invoiceId)
    .maybeSingle();
  if (invoiceResult.error || !invoiceResult.data) throw new Error('No se encontró el cobro.');
  const invoice = invoiceResult.data;
  if (invoice.status === 'paid') return { ok: true };

  const now = new Date().toISOString();
  const invoiceUpdate = await admin.from('subscription_invoices').update({ status: 'paid', paid_at: now, updated_at: now }).eq('id', input.invoiceId);
  if (invoiceUpdate.error) throw new Error(`No se pudo confirmar el cobro: ${invoiceUpdate.error.message}`);
  await admin.from('subscription_payments').update({
    status: 'confirmed',
    reference: input.reference?.trim() || null,
    confirmed_by: context.profile.id,
    confirmed_at: now,
    updated_at: now,
  }).eq('invoice_id', input.invoiceId).eq('status', 'pending');

  const subscription = await latestSubscription(admin, String(invoice.workspace_id));
  const subscriptionValues = {
    plan_code: String(invoice.plan_code) as AdminPlanCode,
    status: 'active' as AdminSubscriptionStatus,
    provider: 'manual',
    starts_at: now,
    ends_at: new Date(`${String(invoice.period_end)}T23:59:59-05:00`).toISOString(),
    updated_at: now,
  };
  if (subscription) {
    const result = await admin.from('workspace_subscriptions').update(subscriptionValues).eq('id', subscription.id);
    if (result.error) throw new Error(`El pago quedó registrado, pero no se pudo activar el plan: ${result.error.message}`);
  } else {
    const result = await admin.from('workspace_subscriptions').insert({ workspace_id: invoice.workspace_id, ...subscriptionValues });
    if (result.error) throw new Error(`El pago quedó registrado, pero no se pudo crear el plan: ${result.error.message}`);
  }

  const nextPeriodStart = String(invoice.period_end);
  const nextPeriodEndDate = new Date(`${nextPeriodStart}T12:00:00-05:00`);
  nextPeriodEndDate.setMonth(nextPeriodEndDate.getMonth() + 1);
  const nextPeriodEnd = nextPeriodEndDate.toISOString().slice(0, 10);
  const existingNext = await admin.from('subscription_invoices').select('id').eq('workspace_id', invoice.workspace_id).eq('plan_code', invoice.plan_code).eq('period_start', nextPeriodStart).limit(1).maybeSingle();
  if (!existingNext.data) {
    const nextInvoice = await admin.from('subscription_invoices').insert({
      workspace_id: invoice.workspace_id,
      subscription_id: subscription?.id ?? invoice.subscription_id ?? null,
      plan_code: invoice.plan_code,
      amount_cop: invoice.amount_cop,
      period_start: nextPeriodStart,
      period_end: nextPeriodEnd,
      due_at: new Date(`${nextPeriodStart}T23:59:59-05:00`).toISOString(),
      status: 'pending',
      metadata: { renewal_invoice: true },
    }).select('id, due_at').single();
    if (nextInvoice.data) {
      const dueAt = new Date(String(nextInvoice.data.due_at));
      const reminderAt = (offsetDays: number) => new Date(dueAt.getTime() + offsetDays * 24 * 60 * 60 * 1000).toISOString();
      await admin.from('subscription_reminders').upsert([
        { invoice_id: nextInvoice.data.id, workspace_id: invoice.workspace_id, reminder_type: 'three_days_before', scheduled_for: reminderAt(-3) },
        { invoice_id: nextInvoice.data.id, workspace_id: invoice.workspace_id, reminder_type: 'due_today', scheduled_for: reminderAt(0) },
        { invoice_id: nextInvoice.data.id, workspace_id: invoice.workspace_id, reminder_type: 'one_day_overdue', scheduled_for: reminderAt(1) },
        { invoice_id: nextInvoice.data.id, workspace_id: invoice.workspace_id, reminder_type: 'grace_ending', scheduled_for: reminderAt(3) },
      ], { onConflict: 'invoice_id,reminder_type,channel', ignoreDuplicates: true });
    }
  }

  await audit(admin, { actorUserId: context.profile.id, workspaceId: String(invoice.workspace_id), action: 'confirm_subscription_payment', previous: invoice, next: { status: 'paid', plan_code: invoice.plan_code }, note: input.reference });
  revalidatePath('/app');
  return { ok: true };
}

export async function adminRejectSubscriptionPayment(input: { invoiceId: string; note?: string }) {
  const { context, admin } = await requireSuperAdmin();
  const invoice = await admin.from('subscription_invoices').select('id, workspace_id, status').eq('id', input.invoiceId).maybeSingle();
  if (invoice.error || !invoice.data) throw new Error('No se encontró el cobro.');
  const result = await admin.from('subscription_invoices').update({ status: 'void', updated_at: new Date().toISOString(), metadata: { rejection_note: input.note?.trim() || null } }).eq('id', input.invoiceId);
  if (result.error) throw new Error(`No se pudo rechazar el comprobante: ${result.error.message}`);
  await admin.from('subscription_payments').update({ status: 'rejected', updated_at: new Date().toISOString(), metadata: { rejection_note: input.note?.trim() || null } }).eq('invoice_id', input.invoiceId).eq('status', 'pending');
  await audit(admin, { actorUserId: context.profile.id, workspaceId: String(invoice.data.workspace_id), action: 'reject_subscription_payment', previous: invoice.data, next: { status: 'void' }, note: input.note });
  revalidatePath('/app');
  return { ok: true };
}
