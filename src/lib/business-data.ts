import type { WorkspaceContext } from "@/src/lib/auth-types";
import type { BusinessActiveItem, BusinessSource, BusinessTopItem, BusinessUnitSummary, BusinessViewModel } from "@/src/lib/business-types";
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

function currentMonthBounds() {
  const [year, month] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  }).format(new Date()).split("-");

  const start = `${year}-${month}-01`;
  const monthNumber = Number(month);
  const nextMonth = monthNumber === 12 ? `${Number(year) + 1}-01-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  return { start, nextMonth };
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function eventLabel(rawDate: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    month: "short",
    day: "numeric",
  }).format(new Date(`${rawDate}T00:00:00-05:00`));
}

function dueLabel(rawDate: string) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (rawDate < today) return `Vencio ${eventLabel(rawDate)}`;
  if (rawDate === today) return "Vence hoy";
  return `Vence ${eventLabel(rawDate)}`;
}

type UnitAccumulator = {
  id: string;
  name: string;
  key: string;
  realIncome: number;
  expectedIncome: number;
  realExpense: number;
  nextEventDate: string | null;
  nextEventTitle: string | null;
  nextEventAmount: number | null;
};

type IncomeSourceRow = {
  id: string;
  name: string;
  business_unit_key: string;
  default_account_id?: string | null;
};

async function loadIncomeSourcesForBusiness(
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerComponentClient>>,
) {
  const primaryResult = await supabase
    .from("income_sources")
    .select("id, name, business_unit_key, default_account_id")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (!primaryResult.error) {
    return primaryResult as { data: IncomeSourceRow[] | null; error: null };
  }

  if (!primaryResult.error.message.includes("default_account_id")) {
    return primaryResult as { data: IncomeSourceRow[] | null; error: typeof primaryResult.error };
  }

  const fallbackResult = await supabase
    .from("income_sources")
    .select("id, name, business_unit_key")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (fallbackResult.error) {
    return fallbackResult as { data: IncomeSourceRow[] | null; error: typeof fallbackResult.error };
  }

  return {
    data: (fallbackResult.data ?? []).map((row) => ({
      ...row,
      default_account_id: null,
    })),
    error: null,
  };
}

export async function loadBusinessViewModel(context: WorkspaceContext): Promise<BusinessViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const workspaceId = context.workspace.id;
  const { start, nextMonth } = currentMonthBounds();
  const today = todayKey();
  const sourcesPromise = loadIncomeSourcesForBusiness(workspaceId, supabase);

  const [unitsResult, transactionsResult, scheduledResult, sourcesResult, accountsResult] = await Promise.all([
    supabase.from("business_units").select("id, name, key").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("amount, kind, unit, date, status")
      .eq("workspace_id", workspaceId)
      .gte("date", `${start}T00:00:00-05:00`)
      .lt("date", `${nextMonth}T00:00:00-05:00`)
      .neq("status", "cancelled"),
    supabase
      .from("scheduled_events")
      .select("title, amount, kind, due_date, status, business_unit_key")
      .eq("workspace_id", workspaceId)
      .gte("due_date", start)
      .lt("due_date", nextMonth)
      .not("status", "in", '("confirmed","confirmado","cancelled","cancelado","paid")')
      .order("due_date", { ascending: true }),
    sourcesPromise,
    supabase
      .from("accounts")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
  ]);

  if (unitsResult.error) {
    throw new Error(`No se pudieron leer los frentes: ${unitsResult.error.message}`);
  }
  if (transactionsResult.error) {
    throw new Error(`No se pudieron leer los movimientos de negocios: ${transactionsResult.error.message}`);
  }
  if (scheduledResult.error) {
    throw new Error(`No se pudieron leer los eventos esperados: ${scheduledResult.error.message}`);
  }
  if (sourcesResult.error) {
    throw new Error(`No se pudieron leer las fuentes de ingreso: ${sourcesResult.error.message}`);
  }
  if (accountsResult.error) {
    throw new Error(`No se pudieron leer las cuentas para negocios: ${accountsResult.error.message}`);
  }

  const unitMap = new Map<string, UnitAccumulator>();
  const activeItems: BusinessActiveItem[] = [];

  for (const row of unitsResult.data ?? []) {
    unitMap.set(String(row.key), {
      id: String(row.id),
      name: String(row.name),
      key: String(row.key),
      realIncome: 0,
      expectedIncome: 0,
      realExpense: 0,
      nextEventDate: null,
      nextEventTitle: null,
      nextEventAmount: null,
    });
  }

  for (const row of transactionsResult.data ?? []) {
    const key = String(row.unit ?? "").trim();
    if (!key || !unitMap.has(key)) continue;
    const unit = unitMap.get(key)!;
    const amount = toNumber(row.amount);
    const kind = String(row.kind);

    if (kind === "income") {
      unit.realIncome += amount;
    } else if (kind === "expense") {
      unit.realExpense += amount;
    }
  }

  for (const row of scheduledResult.data ?? []) {
    const key = String(row.business_unit_key ?? "").trim();
    if (!key || !unitMap.has(key)) continue;
    const unit = unitMap.get(key)!;
    const amount = toNumber(row.amount);
    const kind = String(row.kind);
    const dueDate = String(row.due_date);

    if (kind === "income") {
      unit.expectedIncome += amount;
    }

    if (!unit.nextEventDate || dueDate < unit.nextEventDate) {
      unit.nextEventDate = dueDate;
      unit.nextEventTitle = String(row.title);
      unit.nextEventAmount = amount;
    }

    if (kind === "income") {
      activeItems.push({
        id: `${key}-${dueDate}-${String(row.title)}`,
        title: String(row.title),
        unitName: unit.name,
        amount,
        amountLabel: money(amount),
        dueDate,
        dueLabel: dueLabel(dueDate),
        status: dueDate < today ? "overdue" : dueDate === today ? "today" : "pending",
      });
    }
  }

  const units: BusinessUnitSummary[] = Array.from(unitMap.values()).map((unit) => {
    const net = unit.realIncome - unit.realExpense;
    return {
      id: unit.id,
      name: unit.name,
      key: unit.key,
      realIncome: unit.realIncome,
      realIncomeLabel: money(unit.realIncome),
      expectedIncome: unit.expectedIncome,
      expectedIncomeLabel: money(unit.expectedIncome),
      realExpense: unit.realExpense,
      realExpenseLabel: money(unit.realExpense),
      net,
      netLabel: money(net),
      nextEventLabel: unit.nextEventDate && unit.nextEventTitle ? `${unit.nextEventTitle} · ${eventLabel(unit.nextEventDate)}` : "Sin agenda cargada",
      nextEventAmountLabel: unit.nextEventAmount !== null ? money(unit.nextEventAmount) : null,
    };
  });

  const totals = units.reduce(
    (acc, unit) => {
      acc.expectedIncome += unit.expectedIncome;
      acc.realIncome += unit.realIncome;
      acc.realExpense += unit.realExpense;
      acc.net += unit.net;
      return acc;
    },
    { expectedIncome: 0, realIncome: 0, realExpense: 0, net: 0 },
  );

  const topItems: BusinessTopItem[] = [...units]
    .sort((left, right) => right.realIncome - left.realIncome)
    .slice(0, 3)
    .map((unit) => ({
      id: unit.id,
      name: unit.name,
      totalLabel: unit.realIncomeLabel,
      helper: `Neto ${unit.netLabel}`,
    }));

  const accountMap = new Map((accountsResult.data ?? []).map((row) => [String(row.id), String(row.name)]));
  const sources: BusinessSource[] = (sourcesResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    unitKey: String(row.business_unit_key),
    unitName: unitMap.get(String(row.business_unit_key))?.name ?? String(row.business_unit_key),
    defaultAccountId: row.default_account_id ? String(row.default_account_id) : null,
    defaultAccountLabel: row.default_account_id ? accountMap.get(String(row.default_account_id)) ?? null : null,
  }));

  return {
    totals: {
      expectedIncome: totals.expectedIncome,
      expectedIncomeLabel: money(totals.expectedIncome),
      realIncome: totals.realIncome,
      realIncomeLabel: money(totals.realIncome),
      realExpense: totals.realExpense,
      realExpenseLabel: money(totals.realExpense),
      net: totals.net,
      netLabel: money(totals.net),
    },
    activeItems: activeItems
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
      .slice(0, 4),
    topItems,
    units,
    sources,
    accountOptions: (accountsResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: String(row.name),
    })),
  };
}
