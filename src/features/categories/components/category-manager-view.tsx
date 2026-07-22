'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Tag, ChevronRight } from 'lucide-react';
import { toast } from '@/src/components/toast-provider';
import { createExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '@/app/actions';
import type { RegisterOption } from '@/src/lib/register-data';
import { haptics } from '@/src/lib/haptics';

export function CategoryManagerView({
  categories,
  onClose,
}: {
  categories: RegisterOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingCategory, setEditingCategory] = useState<RegisterOption | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const parentCategories = categories.filter((c) => !c.parentId);

  const handleSave = () => {
    if (!name.trim()) return;
    haptics.medium();

    startTransition(() => {
      const action = editingCategory
        ? updateExpenseCategory({ id: editingCategory.id, name: name.trim(), parentId: parentId || null })
        : createExpenseCategory({ name: name.trim(), parentId: parentId || null });

      action
        .then(() => {
          toast.success(editingCategory ? 'Categoría actualizada' : 'Categoría creada');
          setName('');
          setParentId('');
          setEditingCategory(null);
          setIsCreating(false);
          router.refresh();
        })
        .catch((error: Error) => {
          toast.error('Error al guardar', error.message);
        });
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    haptics.error();

    startTransition(() => {
      deleteExpenseCategory(id)
        .then(() => {
          toast.success('Categoría eliminada');
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
          <Tag className="text-arca-accent" size={20} />
          <h3 className="text-base font-bold text-arca-text-primary">Categorías de Gastos</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setName('');
            setParentId('');
            setEditingCategory(null);
            setIsCreating(true);
          }}
          className="flex items-center gap-1 rounded-xl bg-arca-accent/15 px-3 py-1.5 text-xs font-bold text-arca-accent hover:bg-arca-accent/25 transition-colors"
        >
          <Plus size={16} />
          Nueva
        </button>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between rounded-xl border border-arca-border bg-arca-surface-1 p-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-arca-text-primary">{cat.label}</span>
              {cat.parentId && (
                <span className="text-[10px] text-arca-text-dim uppercase tracking-wider">Subcategoría</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(cat);
                  setName(cat.label);
                  setParentId(cat.parentId || '');
                  setIsCreating(true);
                }}
                className="rounded-lg p-1.5 text-arca-text-secondary hover:bg-arca-surface-2 hover:text-arca-text-primary transition-colors"
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(cat.id)}
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
        <div className="rounded-2xl border border-arca-accent/30 bg-arca-surface-2 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-arca-accent">
            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          </h4>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la categoría"
            className="w-full rounded-xl border border-arca-border bg-arca-base px-3 py-2 text-sm text-arca-text-primary focus:border-arca-accent focus:outline-none"
          />
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-xl border border-arca-border bg-arca-base px-3 py-2 text-sm text-arca-text-primary focus:border-arca-accent focus:outline-none"
          >
            <option value="">Categoría Principal (Ninguna)</option>
            {parentCategories.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
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
