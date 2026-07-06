import "server-only";

import { createSupabaseServerActionClient, createSupabaseServerComponentClient } from "@/lib/supabase";
import type { DashboardSummary, TodaySummary } from "@/lib/types";

type SupabaseRpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function requireClient<T>(client: T | null): T {
  if (!client) {
    throw new Error("Supabase no esta configurado.");
  }

  return client;
}

function isMissingFunction(message?: string) {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("function") || normalized.includes("rpc") || normalized.includes("does not exist");
}

export async function getActionClient(): Promise<SupabaseRpcClient> {
  return requireClient(await createSupabaseServerActionClient()) as unknown as SupabaseRpcClient;
}

export async function getReadClient(): Promise<SupabaseRpcClient> {
  return requireClient(await createSupabaseServerComponentClient()) as unknown as SupabaseRpcClient;
}

export async function createAccountRpc(client: SupabaseRpcClient, params: { name: string; type: string; balance: number; color: string }) {
  const { data, error } = await client.rpc("create_account", {
    p_name: params.name,
    p_type: params.type,
    p_balance: params.balance,
    p_color: params.color,
  });

  if (error) {
    throw new Error(`No se pudo crear la cuenta: ${error.message}`);
  }

  return data;
}

export async function createDebtRpc(
  client: SupabaseRpcClient,
  params: {
    name: string;
    lender: string;
    debtType: string;
    principalAmount?: number;
    balance: number;
    installment: number;
    nextDueDate: string;
    annualInterestRate?: number;
    interestType?: string;
    termMonths?: number;
    remainingMonths?: number;
    estimatedTotalPayment?: number;
    priority: string;
    notes?: string;
  }
) {
  const { data, error } = await client.rpc("create_debt", {
    p_name: params.name,
    p_lender: params.lender,
    p_debt_type: params.debtType,
    p_principal_amount: params.principalAmount ?? null,
    p_balance: params.balance,
    p_installment: params.installment,
    p_next_due_date: params.nextDueDate,
    p_annual_interest_rate: params.annualInterestRate ?? null,
    p_interest_type: params.interestType ?? "unknown",
    p_term_months: params.termMonths ?? null,
    p_remaining_months: params.remainingMonths ?? null,
    p_estimated_total_payment: params.estimatedTotalPayment ?? null,
    p_priority: params.priority,
    p_notes: params.notes ?? null,
  });

  if (error) {
    throw new Error(`No se pudo crear la deuda: ${error.message}`);
  }

  return data;
}

export async function createCreditCardRpc(
  client: SupabaseRpcClient,
  params: {
    name: string;
    issuer: string;
    limit: number;
    used: number;
    cutOffDate: number;
    payDueDate: number;
    minimumPayment: number;
    annualInterestRate?: number;
    interestType?: string;
    estimatedPayoffMonths?: number;
    estimatedTotalPayment?: number;
    paymentStrategy?: string;
    notes?: string;
  }
) {
  const { data, error } = await client.rpc("create_credit_card", {
    p_name: params.name,
    p_issuer: params.issuer,
    p_limit_value: params.limit,
    p_used: params.used,
    p_cut_off_date: params.cutOffDate,
    p_pay_due_date: params.payDueDate,
    p_minimum_payment: params.minimumPayment,
    p_annual_interest_rate: params.annualInterestRate ?? null,
    p_interest_type: params.interestType ?? "unknown",
    p_estimated_payoff_months: params.estimatedPayoffMonths ?? null,
    p_estimated_total_payment: params.estimatedTotalPayment ?? null,
    p_payment_strategy: params.paymentStrategy ?? "minimum",
    p_notes: params.notes ?? null,
  });

  if (error) {
    throw new Error(`No se pudo crear la tarjeta: ${error.message}`);
  }

  return data;
}

export async function createSavingsGoalRpc(
  client: SupabaseRpcClient,
  params: {
    name: string;
    target: number;
    current: number;
    dueDate?: string;
    color: string;
  }
) {
  const { data, error } = await client.rpc("create_savings_goal", {
    p_name: params.name,
    p_target: params.target,
    p_current: params.current,
    p_due_date: params.dueDate ?? null,
    p_color: params.color,
  });

  if (error) {
    throw new Error(`No se pudo crear el ahorro/meta: ${error.message}`);
  }

  return data;
}

export async function createMovementRpc(
  client: SupabaseRpcClient,
  workspaceId: string,
  params: {
    kind: string;
    amount: number;
    concept: string;
    accountId: string;
    category: string;
    unit: string;
    date: string;
    dueDate?: string;
    status: string;
    sourceType?: string;
    sourceId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { data, error } = await client.rpc("create_movement", {
    p_workspace_id: workspaceId,
    p_kind: params.kind,
    p_amount: params.amount,
    p_concept: params.concept,
    p_account_id: params.accountId,
    p_category: params.category,
    p_unit: params.unit,
    p_effective_date: params.date,
    p_due_date: params.dueDate ?? null,
    p_status: params.status,
    p_source_type: params.sourceType ?? null,
    p_source_id: params.sourceId ?? null,
    p_metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(`No se pudo crear el movimiento: ${error.message}`);
  }

  return data;
}

export async function createTransferRpc(
  client: SupabaseRpcClient,
  workspaceId: string,
  params: { fromAccountId: string; toAccountId: string; amount: number; concept: string; date: string }
) {
  const { data, error } = await client.rpc("create_transfer", {
    p_workspace_id: workspaceId,
    p_from_account_id: params.fromAccountId,
    p_to_account_id: params.toAccountId,
    p_amount: params.amount,
    p_concept: params.concept,
    p_effective_date: params.date,
    p_metadata: { source: "arca-ui", created_by: "manual-transfer" },
  });

  if (error) {
    throw new Error(`No se pudo registrar la transferencia: ${error.message}`);
  }

  return data;
}

export async function payObligationRpc(
  client: SupabaseRpcClient,
  workspaceId: string,
  params: { eventId: string; accountId?: string; cardId?: string; amount?: number; paidAt?: string }
) {
  const { data, error } = await client.rpc("pay_obligation", {
    p_workspace_id: workspaceId,
    p_scheduled_event_id: params.eventId,
    p_funding_account_id: params.accountId ?? null,
    p_funding_card_id: params.cardId ?? null,
    p_amount: params.amount ?? null,
    p_paid_at: params.paidAt ?? null,
  });

  if (error) {
    throw new Error(`No se pudo pagar la obligacion: ${error.message}`);
  }

  return data;
}

export async function readFreeCash(client: SupabaseRpcClient, workspaceId: string) {
  const { data, error } = await client.rpc("get_free_cash", {
    p_workspace_id: workspaceId,
  });

  if (error) {
    throw new Error(`No se pudo leer la caja libre: ${error.message}`);
  }

  return Number(data ?? 0);
}

export async function readTodaySummary(client: SupabaseRpcClient, workspaceId: string) {
  const { data, error } = await client.rpc("get_today_summary", {
    p_workspace_id: workspaceId,
  });

  if (error) {
    if (isMissingFunction(error.message)) {
      return null;
    }

    throw new Error(`No se pudo leer el resumen de hoy: ${error.message}`);
  }

  return (data ?? null) as TodaySummary | null;
}

export async function readDashboardSummary(client: SupabaseRpcClient, workspaceId: string, month?: string) {
  const { data, error } = await client.rpc("get_dashboard_summary", {
    p_workspace_id: workspaceId,
    p_month: month ?? null,
  });

  if (error) {
    if (isMissingFunction(error.message)) {
      return null;
    }

    throw new Error(`No se pudo leer el resumen del dashboard: ${error.message}`);
  }

  return (data ?? null) as DashboardSummary | null;
}
