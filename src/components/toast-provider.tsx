"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { haptics } from "@/src/lib/haptics";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastMessage = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
};

type ToastContextType = {
  addToast: (type: ToastType, title: string, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let globalAddToast: ((type: ToastType, title: string, description?: string, duration?: number) => void) | null = null;

export const toast = {
  success: (title: string, description?: string, duration?: number) => {
    haptics.light();
    globalAddToast?.("success", title, description, duration);
  },
  error: (title: string, description?: string, duration?: number) => {
    haptics.medium();
    globalAddToast?.("error", title, description, duration);
  },
  info: (title: string, description?: string, duration?: number) => {
    haptics.light();
    globalAddToast?.("info", title, description, duration);
  },
  warning: (title: string, description?: string, duration?: number) => {
    haptics.medium();
    globalAddToast?.("warning", title, description, duration);
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, description?: string, duration = 3500) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-2), { id, type, title, description, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="pointer-events-none fixed top-4 sm:top-6 inset-x-0 z-[9999] flex flex-col items-center gap-2 px-4">
        <AnimatePresence mode="sync">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-arca-border bg-arca-surface-1/95 p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl light:border-arca-light-border light:bg-arca-light-surface-1"
            >
              <span className="mt-0.5 shrink-0">
                {t.type === "success" && <CheckCircle2 size={18} className="text-arca-positive" />}
                {t.type === "error" && <AlertCircle size={18} className="text-arca-alert" />}
                {t.type === "info" && <Info size={18} className="text-arca-accent" />}
                {t.type === "warning" && <AlertTriangle size={18} className="text-amber-400" />}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-black leading-tight text-arca-text-primary light:text-arca-light-text-primary">
                  {t.title}
                </p>
                {t.description && (
                  <p className="mt-0.5 text-[11px] text-arca-text-secondary light:text-arca-light-text-secondary">
                    {t.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded-full p-1 text-arca-text-dim hover:bg-arca-surface-2 hover:text-arca-text-primary"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider");
  }
  return context;
}
