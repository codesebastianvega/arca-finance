function formatCOP(amount: number | null | undefined): string {
  if (amount == null) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface Props {
  cash: {
    safeToSpend: number;
    totalBalance: number;
    protectedSavings: number;
    pendingCritical: number;
  };
}

export function CajaLibreProposals({ cash }: Props) {
  return (
    <div className="flex flex-col gap-8 mt-10">
      <h2 className="text-xl font-bold text-arca-accent text-center uppercase tracking-widest">5 Propuestas de Caja Libre</h2>

      {/* PROPUESTA 1: Credit Card Glassmorphism */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-arca-text-secondary">Propuesta 1: Credit Card Glass</span>
        <div className="relative overflow-hidden rounded-2xl p-5 border border-arca-border/50 shadow-lg"
             style={{
               background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%)",
               backdropFilter: "blur(10px)"
             }}>
          {/* Decorative elements */}
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-arca-accent rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-arca-positive rounded-full opacity-20 blur-3xl"></div>
          
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-bold tracking-widest text-arca-text-secondary/70 uppercase">Caja Libre</span>
            <div className="w-8 h-5 rounded bg-arca-surface-3 flex items-center justify-center opacity-70 border border-arca-border/30">
              <div className="w-4 h-3 border border-arca-border/40 rounded-sm"></div>
            </div>
          </div>
          
          <div className="mb-6 relative z-10">
            <div className="text-[10px] font-medium text-arca-text-secondary mb-1">Disponible para gastar</div>
            <div className={`text-4xl font-bold tracking-tight ${cash.safeToSpend > 0 ? "text-white" : "text-arca-alert"} drop-shadow-md`}>
              {formatCOP(cash.safeToSpend)}
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-white/5 pt-3 relative z-10">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-widest text-arca-text-secondary">Balance Total</span>
              <span className="text-xs font-bold text-white/90">{formatCOP(cash.totalBalance)}</span>
            </div>
            {cash.protectedSavings > 0 && (
              <div className="flex flex-col gap-1 items-end">
                <span className="text-[9px] uppercase tracking-widest text-arca-positive/80">Bolsillos</span>
                <span className="text-xs font-bold text-arca-positive">−{formatCOP(cash.protectedSavings)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PROPUESTA 2: Minimal Neón Outline */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-arca-text-secondary">Propuesta 2: Minimal Neón</span>
        <div className="rounded-2xl p-5 border border-arca-accent/40 bg-transparent relative overflow-hidden group">
          <div className="absolute inset-0 bg-arca-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="flex flex-col gap-1 mb-4">
            <span className="text-[10px] font-bold tracking-widest text-arca-accent uppercase">Caja Libre Actual</span>
            <span className={`text-3xl font-bold ${cash.safeToSpend > 0 ? "text-arca-text-primary" : "text-arca-alert"}`}>
              {formatCOP(cash.safeToSpend)}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-arca-text-secondary">Balance en cuentas</span>
              <span className="font-bold text-arca-text-primary">{formatCOP(cash.totalBalance)}</span>
            </div>
            {cash.protectedSavings > 0 && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-arca-text-secondary">Protegido en bolsillos</span>
                <span className="font-bold text-arca-positive">−{formatCOP(cash.protectedSavings)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PROPUESTA 3: Ticket / Math Breakdown */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-arca-text-secondary">Propuesta 3: Ticket Matemático</span>
        <div className="rounded-2xl p-5 bg-arca-surface-2 border border-arca-border shadow-sm">
          <div className="flex flex-col gap-2 mb-4 pb-4 border-b border-dashed border-arca-border">
            <div className="flex justify-between items-center text-xs">
              <span className="text-arca-text-secondary">Balance Total</span>
              <span className="font-bold">{formatCOP(cash.totalBalance)}</span>
            </div>
            {cash.protectedSavings > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-arca-text-secondary">Bolsillos (Protegido)</span>
                <span className="font-bold text-arca-positive">−{formatCOP(cash.protectedSavings)}</span>
              </div>
            )}
            {cash.pendingCritical > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-arca-text-secondary">Pagos Pendientes</span>
                <span className="font-bold text-arca-alert">−{formatCOP(cash.pendingCritical)}</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold tracking-widest text-arca-accent uppercase">Caja Libre</span>
            <span className={`text-2xl font-bold ${cash.safeToSpend > 0 ? "text-arca-text-primary" : "text-arca-alert"}`}>
              {formatCOP(cash.safeToSpend)}
            </span>
          </div>
        </div>
      </div>

      {/* PROPUESTA 4: Holográfica (Soft Glow) */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-arca-text-secondary">Propuesta 4: Holográfica Glow</span>
        <div className="rounded-2xl p-6 bg-arca-surface-1 border border-arca-border/30 relative overflow-hidden flex flex-col items-center justify-center text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-arca-accent/10 via-transparent to-arca-positive/10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-arca-accent/20 blur-[50px] rounded-full"></div>
          
          <span className="text-[10px] font-bold tracking-widest text-arca-text-secondary uppercase mb-2 relative z-10">Disponible Real</span>
          <span className={`text-4xl font-black ${cash.safeToSpend > 0 ? "text-arca-text-primary" : "text-arca-alert"} relative z-10 drop-shadow-lg mb-4`}>
            {formatCOP(cash.safeToSpend)}
          </span>

          <div className="flex gap-4 text-[10px] relative z-10 bg-arca-surface-3/50 px-4 py-2 rounded-full border border-arca-border/50 backdrop-blur-sm">
            <div className="flex gap-1">
              <span className="text-arca-text-dim">Total:</span>
              <span className="font-bold text-arca-text-secondary">{formatCOP(cash.totalBalance)}</span>
            </div>
            {cash.protectedSavings > 0 && (
              <>
                <span className="text-arca-text-dim">|</span>
                <div className="flex gap-1">
                  <span className="text-arca-text-dim">Bolsillos:</span>
                  <span className="font-bold text-arca-positive">{formatCOP(cash.protectedSavings)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* PROPUESTA 5: Split Card */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-arca-text-secondary">Propuesta 5: Split Compacto</span>
        <div className="rounded-2xl flex overflow-hidden border border-arca-border bg-arca-surface-2">
          {/* Left Side: Main Number */}
          <div className="flex-1 p-5 flex flex-col justify-center bg-arca-surface-1 border-r border-arca-border">
            <span className="text-[10px] font-bold tracking-widest text-arca-accent uppercase mb-1">Caja Libre</span>
            <span className={`text-2xl font-bold ${cash.safeToSpend > 0 ? "text-arca-text-primary" : "text-arca-alert"}`}>
              {formatCOP(cash.safeToSpend)}
            </span>
          </div>
          
          {/* Right Side: Breakdown */}
          <div className="flex-1 p-4 flex flex-col justify-center gap-2">
            <div className="flex flex-col">
              <span className="text-[9px] text-arca-text-secondary uppercase">Balance Total</span>
              <span className="text-xs font-bold text-arca-text-primary">{formatCOP(cash.totalBalance)}</span>
            </div>
            {cash.protectedSavings > 0 && (
              <div className="flex flex-col">
                <span className="text-[9px] text-arca-positive/80 uppercase">Bolsillos</span>
                <span className="text-xs font-bold text-arca-positive">−{formatCOP(cash.protectedSavings)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
