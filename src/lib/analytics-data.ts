import type { WorkspaceContext } from "@/src/lib/auth-types";
import type { AnalyticsCategory, AnalyticsExpenseItem, AnalyticsMonth, AnalyticsViewModel } from "@/src/lib/analytics-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";

type TransactionRow = {
  id: string;
  concept: string | null;
  amount: number | string | null;
  category: string | null;
  kind: string;
  date: string;
  metadata?: { is_initial_balance?: boolean } | null;
  accounts?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

const EXPENSE_KINDS = new Set(["expense", "debt_payment", "card_payment"]);
const CATEGORY_LABELS: Record<string, string> = {
  expense: "Gastos generales",
  general_expense: "Gastos generales",
  food: "Comida",
  groceries: "Mercado",
  transport: "Transporte",
  transportation: "Transporte",
  utilities: "Servicios",
  entertainment: "Entretenimiento",
  health: "Salud",
  education: "Educación",
  housing: "Vivienda",
  debt: "Deudas",
  debt_payment: "Pago de deudas",
  card_payment: "Pago de tarjetas",
  other: "Otros",
  others: "Otros",
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function categoryLabel(value: string | null) {
  const raw = String(value || "Otros").trim() || "Otros";
  const normalized = raw.toLocaleLowerCase("es-CO").replace(/[\s-]+/g, "_");
  const translated = CATEGORY_LABELS[normalized];
  if (translated) return translated;

  if (!raw.includes("_") && !raw.includes("-")) return raw;
  const readable = raw.replace(/[_-]+/g, " ").toLocaleLowerCase("es-CO");
  return readable.replace(/^./, (letter) => letter.toLocaleUpperCase("es-CO"));
}

function expenseKindLabel(kind: string) {
  if (kind === "debt_payment") return "Pago de deuda";
  if (kind === "card_payment") return "Pago de tarjeta";
  return "Gasto";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildMonthRange() {
  const now = new Date();
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return Array.from({ length: 12 }, (_, index) => {
    const offset = index - 11;
    const date = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + offset, 1));
    return {
      key: monthKey(date),
      label: new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" })
        .format(date)
        .replace(".", "")
        .replace(/^./, (letter) => letter.toUpperCase()),
      date,
    };
  });
}

export async function loadAnalyticsViewModel(context: WorkspaceContext): Promise<AnalyticsViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) throw new Error("Supabase no está configurado.");

  const range = buildMonthRange();
  const firstMonth = range[0].date.toISOString();
  const result = await supabase
    .from("transactions")
    .select("id, concept, amount, category, kind, date, metadata, accounts(name)")
    .eq("workspace_id", context.workspace.id)
    .gte("date", firstMonth)
    .in("status", ["confirmed", "confirmado", "paid", "recovered"])
    .order("date", { ascending: true });

  if (result.error) {
    throw new Error(`No se pudieron leer las tendencias financieras: ${result.error.message}`);
  }

  const monthIndex = new Map(range.map((month, index) => [month.key, index]));
  const months: AnalyticsMonth[] = range.map((month) => ({
    key: month.key,
    label: month.label,
    income: 0,
    expenses: 0,
    net: 0,
  }));
  const categoryAmounts = new Map<string, number[]>();
  const categoryItems = new Map<string, AnalyticsExpenseItem[]>();

  for (const row of (result.data ?? []) as TransactionRow[]) {
    if (row.metadata?.is_initial_balance) continue;
    const index = monthIndex.get(String(row.date).slice(0, 7));
    if (index === undefined) continue;

    const amount = toNumber(row.amount);
    if (row.kind === "income") {
      months[index].income += amount;
    } else if (EXPENSE_KINDS.has(String(row.kind))) {
      months[index].expenses += amount;
      const category = categoryLabel(row.category);
      const amounts = categoryAmounts.get(category) ?? Array.from({ length: 12 }, () => 0);
      amounts[index] += amount;
      categoryAmounts.set(category, amounts);
      const accountName = Array.isArray(row.accounts) ? row.accounts[0]?.name ?? null : row.accounts?.name ?? null;
      const items = categoryItems.get(category) ?? [];
      items.push({
        id: String(row.id),
        concept: String(row.concept || "Movimiento").trim() || "Movimiento",
        amount,
        monthKey: String(row.date).slice(0, 7),
        date: String(row.date),
        dateLabel: formatDate(String(row.date)),
        kindLabel: expenseKindLabel(String(row.kind)),
        accountName,
      });
      categoryItems.set(category, items);
    }
  }

  for (const month of months) month.net = month.income - month.expenses;

  const categories: AnalyticsCategory[] = Array.from(categoryAmounts.entries())
    .map(([label, monthlyAmounts]) => ({
      label,
      monthlyAmounts,
      items: (categoryItems.get(label) ?? []).sort((left, right) => right.date.localeCompare(left.date)),
    }))
    .sort((a, b) => b.monthlyAmounts.reduce((sum, amount) => sum + amount, 0) - a.monthlyAmounts.reduce((sum, amount) => sum + amount, 0));

  return {
    months,
    categories,
    hasData: months.some((month) => month.income > 0 || month.expenses > 0),
  };
}
