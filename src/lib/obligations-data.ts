import type { WorkspaceContext } from "@/src/lib/auth-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";
import type { ObligationItem, ObligationsViewModel } from "@/src/lib/obligations-types";

function money(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s?COP$/, "")
    .trim();
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function startOfTodayInBogota() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${date}T00:00:00-05:00`);
}

function labelDate(rawDate: string) {
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(`${rawDate}T00:00:00-05:00`));
}

function classifyStatus(rawDate: string): "overdue" | "today" | "upcoming" {
  const today = startOfTodayInBogota();
  const due = new Date(`${rawDate}T00:00:00-05:00`);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  return "upcoming";
}

function daysFromToday(rawDate: string) {
  const today = startOfTodayInBogota();
  const due = new Date(`${rawDate}T00:00:00-05:00`);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function normalizePriority(value: string | null | undefined, status: "overdue" | "today" | "upcoming"): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") return value;
  if (status === "overdue" || status === "today") return "high";
  return "medium";
}

export async function loadObligationsViewModel(context: WorkspaceContext): Promise<ObligationsViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  const workspaceId = context.workspace.id;
  const [eventsResult, accountsResult] = await Promise.all([
    supabase
      .from("scheduled_events")
      .select("id, title, amount, due_date, priority, kind, notes, account_id, suggested_account_id, status, template_id")
      .eq("workspace_id", workspaceId)
      .not("status", "in", '("confirmed","confirmado","paid","cancelled","cancelado")')
      .order("due_date", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, name, type")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
  ]);

  if (eventsResult.error) {
    throw new Error(`No se pudieron leer las obligaciones: ${eventsResult.error.message}`);
  }
  if (accountsResult.error) {
    throw new Error(`No se pudieron leer las cuentas para obligaciones: ${accountsResult.error.message}`);
  }

  const rawItems: ObligationItem[] = (eventsResult.data ?? []).map((row) => {
    const status = classifyStatus(String(row.due_date));
    return {
      id: String(row.id),
      name: String(row.title),
      amount: toNumber(row.amount),
      amountLabel: money(toNumber(row.amount)),
      date: labelDate(String(row.due_date)),
      dueDate: String(row.due_date),
      priority: normalizePriority(row.priority as string | null | undefined, status),
      status,
      kind: String(row.kind),
      notes: row.notes ? String(row.notes) : null,
      accountId: row.account_id ? String(row.account_id) : null,
      suggestedAccountId: row.suggested_account_id ? String(row.suggested_account_id) : null,
      templateId: row.template_id ? String(row.template_id) : null,
      groupedOccurrences: 1,
    };
  });

  const visibleWindow = rawItems;
  const items: ObligationItem[] = rawItems
    .map((item) => ({
      ...item,
      groupedOccurrences: 1,
    }))
    .sort((a, b) => {
      const diffA = daysFromToday(a.dueDate);
      const diffB = daysFromToday(b.dueDate);

      if (diffA < 0 && diffB < 0) return Math.abs(diffA) - Math.abs(diffB);
      if (diffA < 0) return -1;
      if (diffB < 0) return 1;
      return diffA - diffB;
    });

  return {
    items,
    accountOptions: (accountsResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: `${String(row.name)} · cuenta`,
    })),
  };
}
