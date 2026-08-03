"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  X, 
  Landmark, 
  ShoppingBag, 
  Coffee, 
  Bus, 
  Shirt, 
  Dog, 
  Baby, 
  Smile, 
  Dumbbell, 
  GraduationCap, 
  Scissors, 
  Utensils, 
  Home, 
  Car, 
  Gamepad2, 
  HeartPulse, 
  Zap, 
  MoreHorizontal,
  Check
} from "lucide-react";
import { createExpenseCategory, updateExpenseCategory } from "@/app/actions";
import { haptics } from "@/src/lib/haptics";

export type CategoryNode = {
  id: string;
  name: string;
  parentId?: string | null;
  icon?: string | null;
  children?: CategoryNode[];
};

type CategoryManagerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryNode[];
};

const ICONS = [
  { name: "landmark", icon: Landmark, label: "Impuestos / Bancos" },
  { name: "shopping-bag", icon: ShoppingBag, label: "Compras" },
  { name: "coffee", icon: Coffee, label: "Café / Salidas" },
  { name: "utensils", icon: Utensils, label: "Alimentación" },
  { name: "home", icon: Home, label: "Hogar" },
  { name: "car", icon: Car, label: "Transporte" },
  { name: "gamepad", icon: Gamepad2, label: "Entretenimiento" },
  { name: "heart", icon: HeartPulse, label: "Salud" },
  { name: "zap", icon: Zap, label: "Servicios" },
  { name: "dumbbell", icon: Dumbbell, label: "Deporte" },
  { name: "graduation-cap", icon: GraduationCap, label: "Educación" },
  { name: "shirt", icon: Shirt, label: "Ropa" },
];

function getIconComponent(iconName?: string | null) {
  const found = ICONS.find((i) => i.name === iconName);
  return found ? found.icon : MoreHorizontal;
}

export function CategoryManagerModal({ isOpen, onClose, categories }: CategoryManagerModalProps) {
  const router = useRouter();
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null);

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [icon, setIcon] = useState<string>("shopping-bag");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const parents = categories.filter((c) => !c.parentId);

  const toggleExpand = (id: string) => {
    haptics.light();
    setExpandedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = (presetParentId?: string) => {
    haptics.light();
    setEditingCategory(null);
    setName("");
    setParentId(presetParentId || "");
    setIcon(presetParentId ? "more" : "shopping-bag");
    setError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (category: CategoryNode) => {
    haptics.light();
    setEditingCategory(category);
    setName(category.name);
    setParentId(category.parentId || "");
    setIcon(category.icon || "shopping-bag");
    setError(null);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        if (editingCategory) {
          await updateExpenseCategory({
            id: editingCategory.id,
            name,
            parentId: parentId || null,
            icon,
          });
        } else {
          await createExpenseCategory({
            name,
            parentId: parentId || null,
            icon,
          });
        }
        haptics.success();
        setIsFormOpen(false);
        router.refresh();
      } catch (err: any) {
        haptics.error();
        setError(err.message || "Error guardando categoría");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] border border-arca-border-strong bg-arca-base p-6 shadow-2xl sm:rounded-[32px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-arca-border pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-arca-accent">Estructura de Gastos</p>
            <h2 className="text-xl font-black text-arca-text-primary">Gestor de Categorías</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-dim hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Action button */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-arca-text-dim">Organiza por categorías principales y subcategorías (hijas).</p>
          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-arca-accent px-3 text-xs font-black text-[#15110c] shadow-sm hover:opacity-90 active:scale-95"
          >
            <Plus size={15} /> Nueva Principal
          </button>
        </div>

        {/* Tree List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1 max-h-[55vh]">
          {parents.length > 0 ? (
            parents.map((parent) => {
              const children = categories.filter((c) => c.parentId === parent.id);
              const isExpanded = expandedParents[parent.id] ?? true;
              const ParentIcon = getIconComponent(parent.icon);

              return (
                <div key={parent.id} className="overflow-hidden rounded-2xl border border-arca-border bg-arca-surface-1">
                  {/* Parent row */}
                  <div className="flex items-center justify-between p-3 hover:bg-arca-surface-2/60 transition-colors">
                    <button
                      type="button"
                      onClick={() => toggleExpand(parent.id)}
                      className="flex flex-1 items-center gap-3 text-left min-w-0"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent">
                        <ParentIcon size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-arca-text-primary">{parent.name}</p>
                        <p className="text-[10px] text-arca-text-dim font-bold">{children.length} subcategoría{children.length === 1 ? "" : "s"}</p>
                      </div>
                      {children.length > 0 ? (
                        <span className="ml-2 text-arca-text-dim">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                      ) : null}
                    </button>

                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(parent.id)}
                        title="Añadir subcategoría"
                        className="flex h-8 items-center gap-1 rounded-lg border border-arca-border bg-arca-surface-2 px-2 text-[10px] font-black text-arca-accent hover:bg-arca-accent/10"
                      >
                        <Plus size={12} /> Hija
                      </button>
                    </div>
                  </div>

                  {/* Children accordion */}
                  {isExpanded && children.length > 0 ? (
                    <div className="border-t border-arca-border/60 bg-arca-surface-2/40 p-2 space-y-1.5 pl-6">
                      {children.map((child) => {
                        const ChildIcon = getIconComponent(child.icon);
                        return (
                          <div
                            key={child.id}
                            className="flex items-center justify-between rounded-xl border border-arca-border/40 bg-arca-surface-1 p-2.5 hover:border-arca-accent/30 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-arca-surface-2 text-arca-accent">
                                <ChildIcon size={14} />
                              </span>
                              <span className="truncate text-xs font-bold text-arca-text-primary">{child.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(child)}
                              className="text-[10px] font-bold text-arca-text-dim hover:text-white px-2 py-1"
                            >
                              Editar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-arca-border p-6 text-center text-xs text-arca-text-dim">
              No tienes categorías configuradas aún.
            </div>
          )}
        </div>

        {/* Add/Edit Form Overlay Modal */}
        <AnimatePresence>
          {isFormOpen ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-20 flex flex-col bg-arca-base p-6"
            >
              <div className="flex items-center justify-between border-b border-arca-border pb-4">
                <h3 className="text-base font-black text-arca-text-primary">
                  {editingCategory ? "Editar Categoría" : parentId ? "Nueva Subcategoría" : "Nueva Categoría Principal"}
                </h3>
                <button type="button" onClick={() => setIsFormOpen(false)} aria-label="Cerrar formulario" className="flex h-8 w-8 items-center justify-center rounded-lg bg-arca-surface-2 text-arca-text-dim">
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-arca-text-dim">Nombre</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: 4x1000 (GMF), Mercado, Servicios..."
                    className="h-12 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-4 text-sm font-bold text-arca-text-primary outline-none focus:border-arca-accent"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-arca-text-dim">Categoría Padre (Jerarquía)</label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-3 text-sm font-bold text-arca-text-primary outline-none"
                  >
                    <option value="">Ninguna (Es Categoría Principal)</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>📂 {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-arca-text-dim">Ícono Representativo</label>
                  <div className="grid grid-cols-4 gap-2">
                    {ICONS.map((i) => {
                      const IconComp = i.icon;
                      const isSelected = icon === i.name;
                      return (
                        <button
                          type="button"
                          key={i.name}
                          onClick={() => setIcon(i.name)}
                          className={`flex flex-col items-center justify-center rounded-xl p-3 border transition-all ${
                            isSelected
                              ? "border-arca-accent bg-arca-accent/15 text-arca-accent"
                              : "border-arca-border bg-arca-surface-1 text-arca-text-dim hover:text-white"
                          }`}
                        >
                          <IconComp size={20} />
                          <span className="mt-1 text-[9px] font-bold truncate max-w-full">{i.label.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error ? (
                  <p className="rounded-xl border border-arca-alert/30 bg-arca-alert/10 p-3 text-xs text-arca-alert">{error}</p>
                ) : null}
              </div>

              <div className="mt-4 flex gap-3 pt-3 border-t border-arca-border">
                <button type="button" onClick={() => setIsFormOpen(false)} className="h-12 px-4 rounded-xl text-xs font-bold text-arca-text-dim">Cancelar</button>
                <button
                  type="button"
                  disabled={isPending || !name.trim()}
                  onClick={handleSave}
                  className="h-12 flex-1 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] disabled:opacity-45"
                >
                  {isPending ? "Guardando…" : "Guardar Categoría"}
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
