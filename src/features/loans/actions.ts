"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceContext } from "@/src/lib/auth";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";
import { createLoanSchema } from "@/src/lib/schemas/financial-schemas";

export async function archiveLoan(input: { id: string; type: "receivable" | "payable" }) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  if (input.type === "receivable") {
    const { error } = await admin
      .from("receivables")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("workspace_id", context.workspace.id);

    if (error) throw new Error(`No se pudo archivar el préstamo: ${error.message}`);
  } else {
    const { error } = await admin
      .from("payables")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("workspace_id", context.workspace.id);

    if (error) throw new Error(`No se pudo archivar el préstamo: ${error.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}
