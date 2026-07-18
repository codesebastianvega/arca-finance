'use server';

import { requireWorkspaceContext } from '@/src/lib/auth';
import { getSupabaseAdminClient } from '@/src/lib/supabase';
import webpush from 'web-push';

export type BrowserPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

export async function getPushConfiguration() {
  await requireWorkspaceContext();
  return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
}

export async function savePushSubscription(input: BrowserPushSubscription & { userAgent?: string }) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error('No se pudo habilitar el servicio de notificaciones.');
  if (!input.endpoint?.startsWith('https://') || !input.keys?.p256dh || !input.keys?.auth) throw new Error('La suscripción del dispositivo no es válida.');

  const { error } = await admin.from('push_subscriptions').upsert({
    workspace_id: context.workspace.id,
    user_id: context.profile.id,
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    expiration_time: input.expirationTime ?? null,
    user_agent: input.userAgent?.slice(0, 500) ?? null,
    timezone: context.workspace.timezone || 'America/Bogota',
    active: true,
    failure_count: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (error) throw new Error(`No se pudo guardar este dispositivo: ${error.message}`);
  return { ok: true };
}

export async function disablePushSubscription(endpoint: string) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error('No se pudo desactivar el servicio de notificaciones.');
  const { error } = await admin.from('push_subscriptions').update({ active: false, updated_at: new Date().toISOString() }).eq('workspace_id', context.workspace.id).eq('endpoint', endpoint);
  if (error) throw new Error(`No se pudo desactivar este dispositivo: ${error.message}`);
  return { ok: true };
}

export async function sendTestPush(endpoint: string) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error('No se pudo iniciar la prueba.');
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error('Faltan las claves VAPID en el servidor.');
  const { data, error } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('workspace_id', context.workspace.id).eq('endpoint', endpoint).eq('active', true).maybeSingle();
  if (error || !data) throw new Error('Este dispositivo todavía no está registrado en Arca.');
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:soporte@arca.app', publicKey, privateKey);
  await webpush.sendNotification({ endpoint: String(data.endpoint), keys: { p256dh: String(data.p256dh), auth: String(data.auth) } }, JSON.stringify({ title: 'Arca ya puede avisarte', body: 'Las notificaciones están funcionando correctamente en este dispositivo.', url: '/app?open=notifications', tag: `arca-test-${Date.now()}` }));
  return { ok: true };
}
