"use server";

import { requireWorkspaceContext } from "@/src/lib/auth";
import { createSupabaseServerComponentClient, getSupabaseAdminClient } from "@/src/lib/supabase";

export type NovaQuotaInfo = {
  usedTokens: number;
  limitTokens: number;
  percentageUsed: number;
  remainingTokens: number;
  isExceeded: boolean;
  globalExceeded: boolean;
  planName: string;
};

export async function getNovaDailyTokenQuota(): Promise<NovaQuotaInfo> {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient() || (await createSupabaseServerComponentClient());

  const FREE_DAILY_LIMIT = 20000;
  const INTERMEDIATE_DAILY_LIMIT = 50000;
  const PRO_DAILY_LIMIT = 200000;
  const GLOBAL_DAILY_LIMIT = 1000000;

  const vipExpiresAt = typeof context.subscription?.metadata?.vip_expires_at === "string"
    ? new Date(context.subscription.metadata.vip_expires_at).getTime()
    : null;
  const hasVipAccess = Boolean(context.subscription?.metadata?.vip_full_access) && (!vipExpiresAt || vipExpiresAt > Date.now());
  const planCode = (context.subscription?.planCode || "free") as string;

  let limitTokens = FREE_DAILY_LIMIT;
  let planName = "Plan Gratuito";

  if (hasVipAccess || planCode === "business" || planCode === "pro") {
    limitTokens = PRO_DAILY_LIMIT;
    planName = "Plan Pro / VIP";
  } else if (planCode === "personal_pro" || planCode === "personal") {
    limitTokens = INTERMEDIATE_DAILY_LIMIT;
    planName = "Plan Personal";
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  let usedTokens = 0;
  let globalUsedTokens = 0;

  if (admin) {
    // 1. Sum workspace daily tokens
    const { data: userEvents, error: userErr } = await admin
      .from("ai_usage_events")
      .select("total_tokens")
      .eq("workspace_id", context.workspace.id)
      .gte("created_at", todayStartIso);

    if (!userErr && userEvents) {
      usedTokens = userEvents.reduce((sum, row) => sum + (Number(row.total_tokens) || 1000), 0);
    }

    // 2. Sum global app daily tokens
    const { data: globalEvents, error: globalErr } = await admin
      .from("ai_usage_events")
      .select("total_tokens")
      .gte("created_at", todayStartIso);

    if (!globalErr && globalEvents) {
      globalUsedTokens = globalEvents.reduce((sum, row) => sum + (Number(row.total_tokens) || 1000), 0);
    }
  }

  const percentageUsed = Math.min(100, Math.round((usedTokens / limitTokens) * 100));
  const remainingTokens = Math.max(0, limitTokens - usedTokens);
  const isExceeded = usedTokens >= limitTokens;
  const globalExceeded = globalUsedTokens >= GLOBAL_DAILY_LIMIT;

  return {
    usedTokens,
    limitTokens,
    percentageUsed,
    remainingTokens,
    isExceeded,
    globalExceeded,
    planName,
  };
}
