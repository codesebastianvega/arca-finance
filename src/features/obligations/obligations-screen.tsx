import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, CheckCircle2, CircleSlash2, PencilLine, X } from "lucide-react";
import { adjustAndConfirmScheduledEvent, cancelScheduledEvent, confirmScheduledEventNow, updateScheduledObligation } from "@/app/actions";
import type { ObligationFilter, ObligationItem, ObligationsViewModel } from "@/src/lib/obligations-types";
import { canEditObligation, filterObligations } from "@/src/lib/obligations-types";
import { haptics } from "../../lib/haptics";

export default function ObligationsScreen({ data }: { data: ObligationsViewModel }) {
  const router = useRouter();
  const [filter, setFilter] = useState<ObligationFilter>("todo");
  const [selectedEntity, setSelectedEntity] = useState<ObligationItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDate, setAdjustDate] = useState("");
  const [adjustAccountId, setAdjustAccountId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [mode, setMode] = useState<"gastos" | "ingresos">("gastos");

  const items = useMemo(() => {
    const baseFiltered = filterObligations(data.items, filter);
    return baseFiltered.filter((item) => (mode === "gastos" ? item.kind !== "income" : item.kind === "income"));
  }, [data.items, filter, mode]);
  const hasData = items.length > 0;

  const chips = [
    { id: "vencido", label: "Vencido" },
    { id: "semana", label: "Esta semana" },
    { id: "mes", label: "Este mes" },
    { id: "todo", label: "Todo" },
  ] as const;

  const openEntity = (item: ObligationItem) => {
    setActionError(null);
    setIsAdjusting(false);
    setIsEditing(false);
    setAdjustAmount(String(item.amount));
    setAdjustDate(new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }));
    setAdjustAccountId(item.accountId ?? item.suggestedAccountId ?? data.accountOptions[0]?.id ?? "");
    setEditTitle(item.name);
    setEditAmount(String(item.amount));
    setEditDueDate(item.dueDate);
    setEditAccountId(item.accountId ?? item.suggestedAccountId ?? data.accountOptions[0]?.id ?? "");
    setEditNotes(item.notes ?? "");
    setSelectedEntity(item);
    setIsEditModalOpen(true);
    haptics.medium();
  };

  const closeEntity = () => {
    setSelectedEntity(null);
    setIsEditModalOpen(false);
    setActionError(null);
    setIsAdjusting(false);
    setIsEditing(false);
    setAdjustAmount("");
    setAdjustDate("");
    setAdjustAccountId("");
    setEditTitle("");
    setEditAmount("");
    setEditDueDate("");
    setEditAccountId("");
    setEditNotes("");
  };

  const handleConfirm = () => {
    if (!selectedEntity) return;
    setIsAdjusting(true);
  };

  const handleCancel = () => {
    if (!selectedEntity) return;
    setActionError(null);
    setPendingActionId(selectedEntity.id);
    startTransition(async () => {
      try {
        await cancelScheduledEvent(selectedEntity.id);
        haptics.success();
        router.refresh();
        closeEntity();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "No se pudo cancelar la obligación.");
        haptics.error();
      } finally {
        setPendingActionId(null);
      }
    });
  };

  const handleAdjustConfirm = () => {
    if (!selectedEntity) return;
    setActionError(null);
    setPendingActionId(selectedEntity.id);
    startTransition(async () => {
      try {
        await adjustAndConfirmScheduledEvent({
          eventId: selectedEntity.id,
          amount: Number(adjustAmount),
          effectiveDate: adjustDate,
          accountId: adjustAccountId || undefined,
        });
        haptics.success();
        closeEntity();
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "No se pudo confirmar la obligación con ajuste.");
        haptics.error();
      } finally {
        setPendingActionId(null);
      }
    });
  };

  const handleSaveEdit = () => {
    if (!selectedEntity || !canEditObligation(selectedEntity)) return;
    setActionError(null);
    setPendingActionId(selectedEntity.id);
    startTransition(async () => {
      try {
        await updateScheduledObligation({
          id: selectedEntity.id,
          title: editTitle,
          amount: Number(editAmount),
          dueDate: editDueDate,
          accountId: editAccountId || null,
          notes: editNotes || null,
        });
        haptics.success();
        closeEntity();
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "No se pudo guardar la obligación.");
        haptics.error();
      } finally {
        setPendingActionId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-arca-surface-2 light:bg-arca-light-surface-2 p-1 rounded-2xl">
        <button
          onClick={() => setMode("gastos")}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
            mode === "gastos"
              ? "bg-arca-accent light:bg-arca-light-accent text-white shadow-sm"
              : "text-arca-text-dim hover:text-arca-text-primary light:hover:text-arca-light-text-primary"
          }`}
        >
          Gastos (Por pagar)
        </button>
        <button
          onClick={() => setMode("ingresos")}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
            mode === "ingresos"
              ? "bg-arca-accent light:bg-arca-light-accent text-white shadow-sm"
              : "text-arca-text-dim hover:text-arca-text-primary light:hover:text-arca-light-text-primary"
          }`}
        >
          Ingresos (Por cobrar)
        </button>
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
        {chips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setFilter(chip.id)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
              filter === chip.id
                ? "bg-arca-accent light:bg-arca-light-accent text-white border-transparent"
                : "bg-arca-surface-2 light:bg-arca-light-surface-2 text-arca-text-dim border-arca-border light:border-arca-light-border"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="py-20 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-arca-surface-2 flex items-center justify-center border border-arca-border">
            <CheckCircle2 size={32} className="text-arca-positive opacity-30" />
          </div>
          <div>
            <p className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary uppercase tracking-widest">Al día</p>
            <p className="text-xs text-arca-text-dim mt-1">
              {mode === "gastos" ? "No tienes gastos pendientes por ahora." : "No tienes ingresos por cobrar por ahora."}
            </p>
          </div>
        </div>
      ) : (
        <div className="card-arca overflow-hidden divide-y divide-arca-border light:divide-arca-light-border">
          {items.map((item) => (
            <motion.div
              key={item.id}
              whileTap={{ scale: 0.985 }}
              onClick={() => openEntity(item)}
              className="flex items-center px-4 py-3.5 relative overflow-hidden cursor-pointer active:bg-arca-surface-2"
            >
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  item.priority === "high" ? "bg-arca-alert" : item.priority === "medium" ? "bg-arca-accent" : "bg-arca-positive"
                }`}
              />

              <div className="flex-1 ml-1 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  {item.status === "overdue" ? (
                    <AlertCircle size={16} className="text-arca-alert" />
                  ) : item.status === "today" ? (
                    <Clock size={16} className="text-arca-accent" />
                  ) : (
                    <CheckCircle2 size={16} className="text-arca-text-dim" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-arca-text-primary light:text-arca-light-text-primary">{item.name}</p>
                      {item.groupedOccurrences > 1 ? (
                        <span className="rounded-full bg-arca-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-arca-accent">
                          {item.groupedOccurrences} pagos
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] font-medium text-arca-text-dim">{item.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary">
                    {item.amountLabel}
                  </p>
                  {item.status === "overdue" ? <p className="text-[9px] font-bold uppercase tracking-widest text-arca-alert/80 mt-0.5">Atrasado</p> : null}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isEditModalOpen && selectedEntity && (
          <div className="fixed inset-0 z-[550] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeEntity}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-arca-surface-1 rounded-t-[32px] p-8 space-y-6 pb-12 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-arca-border rounded-full mx-auto" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-arca-text-primary uppercase tracking-tight">Gestionar {selectedEntity.name}</h3>
                  <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">
                    {selectedEntity.groupedOccurrences > 1
                      ? `${selectedEntity.groupedOccurrences} ocurrencias agrupadas`
                      : selectedEntity.kind === 'income' ? 'Ingreso programado' : 'Obligación financiera'}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedEntity.kind === 'income' ? 'bg-arca-positive/10 text-arca-positive' : 'bg-arca-alert/10 text-arca-alert'}`}>
                  {selectedEntity.kind === 'income' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Nombre</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-14 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 text-sm font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent"
                    />
                  ) : (
                    <div className="w-full min-h-14 px-4 py-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-bold text-arca-text-primary">
                      {selectedEntity.name}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Monto</label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="h-14 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 text-sm font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      />
                    ) : (
                      <div className="w-full min-h-14 px-4 py-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-bold text-arca-text-primary">
                        {selectedEntity.amountLabel}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Fecha</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="h-14 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 text-sm font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      />
                    ) : (
                      <div className="w-full min-h-14 px-4 py-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-bold text-arca-text-primary">
                        {selectedEntity.date}
                      </div>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Cuenta sugerida</label>
                    <select
                      value={editAccountId}
                      onChange={(e) => setEditAccountId(e.target.value)}
                      className="h-14 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
                    >
                      <option value="">Sin cuenta ligada</option>
                      {data.accountOptions.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {isEditing || selectedEntity.notes ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Notas</label>
                    {isEditing ? (
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 py-3 text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      />
                    ) : (
                      <div className="w-full min-h-14 px-4 py-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm text-arca-text-secondary">
                        {selectedEntity.notes}
                      </div>
                    )}
                  </div>
                ) : null}

                {isAdjusting ? (
                  <div className="space-y-3 rounded-2xl border border-arca-border bg-arca-surface-2/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Confirmar con ajuste</p>
                      <button type="button" onClick={() => setIsAdjusting(false)} className="text-arca-text-dim">
                        <X size={16} />
                      </button>
                    </div>
                    <label className="block space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Monto real pagado</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        className="h-12 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Fecha real de pago</span>
                      <input
                        type="date"
                        value={adjustDate}
                        onChange={(e) => setAdjustDate(e.target.value)}
                        className="h-12 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Cuenta real</span>
                      <select
                        value={adjustAccountId}
                        onChange={(e) => setAdjustAccountId(e.target.value)}
                        className="h-12 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      >
                        {data.accountOptions.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}

                {actionError ? <div className="text-xs text-arca-alert">{actionError}</div> : null}

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={closeEntity}
                    disabled={isPending && pendingActionId === selectedEntity.id}
                    className="h-14 bg-arca-surface-2 text-arca-text-dim rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2 border border-arca-border disabled:opacity-60"
                  >
                    <X size={14} />
                    <span>Cerrar</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isPending && pendingActionId === selectedEntity.id}
                    className="h-14 bg-arca-alert/10 text-arca-alert rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2 border border-arca-alert/20 disabled:opacity-60"
                  >
                    <CircleSlash2 size={14} />
                    <span>Anular</span>
                  </button>
                  <button
                    onClick={
                      isEditing
                        ? handleSaveEdit
                        : isAdjusting
                          ? handleAdjustConfirm
                          : () => {
                              if (canEditObligation(selectedEntity)) {
                                setIsEditing(true);
                              } else {
                                setActionError("Esta obligación está agrupada por plantilla. Ajusta o confirma una ocurrencia desde Hoy.");
                              }
                            }
                    }
                    disabled={isPending && pendingActionId === selectedEntity.id}
                    className="h-14 bg-arca-surface-2 text-arca-text-secondary rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2 border border-arca-border disabled:opacity-60"
                  >
                    <PencilLine size={14} />
                    <span>{isEditing ? "Guardar" : isAdjusting ? "Guardar ajuste" : "Editar"}</span>
                  </button>
                  <button
                    onClick={isEditing ? () => setIsEditing(false) : isAdjusting ? () => setIsAdjusting(false) : handleConfirm}
                    disabled={isPending && pendingActionId === selectedEntity.id}
                    className="h-14 bg-arca-accent text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-arca-accent/20 disabled:opacity-60"
                  >
                    {isPending && pendingActionId === selectedEntity.id ? "Procesando..." : isEditing ? "Seguir" : isAdjusting ? "Volver" : "Confirmar"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
