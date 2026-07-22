'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, BadgeDollarSign } from 'lucide-react';
import { toast } from '@/src/components/toast-provider';
import { createIncomeSource, updateIncomeSource, deleteIncomeSource } from '@/app/actions';
import type { RegisterOption } from '@/src/lib/register-data';
import { haptics } from '@/src/lib/haptics';

export function IncomeSourceManagerView({
  incomeSources,
  accounts,
  units,
  onClose,
}: {
  incomeSources: RegisterOption[];
  accounts: RegisterOption[];
  units: RegisterOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingSource, setEditingSource] = useState<RegisterOption | null>(null);
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [unitKey, setUnitKey] = useState('general');
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = () => {
    if (!name.trim() || !accountId) return;
    haptics.medium();

    startTransition(() => {
      const action = editingSource
        ? updateIncomeSource({ id: editingSource.id, name: name.trim(), defaultAccountId: accountId, businessUnitKey: unitKey })
        : createIncomeSource({ name: name.trim(), defaultAccountId: accountId, businessUnitKey: unitKey });

      action
        .then(() => {
          toast.success(editingSource ? 'Concepto actualizado' : 'Concepto creado');
          setName('');
          setAccountId('');
          setUnitKey('general');
          setEditingSource(null);
          setIsCreating(false);
          router.refresh();
        })
        .catch((error: Error) => {
          toast.error('Error al guardar', error.message);
        });
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este concepto de ingreso?')) return;
    haptics.error();

    startTransition(() => {
      deleteIncomeSource(id)
        .then(() => {
          toast.success('Concepto eliminado');
          router.refresh();
        })
        .catch((error: Error) => {
          toast.error('Error al eliminar', error.message);
        });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-arca-border pb-3">
        <div className="flex items-center gap-2">
          <BadgeDollarSign className="text-arca-positive" size={20} />
          <h3 className="text-base font-bold text-arca-text-primary">Conceptos de Ingresos</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setName('');
            setAccountId(accounts[0]?.id || '');
            setUnitKey(units[0]?.value || 'general');
            setEditingSource(null);
            setIsCreating(true);
          }}
          className="flex items-center gap-1 rounded-xl bg-arca-positive/15 px-3 py-1.5 text-xs font-bold text-arca-positive hover:bg-arca-positive/25 transition-colors"
        >
          <Plus size={16} />
          Nuevo Concepto
        </button>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {incomeSources.map((source) => (
          <div
            key={source.id}
            className="flex items-center justify-between rounded-xl border border-arca-border bg-arca-surface-1 p-3 text-sm"
          >
            <span className="font-semibold text-arca-text-primary">{source.label}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const s = source as Record<string, any>;
                  setEditingSource(source);
                  setName(source.label);
                  setAccountId(s.accountId || accounts[0]?.id || '');
                  setUnitKey(s.unitKey || 'general');
                  setIsCreating(true);
                }}
                className="rounded-lg p-1.5 text-arca-text-secondary hover:bg-arca-surface-2 hover:text-arca-text-primary transition-colors"
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(source.id)}
                className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Modal / Form */}
      {isCreating && (
        <div className="rounded-2xl border border-arca-positive/30 bg-arca-surface-2 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-arca-positive">
            {editingSource ? 'Editar Concepto de Ingreso' : 'Nuevo Concepto de Ingreso'}
          </h4>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del concepto (ej: Salario, Freelance)"
            className="w-full rounded-xl border border-arca-border bg-arca-base px-3 py-2 text-sm text-arca-text-primary focus:border-arca-positive focus:outline-none"
          />
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full rounded-xl border border-arca-border bg-arca-base px-3 py-2 text-sm text-arca-text-primary focus:border-arca-positive focus:outline-none"
          >
            <option value="">Selecciona cuenta destino predeterminada</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.label}
              </option>
            ))}
          </select>
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
              disabled={isPending || !name.trim() || !accountId}
              onClick={handleSave}
              className="rounded-xl bg-arca-positive px-4 py-1.5 text-xs font-bold text-white hover:bg-arca-positive/80 disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
