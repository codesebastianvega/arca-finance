import { tool } from "ai";
import { z } from "zod";
import type { WorkspaceContext } from "@/src/lib/auth-types";
import { loadMoneyViewModel } from "@/src/lib/money-data";
import { loadObligationsViewModel } from "@/src/lib/obligations-data";
import { filterObligations } from "@/src/lib/obligations-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";
import { loadTodayViewModel } from "@/src/lib/today-data";
import { loadRegisterViewModel } from "@/src/lib/register-data";
import { loadMonthViewModel } from "@/src/lib/month-data";
import {
  confirmScheduledEventNow,
  createExpectedIncome,
  createMovement,
  createScheduledObligation,
  saveMonthlyPlan,
} from "@/app/actions";

type GenericRow = Record<string, unknown>;

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function dateInBogota(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(rawDate: string, days: number) {
  const date = new Date(`${rawDate}T12:00:00-05:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateInBogota(date);
}

function transactionRange(period: "current_month" | "last_30_days" | "last_90_days") {
  const today = dateInBogota();
  if (period === "last_30_days") return { start: addDays(today, -29), end: addDays(today, 1) };
  if (period === "last_90_days") return { start: addDays(today, -89), end: addDays(today, 1) };

  const [year, month] = today.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return { start, end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01` };
}

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function includesQuery(row: GenericRow, fields: string[], query: string) {
  const normalizedQuery = normalize(query);
  return fields.some((field) => normalize(row[field]).includes(normalizedQuery));
}

async function getSupabase() {
  const supabase = await createSupabaseServerComponentClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

export function createFinancialTools(context: WorkspaceContext) {
  const workspaceId = context.workspace.id;

  return {
    get_financial_action_options: tool({
      description:
        "Consulta las cuentas, categorías, frentes e ingresos disponibles para preparar una acción financiera. Úsala antes de registrar movimientos o programar ingresos/pagos; nunca le pidas al usuario identificadores internos.",
      inputSchema: z.object({}),
      execute: async () => {
        const options = await loadRegisterViewModel(context);
        return {
          currency: context.workspace.currencyCode,
          accounts: options.accounts.map((account) => ({
            id: account.id,
            name: account.label,
            type: account.meta,
            balance: account.amount ?? 0,
          })),
          categories: options.categories.map((category) => ({
            id: category.id,
            name: category.label,
          })),
          units: options.units.map((unit) => ({
            id: unit.id,
            name: unit.label,
            key: unit.value,
          })),
          incomeSources: options.incomeSources,
        };
      },
    }),

    get_financial_snapshot: tool({
      description:
        "Consulta el panorama financiero actual del usuario: saldos, dinero disponible, ahorro protegido, presupuesto, pagos críticos, próximos ingresos y cuentas por cobrar. Úsala antes de dar consejos financieros personalizados.",
      inputSchema: z.object({}),
      execute: async () => {
        const data = await loadTodayViewModel(context);
        return {
          currency: context.workspace.currencyCode,
          cash: data.cash,
          budget: data.budget,
          monthlyBudget: data.monthlyBudget,
          paymentHealth: data.metrics,
          criticalPayments: data.criticalPayments.slice(0, 12),
          receivables: data.receivables.slice(0, 12),
          upcomingIncomes: data.upcomingIncomes.slice(0, 12),
        };
      },
    }),

    get_obligations: tool({
      description:
        "Consulta facturas, cuotas, pagos, compromisos y obligaciones pendientes. Permite ver vencidos, próximos 7 días, mes actual o todo. Úsala para preguntas sobre pagos próximos o atrasados.",
      inputSchema: z.object({
        scope: z
          .enum(["overdue", "week", "month", "all"])
          .default("month")
          .describe("Rango solicitado: vencidos, próximos 7 días, mes actual o todos."),
      }),
      execute: async ({ scope }) => {
        const data = await loadObligationsViewModel(context);
        const filter = scope === "overdue" ? "vencido" : scope === "week" ? "semana" : scope === "all" ? "todo" : "mes";
        const items = filterObligations(data.items, filter);
        return {
          scope,
          currency: context.workspace.currencyCode,
          count: items.length,
          total: items.reduce((sum, item) => sum + item.amount, 0),
          overdueCount: items.filter((item) => item.status === "overdue").length,
          overdueTotal: items
            .filter((item) => item.status === "overdue")
            .reduce((sum, item) => sum + item.amount, 0),
          items: items.slice(0, 30),
          truncated: items.length > 30,
        };
      },
    }),

    get_debts_and_credit: tool({
      description:
        "Consulta deudas personales, tarjetas de crédito y créditos bancarios, incluidos saldos, cuotas, tasas y fechas. Úsala para revisar cuánto debe el usuario y priorizar pagos.",
      inputSchema: z.object({}),
      execute: async () => {
        const [supabase, money] = await Promise.all([getSupabase(), loadMoneyViewModel(context)]);
        const debtsResult = await supabase
          .from("debts")
          .select("id, name, lender, debt_type, principal_amount, balance, installment, next_due_date, annual_interest_rate, interest_type, term_months, remaining_months, paid_installments, estimated_total_payment, status, priority, notes")
          .eq("workspace_id", workspaceId)
          .order("next_due_date", { ascending: true });

        if (debtsResult.error) {
          throw new Error(`No se pudieron leer las deudas: ${debtsResult.error.message}`);
        }

        const debts = (debtsResult.data ?? []) as GenericRow[];
        return {
          currency: context.workspace.currencyCode,
          totals: {
            personalDebts: debts.reduce((sum, debt) => sum + numberValue(debt.balance), 0),
            creditCards: money.cards.reduce((sum, card) => sum + card.used, 0),
            bankCredits: money.bankCredits.reduce((sum, credit) => sum + credit.currentBalance, 0),
          },
          personalDebts: debts.slice(0, 30),
          creditCards: money.cards,
          bankCredits: money.bankCredits,
        };
      },
    }),

    get_transaction_summary: tool({
      description:
        "Suma y analiza ingresos, gastos y flujo neto por periodo y categoría. Úsala para preguntas como cuánto gasté, cuánto ingresó, en qué se fue el dinero o comparaciones del mes.",
      inputSchema: z.object({
        period: z.enum(["current_month", "last_30_days", "last_90_days"]).default("current_month"),
      }),
      execute: async ({ period }) => {
        const supabase = await getSupabase();
        const range = transactionRange(period);
        const result = await supabase
          .from("transactions")
          .select("id, kind, amount, concept, category, date, status")
          .eq("workspace_id", workspaceId)
          .gte("date", `${range.start}T00:00:00-05:00`)
          .lt("date", `${range.end}T00:00:00-05:00`)
          .neq("status", "cancelled")
          .order("date", { ascending: false });

        if (result.error) throw new Error(`No se pudieron leer los movimientos: ${result.error.message}`);

        const rows = (result.data ?? []) as GenericRow[];
        const expenseKinds = new Set(["expense", "debt_payment", "card_payment", "saving", "saving_contribution", "transfer_out"]);
        let income = 0;
        let expenses = 0;
        const categories = new Map<string, number>();

        for (const row of rows) {
          const amount = numberValue(row.amount);
          const kind = String(row.kind);
          if (kind === "income" || kind === "transfer_in") income += amount;
          if (expenseKinds.has(kind)) {
            expenses += amount;
            const category = String(row.category || "General");
            categories.set(category, (categories.get(category) ?? 0) + amount);
          }
        }

        return {
          period,
          range,
          currency: context.workspace.currencyCode,
          totals: { income, expenses, net: income - expenses, transactionCount: rows.length },
          expensesByCategory: [...categories.entries()]
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount),
          recentTransactions: rows.slice(0, 20),
        };
      },
    }),

    suggest_expense_category: tool({
      description:
        "Recomienda una categoría real de la app para un gasto, usando las categorías disponibles y el historial del usuario. Úsala antes de sugerir o registrar la categoría de un movimiento.",
      inputSchema: z.object({
        concept: z.string().min(2).describe("Concepto o descripción del gasto que se quiere categorizar."),
      }),
      execute: async ({ concept }) => {
        const supabase = await getSupabase();
        const [categoriesResult, historyResult] = await Promise.all([
          supabase
            .from("expense_categories")
            .select("name, group_name")
            .eq("workspace_id", workspaceId)
            .eq("active", true)
            .order("name", { ascending: true }),
          supabase
            .from("transactions")
            .select("concept, category, date")
            .eq("workspace_id", workspaceId)
            .in("kind", ["expense", "debt_payment", "card_payment"])
            .neq("status", "cancelled")
            .order("date", { ascending: false })
            .limit(250),
        ]);

        if (categoriesResult.error) throw new Error(`No se pudieron leer las categorías: ${categoriesResult.error.message}`);
        if (historyResult.error) throw new Error(`No se pudo leer el historial: ${historyResult.error.message}`);

        const categories = (categoriesResult.data ?? []) as GenericRow[];
        const history = (historyResult.data ?? []) as GenericRow[];
        const tokens = normalize(concept).split(/\s+/).filter((token) => token.length >= 3);
        const scores = new Map<string, number>();

        for (const row of history) {
          const historicalConcept = normalize(row.concept);
          if (!tokens.some((token) => historicalConcept.includes(token))) continue;
          const category = String(row.category || "General");
          scores.set(category, (scores.get(category) ?? 0) + 1);
        }

        for (const category of categories) {
          const name = String(category.name);
          if (normalize(concept).includes(normalize(name))) {
            scores.set(name, (scores.get(name) ?? 0) + 3);
          }
        }

        return {
          concept,
          availableCategories: categories,
          rankedHistoricalMatches: [...scores.entries()]
            .map(([category, score]) => ({ category, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 8),
          instruction:
            "Elige una categoría de availableCategories. Prioriza coincidencias históricas; si no hay, infiere por el concepto y explica brevemente la elección.",
        };
      },
    }),

    search_financial_records: tool({
      description:
        "Busca un nombre, persona, comercio o concepto en deudas, obligaciones, cuentas por cobrar y movimientos. Úsala para preguntas como qué le debo a Camila o qué pagos tengo con un proveedor.",
      inputSchema: z.object({
        query: z.string().min(2).describe("Nombre, comercio, persona o concepto que se desea encontrar."),
      }),
      execute: async ({ query }) => {
        const supabase = await getSupabase();
        const [debtsResult, eventsResult, receivablesResult, transactionsResult] = await Promise.all([
          supabase
            .from("debts")
            .select("id, name, lender, balance, installment, next_due_date, status, priority, notes")
            .eq("workspace_id", workspaceId)
            .order("next_due_date", { ascending: true })
            .limit(200),
          supabase
            .from("scheduled_events")
            .select("id, title, amount, due_date, kind, status, priority, notes")
            .eq("workspace_id", workspaceId)
            .order("due_date", { ascending: true })
            .limit(300),
          supabase
            .from("receivables")
            .select("id, title, debtor_name, amount, due_date, status, notes")
            .eq("workspace_id", workspaceId)
            .order("due_date", { ascending: true })
            .limit(200),
          supabase
            .from("transactions")
            .select("id, concept, amount, category, kind, date, status")
            .eq("workspace_id", workspaceId)
            .order("date", { ascending: false })
            .limit(300),
        ]);

        const firstError = [debtsResult.error, eventsResult.error, receivablesResult.error, transactionsResult.error].find(Boolean);
        if (firstError) throw new Error(`No se pudo completar la búsqueda: ${firstError?.message}`);

        const debts = ((debtsResult.data ?? []) as GenericRow[]).filter((row) => includesQuery(row, ["name", "lender", "notes"], query));
        const obligations = ((eventsResult.data ?? []) as GenericRow[]).filter((row) => includesQuery(row, ["title", "notes"], query));
        const receivables = ((receivablesResult.data ?? []) as GenericRow[]).filter((row) => includesQuery(row, ["title", "debtor_name", "notes"], query));
        const transactions = ((transactionsResult.data ?? []) as GenericRow[]).filter((row) => includesQuery(row, ["concept", "category"], query));

        return {
          query,
          currency: context.workspace.currencyCode,
          debts: debts.slice(0, 20),
          obligations: obligations.slice(0, 20),
          receivables: receivables.slice(0, 20),
          transactions: transactions.slice(0, 20),
          matchCount: debts.length + obligations.length + receivables.length + transactions.length,
        };
      },
    }),

    get_monthly_plan: tool({
      description:
        "Consulta el plan porcentual del mes, el ingreso base, los destinos asignados y cuánto se ha ejecutado. Úsala antes de recomendar cambios en la distribución del dinero.",
      inputSchema: z.object({}),
      execute: async () => {
        const plan = await loadMonthViewModel(context);
        return {
          month: plan.month,
          monthLabel: plan.monthLabel,
          currency: context.workspace.currencyCode,
          plannedIncome: plan.plannedIncome,
          receivedIncome: plan.receivedIncome,
          expectedIncome: plan.expectedIncome,
          commitments: plan.commitments,
          assignedPercentage: plan.assignedPercentage,
          unassignedPercentage: plan.unassignedPercentage,
          allocations: plan.allocations,
          availableCategories: plan.categoryOptions,
        };
      },
    }),

    save_monthly_plan: tool({
      title: "Guardar plan mensual",
      description:
        "Guarda o reemplaza la distribución porcentual del mes. Úsala solo después de mostrar la propuesta completa y cuando el usuario pida crear, aplicar o reorganizar su plan.",
      needsApproval: true,
      inputSchema: z.object({
        month: z.string().regex(/^\d{4}-\d{2}-01$/).optional().describe("Primer día del mes YYYY-MM-01; omitir para el mes actual."),
        plannedIncome: z.number().positive().describe("Ingreso base sobre el que se calculan los porcentajes."),
        allocations: z.array(z.object({
          name: z.string().min(2).describe("Nombre visible del destino."),
          type: z.enum(["expense", "saving", "debt", "free"]),
          percentage: z.number().positive().max(100),
          trackingCategory: z.string().optional().describe("Categoría real que medirá la ejecución; omitir para medir todo el tipo."),
        })).min(1),
      }),
      execute: async (input) => {
        const month = input.month ?? `${dateInBogota().slice(0, 7)}-01`;
        const result = await saveMonthlyPlan({
          month,
          plannedIncome: input.plannedIncome,
          allocations: input.allocations,
        });
        return {
          success: result.ok,
          action: "monthly_plan_saved",
          month,
          plannedIncome: input.plannedIncome,
          assignedPercentage: input.allocations.reduce((sum, allocation) => sum + allocation.percentage, 0),
          allocations: input.allocations,
          currency: context.workspace.currencyCode,
        };
      },
    }),

    record_transaction: tool({
      title: "Registrar movimiento",
      description:
        "Registra un ingreso o gasto real y actualiza el saldo de la cuenta elegida. Solo úsala cuando el usuario haya pedido explícitamente registrar o guardar el movimiento.",
      needsApproval: true,
      inputSchema: z.object({
        kind: z.enum(["income", "expense"]).describe("Tipo de movimiento."),
        concept: z.string().min(2).describe("Concepto breve y claro."),
        amount: z.number().positive().describe("Monto positivo."),
        accountId: z.string().min(1).describe("ID de una cuenta devuelta por get_financial_action_options."),
        accountName: z.string().min(1).describe("Nombre visible de esa misma cuenta."),
        category: z.string().min(1).describe("Categoría existente devuelta por get_financial_action_options."),
        unit: z.string().default("general").describe("Key del frente existente; usa general si no hay frentes."),
        date: z.string().optional().describe("Fecha efectiva YYYY-MM-DD; omitir para hoy."),
      }),
      execute: async (input) => {
        const options = await loadRegisterViewModel(context);
        const account = options.accounts.find((item) => item.id === input.accountId);
        if (!account) throw new Error("La cuenta seleccionada ya no está disponible.");

        const category = options.categories.find(
          (item) => normalize(item.label) === normalize(input.category),
        );
        if (input.kind === "expense" && !category) {
          throw new Error("La categoría seleccionada no existe en Arca.");
        }

        const unit =
          options.units.find((item) => item.value === input.unit)?.value ??
          (options.units.length === 0 ? "general" : null);
        if (!unit) throw new Error("El frente seleccionado no existe en Arca.");

        const result = await createMovement({
          kind: input.kind,
          concept: input.concept,
          amount: input.amount,
          accountId: account.id,
          category: input.kind === "income" ? "Ingreso" : category!.label,
          unit,
          date: input.date,
        });

        return {
          success: true,
          action: "transaction_recorded",
          transactionId: result.transactionId,
          concept: input.concept,
          amount: input.amount,
          kind: input.kind,
          accountName: account.label,
          category: input.kind === "income" ? "Ingreso" : category!.label,
          currency: context.workspace.currencyCode,
        };
      },
    }),

    confirm_obligation_payment: tool({
      title: "Confirmar pago",
      description:
        "Marca una obligación programada como pagada, crea la transacción y descuenta el saldo de su cuenta asociada. Requiere un ID obtenido con get_obligations o search_financial_records.",
      needsApproval: true,
      inputSchema: z.object({
        eventId: z.string().min(1).describe("ID exacto del evento programado."),
        title: z.string().min(1).describe("Nombre visible del pago para la tarjeta de confirmación."),
        amount: z.number().positive().optional().describe("Monto realmente pagado; omitir si coincide con lo programado."),
      }),
      execute: async ({ eventId, title, amount }) => {
        const result = await confirmScheduledEventNow(eventId, amount);
        return {
          success: true,
          action: "obligation_paid",
          title,
          amount: amount ?? null,
          transactionId: "transactionId" in result ? result.transactionId : null,
          alreadyConfirmed: "alreadyConfirmed" in result ? result.alreadyConfirmed : false,
          currency: context.workspace.currencyCode,
        };
      },
    }),

    schedule_obligation: tool({
      title: "Programar pago",
      description:
        "Crea un próximo pago, factura, cuota u obligación. Úsala cuando el usuario pida agendar o recordar un compromiso financiero.",
      needsApproval: true,
      inputSchema: z.object({
        title: z.string().min(2).describe("Nombre del compromiso."),
        amount: z.number().positive().describe("Monto esperado."),
        dueDate: z.string().describe("Fecha de vencimiento YYYY-MM-DD."),
        accountId: z.string().optional().describe("Cuenta sugerida obtenida con get_financial_action_options."),
        accountName: z.string().optional().describe("Nombre visible de la cuenta sugerida."),
        obligationType: z.string().default("otro").describe("Tipo: arriendo, credito, tarjeta, servicio u otro."),
        frequency: z
          .enum(["once", "monthly", "bimonthly", "quarterly", "biannual", "annual"])
          .default("once"),
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        if (input.accountId) {
          const options = await loadRegisterViewModel(context);
          if (!options.accounts.some((item) => item.id === input.accountId)) {
            throw new Error("La cuenta sugerida ya no está disponible.");
          }
        }

        await createScheduledObligation({
          title: input.title,
          amount: input.amount,
          dueDate: input.dueDate,
          accountId: input.accountId,
          obligationType: input.obligationType,
          frequency: input.frequency,
          notes: input.notes,
        });

        return {
          success: true,
          action: "obligation_scheduled",
          title: input.title,
          amount: input.amount,
          dueDate: input.dueDate,
          frequency: input.frequency,
          accountName: input.accountName ?? null,
          currency: context.workspace.currencyCode,
        };
      },
    }),

    schedule_expected_income: tool({
      title: "Programar ingreso",
      description:
        "Crea un ingreso esperado de una sola vez. Úsala cuando el usuario quiera recordar o proyectar dinero que recibirá próximamente.",
      needsApproval: true,
      inputSchema: z.object({
        title: z.string().min(2).describe("Concepto del ingreso."),
        amount: z.number().positive().describe("Monto esperado."),
        dueDate: z.string().describe("Fecha esperada YYYY-MM-DD."),
        accountId: z.string().min(1).describe("Cuenta destino obtenida con get_financial_action_options."),
        accountName: z.string().min(1).describe("Nombre visible de la cuenta destino."),
        unit: z.string().default("general").describe("Key del frente existente; usa general si no hay frentes."),
        sourceId: z.string().optional().describe("Fuente de ingreso existente, si aplica."),
      }),
      execute: async (input) => {
        const options = await loadRegisterViewModel(context);
        const account = options.accounts.find((item) => item.id === input.accountId);
        if (!account) throw new Error("La cuenta destino ya no está disponible.");

        const unit =
          options.units.find((item) => item.value === input.unit)?.value ??
          (options.units.length === 0 ? "general" : null);
        if (!unit) throw new Error("El frente seleccionado no existe en Arca.");

        await createExpectedIncome({
          title: input.title,
          amount: input.amount,
          dueDate: input.dueDate,
          accountId: account.id,
          unit,
          sourceId: input.sourceId,
          recurrenceMode: "once",
        });

        return {
          success: true,
          action: "income_scheduled",
          title: input.title,
          amount: input.amount,
          dueDate: input.dueDate,
          accountName: account.label,
          currency: context.workspace.currencyCode,
        };
      },
    }),
  };
}
