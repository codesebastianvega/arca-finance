import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, CheckCircle2, CircleSlash2, PencilLine, X } from "lucide-react";
import { adjustAndConfirmScheduledEvent, cancelScheduledEvent, confirmScheduledEventNow, updateScheduledObligation } from "@/app/actions";
import type { ObligationFilter, ObligationItem, ObligationsViewModel } from "@/src/lib/obligations-types";
import { canEditObligation, filterObligations } from "@/src/lib/obligations-types";
import { haptics } from "../../lib/haptics";

import { ObligationActionModal } from "./components/obligation-action-modal";

export default function ObligationsScreen({ data }: { data: ObligationsViewModel }) {
  const router = useRouter();
  const [filter, setFilter] = useState<ObligationFilter>("todo");
  const [selectedEntity, setSelectedEntity] = useState<ObligationItem | null>(null);
  const [mode, setMode] = useState<"gastos" | "ingresos">("gastos");

  const items = useMemo(() => {
    const baseFiltered = filterObligations(data.items, filter);
    return baseFiltered.filter((item) => (mode === "gastos" ? item.kind !== "income" : item.kind === "income"));
  }, [data.items, filter, mode]);
  const hasData = items.length > 0;

  const totalFilteredAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }, [items]);

  const chips = [
    { id: "vencido", label: "Vencido" },
    { id: "semana", label: "Esta semana" },
    { id: "mes", label: "Este mes" },
    { id: "todo", label: "Todo" },
  ] as const;

  const openEntity = (item: ObligationItem) => {
    setSelectedEntity(item);
    haptics.medium();
  };

  const closeEntity = () => {
    setSelectedEntity(null);
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

      {hasData && (
        <div className="bg-arca-surface-1 light:bg-white rounded-2xl p-4 shadow-sm border border-arca-border light:border-arca-light-border flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">
              Total {mode === "gastos" ? "por pagar" : "por cobrar"}
            </p>
            <p className="text-xl font-bold text-arca-text-primary light:text-arca-light-text-primary mt-0.5">
              ${new Intl.NumberFormat("es-CO").format(totalFilteredAmount)}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === "gastos" ? "bg-arca-alert/10 text-arca-alert" : "bg-arca-positive/10 text-arca-positive"}`}>
            {mode === "gastos" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          </div>
        </div>
      )}

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

      <ObligationActionModal
        obligation={selectedEntity}
        accounts={data.accountOptions}
        onClose={closeEntity}
        onRefresh={() => router.refresh()}
      />
    </div>
  );
}
