'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Info,
  Landmark,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { createTransfer } from '@/app/actions';
import { haptics } from '../../lib/haptics';
import { useActionFeedback } from '../feedback/action-feedback-provider';

type TransferAccount = { id: string; name: string; balance: number };
type TransferResult = {
  amount: number;
  fromName: string;
  toName: string;
  originAfter: number;
  destinationAfter: number;
};

function money(value: number, currency: string) {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'COP';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: safeCurrency,
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(new RegExp(`\\s?${safeCurrency}$`), '')
    .trim();
}

function todayBogota() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function TransferScreen({
  onBack,
  onOpenMovements,
  onOpenMoney,
  onOpenNova,
  accounts,
  currency = 'COP',
}: {
  onBack: () => void;
  onOpenMovements?: () => void;
  onOpenMoney?: () => void;
  onOpenNova?: (prompt?: string) => void;
  accounts: TransferAccount[];
  currency?: string;
}) {
  const router = useRouter();
  const feedback = useActionFeedback();
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(todayBogota());
  const [isSuccess, setIsSuccess] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fromAccount = useMemo(
    () => accounts.find((item) => item.id === fromAccountId) ?? null,
    [accounts, fromAccountId],
  );
  const toAccount = useMemo(
    () => accounts.find((item) => item.id === toAccountId) ?? null,
    [accounts, toAccountId],
  );
  const parsedAmount = Number(amount || '0');
  const validAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const hasEnoughBalance = fromAccount ? validAmount <= fromAccount.balance : false;
  const originAfter = fromAccount ? fromAccount.balance - validAmount : 0;
  const destinationAfter = toAccount ? toAccount.balance + validAmount : 0;

  const canSubmit =
    accounts.length >= 2 &&
    Boolean(fromAccountId) &&
    Boolean(toAccountId) &&
    fromAccountId !== toAccountId &&
    validAmount > 0 &&
    hasEnoughBalance &&
    Boolean(date);

  const chooseOrigin = (nextId: string) => {
    setFromAccountId(nextId);
    if (nextId === toAccountId) {
      setToAccountId(accounts.find((account) => account.id !== nextId)?.id ?? '');
    }
    setAmount('');
    setError(null);
  };

  const chooseDestination = (nextId: string) => {
    setToAccountId(nextId);
    if (nextId === fromAccountId) {
      setFromAccountId(accounts.find((account) => account.id !== nextId)?.id ?? '');
      setAmount('');
    }
    setError(null);
  };

  const swapAccounts = () => {
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
    setAmount('');
    setError(null);
    haptics.light();
  };

  const useBalancePercentage = (percentage: number) => {
    if (!fromAccount) return;
    setAmount(String(Math.max(0, Math.floor(fromAccount.balance * percentage))));
    setError(null);
    haptics.light();
  };

  const handleTransfer = () => {
    if (!canSubmit) return;

    setError(null);
    feedback.start('Procesando transferencia…', 'Estamos moviendo el dinero y recalculando ambas cuentas.');
    startTransition(async () => {
      try {
        await createTransfer({
          fromAccountId,
          toAccountId,
          amount: parsedAmount,
          concept,
          date,
        });
        setTransferResult({
          amount: parsedAmount,
          fromName: fromAccount?.name ?? 'Cuenta origen',
          toName: toAccount?.name ?? 'Cuenta destino',
          originAfter,
          destinationAfter,
        });
        haptics.success();
        feedback.succeed('Transferencia completada', `${money(parsedAmount, currency)} pasó a ${toAccount?.name ?? 'la cuenta destino'}.`);
        setIsSuccess(true);
        router.refresh();
      } catch (submissionError) {
        const message = submissionError instanceof Error ? submissionError.message : 'No se pudo registrar la transferencia.';
        setError(message);
        feedback.fail('No pudimos transferir', message);
        haptics.error();
      }
    });
  };

  const startAnotherTransfer = () => {
    setAmount('');
    setConcept('');
    setDate(todayBogota());
    setError(null);
    setTransferResult(null);
    setIsSuccess(false);
  };

  if (accounts.length < 2) {
    return (
      <div className="space-y-6">
        <ScreenHeader onBack={onBack} />
        <div className="card-arca space-y-5 p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-arca-accent/10 text-arca-accent">
            <Landmark size={20} />
          </span>
          <div>
            <p className="font-bold text-arca-text-primary">Necesitas otra cuenta para transferir</p>
            <p className="mt-2 text-xs leading-5 text-arca-text-dim">
              Agrega una cuenta o billetera y podrás mover dinero sin registrarlo como ingreso o gasto.
            </p>
          </div>
          <button type="button" onClick={onOpenMoney ?? onBack} className="h-12 w-full rounded-2xl bg-arca-accent font-black text-black">
            Ir a mis cuentas
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess && transferResult) {
    return (
      <div className="space-y-6">
        <ScreenHeader onBack={onBack} />
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-arca overflow-hidden"
        >
          <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
            <motion.span
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              className="flex h-20 w-20 items-center justify-center rounded-full border border-arca-positive/30 bg-arca-positive/10 text-arca-positive"
            >
              <CheckCircle2 size={40} />
            </motion.span>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-arca-positive">Transferencia completada</p>
            <h2 className="mt-2 text-3xl font-black text-arca-text-primary">{money(transferResult.amount, currency)}</h2>
            <p className="mt-2 max-w-[260px] text-xs leading-5 text-arca-text-secondary">
              El dinero pasó de <strong className="text-arca-text-primary">{transferResult.fromName}</strong> a{' '}
              <strong className="text-arca-text-primary">{transferResult.toName}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center border-y border-arca-border bg-arca-surface-2/50 px-5 py-4">
            <BalanceResult label="Quedó en origen" value={money(transferResult.originAfter, currency)} />
            <ArrowRight size={17} className="mx-3 text-arca-text-dim" />
            <BalanceResult label="Quedó en destino" value={money(transferResult.destinationAfter, currency)} align="right" />
          </div>

          <div className="space-y-3 p-5">
            <button type="button" onClick={onOpenMovements ?? onBack} className="h-13 w-full rounded-2xl bg-arca-accent font-black text-black">
              Ver movimientos
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={startAnotherTransfer} className="h-12 rounded-2xl border border-arca-border font-bold text-arca-text-primary">
                Hacer otra
              </button>
              <button type="button" onClick={onOpenMoney ?? onBack} className="h-12 rounded-2xl border border-arca-border font-bold text-arca-text-primary">
                Volver a Dinero
              </button>
            </div>
          </div>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ScreenHeader onBack={onBack} />

      <section className="card-arca p-4">
        <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Ruta del dinero</p>
        <div className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-stretch gap-2">
          <AccountSelector
            label="Desde"
            tone="origin"
            value={fromAccountId}
            onChange={chooseOrigin}
            accounts={accounts.filter((account) => account.id !== toAccountId)}
            selectedAccount={fromAccount}
            currency={currency}
          />
          <button
            type="button"
            onClick={swapAccounts}
            aria-label="Intercambiar cuenta de origen y destino"
            className="my-auto flex h-11 w-11 items-center justify-center rounded-full border border-arca-accent/30 bg-arca-accent/10 text-arca-accent transition-transform active:rotate-180"
          >
            <ArrowRightLeft size={18} />
          </button>
          <AccountSelector
            label="Hacia"
            tone="destination"
            value={toAccountId}
            onChange={chooseDestination}
            accounts={accounts.filter((account) => account.id !== fromAccountId)}
            selectedAccount={toAccount}
            currency={currency}
          />
        </div>
      </section>

      <section className="card-arca space-y-5 p-5">
        <div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="transfer-amount" className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-text-dim">
              ¿Cuánto quieres mover?
            </label>
            <span className="text-[10px] text-arca-text-secondary">
              Disponible {fromAccount ? money(fromAccount.balance, currency) : money(0, currency)}
            </span>
          </div>
          <div className="relative mt-3 rounded-[22px] border border-arca-border bg-arca-surface-2 px-4 focus-within:border-arca-accent/70">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-arca-accent">$</span>
            <input
              id="transfer-amount"
              inputMode="numeric"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              className="h-20 w-full bg-transparent pl-9 pr-2 text-3xl font-black text-arca-text-primary outline-none placeholder:text-arca-text-dim/50"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <AmountShortcut label="25%" onClick={() => useBalancePercentage(0.25)} />
            <AmountShortcut label="50%" onClick={() => useBalancePercentage(0.5)} />
            <AmountShortcut label="Todo" onClick={() => useBalancePercentage(1)} subtle />
          </div>
          {!hasEnoughBalance && validAmount > 0 ? (
            <p className="mt-3 text-xs font-semibold text-arca-alert">El saldo de la cuenta origen no alcanza para este monto.</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fecha">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-12 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 text-sm text-arca-text-primary outline-none focus:border-arca-accent"
            />
          </Field>
          <Field label="Motivo opcional">
            <input
              type="text"
              placeholder="Ej. Separar ahorro"
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
              className="h-12 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 text-sm text-arca-text-primary outline-none placeholder:text-arca-text-dim focus:border-arca-accent"
            />
          </Field>
        </div>
      </section>

      <section className="card-arca overflow-hidden">
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Así quedarán tus cuentas</p>
            <span className="rounded-full bg-arca-positive/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-arca-positive">Vista previa</span>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center">
            <BalanceResult label={fromAccount?.name ?? 'Origen'} value={money(Math.max(originAfter, 0), currency)} />
            <ArrowRight size={17} className="mx-3 text-arca-text-dim" />
            <BalanceResult label={toAccount?.name ?? 'Destino'} value={money(destinationAfter, currency)} align="right" />
          </div>
        </div>
        <div className="flex items-start gap-2 border-t border-arca-border bg-arca-surface-2/50 px-5 py-3 text-[10px] leading-4 text-arca-text-secondary">
          <Info size={14} className="mt-0.5 shrink-0 text-arca-positive" />
          Solo mueve dinero entre tus cuentas. No suma ingresos ni gastos.
        </div>
      </section>

      {onOpenNova ? (
        <aside className="rounded-[22px] border border-arca-accent/20 bg-arca-accent/[0.05] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent">
              <Sparkles size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-arca-accent">Decídelo con Nova</p>
              <p className="mt-1 text-xs leading-5 text-arca-text-secondary">
                Puedo revisar tus próximos pagos y decirte cuánto conviene mover sin dejar corta la cuenta origen.
              </p>
              <button
                type="button"
                onClick={() => onOpenNova(
                  `Ayúdame a decidir cuánto transferir desde ${fromAccount?.name ?? 'mi cuenta origen'} hacia ${toAccount?.name ?? 'mi cuenta destino'}. Tengo ${money(fromAccount?.balance ?? 0, currency)} disponibles${validAmount > 0 ? ` y estoy pensando mover ${money(validAmount, currency)}` : ''}. Revisa mis próximos pagos y recomiéndame un monto seguro.`,
                )}
                className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-arca-accent"
              >
                Pedir recomendación <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      {error ? <p className="rounded-xl border border-arca-alert/30 bg-arca-alert/10 p-3 text-xs text-arca-alert">{error}</p> : null}

      <button
        type="button"
        disabled={!canSubmit || isPending}
        onClick={handleTransfer}
        className="h-14 w-full rounded-2xl bg-arca-accent font-black text-black shadow-[0_12px_30px_rgba(211,145,61,0.18)] disabled:cursor-not-allowed disabled:bg-arca-surface-2 disabled:text-arca-text-dim disabled:shadow-none"
      >
        {isPending ? 'Transfiriendo...' : validAmount > 0 ? `Transferir ${money(validAmount, currency)}` : 'Indica el monto'}
      </button>
    </div>
  );
}

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="flex items-center gap-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-arca-border bg-arca-surface-1 text-arca-text-secondary"
      >
        <ArrowLeft size={20} />
      </button>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Mover dinero</p>
        <h1 className="text-xl font-black tracking-tight text-arca-text-primary">Transferencia entre cuentas</h1>
      </div>
    </header>
  );
}

function AccountSelector({
  label,
  tone,
  value,
  onChange,
  accounts,
  selectedAccount,
  currency,
}: {
  label: string;
  tone: 'origin' | 'destination';
  value: string;
  onChange: (value: string) => void;
  accounts: TransferAccount[];
  selectedAccount: TransferAccount | null;
  currency: string;
}) {
  const isOrigin = tone === 'origin';

  return (
    <label className={`min-w-0 rounded-2xl border p-3 ${isOrigin ? 'border-arca-accent/25 bg-arca-accent/[0.06]' : 'border-arca-positive/25 bg-arca-positive/[0.06]'}`}>
      <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${isOrigin ? 'text-arca-accent' : 'text-arca-positive'}`}>{label}</span>
      <span className="mt-3 flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isOrigin ? 'bg-arca-accent/15 text-arca-accent' : 'bg-arca-positive/15 text-arca-positive'}`}>
          <Wallet size={15} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-arca-text-primary">{selectedAccount?.name ?? 'Selecciona'}</span>
          <span className="block truncate text-[10px] text-arca-text-secondary">{money(selectedAccount?.balance ?? 0, currency)}</span>
        </span>
      </span>
      <select
        aria-label={`Cuenta ${label.toLowerCase()}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-8 w-full rounded-lg border border-arca-border bg-arca-surface-1 px-2 text-[10px] font-bold text-arca-text-secondary outline-none"
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>{account.name}</option>
        ))}
      </select>
    </label>
  );
}

function AmountShortcut({ label, onClick, subtle = false }: { label: string; onClick: () => void; subtle?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-xl border text-xs font-black ${subtle ? 'border-arca-border text-arca-text-secondary' : 'border-arca-accent/25 bg-arca-accent/[0.06] text-arca-accent'}`}
    >
      {label}
    </button>
  );
}

function BalanceResult({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <p className="truncate text-[9px] font-bold uppercase tracking-wider text-arca-text-dim">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-arca-text-primary">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">{label}</span>
      {children}
    </label>
  );
}
