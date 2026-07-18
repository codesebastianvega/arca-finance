import type { WorkspaceContext } from "@/src/lib/auth-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";



export type MoneyCard = {
  id: string;
  name: string;
  issuer: string;
  used: number;
  limit: number;
  minimumPayment: number;
  annualInterestRate: number | null;
  interestType: string;
  estimatedPayoffMonths: number | null;
  estimatedTotalPayment: number | null;
  paymentStrategy: string;
  notes: string;
  status: string;
  cutOffDay: number;
  payDueDay: number;
  dueDateLabel: string;
  color: string;
  darkText: boolean;
};

export type MoneyGoalType = "goal" | "pocket";

export type MoneySaving = {
  id: string;
  name: string;
  current: number;
  currentLabel: string;
  target: number;
  targetLabel: string;
  progress: number;
  goalType: MoneyGoalType;
  color: string;
  accountId: string | null;
  dueDate: string | null;
};

export type MoneySpendingSlice = {
  name: string;
  value: number;
  color: string;
  percentage: number;
};

export type MoneyAccount = {
  id: string;
  name: string;
  entity: string | null;
  type: string;
  balance: number;
  balanceLabel: string;
  color: string;
  pockets: MoneySaving[];
};

export type BankCredit = {
  id: string;
  name: string;
  totalAmount: number;
  currentBalance: number;
  monthlyPayment: number;
  interestRate: number | null;
  totalInstallments: number;
  paidInstallments: number;
  payDueDay: number;
  notes: string;
  status: string;
  color: string;
  darkText: boolean;
};

export type MoneyViewModel = {
  accounts: MoneyAccount[];
  cards: MoneyCard[];
  bankCredits: BankCredit[];
  savings: MoneySaving[];
  spending: {
    total: number;
    totalLabel: string;
    breakdown: MoneySpendingSlice[];
    monthLabel: string;
    previousTotal: number;
    changePercent: number | null;
    budget: number | null;
    budgetUsagePercent: number | null;
  };
};

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

function monthBoundsInBogota() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  });
  const [yearStr, monthStr] = formatter.format(new Date()).split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = `${yearStr}-${monthStr}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${yearStr}-${String(month + 1).padStart(2, "0")}-01`;
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousStart = `${previousYear}-${String(previousMonth).padStart(2, "0")}-01`;
  const monthLabel = new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "America/Bogota" }).format(new Date(`${start}T00:00:00-05:00`));
  return { start, nextMonth, previousStart, monthLabel };
}

const CARD_COLOR_BY_ISSUER: Record<string, { color: string; darkText?: boolean }> = {
  nu: { color: "#820AD1" },
  rappi: { color: "#111111" },
  rappicard: { color: "#111111" },
  bancolombia: { color: "#FDDA24", darkText: true },
  davivienda: { color: "#ED1C24" },
  bbva: { color: "#004481" },
  falabella: { color: "#7CB342" },
  "banco de bogota": { color: "#D71920" },
  "banco caja social": { color: "#1D4F91" },
  "av villas": { color: "#F58220", darkText: true },
  "banco popular": { color: "#2B5CAB" },
  colpatria: { color: "#E31837" },
  itau: { color: "#FF6A13", darkText: true },
  pichincha: { color: "#FFCC00", darkText: true },
  finandina: { color: "#6A1B9A" },
  serfinanza: { color: "#00A19A" },
  visa: { color: "#1A1F71" },
  mastercard: { color: "#EB001B" },
};

const SPENDING_COLOR_BY_CATEGORY: Record<string, string> = {
  hogar: "#D8A04D",
  comida: "#9CAF76",
  ocio: "#8C7196",
  salud: "#D27A6A",
  transporte: "#5F8E89",
  servicios: "#6F91A3",
  claro: "#6F91A3",
  general: "#D8A04D",
  expense: "#D8A04D",
  deudas: "#E06B52",
  debt_payment: "#E06B52",
  prestamos: "#C97B5B",
  prestamo: "#C97B5B",
  card_payment: "#7B829E",
};

const SPENDING_FALLBACK_COLORS = ["#D8A04D", "#5F8E89", "#C97B5B", "#8C7196", "#9CAF76"];

function spendingCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    expense: "Gastos generales",
    debt_payment: "Deudas",
    card_payment: "Tarjetas",
    prestamo: "Préstamos",
    prestamos: "Préstamos",
  };
  return labels[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

function issuerVisual(issuer: string, brandColor?: string | null, textColor?: string | null) {
  if (brandColor) {
    const darkText = textColor ? textColor.toLowerCase() !== "#ffffff" && textColor.toLowerCase() !== "#fff" : false;
    return { color: brandColor, darkText };
  }

  const normalized = issuer.toLowerCase();
  for (const key of Object.keys(CARD_COLOR_BY_ISSUER)) {
    if (normalized.includes(key)) {
      return {
        color: CARD_COLOR_BY_ISSUER[key].color,
        darkText: Boolean(CARD_COLOR_BY_ISSUER[key].darkText),
      };
    }
  }

  return { color: "#C68A45", darkText: false };
}

export async function loadMoneyViewModel(context: WorkspaceContext): Promise<MoneyViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  const workspaceId = context.workspace.id;
  const monthBounds = monthBoundsInBogota();

  const [accountsResult, rawCardsResult, savingsResult, transactionsResult, bankCreditsResult, budgetResult] = await Promise.all([
    supabase.from("accounts").select("id, name, entity, type, balance, color, active, archived").eq("workspace_id", workspaceId).eq("active", true).eq("archived", false).order("created_at", { ascending: true }),
    supabase
      .from("credit_cards")
      .select("id, name, issuer, used, limit_value, minimum_payment, annual_interest_rate, interest_type, estimated_payoff_months, estimated_total_payment, payment_strategy, notes, status, cut_off_date, pay_due_date, brand_color, text_color, archived")
      .eq("workspace_id", workspaceId)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("savings_goals")
      .select("id, name, current, target, color, goal_type, archived, account_id, due_date")
      .eq("workspace_id", workspaceId)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("id, kind, amount, category, date")
      .eq("workspace_id", workspaceId)
      .gte("date", `${monthBounds.previousStart}T00:00:00-05:00`)
      .lt("date", `${monthBounds.nextMonth}T00:00:00-05:00`),
    supabase
      .from("bank_credits")
      .select("id, name, total_amount, current_balance, monthly_payment, interest_rate, total_installments, paid_installments, pay_due_date, notes, status, brand_color, text_color")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
    supabase
      .from("monthly_budgets")
      .select("limit_amount, month")
      .eq("workspace_id", workspaceId)
      .gte("month", monthBounds.start)
      .lt("month", monthBounds.nextMonth)
      .limit(1)
      .maybeSingle(),
  ]);

  let cardsResult: typeof rawCardsResult | any = rawCardsResult;

  if (cardsResult.error && cardsResult.error.message.includes("does not exist")) {
    cardsResult = await supabase
      .from("credit_cards")
      .select("id, name, issuer, used, limit_value, pay_due_date, status, cut_off_date, archived")
      .eq("workspace_id", workspaceId)
      .eq("archived", false)
      .order("created_at", { ascending: true });
  }

  if (accountsResult.error) throw new Error(`No se pudieron leer las cuentas: ${accountsResult.error.message}`);
  if (cardsResult.error) throw new Error(`No se pudieron leer las tarjetas: ${cardsResult.error.message}`);
  if (savingsResult.error) throw new Error(`No se pudo leer el ahorro: ${savingsResult.error.message}`);
  if (transactionsResult.error) throw new Error(`No se pudieron leer los movimientos del mes: ${transactionsResult.error.message}`);
  if (budgetResult.error && budgetResult.error.code !== "PGRST205") {
    throw new Error(`No se pudo leer el presupuesto del mes: ${budgetResult.error.message}`);
  }
  // If bankCredits fail, don't throw, just map to empty array as user may not have applied SQL migration yet.

  const allSavings: MoneySaving[] = (savingsResult.data ?? []).map((row) => {
    const current = toNumber(row.current);
    const target = toNumber(row.target);
    const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return {
      id: String(row.id),
      name: String(row.name),
      current,
      currentLabel: money(current),
      target,
      targetLabel: money(target),
      progress,
      goalType: (row.goal_type === "pocket" ? "pocket" : "goal") as MoneyGoalType,
      color: String(row.color ?? "#16735b"),
      accountId: row.account_id ? String(row.account_id) : null,
      dueDate: row.due_date ? String(row.due_date).split("T")[0] : null,
    };
  });

  const accounts: MoneyAccount[] = (accountsResult.data ?? []).map((row) => {
    const balance = toNumber(row.balance);
    const pockets = allSavings.filter((s) => s.goalType === "pocket" && s.accountId === String(row.id));
    return {
      id: String(row.id),
      name: String(row.name),
      entity: row.entity ? String(row.entity) : null,
      type: String(row.type),
      balance,
      balanceLabel: money(balance),
      color: String(row.color ?? "#C68A45"),
      pockets,
    };
  });

  const cards: MoneyCard[] = (cardsResult.data ?? []).map((row) => {
    const used = toNumber(row.used);
    const limit = toNumber(row.limit_value);
    const visual = issuerVisual(String(row.issuer ?? ""), row.brand_color as string | null | undefined, row.text_color as string | null | undefined);
    return {
      id: String(row.id),
      name: String(row.name),
      issuer: String(row.issuer),
      used,
      limit,
      minimumPayment: toNumber(row.minimum_payment),
      annualInterestRate: row.annual_interest_rate == null ? null : toNumber(row.annual_interest_rate),
      interestType: String(row.interest_type ?? "unknown"),
      estimatedPayoffMonths: row.estimated_payoff_months == null ? null : Number(row.estimated_payoff_months),
      estimatedTotalPayment: row.estimated_total_payment == null ? null : toNumber(row.estimated_total_payment),
      paymentStrategy: String(row.payment_strategy ?? "minimum"),
      notes: String(row.notes ?? ""),
      status: String(row.status ?? "active"),
      cutOffDay: Number(row.cut_off_date ?? 1),
      payDueDay: Number(row.pay_due_date ?? 1),
      dueDateLabel: `${row.pay_due_date} ${monthBounds.monthLabel}`,
      color: visual.color,
      darkText: visual.darkText,
    };
  });

  const savings = allSavings.filter((s) => s.goalType === "goal");

  const outgoingKinds = new Set(["expense", "debt_payment", "card_payment"]);
  const grouped = new Map<string, number>();
  let previousTotal = 0;

  for (const row of transactionsResult.data ?? []) {
    if (!outgoingKinds.has(String(row.kind))) continue;
    if (String(row.date) < monthBounds.start) {
      previousTotal += toNumber(row.amount);
      continue;
    }
    const key = String(row.category ?? "general").toLowerCase();
    grouped.set(key, (grouped.get(key) ?? 0) + toNumber(row.amount));
  }

  const spendingTotal = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0);
  const sortedCategories = Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);
  const visibleCategories = sortedCategories.slice(0, 4);
  const hiddenTotal = sortedCategories.slice(4).reduce((sum, [, value]) => sum + value, 0);
  if (hiddenTotal > 0) visibleCategories.push(["otros", hiddenTotal]);

  const displayCategories = new Map<string, { value: number; color: string }>();
  visibleCategories.forEach(([name, value], index) => {
    const label = spendingCategoryLabel(name);
    const existing = displayCategories.get(label);
    displayCategories.set(label, {
      value: (existing?.value ?? 0) + value,
      color: existing?.color ?? (name === "otros" ? "#7A7064" : SPENDING_COLOR_BY_CATEGORY[name] ?? SPENDING_FALLBACK_COLORS[index % SPENDING_FALLBACK_COLORS.length]),
    });
  });

  const breakdown: MoneySpendingSlice[] = Array.from(displayCategories.entries()).map(([name, entry]) => ({
    name,
    value: entry.value,
    percentage: spendingTotal > 0 ? Math.round((entry.value / spendingTotal) * 100) : 0,
    color: entry.color,
  }));
  const budget = budgetResult.data ? toNumber(budgetResult.data.limit_amount) : null;

  const bankCredits: BankCredit[] = (bankCreditsResult?.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    totalAmount: toNumber(row.total_amount),
    currentBalance: toNumber(row.current_balance),
    monthlyPayment: toNumber(row.monthly_payment),
    interestRate: row.interest_rate != null ? toNumber(row.interest_rate) : null,
    totalInstallments: toNumber(row.total_installments),
    paidInstallments: toNumber(row.paid_installments),
    payDueDay: toNumber(row.pay_due_date),
    notes: String(row.notes || ""),
    status: String(row.status),
    color: String(row.brand_color || "#16735b"),
    darkText: String(row.text_color).toLowerCase() !== "#ffffff" && String(row.text_color).toLowerCase() !== "#fff",
  }));

  return {
    accounts,
    cards,
    bankCredits,
    savings,
    spending: {
      total: spendingTotal,
      totalLabel: money(spendingTotal),
      breakdown,
      monthLabel: monthBounds.monthLabel,
      previousTotal,
      changePercent: previousTotal > 0 ? Math.round(((spendingTotal - previousTotal) / previousTotal) * 100) : null,
      budget,
      budgetUsagePercent: budget && budget > 0 ? Math.round((spendingTotal / budget) * 100) : null,
    },
  };
}
