"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase";

const transactionSchema = z.object({
  kind: z.enum([
    "income",
    "expense",
    "transfer",
    "debt_payment",
    "card_payment",
    "saving_contribution",
    "saving_withdrawal",
  ]),
  status: z.enum(["pending", "paid", "confirmed", "cancelled", "overdue", "scheduled"]),
  amount: z.coerce.number().positive(),
  concept: z.string().trim().min(2),
  accountId: z.string().uuid(),
  category: z.string().trim().min(2),
  unit: z.enum(["personal", "empresa", "deuxio", "sie", "aluna"]),
  date: z.string().trim().min(10),
  dueDate: z.string().trim().optional(),
});

const outflowKinds = new Set(["expense", "debt_payment", "card_payment", "saving_contribution"]);
const inflowKinds = new Set(["income", "saving_withdrawal"]);

function getBalanceDelta(kind: string, amount: number) {
  if (inflowKinds.has(kind)) {
    return amount;
  }

  if (outflowKinds.has(kind)) {
    return -amount;
  }

  return 0;
}

function shouldAffectAccount(status: string) {
  return status === "paid" || status === "confirmed";
}

export async function createTransaction(formData: FormData) {
  const input = transactionSchema.parse({
    kind: formData.get("kind"),
    status: formData.get("status"),
    amount: formData.get("amount"),
    concept: formData.get("concept"),
    accountId: formData.get("accountId"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    date: formData.get("date"),
    dueDate: formData.get("dueDate") || undefined,
  });

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({
      kind: input.kind,
      status: input.status,
      amount: input.amount,
      concept: input.concept,
      account_id: input.accountId,
      category: input.category,
      unit: input.unit,
      date: input.date,
      due_date: input.dueDate || null,
      metadata: {
        source: "arca-ui",
        created_by: "manual-register",
      },
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`No se pudo registrar el movimiento: ${error.message}`);
  }

  if (shouldAffectAccount(input.status)) {
    const delta = getBalanceDelta(input.kind, input.amount);

    if (delta !== 0) {
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", input.accountId)
        .single();

      if (accountError) {
        throw new Error(`Movimiento creado, pero no se pudo leer la cuenta: ${accountError.message}`);
      }

      const currentBalance = Number(account?.balance ?? 0);
      const { error: updateError } = await supabase
        .from("accounts")
        .update({ balance: currentBalance + delta, updated_at: new Date().toISOString() })
        .eq("id", input.accountId);

      if (updateError) {
        throw new Error(`Movimiento creado, pero no se pudo actualizar el saldo: ${updateError.message}`);
      }
    }
  }

  if (input.status === "scheduled" || input.status === "pending" || input.status === "overdue") {
    const { error: eventError } = await supabase.from("financial_events").insert({
      event_date: input.dueDate || input.date,
      title: input.concept,
      amount: input.amount,
      event_type: input.kind === "saving_contribution" ? "saving" : input.kind,
      status: input.status,
      business_unit_key: input.unit,
      account_id: input.accountId,
      related_table: "transactions",
      related_id: transaction?.id ?? null,
      notes: `Creado desde registro manual de Arca.`,
    });

    if (eventError) {
      throw new Error(`Movimiento creado, pero no se pudo crear el evento: ${eventError.message}`);
    }
  }

  revalidatePath("/");
  redirect("/?view=dashboard&saved=1");
}
