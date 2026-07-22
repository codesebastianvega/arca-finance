'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Archive, Wallet, CreditCard, Building } from 'lucide-react';
import { toast } from '@/src/components/toast-provider';
import { createAccount, updateAccountDetails, archiveAccount } from '@/app/actions';
import type { RegisterOption } from '@/src/lib/register-data';
import { haptics } from '@/src/lib/haptics';

export function AccountManagerView({
  accounts,
  onClose,
}: {
  accounts: RegisterOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingAccount, setEditingAccount] = useState<RegisterOption | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('Ahorros');
  const [entity, setEntity] = useState('');
  const [balance, setBalance] = useState('0');
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    haptics.medium();

    startTransition(() => {
      const action = editingAccount
        ? updateAccountDetails({ id: editingAccount.id, name: name.trim(), entity, type, color: '#C68A45' })
        : createAccount({ name: name.trim(), entity, type, balance: Number(balance || 0), color: '#C68A45' });

      action
        .then(() => {
          toast.success(editingAccount ? 'Cuenta actualizada' : 'Cuenta creada');
          setName('');
          setEntity('');
          setType('Ahorros');
          setBalance('0');
          setEditingAccount(null);
          setIsCreating(false);
          router.refresh();
        })
        .catch((error: Error) => {
          toast.error('Error al guardar', error.message);
        });
    });
  };

  const handleArchive = (id: string) => {
    if (!confirm('¿Deseas archivar esta cuenta bancaria?')) return;
    haptics.error();

    startTransition(() => {
      archiveAccount(id)
        .then(() => {
          toast.success('Cuenta archivada');
          router.refresh();
        })
        .catch((error: Error) => {
          toast.error('Error al archivar', error.message);
        });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-arca-border pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="text-arca-accent" size={20} />
          <h3 className="text-base font-bold text-arca-text-primary">Cuentas Bancarias y Efectivo</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setName('');
            setEntity('');
            setType('Ahorros');
            setBalance('0');
            setEditingAccount(null);
            setIsCreating(true);
          }}
          className="flex items-center gap-1 rounded-xl bg-arca-accent/15 px-3 py-1.5 text-xs font-bold text-arca-accent hover:bg-arca-accent/25 transition-colors"
        >
          <Plus size={16} />
          Nueva Cuenta
        </button>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex items-center justify-between rounded-xl border border-arca-border bg-arca-surface-1 p-3 text-sm"
          >
            <div className="flex flex-col">
              <span className="font-semibold text-arca-text-primary">{acc.label}</span>
              <span className="text-[10px] text-arca-text-dim uppercase tracking-wider">{acc.meta || acc.entity || 'Cuenta'}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditingAccount(acc);
                  setName(acc.label);
                  setEntity(acc.entity || '');
                  setType(acc.meta || 'Ahorros');
                  setIsCreating(true);
                }}
                className="rounded-lg p-1.5 text-arca-text-secondary hover:bg-arca-surface-2 hover:text-arca-text-primary transition-colors"
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleArchive(acc.id)}
                className="rounded-lg p-1.5 text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <Archive size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Modal / Form */}
      {isCreating && (
        <div className="rounded-2xl border border-arca-accent/30 bg-arca-surface-2 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-arca-accent">
            {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
          </h4>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la cuenta (ej: Nequi, Bancolombia)"
            className="w-full rounded-xl border border-arca-border bg-arca-base px-3 py-2 text-sm text-arca-text-primary focus:border-arca-accent focus:outline-none"
          />
          <input
            type="text"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            placeholder="Entidad bancaria (opcional)"
            className="w-full rounded-xl border border-arca-border bg-arca-base px-3 py-2 text-sm text-arca-text-primary focus:border-arca-accent focus:outline-none"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-xl border border-arca-border bg-arca-base px-3 py-2 text-sm text-arca-text-primary focus:border-arca-accent focus:outline-none"
          >
            <option value="Ahorros">Cuenta de Ahorros</option>
            <option value="Corriente">Cuenta Corriente</option>
            <option value="Efectivo">Bolsillo / Efectivo</option>
            <option value="Inversión">Inversión / Fiduciaria</option>
          </select>
          {!editingAccount && (
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="Saldo inicial"
              className="w-full rounded-xl border border-arca-border bg-arca-base px-3 py-2 text-sm text-arca-text-primary focus:border-arca-accent focus:outline-none"
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="rounded-xl border border-arca-border px-3 py-1.5 text-xs font-bold text-arca-text-secondary hover:bg-arca-surface-1"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isPending || !name.trim()}
              onClick={handleSave}
              className="rounded-xl bg-arca-accent px-4 py-1.5 text-xs font-bold text-[#15110c] hover:bg-arca-accent-hover disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
