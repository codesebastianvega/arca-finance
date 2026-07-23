import webpush from 'web-push';
import { getSupabaseAdminClient } from '@/src/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

type PushSubscriptionRow = { id: string; workspace_id: string; endpoint: string; p256dh: string; auth: string; failure_count: number | null };
type ScheduledEventRow = { id: string; workspace_id: string; due_date: string; title: string; amount: number | string; status: string };
type SavingsChainRow = { id: string; workspace_id: string; name: string; contribution_amount: number; total_rounds: number; user_turn_number: number; status: string };

function bogotaDate(offsetDays = 0) {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
  const current = formatter.format(new Date());
  const date = new Date(`${current}T12:00:00-05:00`);
  date.setDate(date.getDate() + offsetDays);
  return formatter.format(date);
}

function money(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) return new Response('Unauthorized', { status: 401 });

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@arca.app';
  if (!publicKey || !privateKey) return Response.json({ ok: false, error: 'VAPID no configurado' }, { status: 503 });
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const admin = getSupabaseAdminClient();
  if (!admin) return Response.json({ ok: false, error: 'Supabase admin no disponible' }, { status: 503 });
  const today = bogotaDate();
  const endDate = bogotaDate(3);
  const recentPast = bogotaDate(-7);

  const [subscriptionsResult, eventsResult] = await Promise.all([
    admin.from('push_subscriptions').select('id, workspace_id, endpoint, p256dh, auth, failure_count').eq('active', true),
    admin.from('scheduled_events').select('id, workspace_id, due_date, title, amount, status').gte('due_date', recentPast).lte('due_date', endDate).in('status', ['scheduled', 'pending', 'overdue']),
  ]);

  let activeChains: any[] = [];
  try {
    const chainsResult = await admin.from('savings_chains').select('id, workspace_id, name, contribution_amount, total_rounds, user_turn_number, status').eq('status', 'active');
    activeChains = (chainsResult.data ?? []) as any[];
  } catch {
    // savings_chains table may not exist yet – skip gracefully
  }

  if (subscriptionsResult.error || eventsResult.error) {
    return Response.json({ ok: false, error: subscriptionsResult.error?.message ?? eventsResult.error?.message }, { status: 500 });
  }

  const subscriptions = (subscriptionsResult.data ?? []) as PushSubscriptionRow[];
  const events = (eventsResult.data ?? []) as ScheduledEventRow[];

  const eventsByWorkspace = new Map<string, ScheduledEventRow[]>();
  for (const event of events) eventsByWorkspace.set(event.workspace_id, [...(eventsByWorkspace.get(event.workspace_id) ?? []), event]);

  const chainsByWorkspace = new Map<string, any[]>();
  for (const chain of activeChains) chainsByWorkspace.set(chain.workspace_id, [...(chainsByWorkspace.get(chain.workspace_id) ?? []), chain]);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const subscription of subscriptions) {
    const workspaceEvents = eventsByWorkspace.get(subscription.workspace_id) ?? [];
    const workspaceChains = chainsByWorkspace.get(subscription.workspace_id) ?? [];

    if (!workspaceEvents.length && !workspaceChains.length) continue;

    const eventKey = `financial-digest:${today}`;
    const existing = await admin.from('push_notification_deliveries').select('id, status').eq('subscription_id', subscription.id).eq('event_key', eventKey).maybeSingle();
    if (existing.data?.status === 'sent') { skipped += 1; continue; }

    const overdue = workspaceEvents.filter((event) => event.due_date < today);
    const todayItems = workspaceEvents.filter((event) => event.due_date === today);
    const total = workspaceEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0);

    let title = 'Tus compromisos y Cadenas de Ahorro';
    let body = `${workspaceEvents.length} compromisos por ${money(total)}. Toca para organizarlos con Arca.`;

    if (workspaceChains.length > 0 && !overdue.length) {
      const chain = workspaceChains[0];
      const pot = Number(chain.contribution_amount || 0) * Number(chain.total_rounds || 1);
      title = `🎉 Cadena activa: ${chain.name}`;
      body = `Recuerda tu participación en ${chain.name} (Bolsa de ${money(pot)}). Revisa tus turnos en Arca.`;
    } else if (overdue.length) {
      title = `Tienes ${overdue.length} ${overdue.length === 1 ? 'pago vencido' : 'pagos vencidos'}`;
    } else if (todayItems.length) {
      title = `${todayItems.length} ${todayItems.length === 1 ? 'compromiso vence' : 'compromisos vencen'} hoy`;
    }

    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify({ title, body, url: '/app?open=cadenas', tag: eventKey })
      );
      await admin.from('push_notification_deliveries').upsert({ subscription_id: subscription.id, workspace_id: subscription.workspace_id, event_key: eventKey, status: 'sent', sent_at: new Date().toISOString(), error_message: null, payload: { title, body, event_ids: workspaceEvents.map((event) => event.id) } }, { onConflict: 'subscription_id,event_key' });
      await admin.from('push_subscriptions').update({ last_success_at: new Date().toISOString(), failure_count: 0, updated_at: new Date().toISOString() }).eq('id', subscription.id);
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0;
      const shouldDisable = statusCode === 404 || statusCode === 410;
      await admin.from('push_subscriptions').update({ active: shouldDisable ? false : true, failure_count: (subscription.failure_count ?? 0) + 1, updated_at: new Date().toISOString() }).eq('id', subscription.id);
      await admin.from('push_notification_deliveries').upsert({ subscription_id: subscription.id, workspace_id: subscription.workspace_id, event_key: eventKey, status: 'failed', error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Error desconocido', payload: { event_ids: workspaceEvents.map((event) => event.id) } }, { onConflict: 'subscription_id,event_key' });
      failed += 1;
    }
  }

  return Response.json({ ok: true, date: today, subscriptions: subscriptions.length, sent, skipped, failed });
}
