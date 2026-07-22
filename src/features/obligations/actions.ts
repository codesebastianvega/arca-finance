"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceContext } from "@/src/lib/auth";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";

export async function cancelScheduledEvent(id: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const { error } = await admin
    .from("scheduled_events")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo cancelar el pago programado: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}
