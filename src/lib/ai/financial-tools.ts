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
import { summarizeRecurrence } from "@/src/lib/recurrence-summary";
import {
  archiveAccount,
  archiveCreditCard,
  archiveBankCredit,
  archiveBusinessUnit,
  confirmScheduledEventNow,
  createAccount,
  createCreditCard,
  createBankCredit,
  createBusinessUnit,
  createExpenseCategory,
  createExpectedIncome,
  createIncomeSource,
  createMovement,
  createPayableLoan,
  createReceivableLoan,
  createSavingsGoal,
  createScheduledObligation,
  createTransfer,
  deleteExpenseCategory,
  deleteIncomeSource,
  saveMonthlyPlan,
  updateAccountDetails,
  updateCreditCardDetails,
  updateBankCreditDetails,
  updateBusinessUnit,
  updateExpenseCategory,
  updateIncomeSource,
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
  const isPersonalUnit = (unit: { label: string; value: string }) =>
    normalize(unit.label) === "personal" || unit.value.startsWith("personal-");

  return {
    get_financial_action_options: tool({
      description:
        "Consulta cuentas, categorías, el espacio Personal, proyectos e ingresos disponibles para preparar una acción financiera. Úsala antes de registrar movimientos o programar ingresos/pagos; nunca le pidas al usuario identificadores internos.",
      inputSchema: z.object({}),
      execute: async () => {
        const options = await loadRegisterViewModel(context);
        return {
          currency: context.workspace.currencyCode,
          accounts: options.accounts.map((account) => ({
            id: account.id,
            name: account.label,
            entity: account.entity ?? null,
            type: account.meta,
            balance: account.amount ?? 0,
            color: account.color ?? null,
          })),
          creditCards: options.creditCards.map((card) => ({
            id: card.id,
            name: card.name,
            issuer: card.issuer,
            limit: card.limit,
            used: card.used,
            available: Math.max(0, card.limit - card.used),
            minimumPayment: card.minimumPayment,
            annualInterestRate: card.annualInterestRate,
            interestType: card.interestType,
            cutOffDay: card.cutOffDay,
            payDueDay: card.payDueDay,
            paymentStrategy: card.paymentStrategy,
            notes: card.notes,
          })),
          bankCredits: options.bankCredits.map((credit) => ({
            id: credit.id,
            name: credit.name,
            totalAmount: credit.totalAmount,
            currentBalance: credit.currentBalance,
            monthlyPayment: credit.monthlyPayment,
            interestRate: credit.interestRate,
            totalInstallments: credit.totalInstallments,
            paidInstallments: credit.paidInstallments,
            payDueDay: credit.payDueDay,
            notes: credit.notes,
          })),
          categories: options.categories.map((category) => ({
            id: category.id,
            name: category.label,
          })),
          units: options.units.map((unit) => ({
            id: unit.id,
            name: unit.label,
            key: unit.value,
            type: isPersonalUnit(unit) ? "personal" : "project",
          })),
          incomeSources: options.incomeSources,
        };
      },
    }),

    create_expense_category: tool({
      title: "Crear categoría de gasto",
      description: "Crea una categoría de gasto. Consulta primero get_financial_action_options y usa IDs exactos.",
      needsApproval: true,
      inputSchema: z.object({
        name: z.string().min(2),
        parentCategoryId: z.string().optional(),
        parentCategoryName: z.string().optional(),
      }),
      execute: async ({ name, parentCategoryId, parentCategoryName }) => {
        const options = await loadRegisterViewModel(context);
        const parent = parentCategoryId ? options.categories.find((item) => item.id === parentCategoryId) : null;
        if (parentCategoryId && !parent) throw new Error("La categoría principal ya no está disponible.");
        if (parent && parentCategoryName && normalize(parent.label) !== normalize(parentCategoryName)) throw new Error("La categoría principal cambió; vuelve a consultarla.");
        const result = await createExpenseCategory({ name, parentId: parent?.id ?? null });
        return { success: result.ok, action: "expense_category_created", categoryId: result.categoryId, name, parentCategory: parent?.label ?? null };
      },
    }),

    update_expense_category: tool({
      title: "Editar categoría de gasto",
      description: "Renombra o reorganiza una categoría existente. Consulta primero get_financial_action_options.",
      needsApproval: true,
      inputSchema: z.object({
        categoryId: z.string().min(1),
        currentName: z.string().min(1),
        name: z.string().min(2),
        parentCategoryId: z.string().nullable().optional(),
        parentCategoryName: z.string().nullable().optional(),
      }),
      execute: async ({ categoryId, currentName, name, parentCategoryId, parentCategoryName }) => {
        const options = await loadRegisterViewModel(context);
        const category = options.categories.find((item) => item.id === categoryId);
        const parent = parentCategoryId ? options.categories.find((item) => item.id === parentCategoryId) : null;
        if (!category) throw new Error("La categoría ya no está disponible.");
        if (normalize(category.label) !== normalize(currentName)) throw new Error("La categoría cambió; vuelve a consultarla.");
        if (parentCategoryId && !parent) throw new Error("La categoría principal ya no está disponible.");
        if (parent && parentCategoryName && normalize(parent.label) !== normalize(parentCategoryName)) throw new Error("La categoría principal cambió; vuelve a consultarla.");
        if (parent?.id === category.id) throw new Error("Una categoría no puede depender de sí misma.");
        const result = await updateExpenseCategory({ id: category.id, name, parentId: parent?.id ?? null, icon: category.icon });
        return { success: result.ok, action: "expense_category_updated", categoryId: category.id, previousName: category.label, name, parentCategory: parent?.label ?? null };
      },
    }),

    delete_expense_category: tool({
      title: "Eliminar categoría de gasto",
      description: "Elimina una categoría existente. Consulta primero get_financial_action_options.",
      needsApproval: true,
      inputSchema: z.object({ categoryId: z.string().min(1), name: z.string().min(1) }),
      execute: async ({ categoryId, name }) => {
        const options = await loadRegisterViewModel(context);
        const category = options.categories.find((item) => item.id === categoryId);
        if (!category) throw new Error("La categoría ya no está disponible.");
        if (normalize(category.label) !== normalize(name)) throw new Error("La categoría cambió; vuelve a consultarla.");
        const result = await deleteExpenseCategory(category.id);
        return { success: result.ok, action: "expense_category_deleted", categoryId: category.id, name: category.label };
      },
    }),

    create_income_source: tool({
      title: "Crear concepto de ingreso",
      description: "Crea una fuente o concepto de ingreso vinculada a una cuenta y un espacio. Consulta primero get_financial_action_options.",
      needsApproval: true,
      inputSchema: z.object({ name: z.string().min(2), accountId: z.string().min(1), accountName: z.string().min(1), unitKey: z.string().min(1), unitName: z.string().min(1) }),
      execute: async ({ name, accountId, accountName, unitKey, unitName }) => {
        const options = await loadRegisterViewModel(context);
        const account = options.accounts.find((item) => item.id === accountId);
        const unit = options.units.find((item) => item.value === unitKey);
        if (!account) throw new Error("La cuenta destino ya no está disponible.");
        if (!unit) throw new Error("El espacio o proyecto ya no está disponible.");
        if (normalize(account.label) !== normalize(accountName) || normalize(unit.label) !== normalize(unitName)) throw new Error("La cuenta o el proyecto cambió; vuelve a consultar las opciones.");
        const result = await createIncomeSource({ name, defaultAccountId: account.id, businessUnitKey: unit.value });
        return { success: result.ok, action: "income_source_created", sourceId: result.sourceId, name, accountName: account.label, unitName: unit.label };
      },
    }),

    update_income_source: tool({
      title: "Editar concepto de ingreso",
      description: "Edita una fuente de ingreso existente. Consulta primero get_financial_action_options.",
      needsApproval: true,
      inputSchema: z.object({ sourceId: z.string().min(1), currentName: z.string().min(1), name: z.string().min(2), accountId: z.string().min(1), accountName: z.string().min(1), unitKey: z.string().min(1), unitName: z.string().min(1) }),
      execute: async ({ sourceId, currentName, name, accountId, accountName, unitKey, unitName }) => {
        const options = await loadRegisterViewModel(context);
        const source = options.incomeSources.find((item) => item.id === sourceId);
        const account = options.accounts.find((item) => item.id === accountId);
        const unit = options.units.find((item) => item.value === unitKey);
        if (!source) throw new Error("El concepto de ingreso ya no está disponible.");
        if (normalize(source.label) !== normalize(currentName)) throw new Error("El concepto de ingreso cambió; vuelve a consultarlo.");
        if (!account) throw new Error("La cuenta destino ya no está disponible.");
        if (!unit) throw new Error("El espacio o proyecto ya no está disponible.");
        if (normalize(account.label) !== normalize(accountName) || normalize(unit.label) !== normalize(unitName)) throw new Error("La cuenta o el proyecto cambió; vuelve a consultar las opciones.");
        const result = await updateIncomeSource({ id: source.id, name, defaultAccountId: account.id, businessUnitKey: unit.value });
        return { success: result.ok, action: "income_source_updated", sourceId: source.id, previousName: source.label, name, accountName: account.label, unitName: unit.label };
      },
    }),

    delete_income_source: tool({
      title: "Eliminar concepto de ingreso",
      description: "Elimina una fuente de ingreso existente. Consulta primero get_financial_action_options.",
      needsApproval: true,
      inputSchema: z.object({ sourceId: z.string().min(1), name: z.string().min(1) }),
      execute: async ({ sourceId, name }) => {
        const options = await loadRegisterViewModel(context);
        const source = options.incomeSources.find((item) => item.id === sourceId);
        if (!source) throw new Error("El concepto de ingreso ya no está disponible.");
        if (normalize(source.label) !== normalize(name)) throw new Error("El concepto de ingreso cambió; vuelve a consultarlo.");
        const result = await deleteIncomeSource(source.id);
        return { success: result.ok, action: "income_source_deleted", sourceId: source.id, name: source.label };
      },
    }),

    create_personal_loan: tool({
      title: "Registrar préstamo entre personas",
      description: "Registra dinero prestado a otra persona o recibido en préstamo. Consulta primero get_financial_action_options.",
      needsApproval: true,
      inputSchema: z.object({
        direction: z.enum(["lent", "borrowed"]),
        personName: z.string().min(2),
        title: z.string().min(2).optional(),
        amount: z.number().positive(),
        dueDate: z.string().optional(),
        accountId: z.string().min(1),
        accountName: z.string().min(1),
        balanceBefore: z.number().min(0),
        notes: z.string().optional(),
      }),
      execute: async ({ direction, personName, title, amount, dueDate, accountId, accountName, balanceBefore, notes }) => {
        const options = await loadRegisterViewModel(context);
        const account = options.accounts.find((item) => item.id === accountId);
        if (!account) throw new Error("La cuenta seleccionada ya no está disponible.");
        if (normalize(account.label) !== normalize(accountName) || (account.amount ?? 0) !== balanceBefore) throw new Error("El saldo o la cuenta cambió; vuelve a consultar antes de confirmar.");
        if (direction === "borrowed" && !dueDate) throw new Error("Debes indicar cuándo se pagará el préstamo recibido.");
        if (direction === "lent") {
          const result = await createReceivableLoan({ debtorName: personName, title, amount, dueDate, accountId: account.id, notes });
          return { success: result.ok, action: "personal_loan_lent", receivableId: result.receivableId, personName, title: title ?? `Préstamo a ${personName}`, amount, dueDate: dueDate ?? null, accountName: account.label, balanceAfter: (account.amount ?? 0) - amount, currency: context.workspace.currencyCode };
        }
        const result = await createPayableLoan({ lenderName: personName, title, amount, dueDate, accountId: account.id, notes });
        return { success: result.ok, action: "personal_loan_borrowed", personName, title: title ?? `Préstamo de ${personName}`, amount, dueDate, accountName: account.label, balanceAfter: (account.amount ?? 0) + amount, currency: context.workspace.currencyCode };
      },
    }),

    transfer_between_accounts: tool({
      title: "Transferir entre cuentas",
      description: "Mueve dinero entre dos cuentas activas del usuario. Consulta primero get_financial_action_options y usa sus IDs exactos.",
      needsApproval: true,
      inputSchema: z.object({
        fromAccountId: z.string().min(1),
        fromAccountName: z.string().min(1),
        fromBalanceBefore: z.number().min(0),
        toAccountId: z.string().min(1),
        toAccountName: z.string().min(1),
        toBalanceBefore: z.number().min(0),
        amount: z.number().positive(),
        concept: z.string().min(2).default("Transferencia entre cuentas"),
        date: z.string().optional().describe("Fecha YYYY-MM-DD; omitir para hoy."),
      }),
      execute: async ({ fromAccountId, fromAccountName, fromBalanceBefore, toAccountId, toAccountName, toBalanceBefore, amount, concept, date }) => {
        const options = await loadRegisterViewModel(context);
        const from = options.accounts.find((item) => item.id === fromAccountId);
        const to = options.accounts.find((item) => item.id === toAccountId);
        if (!from || !to) throw new Error("Una de las cuentas ya no está disponible.");
        if (from.id === to.id) throw new Error("La cuenta origen y destino deben ser diferentes.");
        if (normalize(from.label) !== normalize(fromAccountName) || normalize(to.label) !== normalize(toAccountName) || (from.amount ?? 0) !== fromBalanceBefore || (to.amount ?? 0) !== toBalanceBefore) {
          throw new Error("Una cuenta o saldo cambió; vuelve a consultar antes de confirmar.");
        }
        const result = await createTransfer({ fromAccountId: from.id, toAccountId: to.id, amount, concept, date: date ?? dateInBogota() });
        return { success: result.ok, action: "account_transfer_created", ...result, currency: context.workspace.currencyCode };
      },
    }),

    create_savings_goal: tool({
      title: "Crear meta de ahorro",
      description: "Crea una meta de ahorro sin mover dinero todavía. Los aportes se registran después por separado.",
      needsApproval: true,
      inputSchema: z.object({
        name: z.string().min(2),
        target: z.number().positive(),
        dueDate: z.string().nullable().optional().describe("Fecha objetivo YYYY-MM-DD, si existe."),
      }),
      execute: async ({ name, target, dueDate }) => {
        const result = await createSavingsGoal({ name, target, current: 0, dueDate, goalType: "goal" });
        return { success: result.ok, action: "savings_goal_created", goalId: result.goalId, name, target, current: 0, dueDate: dueDate ?? null, currency: context.workspace.currencyCode };
      },
    }),

    get_projects_and_activities: tool({
      description:
        "Consulta los proyectos y actividades activos. Úsala para listar, comparar o identificar el proyecto que se quiere editar o archivar. Personal no es un proyecto y no se puede archivar.",
      inputSchema: z.object({}),
      execute: async () => {
        const options = await loadRegisterViewModel(context);
        const projects = options.units
          .filter((unit) => !isPersonalUnit(unit))
          .map((unit) => ({ id: unit.id, name: unit.label, key: unit.value }));
        return {
          count: projects.length,
          projects,
          personalMode: projects.length === 0,
          instruction: projects.length === 0
            ? "El usuario usa Arca en modo Personal. Solo crea un proyecto si lo solicita."
            : "Usa el id exacto de esta lista para editar o archivar.",
        };
      },
    }),

    create_project: tool({
      title: "Crear proyecto",
      description:
        "Crea un proyecto o actividad para separar ingresos y gastos de Personal. Úsala solo cuando el usuario pida crear un negocio, cliente, trabajo o proyecto.",
      needsApproval: true,
      inputSchema: z.object({
        name: z.string().min(2).describe("Nombre visible del proyecto o actividad."),
      }),
      execute: async ({ name }) => {
        const result = await createBusinessUnit({ name, key: name });
        return {
          success: result.ok,
          action: "project_created",
          projectId: result.unitId,
          name: result.name,
        };
      },
    }),

    update_project: tool({
      title: "Renombrar proyecto",
      description:
        "Cambia el nombre de un proyecto existente. Consulta get_projects_and_activities antes y usa su ID exacto.",
      needsApproval: true,
      inputSchema: z.object({
        projectId: z.string().min(1).describe("ID exacto devuelto por get_projects_and_activities."),
        currentName: z.string().min(1).describe("Nombre actual visible para la confirmación."),
        newName: z.string().min(2).describe("Nuevo nombre solicitado."),
      }),
      execute: async ({ projectId, newName }) => {
        const options = await loadRegisterViewModel(context);
        const project = options.units.find((unit) => unit.id === projectId && !isPersonalUnit(unit));
        if (!project) throw new Error("El proyecto ya no está disponible.");
        const result = await updateBusinessUnit({ id: project.id, name: newName, key: project.value });
        return {
          success: result.ok,
          action: "project_updated",
          projectId: result.unitId,
          previousName: project.label,
          name: result.name,
        };
      },
    }),

    archive_project: tool({
      title: "Archivar proyecto",
      description:
        "Oculta un proyecto activo sin borrar su historial financiero. Consulta get_projects_and_activities antes y usa su ID exacto. Personal nunca se puede archivar.",
      needsApproval: true,
      inputSchema: z.object({
        projectId: z.string().min(1).describe("ID exacto devuelto por get_projects_and_activities."),
        name: z.string().min(1).describe("Nombre visible del proyecto para la confirmación."),
      }),
      execute: async ({ projectId }) => {
        const result = await archiveBusinessUnit(projectId);
        return {
          success: result.ok,
          action: "project_archived",
          projectId: result.unitId,
          name: result.name,
        };
      },
    }),

    create_account: tool({
      title: "Crear cuenta",
      description:
        "Crea una cuenta bancaria, billetera digital, efectivo o inversión. El saldo inicial queda registrado como punto de partida. Úsala solo cuando el usuario pida agregar una cuenta.",
      needsApproval: true,
      inputSchema: z.object({
        name: z.string().min(2).describe("Nombre visible de la cuenta."),
        entity: z.string().optional().describe("Banco o entidad, si aplica."),
        type: z.enum(["Ahorros", "Corriente", "Billetera digital", "Efectivo", "Inversión"]),
        initialBalance: z.number().min(0).default(0).describe("Saldo actual desde el que empezará la cuenta; no es ingreso del mes."),
      }),
      execute: async ({ name, entity, type, initialBalance }) => {
        const result = await createAccount({
          name,
          entity,
          type,
          balance: initialBalance,
          color: "#C68A45",
        });
        return {
          success: result.ok,
          action: "account_created",
          accountId: result.accountId,
          name: result.name,
          entity: result.entity,
          type: result.type,
          balance: result.balance,
          currency: context.workspace.currencyCode,
        };
      },
    }),

    update_account: tool({
      title: "Editar cuenta",
      description:
        "Actualiza nombre, entidad o tipo de una cuenta activa sin cambiar su saldo. Usa un ID devuelto por get_financial_action_options.",
      needsApproval: true,
      inputSchema: z.object({
        accountId: z.string().min(1).describe("ID exacto de la cuenta."),
        currentName: z.string().min(1).describe("Nombre actual para la confirmación."),
        name: z.string().min(2).describe("Nombre nuevo o confirmado."),
        entity: z.string().optional().describe("Banco o entidad."),
        type: z.enum(["Ahorros", "Corriente", "Billetera digital", "Efectivo", "Inversión"]),
      }),
      execute: async ({ accountId, currentName, name, entity, type }) => {
        const options = await loadRegisterViewModel(context);
        const account = options.accounts.find((item) => item.id === accountId);
        if (!account) throw new Error("La cuenta ya no está disponible.");
        const result = await updateAccountDetails({
          id: account.id,
          name,
          entity,
          type,
          color: account.color,
        });
        return {
          success: result.ok,
          action: "account_updated",
          accountId: result.accountId,
          previousName: currentName || account.label,
          name: result.name,
          entity: result.entity,
          type: result.type,
          balance: result.balance,
          currency: context.workspace.currencyCode,
        };
      },
    }),

    archive_account: tool({
      title: "Archivar cuenta",
      description:
        "Archiva una cuenta sin borrar su historial. Solo es posible si su saldo es cero y queda otra cuenta activa. Usa un ID devuelto por get_financial_action_options.",
      needsApproval: true,
      inputSchema: z.object({
        accountId: z.string().min(1).describe("ID exacto de la cuenta."),
        name: z.string().min(1).describe("Nombre visible para la confirmación."),
      }),
      execute: async ({ accountId }) => {
        const options = await loadRegisterViewModel(context);
        const account = options.accounts.find((item) => item.id === accountId);
        if (!account) throw new Error("La cuenta ya no está disponible.");
        const result = await archiveAccount(account.id);
        return {
          success: result.ok,
          action: "account_archived",
          accountId: result.accountId,
          name: result.name,
        };
      },
    }),

    create_credit_card: tool({
      title: "Crear tarjeta de crédito",
      description:
        "Registra una tarjeta de crédito con su cupo, deuda inicial, fechas y pago mínimo. La deuda inicial es un punto de partida, no un gasto nuevo.",
      needsApproval: true,
      inputSchema: z.object({
        name: z.string().min(2).describe("Nombre visible de la tarjeta."),
        issuer: z.string().min(2).describe("Banco o entidad emisora."),
        limitValue: z.number().min(0).describe("Cupo total de la tarjeta."),
        initialDebt: z.number().min(0).default(0).describe("Deuda actual al registrarla; no crea un gasto."),
        cutOffDay: z.number().int().min(1).max(31).describe("Día de corte."),
        payDueDay: z.number().int().min(1).max(31).describe("Día límite de pago."),
        minimumPayment: z.number().min(0).default(0).describe("Pago mínimo mensual conocido."),
        annualInterestRate: z.number().min(0).nullable().optional().describe("Tasa anual en porcentaje, si el usuario la conoce."),
        interestType: z.enum(["EA", "NMV", "unknown"]).default("unknown"),
        paymentStrategy: z.enum(["minimum", "fixed", "full"]).default("minimum"),
        notes: z.string().optional(),
      }),
      execute: async ({ name, issuer, limitValue, initialDebt, cutOffDay, payDueDay, minimumPayment, annualInterestRate, interestType, paymentStrategy, notes }) => {
        const result = await createCreditCard({
          name,
          issuer,
          limitValue,
          used: initialDebt,
          cutOffDate: cutOffDay,
          payDueDate: payDueDay,
          minimumPayment,
          annualInterestRate: annualInterestRate ?? null,
          interestType,
          estimatedPayoffMonths: null,
          estimatedTotalPayment: null,
          paymentStrategy,
          notes: notes ?? "",
        });
        return { success: result.ok, action: "credit_card_created", ...result, currency: context.workspace.currencyCode };
      },
    }),

    update_credit_card: tool({
      title: "Editar tarjeta de crédito",
      description:
        "Actualiza datos contractuales de una tarjeta sin modificar la deuda utilizada. Consulta primero get_financial_action_options y usa el ID exacto.",
      needsApproval: true,
      inputSchema: z.object({
        cardId: z.string().min(1).describe("ID exacto de la tarjeta."),
        name: z.string().min(2),
        issuer: z.string().min(2),
        limitValue: z.number().min(0),
        cutOffDay: z.number().int().min(1).max(31),
        payDueDay: z.number().int().min(1).max(31),
        minimumPayment: z.number().min(0),
        annualInterestRate: z.number().min(0).nullable().optional(),
        interestType: z.enum(["EA", "NMV", "unknown"]),
        paymentStrategy: z.enum(["minimum", "fixed", "full"]),
      }),
      execute: async ({ cardId, name, issuer, limitValue, cutOffDay, payDueDay, minimumPayment, annualInterestRate, interestType, paymentStrategy }) => {
        const options = await loadRegisterViewModel(context);
        const card = options.creditCards.find((item) => item.id === cardId);
        if (!card) throw new Error("La tarjeta ya no está disponible.");
        const result = await updateCreditCardDetails({
          id: card.id,
          name,
          issuer,
          limitValue,
          cutOffDate: cutOffDay,
          payDueDate: payDueDay,
          minimumPayment,
          annualInterestRate: annualInterestRate ?? null,
          interestType,
          estimatedPayoffMonths: card.estimatedPayoffMonths,
          estimatedTotalPayment: card.estimatedTotalPayment,
          paymentStrategy,
          notes: card.notes,
        });
        return { success: result.ok, action: "credit_card_updated", previousName: card.name, ...result, currency: context.workspace.currencyCode };
      },
    }),

    archive_credit_card: tool({
      title: "Archivar tarjeta de crédito",
      description:
        "Archiva una tarjeta y conserva su historial. Solo se permite cuando su deuda utilizada es cero. Consulta primero get_financial_action_options.",
      needsApproval: true,
      inputSchema: z.object({
        cardId: z.string().min(1).describe("ID exacto de la tarjeta."),
        name: z.string().min(1).describe("Nombre visible para confirmar."),
      }),
      execute: async ({ cardId }) => {
        const options = await loadRegisterViewModel(context);
        const card = options.creditCards.find((item) => item.id === cardId);
        if (!card) throw new Error("La tarjeta ya no está disponible.");
        const result = await archiveCreditCard(card.id);
        return { success: result.ok, action: "credit_card_archived", cardId: result.cardId, name: result.name };
      },
    }),

    create_bank_credit: tool({
      title: "Crear crédito bancario",
      description:
        "Registra un préstamo o crédito bancario con su saldo actual y plan de cuotas. El saldo inicial es un punto de partida, no un gasto nuevo.",
      needsApproval: true,
      inputSchema: z.object({
        name: z.string().min(2),
        totalAmount: z.number().positive().describe("Monto original del crédito."),
        currentBalance: z.number().min(0).describe("Saldo pendiente actual."),
        monthlyPayment: z.number().min(0).describe("Valor de la cuota periódica."),
        interestRate: z.number().min(0).nullable().optional(),
        totalInstallments: z.number().int().positive(),
        paidInstallments: z.number().int().min(0).default(0),
        payDueDay: z.number().int().min(1).max(31),
        notes: z.string().optional(),
      }),
      execute: async ({ name, totalAmount, currentBalance, monthlyPayment, interestRate, totalInstallments, paidInstallments, payDueDay, notes }) => {
        const result = await createBankCredit({
          name,
          totalAmount,
          currentBalance,
          monthlyPayment,
          interestRate: interestRate ?? null,
          totalInstallments,
          paidInstallments,
          payDueDate: payDueDay,
          notes,
        });
        return { success: result.ok, action: "bank_credit_created", ...result, currency: context.workspace.currencyCode };
      },
    }),

    update_bank_credit: tool({
      title: "Editar crédito bancario",
      description:
        "Actualiza nombre, monto original, cuota, tasa, total de cuotas o día de pago sin modificar saldo ni progreso. Consulta primero get_financial_action_options.",
      needsApproval: true,
      inputSchema: z.object({
        creditId: z.string().min(1),
        name: z.string().min(2),
        totalAmount: z.number().positive(),
        monthlyPayment: z.number().min(0),
        interestRate: z.number().min(0).nullable().optional(),
        totalInstallments: z.number().int().positive(),
        payDueDay: z.number().int().min(1).max(31),
        notes: z.string().optional(),
      }),
      execute: async ({ creditId, name, totalAmount, monthlyPayment, interestRate, totalInstallments, payDueDay, notes }) => {
        const options = await loadRegisterViewModel(context);
        const credit = options.bankCredits.find((item) => item.id === creditId);
        if (!credit) throw new Error("El crédito ya no está disponible.");
        const result = await updateBankCreditDetails({
          id: credit.id,
          name,
          totalAmount,
          monthlyPayment,
          interestRate: interestRate ?? null,
          totalInstallments,
          payDueDate: payDueDay,
          notes: notes ?? credit.notes,
        });
        return { success: result.ok, action: "bank_credit_updated", previousName: credit.name, ...result, currency: context.workspace.currencyCode };
      },
    }),

    archive_bank_credit: tool({
      title: "Archivar crédito bancario",
      description:
        "Archiva un crédito conservando su historial. Solo se permite cuando el saldo pendiente es cero. Consulta primero get_financial_action_options.",
      needsApproval: true,
      inputSchema: z.object({
        creditId: z.string().min(1),
        name: z.string().min(1),
      }),
      execute: async ({ creditId }) => {
        const options = await loadRegisterViewModel(context);
        const credit = options.bankCredits.find((item) => item.id === creditId);
        if (!credit) throw new Error("El crédito ya no está disponible.");
        const result = await archiveBankCredit(credit.id);
        return { success: result.ok, action: "bank_credit_archived", ...result };
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
        const [data, options] = await Promise.all([
          loadObligationsViewModel(context),
          loadRegisterViewModel(context),
        ]);
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
          items: items.slice(0, 30).map((item) => {
            const account = item.accountId
              ? options.accounts.find((candidate) => candidate.id === item.accountId)
              : null;
            return { ...item, accountName: account?.label ?? null, accountBalance: account?.amount ?? null };
          }),
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
        balanceBefore: z.number().min(0).describe("Saldo actual devuelto para esa cuenta."),
        category: z.string().min(1).describe("Categoría existente devuelta por get_financial_action_options."),
        unit: z.string().optional().describe("Key de Personal o de un proyecto devuelto por get_financial_action_options. Omitir para usar Personal."),
        date: z.string().optional().describe("Fecha efectiva YYYY-MM-DD; omitir para hoy."),
      }),
      execute: async (input) => {
        const options = await loadRegisterViewModel(context);
        const account = options.accounts.find((item) => item.id === input.accountId);
        if (!account) throw new Error("La cuenta seleccionada ya no está disponible.");
        if (normalize(account.label) !== normalize(input.accountName) || (account.amount ?? 0) !== input.balanceBefore) {
          throw new Error("El saldo o la cuenta cambió; vuelve a consultar antes de confirmar.");
        }

        const category = options.categories.find(
          (item) => normalize(item.label) === normalize(input.category),
        );
        if (input.kind === "expense" && !category) {
          throw new Error("La categoría seleccionada no existe en Arca.");
        }

        const personalKey = options.units.find(isPersonalUnit)?.value ?? "general";
        const unit = input.unit
          ? options.units.find((item) => item.value === input.unit)?.value
          : personalKey;
        if (!unit) throw new Error("El proyecto seleccionado no existe en Arca.");

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
          date: result.date,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter,
          effect: result.effect,
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
        amount: z.number().positive().describe("Monto que se confirmará."),
        accountName: z.string().min(1).describe("Cuenta asociada devuelta por get_obligations."),
        balanceBefore: z.number().min(0).describe("Saldo de esa cuenta devuelto por get_obligations."),
      }),
      execute: async ({ eventId, title, amount, accountName, balanceBefore }) => {
        const [obligations, options] = await Promise.all([
          loadObligationsViewModel(context),
          loadRegisterViewModel(context),
        ]);
        const event = obligations.items.find((item) => item.id === eventId);
        if (!event) throw new Error("La obligación ya no está pendiente.");
        const account = event.accountId ? options.accounts.find((item) => item.id === event.accountId) : null;
        if (!account) throw new Error("La obligación no tiene una cuenta activa asociada.");
        if (normalize(event.name) !== normalize(title) || normalize(account.label) !== normalize(accountName) || (account.amount ?? 0) !== balanceBefore) {
          throw new Error("La obligación, la cuenta o el saldo cambió; vuelve a consultar antes de confirmar.");
        }
        const result = await confirmScheduledEventNow(eventId, amount);
        if ("alreadyConfirmed" in result && result.alreadyConfirmed) {
          return { success: true, action: "obligation_paid", title, alreadyConfirmed: true, currency: context.workspace.currencyCode };
        }
        return {
          success: true,
          action: "obligation_paid",
          title,
          amount: "amount" in result ? result.amount : amount ?? null,
          transactionId: "transactionId" in result ? result.transactionId : null,
          accountName: "accountName" in result ? result.accountName : null,
          category: "category" in result ? result.category : "expense",
          date: "date" in result ? result.date : dateInBogota(),
          balanceBefore: "balanceBefore" in result ? result.balanceBefore : null,
          balanceAfter: "balanceAfter" in result ? result.balanceAfter : null,
          effect: "effect" in result ? result.effect : null,
          alreadyConfirmed: false,
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
        "Crea un ingreso esperado único o recurrente. Consulta get_financial_action_options y usa una fuente existente para recurrencias.",
      needsApproval: true,
      inputSchema: z.object({
        title: z.string().min(2).describe("Concepto del ingreso."),
        amount: z.number().positive().describe("Monto esperado."),
        dueDate: z.string().describe("Fecha esperada YYYY-MM-DD."),
        accountId: z.string().min(1).describe("Cuenta destino obtenida con get_financial_action_options."),
        accountName: z.string().min(1).describe("Nombre visible de la cuenta destino."),
        unit: z.string().optional().describe("Key de Personal o de un proyecto devuelto por get_financial_action_options. Omitir para usar Personal."),
        sourceId: z.string().optional().describe("Fuente de ingreso existente, si aplica."),
        sourceName: z.string().optional().describe("Nombre visible de la fuente de ingreso seleccionada."),
        recurrenceMode: z.enum(["once", "daily", "weekly", "biweekly", "semimonthly", "monthly"]).default("once"),
        recurrenceDays: z.array(z.number().int().min(1).max(31)).optional().describe("Días del mes: dos para quincenal, uno o más para mensual."),
        recurrenceEndMode: z.enum(["indefinite", "until_date", "count"]).default("indefinite"),
        recurrenceEndDate: z.string().nullable().optional().describe("Fecha final YYYY-MM-DD cuando termina en una fecha."),
        recurrenceCount: z.number().int().min(1).max(1000).nullable().optional().describe("Cantidad total de cobros cuando termina por cantidad."),
      }),
      execute: async (input) => {
        const options = await loadRegisterViewModel(context);
        const account = options.accounts.find((item) => item.id === input.accountId);
        if (!account) throw new Error("La cuenta destino ya no está disponible.");
        if (normalize(account.label) !== normalize(input.accountName)) {
          throw new Error("La cuenta destino cambió; vuelve a consultar las opciones.");
        }

        const personalKey = options.units.find(isPersonalUnit)?.value ?? "general";
        const unit = input.unit
          ? options.units.find((item) => item.value === input.unit)?.value
          : personalKey;
        if (!unit) throw new Error("El proyecto seleccionado no existe en Arca.");

        const source = input.sourceId
          ? options.incomeSources.find((item) => item.id === input.sourceId)
          : null;
        if (input.sourceId && !source) throw new Error("La fuente de ingreso ya no está disponible.");
        if (source && input.sourceName && normalize(source.label) !== normalize(input.sourceName)) {
          throw new Error("El concepto de ingreso cambió; vuelve a consultar las opciones.");
        }
        if (input.recurrenceMode !== "once" && !source) {
          throw new Error("Los ingresos recurrentes necesitan un concepto de ingreso existente.");
        }

        const recurrence = input.recurrenceMode === "once" ? null : summarizeRecurrence({
          frequency: input.recurrenceMode,
          startDate: input.dueDate,
          recurrenceDays: input.recurrenceDays,
          endMode: input.recurrenceEndMode,
          endDate: input.recurrenceEndDate,
          occurrenceCount: input.recurrenceCount,
          occurrenceNoun: { singular: "cobro", plural: "cobros" },
        });

        await createExpectedIncome({
          title: input.title,
          amount: input.amount,
          dueDate: input.dueDate,
          accountId: account.id,
          unit,
          sourceId: source?.id,
          recurrenceMode: input.recurrenceMode,
          recurrenceDays: input.recurrenceDays,
          recurrenceEndMode: input.recurrenceEndMode,
          recurrenceEndDate: input.recurrenceEndDate,
          recurrenceCount: input.recurrenceCount,
        });

        return {
          success: true,
          action: "income_scheduled",
          title: input.title,
          amount: input.amount,
          dueDate: input.dueDate,
          accountName: account.label,
          sourceName: source?.label ?? null,
          recurrenceMode: input.recurrenceMode,
          recurrenceDays: input.recurrenceDays ?? [],
          recurrenceEndMode: input.recurrenceEndMode,
          recurrenceEndDate: input.recurrenceEndDate ?? null,
          recurrenceCount: input.recurrenceCount ?? null,
          recurrenceSummary: recurrence?.summary ?? null,
          currency: context.workspace.currencyCode,
        };
      },
    }),

    navigate_to_screen: tool({
      description: "Abre o navega a una pantalla específica de la aplicación para el usuario (ej: configuracion, movimientos, cuentas, calendario, resumen, obligaciones, negocios).",
      inputSchema: z.object({
        screen: z.string().describe("Nombre de la pantalla a abrir (ej: configuracion, movimientos, calendario, cuentas, resumen, obligaciones, negocios)"),
      }),
      execute: async ({ screen }) => {
        return {
          success: true,
          action: "navigate_screen",
          screen,
        };
      },
    }),

    change_app_theme: tool({
      description: "Cambia el tema de color o apariencia visual de la aplicación entre todos los temas disponibles (ej: dark, light, emerald, cyberpunk, neon, etc.).",
      inputSchema: z.object({
        theme: z.string().describe("Identificador del tema deseado (ej: dark, light, emerald, cyberpunk, neon, etc.)"),
      }),
      execute: async ({ theme }) => {
        return {
          success: true,
          action: "change_theme",
          theme,
        };
      },
    }),
  };
}
