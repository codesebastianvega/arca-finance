'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspaceContext } from '@/src/lib/auth';
import { getSupabaseAdminClient } from '@/src/lib/supabase';
import type { AdminPlanCode } from '@/src/lib/superadmin-types';

export async function requestSubscriptionPayment(input: { planCode: Exclude<AdminPlanCode, 'free'> }) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error('No se pudo iniciar la solicitud de pago.');

  const planResult = await admin.from('subscription_plans').select('code, monthly_price_cop, active').eq('code', input.planCode).maybeSingle();
  if (planResult.error || !planResult.data || planResult.data.active === false) throw new Error('Este plan no está disponible.');
  const amountCop = Number(planResult.data.monthly_price_cop ?? 0);
  if (amountCop <= 0) throw new Error('El plan todavía no tiene un precio válido.');

  // Una nueva elección reemplaza solicitudes abiertas de otro plan para no
  // duplicar el valor pendiente del cliente ni del panel administrativo.
  await admin.from('subscription_invoices').update({ status: 'void', updated_at: new Date().toISOString() })
    .eq('workspace_id', context.workspace.id)
    .in('status', ['pending', 'overdue'])
    .neq('plan_code', input.planCode);

  const existing = await admin
    .from('subscription_invoices')
    .select('id, amount_cop')
    .eq('workspace_id', context.workspace.id)
    .eq('plan_code', input.planCode)
    .in('status', ['pending', 'overdue'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error && !existing.error.message.includes('subscription_invoices')) throw new Error(`No se pudo revisar el cobro: ${existing.error.message}`);

  let invoiceId = existing.data?.id ? String(existing.data.id) : '';
  let invoiceAmountCop = existing.data?.amount_cop == null ? amountCop : Number(existing.data.amount_cop);
  if (!invoiceId) {
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const invoiceResult = await admin.from('subscription_invoices').insert({
      workspace_id: context.workspace.id,
      subscription_id: context.subscription?.id ?? null,
      plan_code: input.planCode,
      amount_cop: amountCop,
      period_start: periodStart.toISOString().slice(0, 10),
      period_end: periodEnd.toISOString().slice(0, 10),
      due_at: periodStart.toISOString(),
      status: 'pending',
      metadata: { requested_by: context.profile.id, payment_key: '@JVH914' },
    }).select('id').single();
    if (invoiceResult.error || !invoiceResult.data) throw new Error('Falta aplicar la migración de cobros de suscripción en Supabase.');
    invoiceId = String(invoiceResult.data.id);
    invoiceAmountCop = amountCop;
    await admin.from('subscription_payments').insert({
      invoice_id: invoiceId,
      workspace_id: context.workspace.id,
      amount_cop: amountCop,
      method: 'nu_key',
      status: 'pending',
      metadata: { proof_channel: 'whatsapp' },
    });
  }

  revalidatePath('/app');
  return { invoiceId, amountCop: invoiceAmountCop };
}
