import type { WorkspaceContext } from "@/src/lib/auth-types";
import type { CalendarEventItem, CalendarMonth, CalendarViewModel } from "@/src/lib/calendar-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

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

function bogotaTodayString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function currentMonthParts() {
  const [yearStr, monthStr] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  }).format(new Date()).split("-");

  return { year: Number(yearStr), month: Number(monthStr) };
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthStart(year: number, month: number) {
  return `${monthKey(year, month)}-01`;
}

function addMonths(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function buildMonth(year: number, month: number): CalendarMonth {
  const firstDate = new Date(`${monthStart(year, month)}T00:00:00-05:00`);
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekday = firstDate.getDay();

  return {
    key: monthKey(year, month),
    label: new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      month: "long",
      year: "numeric",
    }).format(firstDate),
    year,
    monthIndex: month,
    firstWeekday: weekday,
    daysInMonth,
    events: [],
    summary: { payments: 0, income: 0, receivables: 0, expectedBalance: 0, overdueCount: 0, overdueAmount: 0, receivedToDate: 0, paidToDate: 0, pendingDueToDate: 0, commitmentsDueToDate: 0, balanceToDate: 0, health: "positive" },
  };
}

function classifyStatus(rawDate: string): "overdue" | "today" | "upcoming" {
  const today = bogotaTodayString();
  if (rawDate < today) return "overdue";
  if (rawDate === today) return "today";
  return "upcoming";
}

function dateLabel(rawDate: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    month: "short",
    day: "numeric",
  }).format(new Date(`${rawDate}T00:00:00-05:00`));
}

function paymentLabel(status: "overdue" | "today" | "upcoming") {
  if (status === "overdue") return "Pago vencido";
  if (status === "today") return "Pago hoy";
  return "Pago programado";
}

function incomeLabel(status: "overdue" | "today" | "upcoming") {
  if (status === "overdue") return "Ingreso atrasado";
  if (status === "today") return "Ingreso hoy";
  return "Ingreso esperado";
}

export async function loadCalendarViewModel(context: WorkspaceContext): Promise<CalendarViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const workspaceId = context.workspace.id;
  const { year, month } = currentMonthParts();
  const startCursor = addMonths(year, month, -1);
  const endCursor = addMonths(year, month, 5);
  const startWindow = monthStart(startCursor.year, startCursor.month);
  const endWindow = monthStart(endCursor.year, endCursor.month);

  const currentMonthStart = monthStart(year, month);
  const nextMonthParts = addMonths(year, month, 1);
  const currentMonthEnd = monthStart(nextMonthParts.year, nextMonthParts.month);

  const [scheduledResult, receivablesResult, transactionsResult] = await Promise.all([
    supabase
      .from("scheduled_events")
      .select("id, title, amount, due_date, kind, status, priority, account_id, suggested_account_id, notes, template_id")
      .eq("workspace_id", workspaceId)
      .gte("due_date", startWindow)
      .lt("due_date", endWindow)
      .not("status", "in", '("confirmed","confirmado","cancelled","cancelado","paid")')
      .order("due_date", { ascending: true }),
    supabase
      .from("receivables")
      .select("id, title, debtor_name, amount, due_date, status, notes")
      .eq("workspace_id", workspaceId)
      .gte("due_date", startWindow)
      .lt("due_date", endWindow)
      .order("due_date", { ascending: true }),
    supabase
      .from("transactions")
      .select("id, amount, date, kind")
      .eq("workspace_id", workspaceId)
      .neq("status", "cancelled")
      .gte("date", `${currentMonthStart}T00:00:00-05:00`)
      .lt("date", `${currentMonthEnd}T00:00:00-05:00`),
  ]);

  if (scheduledResult.error) {
    throw new Error(`No se pudo leer la agenda del calendario: ${scheduledResult.error.message}`);
  }
  if (receivablesResult.error && receivablesResult.error.code !== "PGRST205") {
    throw new Error(`No se pudieron leer las cuentas por cobrar: ${receivablesResult.error.message}`);
  }
  if (transactionsResult.error) {
    throw new Error(`No se pudieron calcular los movimientos de la agenda: ${transactionsResult.error.message}`);
  }

  const months = Array.from({ length: 6 }, (_, index) => {
    const value = addMonths(year, month, index);
    return buildMonth(value.year, value.month);
  });
  const monthMap = new Map(months.map((item) => [item.key, item]));

  const scheduledEvents: CalendarEventItem[] = (scheduledResult.data ?? []).map((row) => {
    const dueDate = String(row.due_date);
    const status = classifyStatus(dueDate);
    const kind = String(row.kind) === "income" ? "income" : "payment";
    return {
      id: String(row.id),
      title: String(row.title),
      amount: toNumber(row.amount),
      amountLabel: money(toNumber(row.amount)),
      dueDate,
      day: Number(dueDate.slice(8, 10)),
      monthKey: dueDate.slice(0, 7),
      kind,
      status,
      dateLabel: dateLabel(dueDate),
      secondaryLabel: kind === "income" ? incomeLabel(status) : paymentLabel(status),
      accountId: row.account_id ? String(row.account_id) : null,
      suggestedAccountId: row.suggested_account_id ? String(row.suggested_account_id) : null,
      notes: row.notes ? String(row.notes) : null,
      priority: (row.priority === "high" || row.priority === "low" ? row.priority : "medium") as "high" | "medium" | "low",
      templateId: row.template_id ? String(row.template_id) : null,
    };
  });

  const receivableEvents: CalendarEventItem[] = ((receivablesResult.data ?? []) as Array<{
    id: string;
    title: string;
    debtor_name: string;
    amount: number | string;
    due_date: string | null;
    status: string | null;
    notes: string | null;
  }>)
    .filter((row) => Boolean(row.due_date))
    .map((row) => {
      const dueDate = String(row.due_date);
      return {
        id: String(row.id),
        title: String(row.title || row.debtor_name),
        amount: toNumber(row.amount),
        amountLabel: money(toNumber(row.amount)),
        dueDate,
        day: Number(dueDate.slice(8, 10)),
        monthKey: dueDate.slice(0, 7),
        kind: "receivable",
        status: classifyStatus(dueDate),
        dateLabel: dateLabel(dueDate),
        secondaryLabel: `Cobro a ${row.debtor_name}`,
        accountId: null,
        suggestedAccountId: null,
        notes: row.notes ? String(row.notes) : null,
        priority: "medium",
      };
    });

  for (const event of [...scheduledEvents, ...receivableEvents]) {
    const monthBucket = monthMap.get(event.monthKey);
    if (monthBucket) {
      monthBucket.events.push(event);
    }
  }

  for (const monthItem of months) {
    monthItem.events.sort((a, b) => {
      if (a.dueDate === b.dueDate) return a.amount - b.amount;
      return a.dueDate.localeCompare(b.dueDate);
    });
    const payments = monthItem.events.filter((event) => event.kind === "payment").reduce((sum, event) => sum + event.amount, 0);
    const income = monthItem.events.filter((event) => event.kind === "income").reduce((sum, event) => sum + event.amount, 0);
    const receivables = monthItem.events.filter((event) => event.kind === "receivable").reduce((sum, event) => sum + event.amount, 0);
    const overdueEvents = monthItem.events.filter((event) => event.kind === "payment" && event.status === "overdue");
    const isCurrentMonth = monthItem.key === monthKey(year, month);
    const currentTransactions = isCurrentMonth ? (transactionsResult.data ?? []).filter((row) => String(row.date).slice(0, 10) <= bogotaTodayString()) : [];
    const outgoingKinds = new Set(["expense", "debt_payment", "card_payment", "saving"]);
    const receivedToDate = currentTransactions.filter((row) => String(row.kind) === "income").reduce((sum, row) => sum + toNumber(row.amount), 0);
    const paidToDate = currentTransactions.filter((row) => outgoingKinds.has(String(row.kind))).reduce((sum, row) => sum + toNumber(row.amount), 0);
    const pendingDueToDate = isCurrentMonth
      ? monthItem.events.filter((event) => event.kind === "payment" && event.dueDate <= bogotaTodayString()).reduce((sum, event) => sum + event.amount, 0)
      : 0;
    const commitmentsDueToDate = paidToDate + pendingDueToDate;
    const balanceToDate = receivedToDate - commitmentsDueToDate;
    const health = balanceToDate < 0 ? "negative" : overdueEvents.length > 0 ? "attention" : "positive";
    monthItem.summary = {
      payments,
      income,
      receivables,
      expectedBalance: income + receivables - payments,
      overdueCount: overdueEvents.length,
      overdueAmount: overdueEvents.reduce((sum, event) => sum + event.amount, 0),
      receivedToDate,
      paidToDate,
      pendingDueToDate,
      commitmentsDueToDate,
      balanceToDate,
      health,
    };
  }

  return {
    months,
    initialMonthKey: monthKey(year, month),
  };
}
