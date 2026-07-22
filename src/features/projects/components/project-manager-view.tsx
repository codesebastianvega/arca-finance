'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Archive, Briefcase } from 'lucide-react';
import { toast } from '@/src/components/toast-provider';
import { createBusinessUnit, updateBusinessUnit, archiveBusinessUnit } from '@/app/actions';
import type { RegisterOption } from '@/src/lib/register-data';
import { haptics } from '@/src/lib/haptics';

export function ProjectManagerView({
  units,
  onClose,
}: {
  units: RegisterOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingUnit, setEditingUnit] = useState<RegisterOption | null>(null);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    haptics.medium();

    startTransition(() => {
      const action = editingUnit
        ? updateBusinessUnit({ id: editingUnit.id, name: name.trim(), key: editingUnit.value || name.toLowerCase().replace(/\s+/g, '_') })
        : createBusinessUnit({ name: name.trim(), key: name.toLowerCase().replace(/\s+/g, '_') });

      action
        .then(() => {
          toast.success(editingUnit ? 'Proyecto actualizado' : 'Proyecto creado');
          setName('');
          setEditingUnit(null);
          setIsCreating(false);
          router.refresh();
        })
        .catch((error: Error) => {
          toast.error('Error al guardar', error.message);
        });
    });
  };

  const handleArchive = (id: string) => {
    if (!confirm('¿Deseas archivar este proyecto/unidad?')) return;
    haptics.error();

    startTransition(() => {
      archiveBusinessUnit(id)
        .then(() => {
          toast.success('Proyecto archivado');
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
          <Briefcase className="text-arca-accent" size={20} />
          <h3 className="text-base font-bold text-arca-text-primary">Proyectos y Espacios</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setName('');
            setEditingUnit(null);
            setIsCreating(true);
          }}
          className="flex items-center gap-1 rounded-xl bg-arca-accent/15 px-3 py-1.5 text-xs font-bold text-arca-accent hover:bg-arca-accent/25 transition-colors"
        >
          <Plus size={16} />
          Nuevo Proyecto
        </button>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {units.map((unit) => (
          <div
            key={unit.id}
            className="flex items-center justify-between rounded-xl border border-arca-border bg-arca-surface-1 p-3 text-sm"
          >
            <span className="font-semibold text-arca-text-primary">{unit.label}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditingUnit(unit);
                  setName(unit.label);
                  setIsCreating(true);
                }}
                className="rounded-lg p-1.5 text-arca-text-secondary hover:bg-arca-surface-2 hover:text-arca-text-primary transition-colors"
              >
                <Pencil size={15} />
              </button>
              {unit.value !== 'general' && (
                <button
                  type="button"
                  onClick={() => handleArchive(unit.id)}
                  className="rounded-lg p-1.5 text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <Archive size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Editor Modal / Form */}
      {isCreating && (
        <div className="rounded-2xl border border-arca-accent/30 bg-arca-surface-2 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-arca-accent">
            {editingUnit ? 'Editar Proyecto' : 'Nuevo Proyecto / Negocio'}
          </h4>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del proyecto"
            className="w-full rounded-xl border border-arca-border bg-arca-base px-3 py-2 text-sm text-arca-text-primary focus:border-arca-accent focus:outline-none"
          />
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
