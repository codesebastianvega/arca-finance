'use server';

import { getCurrentWorkspaceContext } from '@/src/lib/auth';
import { getSupabaseAdminClient } from '@/src/lib/supabase';

export async function recordAppUsage(input: { sessionKey: string; activeSeconds: number }) {
  const context = await getCurrentWorkspaceContext();
  const admin = getSupabaseAdminClient();
  if (!context || !admin || !input.sessionKey || input.activeSeconds <= 0) return { ok: false };

  const existing = await admin.from('app_usage_sessions').select('id, duration_seconds').eq('session_key', input.sessionKey).eq('user_id', context.profile.id).maybeSingle();
  if (existing.error) return { ok: false };

  if (existing.data) {
    const result = await admin.from('app_usage_sessions').update({
      last_seen_at: new Date().toISOString(),
      duration_seconds: Number(existing.data.duration_seconds ?? 0) + Math.min(input.activeSeconds, 300),
    }).eq('id', existing.data.id);
    return { ok: !result.error };
  }

  const result = await admin.from('app_usage_sessions').insert({
    workspace_id: context.workspace.id,
    user_id: context.profile.id,
    session_key: input.sessionKey,
    started_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    duration_seconds: Math.min(input.activeSeconds, 300),
  });
  return { ok: !result.error };
}
