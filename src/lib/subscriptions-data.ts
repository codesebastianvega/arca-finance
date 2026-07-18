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
  daysOfMonth: number[];
  accountName: string | null;
  nextOccurrence: string | null;
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

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const [incomesResult, expensesResult, eventsResult, accountsResult] = await Promise.all([
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
    supabase
      .from("scheduled_events")
      .select("template_id, due_date, status")
      .eq("workspace_id", workspaceId)
      .gte("due_date", today)
      .not("status", "in", '("confirmed","confirmado","cancelled","cancelado")')
      .order("due_date", { ascending: true }),
    supabase.from("accounts").select("id, name").eq("workspace_id", workspaceId),
  ]);

  if (incomesResult.error) console.error("Error fetching income_templates:", incomesResult.error);
  if (expensesResult.error) console.error("Error fetching expense_templates:", expensesResult.error);
  if (eventsResult.error) console.error("Error fetching recurring scheduled events:", eventsResult.error);
  if (accountsResult.error) console.error("Error fetching recurring accounts:", accountsResult.error);

  const incomesData = incomesResult.data || [];
  const expensesData = expensesResult.data || [];

  const nextOccurrenceByTemplate = new Map<string, string>();
  for (const event of eventsResult.data ?? []) {
    const templateId = event.template_id ? String(event.template_id) : "";
    if (templateId && !nextOccurrenceByTemplate.has(templateId)) nextOccurrenceByTemplate.set(templateId, String(event.due_date));
  }
  const accountNames = new Map((accountsResult.data ?? []).map((account) => [String(account.id), String(account.name)]));

  const mapToSubscription = (row: Record<string, unknown>, forceKind: "income" | "expense"): Subscription => ({
    id: String(row.id),
    name: String(row.name),
    kind: forceKind,
    status: row.status as "active" | "cancelled" | "completed",
    defaultAmount: Number(row.default_amount),
    startDate: String(row.start_date),
    endDate: row.end_date ? String(row.end_date) : null,
    recurrenceMode: String(row.recurrence_mode),
    frequency: String(row.frequency),
    businessUnitKey: String(row.business_unit_key),
    daysOfMonth: Array.isArray(row.days_of_month) ? row.days_of_month.map(Number) : [],
    accountName: row.default_account_id ? accountNames.get(String(row.default_account_id)) ?? null : null,
    nextOccurrence: nextOccurrenceByTemplate.get(String(row.id)) ?? null,
  });

  return {
    incomes: incomesData.map((r) => mapToSubscription(r, "income")),
    expenses: expensesData.map((r) => mapToSubscription(r, "expense")),
  };
}
