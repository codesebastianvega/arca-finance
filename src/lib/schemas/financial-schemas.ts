import { z } from "zod";

export const createAccountSchema = z.object({
  name: z
    .string({ required_error: "El nombre de la cuenta es obligatorio." })
    .trim()
    .min(1, { message: "El nombre de la cuenta no puede estar vacío." })
    .max(100, { message: "El nombre es demasiado largo." }),
  accountType: z.string().default("checking"),
  balance: z.number().default(0),
  entity: z.string().nullable().optional(),
  brandColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const createTransactionSchema = z.object({
  concept: z
    .string({ required_error: "El concepto es obligatorio." })
    .trim()
    .min(1, { message: "El concepto del movimiento no puede estar vacío." }),
  amount: z
    .number({ required_error: "El monto es obligatorio." })
    .positive({ message: "El monto del movimiento debe ser un valor positivo mayor a 0." }),
  date: z.string().min(1, { message: "La fecha es obligatoria." }),
  kind: z.enum(["income", "expense", "transfer_in", "transfer_out", "debt_payment", "card_payment", "loan_payment", "saving", "saving_contribution"], {
    errorMap: () => ({ message: "Tipo de movimiento no válido." }),
  }),
  category: z.string().default("general"),
  unit: z.string().default("general"),
  accountId: z.string().nullable().optional(),
  targetAccountId: z.string().nullable().optional(),
  incomeStatus: z.enum(["received", "expected"]).optional(),
  sourceType: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
});

export const createCreditCardSchema = z.object({
  name: z.string().trim().min(1, { message: "El nombre de la tarjeta es obligatorio." }),
  issuer: z.string().default("Tarjeta de crédito"),
  limit: z.number().nonnegative({ message: "El cupo total no puede ser negativo." }),
  used: z.number().nonnegative({ message: "El saldo usado no puede ser negativo." }),
  cutOffDay: z.number().min(1).max(31, { message: "Día de corte inválido." }),
  payDueDay: z.number().min(1).max(31, { message: "Día de pago inválido." }),
  minimumPayment: z.number().optional(),
  annualInterestRate: z.number().optional(),
  brandColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
});

export const createSavingsGoalSchema = z.object({
  name: z.string().trim().min(1, { message: "El nombre de la meta o bolsillo es obligatorio." }),
  target: z.number().positive({ message: "El monto objetivo debe ser mayor a 0." }),
  current: z.number().nonnegative({ message: "El monto ahorrado actual no puede ser negativo." }).default(0),
  dueDate: z.string().nullable().optional(),
  goalType: z.enum(["saving", "pocket", "goal"]).default("goal"),
  color: z.string().optional(),
  sourceAccountId: z.string().nullable().optional(),
});

export const createLoanSchema = z.object({
  counterparty: z.string().trim().min(1, { message: "El nombre del contacto o persona es obligatorio." }),
  type: z.enum(["receivable", "payable"], { errorMap: () => ({ message: "Tipo de préstamo no válido." }) }),
  totalAmount: z.number().positive({ message: "El monto prestado debe ser mayor a 0." }),
  pendingBalance: z.number().nonnegative({ message: "El saldo pendiente no puede ser negativo." }),
  dueDate: z.string().nullable().optional(),
  interestRate: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});
