'use client';

import type { ToolUIPart } from 'ai';
import {
  Archive,
  BadgeDollarSign,
  CalendarPlus,
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FolderPlus,
  HandCoins,
  Pencil,
  ReceiptText,
  ShieldCheck,
  Tags,
  Target,
  WalletCards,
  XCircle,
} from 'lucide-react';
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from '@/src/components/ai-elements/confirmation';
import type { ConfirmationProps } from '@/src/components/ai-elements/confirmation';
import { summarizeRecurrence } from '@/src/lib/recurrence-summary';

const ACTION_TYPES = new Set([
  'tool-record_transaction',
  'tool-confirm_obligation_payment',
  'tool-schedule_obligation',
  'tool-schedule_expected_income',
  'tool-create_expense_category',
  'tool-update_expense_category',
  'tool-delete_expense_category',
  'tool-create_income_source',
  'tool-update_income_source',
  'tool-delete_income_source',
  'tool-create_personal_loan',
  'tool-transfer_between_accounts',
  'tool-create_savings_goal',
  'tool-create_project',
  'tool-update_project',
  'tool-archive_project',
  'tool-create_account',
  'tool-update_account',
  'tool-archive_account',
  'tool-create_credit_card',
  'tool-update_credit_card',
  'tool-archive_credit_card',
  'tool-create_bank_credit',
  'tool-update_bank_credit',
  'tool-archive_bank_credit',
]);

export type FinancialActionPart = {
  type: string;
  state: ToolUIPart['state'];
  toolCallId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorText?: string;
  approval?: ConfirmationProps['approval'];
};

export function isFinancialActionPart(part: unknown): part is FinancialActionPart {
  if (!part || typeof part !== 'object') return false;
  const type = 'type' in part ? String(part.type) : '';
  return ACTION_TYPES.has(type);
}

function safeCurrency(currencyCode: string) {
  const normalized = currencyCode.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : 'COP';
}

function formatMoney(value: unknown, currencyCode: string) {
  if (value === null || value === undefined || value === '') return null;
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: safeCurrency(currencyCode),
    maximumFractionDigits: 0,
  }).format(amount);
}

function value(input: Record<string, unknown>, key: string) {
  const raw = input[key];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function numericValue(input: Record<string, unknown>, key: string) {
  const raw = input[key];
  if (raw === null || raw === undefined || raw === '') return null;
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstText(
  output: Record<string, unknown>,
  input: Record<string, unknown>,
  ...keys: string[]
) {
  for (const source of [output, input]) {
    for (const key of keys) {
      const result = value(source, key);
      if (result) return result;
    }
  }
  return null;
}

function firstNumber(
  output: Record<string, unknown>,
  input: Record<string, unknown>,
  ...keys: string[]
) {
  for (const source of [output, input]) {
    for (const key of keys) {
      const result = numericValue(source, key);
      if (result !== null) return result;
    }
  }
  return null;
}

function moneyDetail(
  output: Record<string, unknown>,
  input: Record<string, unknown>,
  currencyCode: string,
  ...keys: string[]
) {
  return formatMoney(firstNumber(output, input, ...keys), currencyCode);
}

function transactionBalances(
  output: Record<string, unknown>,
  input: Record<string, unknown>,
  currencyCode: string,
) {
  const amount = firstNumber(output, input, 'amount');
  const before = firstNumber(output, input, 'balanceBefore', 'previousBalance', 'accountBalanceBefore');
  const explicitAfter = firstNumber(output, input, 'balanceAfter', 'resultingBalance', 'accountBalanceAfter');
  const isIncome = input.kind === 'income' || output.kind === 'income';
  const after = explicitAfter ?? (before !== null && amount !== null ? before + (isIncome ? amount : -amount) : null);

  return {
    before: formatMoney(before, currencyCode),
    after: formatMoney(after, currencyCode),
  };
}

function recurrenceLabel(value: unknown) {
  const labels: Record<string, string> = {
    once: 'Una vez',
    daily: 'Diario',
    weekly: 'Semanal',
    biweekly: 'Cada 2 semanas',
    semimonthly: 'Quincenal',
    monthly: 'Mensual',
  };
  return labels[String(value ?? '')] ?? null;
}

function recurrenceSummaryFromInput(input: Record<string, unknown>) {
  const frequency = String(input.recurrenceMode ?? 'once');
  if (frequency === 'once') return null;
  try {
    return summarizeRecurrence({
      frequency: frequency as 'daily' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly',
      startDate: String(input.dueDate ?? ''),
      recurrenceDays: Array.isArray(input.recurrenceDays)
        ? input.recurrenceDays.map(Number)
        : undefined,
      endMode: String(input.recurrenceEndMode ?? 'indefinite') as 'indefinite' | 'until_date' | 'count',
      endDate: typeof input.recurrenceEndDate === 'string' ? input.recurrenceEndDate : null,
      occurrenceCount: typeof input.recurrenceCount === 'number' ? input.recurrenceCount : null,
      occurrenceNoun: { singular: 'cobro', plural: 'cobros' },
    }).summary;
  } catch {
    return null;
  }
}

function actionPresentation(part: FinancialActionPart, currencyCode: string) {
  const input = part.input ?? {};
  const output = part.output ?? {};

  if (part.type === 'tool-record_transaction') {
    const isIncome = input.kind === 'income' || output.kind === 'income';
    const balances = transactionBalances(output, input, currencyCode);
    return {
      icon: ReceiptText,
      eyebrow: isIncome ? 'Nuevo ingreso' : 'Nuevo gasto',
      title: firstText(output, input, 'concept') ?? 'Registrar movimiento',
      details: [
        ['Cuenta', firstText(output, input, 'accountName')],
        ['Saldo anterior', balances.before],
        ['Valor', moneyDetail(output, input, currencyCode, 'amount')],
        ['Saldo resultante', balances.after],
        ['Categoría', firstText(output, input, 'category')],
        ['Fecha', firstText(output, input, 'date') ?? 'Hoy'],
        ['Efecto', isIncome ? 'Aumenta el saldo disponible' : 'Reduce el saldo disponible'],
      ],
    };
  }

  if (part.type === 'tool-confirm_obligation_payment') {
    const balances = transactionBalances(output, { ...input, kind: 'expense' }, currencyCode);
    return {
      icon: CircleDollarSign,
      eyebrow: 'Confirmar pago',
      title: firstText(output, input, 'title') ?? 'Obligación pendiente',
      details: [
        ['Cuenta', firstText(output, input, 'accountName')],
        ['Saldo anterior', balances.before],
        ['Valor pagado', moneyDetail(output, input, currencyCode, 'amount')],
        ['Saldo resultante', balances.after],
        ['Fecha', firstText(output, input, 'date') ?? 'Hoy'],
        ['Efecto', 'Paga la obligación y reduce el saldo de la cuenta'],
      ],
    };
  }

  if (part.type === 'tool-schedule_expected_income') {
    const recurrenceMode = output.recurrenceMode ?? input.recurrenceMode ?? 'once';
    const recurrenceEndMode = output.recurrenceEndMode ?? input.recurrenceEndMode;
    const recurrenceEnd = recurrenceEndMode === 'count'
      ? `${firstNumber(output, input, 'recurrenceCount') ?? '—'} cobros`
      : recurrenceEndMode === 'until_date'
        ? firstText(output, input, 'recurrenceEndDate')
        : recurrenceMode === 'once' ? null : 'Sin fecha final';
    return {
      icon: CalendarPlus,
      eyebrow: 'Programar ingreso',
      title: firstText(output, input, 'title') ?? 'Ingreso esperado',
      details: [
        ['Cuenta destino', firstText(output, input, 'accountName')],
        ['Concepto de ingreso', firstText(output, input, 'sourceName')],
        ['Valor esperado', moneyDetail(output, input, currencyCode, 'amount')],
        ['Fecha esperada', firstText(output, input, 'dueDate')],
        ['Frecuencia', recurrenceLabel(recurrenceMode)],
        ['Finaliza', recurrenceEnd],
        ['Duración', firstText(output, input, 'recurrenceSummary') ?? recurrenceSummaryFromInput(input)],
        ['Efecto', 'Se proyecta; no cambia el saldo disponible hoy'],
      ],
    };
  }

  if (part.type === 'tool-create_expense_category') {
    return {
      icon: Tags,
      eyebrow: 'Nueva categoría',
      title: firstText(output, input, 'name') ?? 'Crear categoría de gasto',
      details: [
        ['Categoría principal', firstText(output, input, 'parentCategory', 'parentCategoryName') ?? 'Sin categoría principal'],
        ['Efecto', 'Estará disponible para clasificar nuevos gastos'],
      ],
    };
  }

  if (part.type === 'tool-update_expense_category') {
    return {
      icon: Pencil,
      eyebrow: 'Editar categoría',
      title: firstText(output, input, 'name') ?? 'Actualizar categoría de gasto',
      details: [
        ['Nombre anterior', firstText(output, input, 'previousName', 'currentName')],
        ['Categoría principal', firstText(output, input, 'parentCategory', 'parentCategoryName') ?? 'Sin categoría principal'],
        ['Efecto', 'Actualiza la clasificación sin crear un movimiento'],
      ],
    };
  }

  if (part.type === 'tool-delete_expense_category') {
    return {
      icon: Archive,
      eyebrow: 'Eliminar categoría',
      title: firstText(output, input, 'name') ?? 'Categoría de gasto',
      details: [['Efecto', 'Dejará de estar disponible para nuevos gastos']],
    };
  }

  if (part.type === 'tool-create_income_source') {
    return {
      icon: BadgeDollarSign,
      eyebrow: 'Nuevo concepto de ingreso',
      title: firstText(output, input, 'name') ?? 'Crear concepto de ingreso',
      details: [
        ['Cuenta destino', firstText(output, input, 'accountName')],
        ['Espacio', firstText(output, input, 'unitName')],
        ['Efecto', 'Quedará disponible al registrar ingresos'],
      ],
    };
  }

  if (part.type === 'tool-update_income_source') {
    return {
      icon: Pencil,
      eyebrow: 'Editar concepto de ingreso',
      title: firstText(output, input, 'name') ?? 'Actualizar concepto de ingreso',
      details: [
        ['Nombre anterior', firstText(output, input, 'previousName', 'currentName')],
        ['Cuenta destino', firstText(output, input, 'accountName')],
        ['Espacio', firstText(output, input, 'unitName')],
        ['Efecto', 'Cambia la configuración de los próximos ingresos'],
      ],
    };
  }

  if (part.type === 'tool-delete_income_source') {
    return {
      icon: Archive,
      eyebrow: 'Eliminar concepto de ingreso',
      title: firstText(output, input, 'name') ?? 'Concepto de ingreso',
      details: [['Efecto', 'Dejará de estar disponible para nuevos ingresos']],
    };
  }

  if (part.type === 'tool-create_personal_loan') {
    const isLent = input.direction === 'lent' || output.action === 'personal_loan_lent';
    const amountValue = firstNumber(output, input, 'amount');
    const balanceBeforeValue = firstNumber(output, input, 'balanceBefore', 'accountBalanceBefore');
    const explicitBalanceAfter = firstNumber(output, input, 'balanceAfter', 'resultingBalance');
    const balanceAfterValue = explicitBalanceAfter
      ?? (balanceBeforeValue !== null && amountValue !== null
        ? balanceBeforeValue + (isLent ? -amountValue : amountValue)
        : null);
    return {
      icon: HandCoins,
      eyebrow: isLent ? 'Dinero prestado' : 'Préstamo recibido',
      title: firstText(output, input, 'title') ?? (isLent ? 'Registrar dinero prestado' : 'Registrar préstamo recibido'),
      details: [
        ['Persona', firstText(output, input, 'personName')],
        ['Cuenta', firstText(output, input, 'accountName')],
        ['Valor', moneyDetail(output, input, currencyCode, 'amount')],
        ['Saldo anterior', formatMoney(balanceBeforeValue, currencyCode)],
        ['Saldo resultante', formatMoney(balanceAfterValue, currencyCode)],
        ['Fecha acordada', firstText(output, input, 'dueDate') ?? 'Sin fecha definida'],
        ['Efecto', isLent ? 'Reduce el saldo y crea una cuenta por cobrar' : 'Aumenta el saldo y crea una deuda por pagar'],
      ],
    };
  }

  if (part.type === 'tool-transfer_between_accounts') {
    const amountValue = firstNumber(output, input, 'amount');
    const fromBefore = firstNumber(output, input, 'fromBalanceBefore');
    const toBefore = firstNumber(output, input, 'toBalanceBefore');
    const fromAfter = firstNumber(output, input, 'fromBalanceAfter')
      ?? (fromBefore !== null && amountValue !== null ? fromBefore - amountValue : null);
    const toAfter = firstNumber(output, input, 'toBalanceAfter')
      ?? (toBefore !== null && amountValue !== null ? toBefore + amountValue : null);
    return {
      icon: ArrowLeftRight,
      eyebrow: 'Transferencia entre cuentas',
      title: firstText(output, input, 'concept', 'title') ?? 'Mover dinero',
      details: [
        ['Desde', firstText(output, input, 'sourceAccountName', 'fromAccountName')],
        ['Hacia', firstText(output, input, 'destinationAccountName', 'toAccountName')],
        ['Valor', moneyDetail(output, input, currencyCode, 'amount')],
        ['Origen antes', formatMoney(fromBefore, currencyCode)],
        ['Origen después', formatMoney(fromAfter, currencyCode)],
        ['Destino antes', formatMoney(toBefore, currencyCode)],
        ['Destino después', formatMoney(toAfter, currencyCode)],
        ['Fecha', firstText(output, input, 'date') ?? 'Hoy'],
        ['Efecto', 'Mueve dinero entre cuentas sin cambiar el balance total'],
      ],
    };
  }

  if (part.type === 'tool-create_savings_goal') {
    return {
      icon: Target,
      eyebrow: 'Nueva meta de ahorro',
      title: firstText(output, input, 'name', 'title') ?? 'Crear meta de ahorro',
      details: [
        ['Objetivo', moneyDetail(output, input, currencyCode, 'target', 'targetAmount', 'amount')],
        ['Ahorrado', moneyDetail(output, input, currencyCode, 'current', 'currentAmount', 'savedAmount')],
        ['Fecha objetivo', firstText(output, input, 'targetDate', 'dueDate')],
        ['Efecto', 'Organiza el ahorro; no mueve dinero automáticamente'],
      ],
    };
  }

  if (part.type === 'tool-create_project') {
    return {
      icon: FolderPlus,
      eyebrow: 'Nuevo proyecto',
      title: value(input, 'name') ?? 'Crear proyecto o actividad',
      details: [['Organización', 'Separado de Personal']],
    };
  }

  if (part.type === 'tool-update_project') {
    return {
      icon: Pencil,
      eyebrow: 'Renombrar proyecto',
      title: value(input, 'newName') ?? 'Actualizar proyecto',
      details: [['Nombre actual', value(input, 'currentName')]],
    };
  }

  if (part.type === 'tool-archive_project') {
    return {
      icon: Archive,
      eyebrow: 'Archivar proyecto',
      title: value(input, 'name') ?? 'Proyecto o actividad',
      details: [['Historial', 'Se conservará']],
    };
  }

  if (part.type === 'tool-create_account') {
    return {
      icon: WalletCards,
      eyebrow: 'Nueva cuenta',
      title: value(input, 'name') ?? 'Crear cuenta',
      details: [
        ['Entidad', value(input, 'entity') ?? 'Sin entidad'],
        ['Tipo', value(input, 'type')],
      ],
    };
  }

  if (part.type === 'tool-update_account') {
    return {
      icon: Pencil,
      eyebrow: 'Editar cuenta',
      title: value(input, 'name') ?? 'Actualizar cuenta',
      details: [
        ['Nombre actual', value(input, 'currentName')],
        ['Entidad', value(input, 'entity') ?? 'Sin entidad'],
        ['Tipo', value(input, 'type')],
      ],
    };
  }

  if (part.type === 'tool-archive_account') {
    return {
      icon: Archive,
      eyebrow: 'Archivar cuenta',
      title: value(input, 'name') ?? 'Cuenta',
      details: [
        ['Condición', 'Saldo en $0'],
        ['Historial', 'Se conservará'],
      ],
    };
  }

  if (part.type === 'tool-create_credit_card') {
    return {
      icon: CreditCard,
      eyebrow: 'Nueva tarjeta',
      title: value(input, 'name') ?? 'Crear tarjeta de crédito',
      details: [
        ['Emisor', value(input, 'issuer')],
        ['Cupo', formatMoney(input.limitValue, currencyCode)],
        ['Deuda inicial', formatMoney(input.initialDebt, currencyCode) ?? formatMoney(0, currencyCode)],
        ['Corte y pago', `Día ${input.cutOffDay ?? '—'} · día ${input.payDueDay ?? '—'}`],
      ],
    };
  }

  if (part.type === 'tool-update_credit_card') {
    return {
      icon: Pencil,
      eyebrow: 'Editar tarjeta',
      title: value(input, 'name') ?? 'Actualizar tarjeta',
      details: [
        ['Emisor', value(input, 'issuer')],
        ['Nuevo cupo', formatMoney(input.limitValue, currencyCode)],
        ['Deuda', 'No se modificará'],
        ['Corte y pago', `Día ${input.cutOffDay ?? '—'} · día ${input.payDueDay ?? '—'}`],
      ],
    };
  }

  if (part.type === 'tool-archive_credit_card') {
    return {
      icon: Archive,
      eyebrow: 'Archivar tarjeta',
      title: value(input, 'name') ?? 'Tarjeta de crédito',
      details: [
        ['Condición', 'Deuda en $0'],
        ['Historial', 'Se conservará'],
      ],
    };
  }

  if (part.type === 'tool-create_bank_credit') {
    return {
      icon: BadgeDollarSign,
      eyebrow: 'Nuevo crédito',
      title: value(input, 'name') ?? 'Crear crédito bancario',
      details: [
        ['Monto original', formatMoney(input.totalAmount, currencyCode)],
        ['Saldo pendiente', formatMoney(input.currentBalance, currencyCode)],
        ['Cuota', formatMoney(input.monthlyPayment, currencyCode)],
        ['Progreso', `${input.paidInstallments ?? 0} de ${input.totalInstallments ?? '—'} cuotas`],
        ['Pago', `Día ${input.payDueDay ?? '—'}`],
      ],
    };
  }

  if (part.type === 'tool-update_bank_credit') {
    return {
      icon: Pencil,
      eyebrow: 'Editar crédito',
      title: value(input, 'name') ?? 'Actualizar crédito',
      details: [
        ['Monto original', formatMoney(input.totalAmount, currencyCode)],
        ['Nueva cuota', formatMoney(input.monthlyPayment, currencyCode)],
        ['Saldo y progreso', 'No se modificarán'],
        ['Pago', `Día ${input.payDueDay ?? '—'}`],
      ],
    };
  }

  if (part.type === 'tool-archive_bank_credit') {
    return {
      icon: Archive,
      eyebrow: 'Archivar crédito',
      title: value(input, 'name') ?? 'Crédito bancario',
      details: [
        ['Condición', 'Saldo pendiente en $0'],
        ['Historial', 'Se conservará'],
      ],
    };
  }

  return {
    icon: CalendarPlus,
    eyebrow: 'Programar pago',
    title: firstText(output, input, 'title') ?? 'Próxima obligación',
    details: [
      ['Cuenta sugerida', firstText(output, input, 'accountName') ?? 'Sin cuenta asignada'],
      ['Valor esperado', moneyDetail(output, input, currencyCode, 'amount')],
      ['Vencimiento', firstText(output, input, 'dueDate')],
      ['Frecuencia', firstText(output, input, 'frequency') ?? 'Una vez'],
      ['Efecto', 'Se agenda; no descuenta dinero hasta confirmar el pago'],
    ],
  };
}

function completionMessage(part: FinancialActionPart) {
  const output = part.output ?? {};
  const action = value(output, 'action');

  const messages: Record<string, string> = {
    transaction_recorded: output.kind === 'income' ? 'Ingreso registrado' : 'Gasto registrado',
    obligation_paid: 'Pago confirmado',
    obligation_scheduled: 'Pago programado',
    income_scheduled: 'Ingreso programado',
    expense_category_created: 'Categoría creada',
    expense_category_updated: 'Categoría actualizada',
    expense_category_deleted: 'Categoría eliminada',
    income_source_created: 'Concepto de ingreso creado',
    income_source_updated: 'Concepto de ingreso actualizado',
    income_source_deleted: 'Concepto de ingreso eliminado',
    personal_loan_lent: 'Préstamo por cobrar registrado',
    personal_loan_borrowed: 'Préstamo por pagar registrado',
    account_transfer_created: 'Transferencia completada',
    savings_goal_created: 'Meta de ahorro creada',
    project_created: 'Proyecto creado',
    project_updated: 'Proyecto actualizado',
    project_archived: 'Proyecto archivado',
    account_created: 'Cuenta creada',
    account_updated: 'Cuenta actualizada',
    account_archived: 'Cuenta archivada',
    credit_card_created: 'Tarjeta creada',
    credit_card_updated: 'Tarjeta actualizada',
    credit_card_archived: 'Tarjeta archivada',
    bank_credit_created: 'Crédito creado',
    bank_credit_updated: 'Crédito actualizado',
    bank_credit_archived: 'Crédito archivado',
  };

  return (action && messages[action]) ?? 'Acción completada';
}

export function FinancialActionCard({
  part,
  currencyCode,
  onApproval,
  onContinue,
  onViewChanges,
}: {
  part: FinancialActionPart;
  currencyCode: string;
  onApproval: (id: string, approved: boolean) => void;
  onContinue?: () => void;
  onViewChanges?: () => void;
}) {
  const input = part.input ?? {};
  const output = part.output ?? {};
  const presentation = actionPresentation(part, currencyCode);
  const Icon = presentation.icon;
  const amount = moneyDetail(output, input, currencyCode, 'amount', 'initialBalance');

  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return (
      <div className="w-full rounded-2xl border border-arca-border bg-arca-surface-1 p-4 text-arca-text-secondary">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clock3 className="text-arca-accent" size={17} />
          Nova está preparando la acción…
        </div>
      </div>
    );
  }

  if (part.state === 'output-error') {
    return (
      <div className="w-full rounded-2xl border border-arca-alert/40 bg-arca-alert/10 p-4">
        <div className="flex items-center gap-2 font-semibold text-arca-text-primary">
          <XCircle className="text-arca-alert" size={18} />
          No se pudo completar
        </div>
        <p className="mt-2 text-sm text-arca-text-secondary">
          {part.errorText ?? 'La acción encontró un error. Revisa los datos e intenta nuevamente.'}
        </p>
      </div>
    );
  }

  return (
    <Confirmation
      approval={part.approval}
      state={part.state}
      className="w-full gap-0 overflow-hidden rounded-2xl border-arca-accent/35 bg-arca-surface-1 p-0 text-arca-text-primary shadow-[0_14px_35px_-25px_rgba(198,138,69,0.65)]"
    >
      <ConfirmationTitle className="block p-4 text-arca-text-primary">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-arca-accent/30 bg-arca-accent/10">
            <Icon className="text-arca-accent" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-arca-accent">
              {presentation.eyebrow}
            </p>
            <p className="mt-1 break-words text-base font-bold leading-tight text-arca-text-primary">
              {presentation.title}
            </p>
            {amount && <p className="mt-2 text-2xl font-black tracking-tight">{amount}</p>}
          </div>
        </div>
      </ConfirmationTitle>

      <ConfirmationRequest>
        <div className="border-y border-arca-border bg-arca-base/35 px-4 py-3">
          <dl className="space-y-2">
            {presentation.details.map(([label, detail]) =>
              detail ? (
                <div className="flex items-start justify-between gap-4 text-xs" key={label}>
                  <dt className="text-arca-text-dim">{label}</dt>
                  <dd className="text-right font-semibold text-arca-text-secondary">{detail}</dd>
                </div>
              ) : null,
            )}
          </dl>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-arca-accent/[0.08] px-3 py-2 text-xs text-arca-text-secondary">
            <ShieldCheck className="shrink-0 text-arca-accent" size={16} />
            Nada cambiará hasta que confirmes.
          </div>
        </div>
      </ConfirmationRequest>

      <ConfirmationAccepted>
        <div className="border-t border-arca-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-arca-positive">
            <CheckCircle2 size={18} />
            <span>{part.state === 'output-available' ? completionMessage(part) : 'Aprobado, procesando…'}</span>
          </div>
          {part.state === 'output-available' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onContinue}
                className="h-10 rounded-xl border border-arca-border-strong px-3 text-xs font-bold text-arca-text-secondary transition-colors hover:bg-arca-surface-2 hover:text-arca-text-primary"
              >
                Seguir con Nova
              </button>
              <button
                type="button"
                onClick={onViewChanges}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-arca-accent px-3 text-xs font-black text-[#15110c] transition-colors hover:bg-arca-accent-hover"
              >
                Ver cambios
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </ConfirmationAccepted>

      <ConfirmationRejected>
        <div className="flex items-center gap-2 border-t border-arca-border px-4 py-3 text-sm text-arca-text-secondary">
          <XCircle size={18} />
          <span>Acción cancelada. No se realizó ningún cambio.</span>
        </div>
      </ConfirmationRejected>

      <ConfirmationActions className="w-full justify-stretch border-t border-arca-border p-3">
        <ConfirmationAction
          className="h-10 flex-1 rounded-xl border border-arca-border-strong bg-transparent text-arca-text-secondary hover:bg-arca-surface-2 hover:text-arca-text-primary"
          onClick={() => part.approval && onApproval(part.approval.id, false)}
          variant="outline"
        >
          Cancelar
        </ConfirmationAction>
        <ConfirmationAction
          className="h-10 flex-1 rounded-xl bg-arca-accent font-bold text-[#15110c] hover:bg-arca-accent-hover"
          onClick={() => part.approval && onApproval(part.approval.id, true)}
        >
          Confirmar
        </ConfirmationAction>
      </ConfirmationActions>
    </Confirmation>
  );
}
