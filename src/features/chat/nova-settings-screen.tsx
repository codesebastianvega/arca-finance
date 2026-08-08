"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Sparkles,
  Bot,
  Zap,
  CalendarClock,
  Bell,
  BadgeDollarSign,
  MessageCircle,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { NovaLiquidOrb } from "@/src/components/nova-liquid-orb";
import { haptics } from "@/src/lib/haptics";
import {
  DEFAULT_NOVA_PREFERENCES,
  NOVA_PREFERENCES_KEY,
  normalizeNovaPreferences,
  type NovaPreferences,
} from "@/src/lib/nova-preferences";

const QUICK_PROMPTS = [
  {
    emoji: "📊",
    title: "Revisa mis gastos del mes",
    subtitle: "Análisis detallado de compras y categorías",
    prompt: "Revisa mis gastos del mes y dime cómo voy",
    tag: "Análisis",
  },
  {
    emoji: "💰",
    title: "¿Cuánto puedo gastar esta semana?",
    subtitle: "Cálculo de caja disponible sin afectar pagos",
    prompt: "¿Cuánto puedo gastar esta semana sin afectar mis pagos?",
    tag: "Caja Libre",
  },
  {
    emoji: "📅",
    title: "¿Qué pagos tengo pendientes?",
    subtitle: "Resumen de facturas, cuotas y servicios próximos",
    prompt: "¿Qué pagos tengo pendientes?",
    tag: "Agenda",
  },
  {
    emoji: "🏦",
    title: "Programa un pago nuevo",
    subtitle: "Asistencia paso a paso para agendar compromisos",
    prompt: "Quiero programar un pago",
    tag: "Acción",
  },
  {
    emoji: "📈",
    title: "Analiza mis ingresos vs gastos",
    subtitle: "Comparativa de flujo operativo y ahorros",
    prompt: "Analiza mis ingresos vs mis gastos de este mes",
    tag: "Balance",
  },
  {
    emoji: "🎯",
    title: "Plan de ahorro del mes",
    subtitle: "Sugerencia de metas y bolsillos de protección",
    prompt: "Ayúdame a crear un plan para ahorrar dinero este mes",
    tag: "Estrategia",
  },
  {
    emoji: "💡",
    title: "3 Tips para recortar gastos hoy",
    subtitle: "Recomendaciones prioritarias de optimización",
    prompt: "Dame 3 sugerencias concretas para recortar gastos hoy",
    tag: "Tips",
  },
];

export function NovaSettingsScreen({
  onBack,
  onOpenNova,
}: {
  onBack: () => void;
  onOpenNova: (prompt?: string) => void;
}) {
  const [novaPreferences, setNovaPreferences] = useState<NovaPreferences>(DEFAULT_NOVA_PREFERENCES);

  useEffect(() => {
    try {
      const storedNovaPreferences = window.localStorage.getItem(NOVA_PREFERENCES_KEY);
      if (storedNovaPreferences) {
        setNovaPreferences(normalizeNovaPreferences(JSON.parse(storedNovaPreferences)));
      }
    } catch {
      // Use defaults if storage unavailable
    }
  }, []);

  const updateNovaPreferences = (next: Partial<NovaPreferences>) => {
    haptics.light();
    setNovaPreferences((current) => {
      const updated = { ...current, ...next };
      try {
        window.localStorage.setItem(NOVA_PREFERENCES_KEY, JSON.stringify(updated));
      } catch {
        // UI fallback
      }
      return updated;
    });
  };

  const handleTriggerPrompt = (prompt: string) => {
    haptics.medium();
    onOpenNova(prompt);
  };

  return (
    <div className="flex flex-col gap-5 font-sans w-full pb-24">
      {/* Header */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            haptics.light();
            onBack();
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-arca-border bg-arca-surface-2 text-arca-text-primary transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-arca-text-primary">
            Nova AI & Herramientas
          </h1>
          <p className="text-xs font-semibold text-arca-text-dim">
            Prompts rápidos, autonomía y configuración de Nova
          </p>
        </div>
      </header>

      {/* Nova Live Card */}
      <div className="relative overflow-hidden rounded-[26px] border border-arca-accent/40 bg-gradient-to-r from-amber-500/15 via-arca-surface-1 to-purple-600/15 p-5 shadow-xl">
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex shrink-0 items-center justify-center rounded-2xl border border-arca-accent/40 bg-arca-surface-2 p-2 shadow-inner">
            <NovaLiquidOrb size={48} isThinking={true} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-arca-accent">
                Nova Copiloto AI
              </span>
              <span className="rounded-full bg-arca-accent/20 px-2 py-0.5 text-[9px] font-extrabold text-arca-accent border border-arca-accent/30">
                En línea ✦
              </span>
            </div>
            <h2 className="mt-1 text-sm font-black text-arca-text-primary">
              ¿En qué trabajamos hoy?
            </h2>
            <p className="mt-0.5 text-xs text-arca-text-secondary leading-relaxed">
              Selecciona un prompt de análisis o configura la autonomía de Nova.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onOpenNova();
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-arca-accent py-3 text-xs font-black uppercase tracking-wider text-black active:scale-95 transition-transform shadow-md"
        >
          <Sparkles size={16} /> Abrir Chat de Nova
        </button>
      </div>

      {/* --- PROMPTS RÁPIDOS & ACCIONES REUTILIZABLES --- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-arca-accent">
            <Zap size={16} />
            <h3 className="text-xs font-black uppercase tracking-wider">Prompts Rápidos</h3>
          </div>
          <span className="text-[10px] font-bold text-arca-text-dim">Toca uno para lanzar a Nova</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => handleTriggerPrompt(item.prompt)}
              className="group flex items-start gap-3.5 rounded-2xl border border-arca-border bg-arca-surface-1 p-3.5 text-left transition-all hover:border-arca-accent/50 hover:bg-arca-surface-2 active:scale-[0.98] shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-surface-2 text-xl shadow-inner group-hover:scale-110 transition-transform">
                {item.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-black text-arca-text-primary group-hover:text-arca-accent transition-colors truncate">
                    {item.title}
                  </span>
                  <span className="rounded-full bg-arca-surface-2 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-arca-text-dim shrink-0">
                    {item.tag}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-arca-text-secondary line-clamp-1">
                  {item.subtitle}
                </p>
              </div>
              <ChevronRight size={15} className="text-arca-text-dim group-hover:translate-x-0.5 transition-transform self-center" />
            </button>
          ))}
        </div>
      </section>

      {/* --- CÓMO TRABAJA NOVA (CONFIGURACIÓN CENTRAL UNIFICADA) --- */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-arca-accent px-1">
          <Bot size={16} />
          <h3 className="text-xs font-black uppercase tracking-wider">Cómo trabaja Nova</h3>
        </div>

        <div className="overflow-hidden rounded-3xl border border-arca-border bg-arca-surface-1 shadow-sm">
          {/* Autonomía */}
          <div className="border-b border-arca-border p-4">
            <p className="text-xs font-black text-arca-text-primary">Nivel de autonomía</p>
            <p className="mt-1 text-[10px] leading-relaxed text-arca-text-dim">
              Elige cuánto puede avanzar Nova antes de pedirte confirmación.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-arca-surface-2 p-1">
              {(
                [
                  ["guide", "Orienta"],
                  ["prepare", "Prepara"],
                  ["execute", "Ejecuta"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateNovaPreferences({ autonomy: value })}
                  className={`rounded-xl px-2 py-2.5 text-[10px] font-bold transition-all ${
                    novaPreferences.autonomy === value
                      ? "bg-arca-accent text-black font-black shadow-sm"
                      : "text-arca-text-dim hover:text-arca-text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-arca-text-dim">
              {novaPreferences.autonomy === "guide" && "Nova recomienda y tú realizas cada acción."}
              {novaPreferences.autonomy === "prepare" && "Nova deja las acciones listas para que las confirmes."}
              {novaPreferences.autonomy === "execute" && "Nova ejecuta tareas seguras; el dinero siempre requiere confirmación."}
            </p>
          </div>

          {/* Toggles */}
          <PreferenceToggleRow
            icon={CalendarClock}
            label="Resumen semanal"
            description="Prioridades, vencimientos y saldo esperado"
            checked={novaPreferences.weeklySummary}
            onChange={() => updateNovaPreferences({ weeklySummary: !novaPreferences.weeklySummary })}
          />
          <PreferenceToggleRow
            icon={Bell}
            label="Alertas de vencimiento"
            description="Avisos antes de que un pago se atrase"
            checked={novaPreferences.dueReminders}
            onChange={() => updateNovaPreferences({ dueReminders: !novaPreferences.dueReminders })}
          />
          <PreferenceToggleRow
            icon={BadgeDollarSign}
            label="Auto-confirmar ingresos esperados"
            description="Ingresa el dinero automáticamente el día del cobro previsto"
            checked={novaPreferences.autoConfirmIncomes}
            onChange={() => updateNovaPreferences({ autoConfirmIncomes: !novaPreferences.autoConfirmIncomes })}
          />

          {/* Movimientos de dinero */}
          <div className="flex items-center justify-between border-t border-arca-border px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-secondary">
                <BadgeDollarSign size={17} />
              </div>
              <div>
                <p className="text-xs font-semibold text-arca-text-primary">Movimientos de dinero</p>
                <p className="text-[9px] text-arca-text-dim">Pagos y transferencias</p>
              </div>
            </div>
            <span className="rounded-full bg-arca-positive/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-arca-positive border border-arca-positive/20">
              Siempre confirma
            </span>
          </div>

          {/* Estilo de respuesta */}
          <div className="border-t border-arca-border p-4">
            <div className="mb-2.5 flex items-center gap-2 text-xs font-black text-arca-text-primary">
              <MessageCircle size={15} className="text-arca-accent" /> Estilo de respuesta
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["clear", "Claro"],
                  ["brief", "Breve"],
                  ["coach", "Consejero"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateNovaPreferences({ tone: value })}
                  className={`rounded-xl border px-2 py-2.5 text-[10px] font-extrabold transition-all ${
                    novaPreferences.tone === value
                      ? "border-arca-accent bg-arca-accent/15 text-arca-accent shadow-sm"
                      : "border-arca-border bg-arca-surface-2 text-arca-text-dim hover:text-arca-text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PreferenceToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: any;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-arca-border px-4 py-3.5">
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-secondary">
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-arca-text-primary truncate">{label}</p>
          <p className="text-[9px] leading-tight text-arca-text-dim">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
          checked ? "bg-arca-accent" : "bg-arca-surface-3"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
