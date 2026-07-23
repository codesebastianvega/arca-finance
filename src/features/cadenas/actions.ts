"use server";

import { requireWorkspaceContext } from "@/src/lib/auth";
import { createSupabaseServerComponentClient, getSupabaseAdminClient } from "@/src/lib/supabase";
import type { SavingsChain, SavingsChainMember, SavingsChainsViewModel, ChainFrequency, ChainStatus } from "./types";

function calculateDaysBetweenRounds(frequency: ChainFrequency): number {
  switch (frequency) {
    case "daily": return 1;
    case "weekly_8d": return 8;
    case "biweekly_15d": return 15;
    case "monthly": return 30;
    default: return 15;
  }
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function getSavingsChainsViewModel(): Promise<SavingsChainsViewModel> {
  const context = await requireWorkspaceContext();
  const supabase = (await createSupabaseServerComponentClient()) || getSupabaseAdminClient();

  if (!supabase) {
    return { chains: [], totalActiveChains: 0, totalMonthlyCommitment: 0, nextUserPayout: null };
  }

  const { data: rawChains, error: chainsErr } = await supabase
    .from("savings_chains")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("created_at", { ascending: false });

  const dbChains = (rawChains || []) as any[];
  if (chainsErr || dbChains.length === 0) {
    return { chains: [], totalActiveChains: 0, totalMonthlyCommitment: 0, nextUserPayout: null };
  }

  const chainIds = dbChains.map((c) => c.id);
  const { data: rawMembers } = await supabase
    .from("savings_chain_members")
    .select("*")
    .in("chain_id", chainIds)
    .order("turn_number", { ascending: true });

  const dbMembers = (rawMembers || []) as any[];
  const membersByChain = new Map<string, SavingsChainMember[]>();
  dbMembers.forEach((m) => {
    const list = membersByChain.get(m.chain_id) || [];
    list.push({
      id: m.id,
      chainId: m.chain_id,
      turnNumber: m.turn_number,
      memberName: m.member_name,
      phone: m.phone,
      isCurrentUser: m.is_current_user,
      payoutStatus: m.payout_status,
      payoutDate: m.payout_date,
    });
    membersByChain.set(m.chain_id, list);
  });

  const todayStr = new Date().toISOString().split("T")[0];
  let totalMonthlyCommitment = 0;
  let nextUserPayout: SavingsChainsViewModel["nextUserPayout"] = null;

  const chains: SavingsChain[] = dbChains.map((row: any) => {
    const members = membersByChain.get(row.id) || [];
    const totalRounds = Math.max(row.total_rounds, members.length, 1);
    const contributionAmount = Number(row.contribution_amount) || 0;
    const totalPot = contributionAmount * totalRounds;

    const daysStep = calculateDaysBetweenRounds(row.frequency as ChainFrequency);
    const startDate = row.start_date || todayStr;

    // Calculate user payout date
    const userMember = members.find((m) => m.isCurrentUser) || members.find((m) => m.turnNumber === row.user_turn_number);
    const userTurn = userMember ? userMember.turnNumber : row.user_turn_number;
    const userPayoutDate = addDaysToDate(startDate, (userTurn - 1) * daysStep);
    const userHasBeenPaid = userMember ? userMember.payoutStatus === "paid" : false;

    // Estimate current round
    const startMs = new Date(startDate).getTime();
    const nowMs = Date.now();
    const diffDays = Math.max(0, Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24)));
    const currentRoundNumber = Math.min(totalRounds, Math.floor(diffDays / daysStep) + 1);

    // Estimate monthly commitment (approx 30 days)
    if (row.status === "active") {
      const roundsPerMonth = 30 / daysStep;
      totalMonthlyCommitment += Math.round(contributionAmount * roundsPerMonth);

      // Track next payout
      if (!userHasBeenPaid) {
        const payoutMs = new Date(userPayoutDate).getTime();
        const daysRem = Math.ceil((payoutMs - nowMs) / (1000 * 60 * 60 * 24));
        if (!nextUserPayout || daysRem < nextUserPayout.daysRemaining) {
          nextUserPayout = {
            chainName: row.name,
            amount: totalPot,
            date: userPayoutDate,
            daysRemaining: Math.max(0, daysRem),
          };
        }
      }
    }

    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      contributionAmount,
      frequency: row.frequency as ChainFrequency,
      startDate,
      totalRounds,
      userTurnNumber: userTurn,
      status: row.status as ChainStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      members,
      totalPot,
      currentRoundNumber,
      userPayoutDate,
      userHasBeenPaid,
    };
  });

  return {
    chains,
    totalActiveChains: chains.filter((c) => c.status === "active").length,
    totalMonthlyCommitment,
    nextUserPayout,
  };
}

export type CreateChainInput = {
  name: string;
  contributionAmount: number;
  frequency: ChainFrequency;
  startDate: string;
  userTurnNumber: number;
  members: Array<{
    turnNumber: number;
    memberName: string;
    phone?: string;
    isCurrentUser?: boolean;
  }>;
};

export async function createSavingsChain(input: CreateChainInput) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient() || (await createSupabaseServerComponentClient());
  if (!admin) throw new Error("Servicio de base de datos no disponible.");

  const totalRounds = input.members.length;

  const { data: chain, error: chainErr } = await admin
    .from("savings_chains")
    .insert({
      workspace_id: context.workspace.id,
      name: input.name,
      contribution_amount: input.contributionAmount,
      frequency: input.frequency,
      start_date: input.startDate,
      total_rounds: totalRounds,
      user_turn_number: input.userTurnNumber,
      status: "active",
    })
    .select()
    .single();

  const createdChain = chain as any;
  if (chainErr || !createdChain) {
    throw new Error(chainErr?.message || "No se pudo crear la cadena de ahorro.");
  }

  const memberRows = input.members.map((m) => ({
    chain_id: createdChain.id,
    turn_number: m.turnNumber,
    member_name: m.memberName,
    phone: m.phone || null,
    is_current_user: Boolean(m.isCurrentUser || m.turnNumber === input.userTurnNumber),
    payout_status: "pending",
  }));

  const { error: membersErr } = await admin.from("savings_chain_members").insert(memberRows);
  if (membersErr) {
    console.error("Error inserting members:", membersErr);
  }

  return { ok: true, chainId: createdChain.id };
}

export async function toggleMemberPayoutStatus(memberId: string, status: "pending" | "paid") {
  const admin = getSupabaseAdminClient() || (await createSupabaseServerComponentClient());
  if (!admin) throw new Error("Servicio de base de datos no disponible.");

  const payoutDate = status === "paid" ? new Date().toISOString().split("T")[0] : null;
  const { error } = await admin
    .from("savings_chain_members")
    .update({ payout_status: status, payout_date: payoutDate })
    .eq("id", memberId);

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteSavingsChain(id: string) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient() || (await createSupabaseServerComponentClient());
  if (!admin) throw new Error("Servicio de base de datos no disponible.");

  const { error } = await admin
    .from("savings_chains")
    .delete()
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(error.message);
  return { ok: true };
}
