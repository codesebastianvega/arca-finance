"use client";

import { useState } from "react";
import { CheckCircle2, Download, Share, Sparkles } from "lucide-react";
import { usePwa } from "./pwa-provider";

export function PwaInstallCard() {
  const { canInstall, install, isIOS, isInstalled } = usePwa();
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  if (isInstalled || !canInstall) return null;

  const handleInstall = async () => {
    const result = await install();
    if (result === "ios") setShowIOSSteps(true);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-arca-accent/30 bg-arca-accent/[0.06] p-5">
      <div aria-hidden="true" className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-arca-accent/10 blur-3xl" />
      <div className="relative z-10 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-arca-accent/25 bg-arca-accent/10 text-arca-accent">
          <Download size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-arca-accent">
            <Sparkles size={11} />
            Experiencia móvil
          </div>
          <h3 className="mt-1 text-base font-black text-arca-text-primary">Instala Arca</h3>
          <p className="mt-1 text-xs leading-relaxed text-arca-text-secondary">
            Ábrela como una app, sin barra del navegador y con acceso directo desde tu inicio.
          </p>
        </div>
      </div>

      {showIOSSteps ? (
        <div className="relative z-10 mt-4 rounded-2xl border border-arca-border bg-arca-surface-1/70 p-3">
          <p className="flex items-center gap-2 text-xs font-bold text-arca-text-primary">
            <Share className="text-arca-accent" size={15} />
            En Safari: Compartir → Agregar a inicio
          </p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-arca-text-dim">Apple requiere este último paso manual. Después Arca abrirá en pantalla completa.</p>
        </div>
      ) : (
        <button type="button" onClick={() => void handleInstall()} className="relative z-10 mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-xs font-black text-[#15110c]">
          {isIOS ? <Share size={16} /> : <Download size={16} />}
          {isIOS ? "Ver cómo instalar" : "Instalar en este dispositivo"}
        </button>
      )}

      <div className="relative z-10 mt-3 flex items-center gap-1.5 text-[9px] text-arca-text-dim">
        <CheckCircle2 className="text-arca-positive" size={12} />
        Tus datos siguen protegidos y requieren conexión.
      </div>
    </section>
  );
}
