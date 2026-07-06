import { subDays, subMonths } from "date-fns";
import type { Account, BusinessSummary, CreditCard, Debt, SavingsGoal, Transaction } from "./types";

const today = new Date();
const workspaceId = "mock-workspace";

export const accounts: Account[] = [
  { id: "acc-nequi", workspaceId, name: "Nequi", type: "wallet", balance: 825000, color: "accent", active: true },
  { id: "acc-daviplata", workspaceId, name: "Daviplata", type: "wallet", balance: 240000, color: "copper", active: true },
  { id: "acc-nu", workspaceId, name: "Nu", type: "bank", balance: 1680000, color: "danger", active: true },
  { id: "acc-cash", workspaceId, name: "Efectivo", type: "cash", balance: 180000, color: "success", active: true },
];

export const transactions: Transaction[] = [
  {
    id: "tx-001",
    workspaceId,
    kind: "income",
    status: "confirmed",
    amount: 4200000,
    concept: "Salario mensual",
    accountId: "acc-nu",
    category: "Ingreso fijo",
    unit: "empresa",
    date: subDays(today, 3).toISOString(),
  },
  {
    id: "tx-002",
    workspaceId,
    kind: "expense",
    status: "paid",
    amount: 38000,
    concept: "Almuerzo",
    accountId: "acc-nequi",
    category: "Alimentación",
    unit: "personal",
    date: subDays(today, 1).toISOString(),
  },
  {
    id: "tx-003",
    workspaceId,
    kind: "expense",
    status: "scheduled",
    amount: 620000,
    concept: "Cuota Solventa",
    accountId: "acc-nequi",
    category: "Deuda",
    unit: "personal",
    dueDate: subDays(today, -5).toISOString(),
    date: today.toISOString(),
  },
  {
    id: "tx-004",
    workspaceId,
    kind: "income",
    status: "pending",
    amount: 860000,
    concept: "Proyecto Deuxio",
    accountId: "acc-daviplata",
    category: "Freelance",
    unit: "deuxio",
    dueDate: subDays(today, -2).toISOString(),
    date: subMonths(today, 0).toISOString(),
  },
  {
    id: "tx-005",
    workspaceId,
    kind: "expense",
    status: "paid",
    amount: 180000,
    concept: "Compra supermercado",
    accountId: "acc-nu",
    category: "Mercado",
    unit: "personal",
    date: subDays(today, 5).toISOString(),
  },
  {
    id: "tx-006",
    workspaceId,
    kind: "income",
    status: "confirmed",
    amount: 1350000,
    concept: "Aluna mensualidad",
    accountId: "acc-nu",
    category: "SaaS",
    unit: "aluna",
    date: subDays(today, 12).toISOString(),
  },
];

export const debts: Debt[] = [
  {
    id: "debt-solventa",
    workspaceId,
    name: "Solventa",
    lender: "Solventa",
    debtType: "personal",
    principalAmount: 1000000,
    balance: 920000,
    installment: 620000,
    nextDueDate: subDays(today, -5).toISOString(),
    annualInterestRate: 38,
    interestType: "effective_annual",
    termMonths: 2,
    remainingMonths: 2,
    estimatedTotalPayment: 1240000,
    status: "active",
    priority: "high",
    notes: "Dato de ejemplo local.",
  },
  {
    id: "debt-friend",
    workspaceId,
    name: "Prestamo familiar",
    lender: "Familia",
    debtType: "personal",
    principalAmount: 1800000,
    balance: 1800000,
    installment: 300000,
    nextDueDate: subDays(today, 9).toISOString(),
    annualInterestRate: 0,
    interestType: "none",
    termMonths: 6,
    remainingMonths: 6,
    estimatedTotalPayment: 1800000,
    status: "active",
    priority: "medium",
    notes: "Dato de ejemplo local.",
  },
];

export const cards: CreditCard[] = [
  {
    id: "card-nu",
    workspaceId,
    name: "Nu",
    issuer: "Nu Bank",
    limit: 3500000,
    used: 1680000,
    cutOffDate: 18,
    payDueDate: 3,
    minimumPayment: 120000,
    annualInterestRate: 42,
    interestType: "effective_annual",
    estimatedPayoffMonths: 18,
    estimatedTotalPayment: 2160000,
    paymentStrategy: "minimum",
    notes: "Dato de ejemplo local.",
    status: "active",
  },
];

export const goals: SavingsGoal[] = [
  { id: "goal-emergency", workspaceId, name: "Fondo emergencia", target: 5000000, current: 1800000, color: "success" },
  { id: "goal-fitur", workspaceId, name: "FITUR", target: 2500000, current: 860000, color: "copper" },
];

export const business: BusinessSummary[] = [
  { id: "empresa", workspaceId, name: "Empresa", income: 4200000, expense: 0, pending: 0 },
  { id: "deuxio", workspaceId, name: "Deuxio", income: 860000, expense: 180000, pending: 0 },
  { id: "sie", workspaceId, name: "Sie Travel", income: 1240000, expense: 690000, pending: 240000 },
  { id: "aluna", workspaceId, name: "Aluna", income: 1350000, expense: 260000, pending: 0 },
  { id: "personal", workspaceId, name: "Personal", income: 0, expense: 218000, pending: 620000 },
];
