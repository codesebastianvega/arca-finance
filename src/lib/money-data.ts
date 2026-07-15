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
  const monthLabel = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "America/Bogota" }).format(new Date(`${start}T00:00:00-05:00`));
  return { start, nextMonth, monthLabel };
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
  hogar: "#C68A45",
  comida: "#7A8F5C",
  ocio: "#4A3B26",
  salud: "#C1543A",
  transporte: "#8D6E63",
  servicios: "#D49A57",
  general: "#C68A45",
};

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

  const [accountsResult, rawCardsResult, savingsResult, transactionsResult, bankCreditsResult] = await Promise.all([
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
      .gte("date", `${monthBounds.start}T00:00:00-05:00`)
      .lt("date", `${monthBounds.nextMonth}T00:00:00-05:00`),
    supabase
      .from("bank_credits")
      .select("id, name, total_amount, current_balance, monthly_payment, interest_rate, total_installments, paid_installments, pay_due_date, notes, status, brand_color, text_color")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
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

  for (const row of transactionsResult.data ?? []) {
    if (!outgoingKinds.has(String(row.kind))) continue;
    const key = String(row.category ?? "general").toLowerCase();
    grouped.set(key, (grouped.get(key) ?? 0) + toNumber(row.amount));
  }

  const breakdown: MoneySpendingSlice[] = Array.from(grouped.entries())
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SPENDING_COLOR_BY_CATEGORY[name] ?? "#C68A45",
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const spendingTotal = breakdown.reduce((sum, item) => sum + item.value, 0);

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
    },
  };
}
