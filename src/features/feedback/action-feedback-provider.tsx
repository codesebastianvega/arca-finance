"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, X } from "lucide-react";

type FeedbackState = { phase: "idle" | "pending" | "success" | "error"; title: string; detail?: string };
type ActionFeedbackValue = {
  start: (title: string, detail?: string) => void;
  succeed: (title: string, detail?: string) => void;
  fail: (title: string, detail?: string) => void;
  clear: () => void;
};

const ActionFeedbackContext = createContext<ActionFeedbackValue | null>(null);

export function useActionFeedback() {
  const value = useContext(ActionFeedbackContext);
  if (!value) throw new Error("useActionFeedback debe usarse dentro de ActionFeedbackProvider.");
  return value;
}

export function ActionFeedbackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FeedbackState>({ phase: "idle", title: "" });
  const [showPending, setShowPending] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => clearTimer(), []);

  const clear = () => {
    clearTimer();
    setShowPending(false);
    setState({ phase: "idle", title: "" });
  };

  const start = (title: string, detail?: string) => {
    clearTimer();
    setShowPending(false);
    setState({ phase: "pending", title, detail });
    timerRef.current = window.setTimeout(() => setShowPending(true), 180);
  };

  const finish = (phase: "success" | "error", title: string, detail?: string) => {
    clearTimer();
    setShowPending(false);
    setState({ phase, title, detail });
    timerRef.current = window.setTimeout(clear, phase === "success" ? 2200 : 7000);
  };

  const value: ActionFeedbackValue = {
    start,
    succeed: (title, detail) => finish("success", title, detail),
    fail: (title, detail) => finish("error", title, detail),
    clear,
  };

  return (
    <ActionFeedbackContext.Provider value={value}>
      {children}
      {state.phase === "pending" && showPending ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="w-full max-w-xs rounded-[26px] border border-arca-accent/25 bg-arca-surface-1 p-6 text-center shadow-2xl">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-arca-accent/10 text-arca-accent"><LoaderCircle className="animate-spin" size={27} /></span>
            <p className="mt-4 text-base font-black text-arca-text-primary">{state.title}</p>
            <p className="mt-1 text-[11px] leading-5 text-arca-text-dim">{state.detail ?? "Estamos actualizando tu información financiera."}</p>
          </div>
        </div>
      ) : null}
      {state.phase === "success" || state.phase === "error" ? (
        <div className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[9999] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-arca-border bg-arca-surface-1/95 p-4 shadow-2xl backdrop-blur-xl" role={state.phase === "error" ? "alert" : "status"} aria-live="polite">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${state.phase === "success" ? "bg-arca-positive/10 text-arca-positive" : "bg-arca-alert/10 text-arca-alert"}`}>{state.phase === "success" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</span>
          <div className="min-w-0 flex-1"><p className="text-sm font-black text-arca-text-primary">{state.title}</p>{state.detail ? <p className="mt-1 text-[10px] leading-4 text-arca-text-dim">{state.detail}</p> : null}</div>
          <button type="button" onClick={clear} aria-label="Cerrar mensaje" className="text-arca-text-dim"><X size={16} /></button>
        </div>
      ) : null}
    </ActionFeedbackContext.Provider>
  );
}
