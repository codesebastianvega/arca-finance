'use client';

import { useMemo, useState, useTransition } from 'react';
import { motion } from 'motion/react';
import { ArrowDownLeft, ArrowRight, CheckCircle2, Wallet } from 'lucide-react';
import { createTransfer } from '@/app/actions';
import type { MoneyViewModel } from '@/src/lib/money-data';
import { haptics } from '../../lib/haptics';

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s?COP$/, '')
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
  data,
}: {
  onBack: () => void;
  data: MoneyViewModel;
}) {
  const accounts = data.accounts;
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(todayBogota());
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fromAccount = useMemo(() => accounts.find((item) => item.id === fromAccountId) ?? null, [accounts, fromAccountId]);
  const toAccount = useMemo(() => accounts.find((item) => item.id === toAccountId) ?? null, [accounts, toAccountId]);
  const parsedAmount = Number(amount || '0');
  const hasEnoughBalance = fromAccount ? parsedAmount <= fromAccount.balance : false;

  const canSubmit =
    accounts.length >= 2 &&
    fromAccountId &&
    toAccountId &&
    fromAccountId !== toAccountId &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    hasEnoughBalance &&
    Boolean(date);

  const handleTransfer = () => {
    if (!canSubmit) return;

    setError(null);
    startTransition(async () => {
      try {
        await createTransfer({
          fromAccountId,
          toAccountId,
          amount: parsedAmount,
          concept,
          date,
        });
        haptics.success();
        setIsSuccess(true);
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'No se pudo registrar la transferencia.');
        haptics.error();
      }
    });
  };

  if (accounts.length < 2) {
    return (
      <div className="space-y-6">
        <header className="flex items-center space-x-4">
          <button onClick={onBack} className="text-arca-text-dim hover:text-arca-accent transition-colors">
            <ArrowDownLeft className="rotate-45" size={24} />
          </button>
          <h2 className="text-lg font-bold text-arca-text-primary uppercase tracking-widest">Transferir</h2>
        </header>

        <div className="card-arca p-6 space-y-3">
          <p className="text-sm font-semibold text-arca-text-primary">Te hacen falta al menos dos cuentas activas.</p>
          <p className="text-xs text-arca-text-dim">Crea otra cuenta o billetera para poder mover dinero entre saldos reales.</p>
        </div>
      </div>
    );
  }

  if (isSuccess && fromAccount && toAccount) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 pt-20">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-full bg-arca-positive/10 flex items-center justify-center text-arca-positive"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-arca-text-primary uppercase tracking-widest">Transferencia exitosa</h2>
          <p className="text-arca-text-dim text-sm">
            Moviste {money(parsedAmount)} de {fromAccount.name} a {toAccount.name}.
          </p>
        </div>
        <button onClick={onBack} className="w-full h-14 bg-arca-accent text-white rounded-2xl font-bold uppercase tracking-widest">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="text-arca-text-dim hover:text-arca-accent transition-colors">
          <ArrowDownLeft className="rotate-45" size={24} />
        </button>
        <h2 className="text-lg font-bold text-arca-text-primary uppercase tracking-widest">Transferir</h2>
      </header>

      <div className="space-y-4">
        <div className="card-arca p-6 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Desde</p>
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-arca-accent/10 flex items-center justify-center text-arca-accent shrink-0">
                <Wallet size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-arca-text-primary truncate">{fromAccount?.name ?? 'Cuenta origen'}</p>
                <p className="text-[10px] text-arca-text-dim">{fromAccount ? money(fromAccount.balance) : '$ 0'}</p>
              </div>
            </div>
          </div>
          <ArrowRight className="text-arca-text-dim shrink-0" />
          <div className="space-y-1 text-right min-w-0">
            <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Hacia</p>
            <div className="flex items-center justify-end space-x-2 min-w-0">
              <div className="min-w-0">
                <p className="font-bold text-arca-text-primary truncate">{toAccount?.name ?? 'Cuenta destino'}</p>
                <p className="text-[10px] text-arca-text-dim">{toAccount ? money(toAccount.balance) : '$ 0'}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-arca-positive/10 flex items-center justify-center text-arca-positive shrink-0">
                <Wallet size={16} />
              </div>
            </div>
          </div>
        </div>

        <div className="card-arca p-5 space-y-4">
          <Field label="Cuenta origen">
            <select
              value={fromAccountId}
              onChange={(event) => setFromAccountId(event.target.value)}
              className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.balanceLabel}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Cuenta destino">
            <select
              value={toAccountId}
              onChange={(event) => setToAccountId(event.target.value)}
              className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.balanceLabel}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Monto">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-arca-text-dim font-bold">$</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full h-14 pl-8 pr-4 bg-arca-surface-2 border border-arca-border rounded-xl text-lg font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent"
              />
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fecha">
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
              />
            </Field>

            <Field label="Motivo">
              <input
                type="text"
                placeholder="Mover caja, separar ahorro..."
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm text-arca-text-primary placeholder:text-arca-text-dim focus:outline-none focus:border-arca-accent"
              />
            </Field>
          </div>

          {!hasEnoughBalance && parsedAmount > 0 ? (
            <div className="text-xs text-arca-alert">La cuenta origen no tiene saldo suficiente para mover ese monto.</div>
          ) : null}

          {error ? <div className="text-xs text-arca-alert">{error}</div> : null}

          <button
            disabled={!canSubmit || isPending}
            onClick={handleTransfer}
            className="w-full h-14 bg-arca-accent text-white rounded-2xl font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {isPending ? 'Confirmando...' : 'Confirmar envio'}
          </button>
        </div>

        <div className="card-arca p-4 space-y-2">
          <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Lectura</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-arca-text-dim">Saldo origen despues</span>
            <span className={`font-bold ${fromAccount && fromAccount.balance - (Number.isFinite(parsedAmount) ? parsedAmount : 0) < 0 ? 'text-arca-alert' : 'text-arca-text-primary'}`}>
              {fromAccount ? money(Math.max(fromAccount.balance - (Number.isFinite(parsedAmount) ? parsedAmount : 0), 0)) : '$ 0'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-arca-text-dim">Saldo destino despues</span>
            <span className="font-bold text-arca-text-primary">
              {toAccount ? money(toAccount.balance + (Number.isFinite(parsedAmount) ? parsedAmount : 0)) : '$ 0'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2 block">
      <span className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">{label}</span>
      {children}
    </label>
  );
}
