import { createSupabaseServerComponentClient } from "@/src/lib/supabase";
import type { WorkspaceContext } from "@/src/lib/auth-types";

export type Subscription = {
  id: string;
  name: string;
  kind: "income" | "expense";
  status: "active" | "cancelled" | "completed";
  defaultAmount: number;
  startDate: string;
  endDate: string | null;
  recurrenceMode: string;
  frequency: string;
  businessUnitKey: string;
};

export type SubscriptionsViewModel = {
  incomes: Subscription[];
  expenses: Subscription[];
};

export async function loadSubscriptionsViewModel(context: WorkspaceContext): Promise<SubscriptionsViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  const workspaceId = context.workspace.id;

  const [incomesResult, expensesResult] = await Promise.all([
    supabase
      .from("income_templates")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("expense_templates")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
  ]);

  if (incomesResult.error) console.error("Error fetching income_templates:", incomesResult.error);
  if (expensesResult.error) console.error("Error fetching expense_templates:", expensesResult.error);

  const incomesData = incomesResult.data || [];
  const expensesData = expensesResult.data || [];

  const mapToSubscription = (row: any, forceKind: "income" | "expense"): Subscription => ({
    id: row.id,
    name: row.name,
    kind: forceKind,
    status: row.status as "active" | "cancelled" | "completed",
    defaultAmount: Number(row.default_amount),
    startDate: row.start_date,
    endDate: row.end_date,
    recurrenceMode: row.recurrence_mode,
    frequency: row.frequency,
    businessUnitKey: row.business_unit_key,
  });

  return {
    incomes: incomesData.map((r) => mapToSubscription(r, "income")),
    expenses: expensesData.map((r) => mapToSubscription(r, "expense")),
  };
}
