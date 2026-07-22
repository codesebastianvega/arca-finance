"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceContext } from "@/src/lib/auth";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";
import { createAccountSchema } from "@/src/lib/schemas/financial-schemas";

export async function createAccount(input: {
  name: string;
  entity?: string | null;
  type: string;
  balance: number;
  color: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  createAccountSchema.parse({
    name: input.name,
    accountType: input.type,
    balance: input.balance,
    entity: input.entity,
  });

  const name = input.name.trim();
  const entity = input.entity?.trim() || null;
  const type = input.type.trim();
  const balance = Number(input.balance ?? 0);
  const color = input.color.trim() || "#C68A45";

  const vipExpiresAt = typeof context.subscription?.metadata?.vip_expires_at === "string"
    ? new Date(context.subscription.metadata.vip_expires_at).getTime()
    : null;
  const hasVipAccess = Boolean(context.subscription?.metadata?.vip_full_access)
    && (!vipExpiresAt || vipExpiresAt > Date.now());

  if (!hasVipAccess) {
    const { count, error: countError } = await admin
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", context.workspace.id)
      .eq("active", true);

    if (countError) throw new Error(`No se pudo verificar el limite de cuentas: ${countError.message}`);
    if ((count ?? 0) >= 3) {
      throw new Error("El plan gratuito permite maximo 3 cuentas activas. Desactiva o archiva una cuenta para continuar.");
    }
  }

  const { data: newAccount, error } = await admin
    .from("accounts")
    .insert({
      workspace_id: context.workspace.id,
      name,
      entity,
      type,
      current_balance: balance,
      color,
      is_default: false,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, name, current_balance, type")
    .single();

  if (error) throw new Error(`No se pudo crear la cuenta: ${error.message}`);

  revalidatePath("/app");
  return { ok: true, account: newAccount };
}

export async function archiveAccount(id: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const { count, error: countError } = await admin
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", context.workspace.id)
    .eq("active", true);

  if (countError) throw new Error(`No se pudo verificar tus cuentas activas: ${countError.message}`);
  if ((count ?? 0) <= 1) {
    throw new Error("Debes conservar al menos 1 cuenta activa para operar tu aplicacion.");
  }

  const { data: account, error: getError } = await admin
    .from("accounts")
    .select("id, name, current_balance")
    .eq("id", id)
    .eq("workspace_id", context.workspace.id)
    .single();

  if (getError || !account) throw new Error("No se encontro la cuenta solicitada.");
  if (Number(account.current_balance ?? 0) !== 0) {
    throw new Error("No puedes archivar una cuenta con saldo diferente a $0. Modifica su saldo o transfiere el dinero primero.");
  }

  const { error } = await admin
    .from("accounts")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo archivar la cuenta: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}
