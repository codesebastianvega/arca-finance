"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Landmark, Pencil, PiggyBank, Plus, ReceiptText, Sparkles, Trash2, WalletCards, X } from "lucide-react";
import { saveMonthlyPlan, type MonthlyPlanAllocationInput } from "@/app/actions";
import type { MonthViewModel, MonthlyAllocationType } from "@/src/lib/month-types";

type DraftAllocation = MonthlyPlanAllocationInput & { key: string };

type MonthScreenProps = {
  onBack: () => void;
  onOpenNova: (prompt: string) => void;
  data: MonthViewModel;
  currency: string;
};

const TYPE_OPTIONS: Array<{ value: MonthlyAllocationType; label: string }> = [
  { value: "expense", label: "Gasto" },
  { value: "saving", label: "Ahorro" },
  { value: "debt", label: "Deuda" },
  { value: "free", label: "Dinero libre" },
];

function money(value: number, currency: string) {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "COP";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: safeCurrency, maximumFractionDigits: 0 }).format(value);
}

function inputNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.,]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function MonthScreen({ onBack, onOpenNova, data, currency }: MonthScreenProps) {
  const router = useRouter();
  const [plannedIncome, setPlannedIncome] = useState(String(Math.round(data.plannedIncome || 0)));
  const [allocations, setAllocations] = useState<DraftAllocation[]>(() => data.allocations.map((allocation) => ({
    key: allocation.id,
    name: allocation.name,
    type: allocation.type,
    percentage: allocation.percentage,
    trackingCategory: allocation.trackingCategory,
  })));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const income = inputNumber(plannedIncome);
  const assignedPercentage = allocations.reduce((sum, allocation) => sum + Number(allocation.percentage), 0);
  const assignedAmount = income * (assignedPercentage / 100);
  const unassignedPercentage = Math.max(0, 100 - assignedPercentage);
  const unassignedAmount = Math.max(0, income - assignedAmount);

  const openNew = () => {
    setEditingKey(null);
    setEditorOpen(true);
  };

  const savePlan = () => {
    setError("");
    setSaved(false);
    startTransition(async () => {
      try {
        await saveMonthlyPlan({ month: data.month, plannedIncome: income, allocations });
        setSaved(true);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "No pudimos guardar tu plan.");
      }
    });
  };

  return (
    <div className="space-y-5 pb-7">
      <header className="flex items-start gap-3">
        <button type="button" onClick={onBack} aria-label="Volver al menú" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-arca-border bg-arca-surface-1 text-arca-text-dim hover:text-arca-accent"><ArrowLeft size={19} /></button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Tu regla de distribución</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-arca-text-primary">Plan de {data.monthLabel}</h1>
          <p className="mt-1 text-xs text-arca-text-dim">Decide cómo repartir tus ingresos y mide el resultado.</p>
        </div>
      </header>

      {!data.planAvailable ? (
        <div className="rounded-2xl border border-arca-accent/25 bg-arca-accent/[0.06] px-4 py-3 text-xs leading-5 text-arca-text-secondary">
          La nueva planeación está lista en la aplicación, pero requiere aplicar la migración de base de datos antes de guardar tu primer plan.
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-[30px] border border-arca-border-strong bg-arca-surface-1 p-5">
        <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-arca-accent/[0.08] blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-arca-text-dim">Ingreso base del plan</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-sm font-black text-arca-accent">{currency}</span>
                <input value={plannedIncome} onChange={(event) => setPlannedIncome(event.target.value)} inputMode="numeric" aria-label="Ingreso base del plan" className="min-w-0 flex-1 bg-transparent text-3xl font-black tracking-[-0.045em] text-arca-text-primary outline-none" />
                <Pencil size={15} className="text-arca-text-dim" />
              </div>
              <p className="mt-2 text-xs text-arca-text-secondary">Puedes usar tu ingreso esperado o escribir una base personalizada.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-arca-border pt-4">
            <MiniMetric label="Ya recibido" value={money(data.receivedIncome, currency)} />
            <MiniMetric label="Por recibir" value={money(data.expectedIncome, currency)} />
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-arca-border bg-arca-surface-1 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-arca-text-dim">Estado del plan</p>
            <p className="mt-1 text-lg font-black text-arca-text-primary">{Math.round(assignedPercentage)}% distribuido</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${assignedPercentage > 100 ? "bg-arca-alert/10 text-arca-alert" : assignedPercentage === 100 ? "bg-arca-positive/10 text-arca-positive" : "bg-arca-accent/10 text-arca-accent"}`}>
            {assignedPercentage > 100 ? "Excedido" : assignedPercentage === 100 ? "Completo" : `${Math.round(unassignedPercentage)}% libre`}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-arca-surface-3"><div className={`h-full rounded-full ${assignedPercentage > 100 ? "bg-arca-alert" : "bg-arca-accent"}`} style={{ width: `${Math.min(100, assignedPercentage)}%` }} /></div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniMetric label="Asignado" value={money(assignedAmount, currency)} />
          <MiniMetric label="Sin asignar" value={money(unassignedAmount, currency)} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-text-primary">Tus destinos</h2>
            <p className="mt-1 text-[10px] text-arca-text-dim">Metas editables sobre el ingreso total.</p>
          </div>
          <button type="button" onClick={openNew} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-arca-accent"><Plus size={14} /> Agregar</button>
        </div>

        {allocations.length > 0 ? (
          <div className="space-y-3">
            {allocations.map((allocation) => {
              const persisted = data.allocations.find((item) => item.id === allocation.key);
              const targetAmount = income * (Number(allocation.percentage) / 100);
              const actualAmount = persisted?.actualAmount ?? 0;
              const utilization = targetAmount > 0 ? Math.round((actualAmount / targetAmount) * 100) : 0;
              const exceeded = actualAmount > targetAmount;
              const warning = !exceeded && utilization >= 80;
              return (
                <button type="button" key={allocation.key} onClick={() => { setEditingKey(allocation.key); setEditorOpen(true); }} className="w-full rounded-[22px] border border-arca-border bg-arca-surface-1 p-4 text-left transition-colors hover:bg-arca-surface-2/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <TypeIcon type={allocation.type} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-arca-text-primary">{allocation.name}</p>
                        <p className="mt-0.5 text-[10px] text-arca-text-dim">Meta {money(targetAmount, currency)} · {allocation.percentage}%</p>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[10px] font-black ${exceeded ? "text-arca-alert" : warning ? "text-arca-accent" : "text-arca-text-secondary"}`}>{utilization}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-arca-surface-3"><div className={`h-full rounded-full ${exceeded ? "bg-arca-alert" : warning ? "bg-arca-accent" : "bg-arca-positive"}`} style={{ width: `${Math.min(100, utilization)}%` }} /></div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[10px]">
                    <span className="text-arca-text-dim">Ejecutado {money(actualAmount, currency)}</span>
                    <span className={exceeded ? "font-bold text-arca-alert" : "text-arca-text-dim"}>{exceeded ? `Exceso ${money(actualAmount - targetAmount, currency)}` : `Quedan ${money(targetAmount - actualAmount, currency)}`}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-arca-border-strong bg-arca-surface-1/60 p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-arca-accent/10 text-arca-accent"><WalletCards size={22} /></span>
            <h3 className="mt-4 text-sm font-black text-arca-text-primary">Crea tu propia regla</h3>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-arca-text-secondary">Agrega porcentajes para gastos, gustos, ahorro, deudas o dinero libre.</p>
            <button type="button" onClick={openNew} className="mt-4 inline-flex h-10 items-center gap-2 rounded-2xl bg-arca-accent px-4 text-xs font-black text-[#15110c]"><Plus size={15} /> Primer destino</button>
          </div>
        )}
      </section>

      {assignedPercentage > 100 ? <p role="alert" className="rounded-2xl border border-arca-alert/25 bg-arca-alert/10 px-4 py-3 text-xs text-arca-alert">La distribución supera el 100%. Reduce {Math.round(assignedPercentage - 100)} puntos antes de guardarla.</p> : null}
      {error ? <p role="alert" className="rounded-2xl border border-arca-alert/25 bg-arca-alert/10 px-4 py-3 text-xs leading-5 text-arca-alert">{error}</p> : null}
      {saved ? <p className="rounded-2xl border border-arca-positive/25 bg-arca-positive/10 px-4 py-3 text-xs text-arca-positive">Tu plan quedó guardado.</p> : null}

      <button type="button" disabled={isPending || income <= 0 || assignedPercentage > 100 || !data.planAvailable} onClick={savePlan} className="flex h-13 w-full items-center justify-center rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] disabled:cursor-not-allowed disabled:opacity-45">{isPending ? "Guardando…" : "Guardar plan mensual"}</button>

      <aside className="rounded-[24px] border border-arca-accent/25 bg-arca-accent/[0.06] p-5">
        <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><Sparkles size={17} /></span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-arca-accent">Planifica con Nova</p><p className="mt-2 text-xs leading-5 text-arca-text-secondary">Puedo proponerte porcentajes según tus ingresos, compromisos y movimientos recientes.</p></div></div>
        <button type="button" onClick={() => onOpenNova(`Ayúdame a crear una distribución porcentual para ${data.monthLabel}. Mi ingreso base es ${money(income, currency)} y quiero equilibrar gastos, ahorro, deudas y dinero libre.`)} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-arca-accent/30 text-xs font-black text-arca-accent">Crear propuesta con Nova <ArrowRight size={15} /></button>
      </aside>

      {editorOpen ? (
        <AllocationEditor
          allocation={allocations.find((allocation) => allocation.key === editingKey) ?? null}
          categories={data.categoryOptions}
          onClose={() => setEditorOpen(false)}
          onDelete={editingKey ? () => { setAllocations((current) => current.filter((allocation) => allocation.key !== editingKey)); setEditorOpen(false); } : undefined}
          onSave={(allocation) => {
            setAllocations((current) => editingKey
              ? current.map((item) => item.key === editingKey ? { ...allocation, key: editingKey } : item)
              : [...current, { ...allocation, key: crypto.randomUUID() }]);
            setEditorOpen(false);
            setSaved(false);
          }}
        />
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-arca-border bg-arca-surface-2/60 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-arca-text-dim">{label}</p><p className="mt-1 text-sm font-black text-arca-text-primary">{value}</p></div>;
}

function TypeIcon({ type }: { type: MonthlyAllocationType }) {
  const Icon = type === "saving" ? PiggyBank : type === "debt" ? Landmark : type === "free" ? WalletCards : ReceiptText;
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent/[0.09] text-arca-accent"><Icon size={18} /></span>;
}

function AllocationEditor({ allocation, categories, onClose, onSave, onDelete }: { allocation: DraftAllocation | null; categories: string[]; onClose: () => void; onSave: (allocation: MonthlyPlanAllocationInput) => void; onDelete?: () => void }) {
  const [name, setName] = useState(allocation?.name ?? "");
  const [type, setType] = useState<MonthlyAllocationType>(allocation?.type ?? "expense");
  const [percentage, setPercentage] = useState(String(allocation?.percentage ?? ""));
  const [trackingCategory, setTrackingCategory] = useState(allocation?.trackingCategory ?? "");
  const valid = name.trim() && inputNumber(percentage) > 0 && inputNumber(percentage) <= 100;

  return (
    <div className="fixed inset-0 z-[110] flex items-end bg-black/65 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={allocation ? "Editar destino" : "Nuevo destino"}>
      <div className="mx-auto w-full max-w-md rounded-t-[30px] border border-arca-border-strong bg-arca-base p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-arca-accent">{allocation ? "Editar destino" : "Nuevo destino"}</p><h2 className="mt-1 text-xl font-black text-arca-text-primary">Define tu meta</h2></div><button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-dim"><X size={18} /></button></div>
        <div className="mt-6 space-y-4">
          <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-arca-text-dim">Nombre</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Alimentación" className="h-12 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-4 text-sm font-bold outline-none focus:border-arca-accent" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-arca-text-dim">Tipo</span><select value={type} onChange={(event) => setType(event.target.value as MonthlyAllocationType)} className="h-12 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-3 text-sm font-bold outline-none">{TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-arca-text-dim">Porcentaje</span><div className="flex h-12 items-center rounded-2xl border border-arca-border bg-arca-surface-1 px-4"><input value={percentage} onChange={(event) => setPercentage(event.target.value)} inputMode="decimal" className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none" placeholder="20" /><span className="font-black text-arca-accent">%</span></div></label>
          </div>
          {type !== "free" ? <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-arca-text-dim">Categoría para medir <span className="normal-case tracking-normal">(opcional)</span></span><select value={trackingCategory} onChange={(event) => { setTrackingCategory(event.target.value); if (!name.trim() && event.target.value) setName(event.target.value); }} className="h-12 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-3 text-sm font-bold outline-none"><option value="">Todas las del tipo</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label> : null}
        </div>
        <div className="mt-6 flex gap-3">{onDelete ? <button type="button" onClick={onDelete} aria-label="Eliminar destino" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-arca-alert/25 text-arca-alert"><Trash2 size={18} /></button> : null}<button type="button" disabled={!valid} onClick={() => onSave({ name, type, percentage: inputNumber(percentage), trackingCategory: type === "free" ? null : trackingCategory || null })} className="h-12 flex-1 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] disabled:opacity-45">Guardar destino</button></div>
      </div>
    </div>
  );
}
