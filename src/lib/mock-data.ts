import { subDays, subMonths } from "date-fns";
import type { Account, BusinessSummary, CreditCard, Debt, SavingsGoal, Transaction } from "./types";

const today = new Date();

export const accounts: Account[] = [
  { id: "acc-nequi", name: "Nequi", type: "wallet", balance: 825000, color: "#163a5f", active: true },
  { id: "acc-daviplata", name: "Daviplata", type: "wallet", balance: 240000, color: "#8f6d3b", active: true },
  { id: "acc-nu", name: "Nu", type: "bank", balance: 1680000, color: "#a43d31", active: true },
  { id: "acc-cash", name: "Efectivo", type: "cash", balance: 180000, color: "#16735b", active: true },
];

export const transactions: Transaction[] = [
  {
    id: "tx-001",
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
    name: "Solventa",
    lender: "Solventa",
    balance: 920000,
    installment: 620000,
    nextDueDate: subDays(today, -5).toISOString(),
    status: "active",
    priority: "high",
  },
  {
    id: "debt-friend",
    name: "Prestamo familiar",
    lender: "Familia",
    balance: 1800000,
    installment: 300000,
    nextDueDate: subDays(today, 9).toISOString(),
    status: "active",
    priority: "medium",
  },
];

export const cards: CreditCard[] = [
  {
    id: "card-nu",
    name: "Nu",
    issuer: "Nu Bank",
    limit: 3500000,
    used: 1680000,
    cutOffDate: 18,
    payDueDate: 3,
    minimumPayment: 120000,
    status: "active",
  },
];

export const goals: SavingsGoal[] = [
  { id: "goal-emergency", name: "Fondo emergencia", target: 5000000, current: 1800000, color: "#16735b" },
  { id: "goal-fitur", name: "FITUR", target: 2500000, current: 860000, color: "#8f6d3b" },
];

export const business: BusinessSummary[] = [
  { id: "empresa", name: "Empresa", income: 4200000, expense: 0, pending: 0 },
  { id: "deuxio", name: "Deuxio", income: 860000, expense: 180000, pending: 0 },
  { id: "sie", name: "Sie Travel", income: 1240000, expense: 690000, pending: 240000 },
  { id: "aluna", name: "Aluna", income: 1350000, expense: 260000, pending: 0 },
  { id: "personal", name: "Personal", income: 0, expense: 218000, pending: 620000 },
];
