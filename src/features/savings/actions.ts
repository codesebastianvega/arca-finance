"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceContext } from "@/src/lib/auth";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";
import { createSavingsGoalSchema } from "@/src/lib/schemas/financial-schemas";

export async function createSavingsGoal(input: {
  name: string;
  target: number;
  current: number;
  dueDate?: string | null;
  goalType?: "saving" | "pocket" | "goal";
  color?: string;
  sourceAccountId?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  createSavingsGoalSchema.parse({
    name: input.name,
    target: Number(input.target ?? 0),
    current: Number(input.current ?? 0),
    dueDate: input.dueDate,
    goalType: input.goalType ?? "goal",
    color: input.color,
    sourceAccountId: input.sourceAccountId,
  });

  const name = input.name.trim();
  const target = Number(input.target ?? 0);
  const current = Number(input.current ?? 0);
  const dueDate = input.dueDate?.trim() || null;
  const goalType = input.goalType ?? "saving";
  const color = input.color?.trim() || (goalType === "pocket" ? "#8FA66A" : "#16735b");

  if (goalType === "pocket" && !input.sourceAccountId) {
    throw new Error("Un bolsillo debe estar asociado a una cuenta origen.");
  }

  const { data: goal, error } = await admin
    .from("savings_goals")
    .insert({
      workspace_id: context.workspace.id,
      name,
      target_amount: target,
      current_amount: current,
      due_date: dueDate,
      status: "active",
      goal_type: goalType,
      color,
      source_account_id: goalType === "pocket" ? (input.sourceAccountId || null) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, name, target_amount, current_amount, goal_type")
    .single();

  if (error) throw new Error(`No se pudo crear la meta/bolsillo: ${error.message}`);

  revalidatePath("/app");
  return { ok: true, goal };
}

export async function createSavingsContribution(input: { goalId: string; amount: number; accountId: string }) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  if (!input.goalId) throw new Error("Se requiere una meta o bolsillo.");
  if (!input.accountId) throw new Error("Se requiere una cuenta de origen.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("El monto a aportar debe ser mayor a 0.");

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, name, current_balance")
    .eq("id", input.accountId)
    .eq("workspace_id", context.workspace.id)
    .single();

  if (accountError || !account) throw new Error("La cuenta seleccionada no existe.");

  const { data: goal, error: goalError } = await admin
    .from("savings_goals")
    .select("id, name, current_amount, target_amount")
    .eq("id", input.goalId)
    .eq("workspace_id", context.workspace.id)
    .single();

  if (goalError || !goal) throw new Error("La meta seleccionada no existe.");

  // @ts-expect-error
  const { error: deductError } = await admin.rpc("increment_account_balance", {
    p_account_id: input.accountId,
    p_amount: -input.amount,
    p_allow_negative: false
  });

  if (deductError) throw new Error(`Saldo insuficiente en ${account.name}: ${deductError.message}`);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const { error: transactionError } = await admin
    .from("transactions")
    .insert({
      workspace_id: context.workspace.id,
      account_id: input.accountId,
      concept: `Aporte a ahorro: ${goal.name}`,
      amount: input.amount,
      date: today,
      category: "ahorro",
      unit: "general",
      kind: "saving_contribution",
      status: "confirmed",
      source_type: "saving",
      source_id: input.goalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (transactionError) {
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: input.accountId, p_amount: input.amount, p_allow_negative: true });
    throw new Error(`No se pudo registrar el aporte: ${transactionError.message}`);
  }

  // @ts-expect-error
  const { error: updateError } = await admin.rpc("increment_savings_goal_current", {
    p_goal_id: input.goalId,
    p_amount: input.amount
  });

  if (updateError) {
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: input.accountId, p_amount: input.amount, p_allow_negative: true });
    throw new Error(`Se registró el aporte, pero no se pudo actualizar la meta: ${updateError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function archiveSavingsGoal(id: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const { error } = await admin
    .from("savings_goals")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo archivar la meta/bolsillo: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}
