'use client';

import type { ToolUIPart } from 'ai';
import {
  CalendarPlus,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ReceiptText,
  ShieldCheck,
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

const ACTION_TYPES = new Set([
  'tool-record_transaction',
  'tool-confirm_obligation_payment',
  'tool-schedule_obligation',
  'tool-schedule_expected_income',
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

function actionPresentation(part: FinancialActionPart) {
  const input = part.input ?? {};

  if (part.type === 'tool-record_transaction') {
    const isIncome = input.kind === 'income';
    return {
      icon: ReceiptText,
      eyebrow: isIncome ? 'Nuevo ingreso' : 'Nuevo gasto',
      title: value(input, 'concept') ?? 'Registrar movimiento',
      details: [
        ['Cuenta', value(input, 'accountName')],
        ['Categoría', value(input, 'category')],
        ['Fecha', value(input, 'date') ?? 'Hoy'],
      ],
    };
  }

  if (part.type === 'tool-confirm_obligation_payment') {
    return {
      icon: CircleDollarSign,
      eyebrow: 'Confirmar pago',
      title: value(input, 'title') ?? 'Obligación pendiente',
      details: [['Fecha', 'Hoy']],
    };
  }

  if (part.type === 'tool-schedule_expected_income') {
    return {
      icon: CalendarPlus,
      eyebrow: 'Programar ingreso',
      title: value(input, 'title') ?? 'Ingreso esperado',
      details: [
        ['Cuenta destino', value(input, 'accountName')],
        ['Fecha esperada', value(input, 'dueDate')],
      ],
    };
  }

  return {
    icon: CalendarPlus,
    eyebrow: 'Programar pago',
    title: value(input, 'title') ?? 'Próxima obligación',
    details: [
      ['Cuenta sugerida', value(input, 'accountName') ?? 'Sin cuenta asignada'],
      ['Vencimiento', value(input, 'dueDate')],
      ['Frecuencia', value(input, 'frequency') ?? 'Una vez'],
    ],
  };
}

export function FinancialActionCard({
  part,
  currencyCode,
  onApproval,
}: {
  part: FinancialActionPart;
  currencyCode: string;
  onApproval: (id: string, approved: boolean) => void;
}) {
  const input = part.input ?? {};
  const presentation = actionPresentation(part);
  const Icon = presentation.icon;
  const amount = formatMoney(input.amount, currencyCode);

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
        <div className="flex items-center gap-2 border-t border-arca-border px-4 py-3 text-sm text-arca-positive">
          <CheckCircle2 size={18} />
          <span>{part.state === 'output-available' ? 'Acción completada' : 'Aprobado, procesando…'}</span>
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
