"use client";

import { useRef, useState, useTransition, type ReactNode, type TouchEvent } from "react";
import { ArrowDown, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { haptics } from "@/src/lib/haptics";

const REFRESH_THRESHOLD = 68;
const MAX_PULL_DISTANCE = 92;

export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const startY = useRef<number | null>(null);
  const canPull = useRef(false);
  const [distance, setDistance] = useState(0);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    startY.current = null;
    canPull.current = false;
    setDistance(0);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const isInteractive = Boolean(target.closest("input, textarea, select, [data-pull-refresh-ignore]"));
    canPull.current = window.scrollY <= 0 && !isInteractive && !isPending;
    startY.current = canPull.current ? event.touches[0]?.clientY ?? null : null;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!canPull.current || startY.current === null || window.scrollY > 0) return;
    const delta = (event.touches[0]?.clientY ?? startY.current) - startY.current;
    if (delta <= 0) {
      setDistance(0);
      return;
    }
    setDistance(Math.min(MAX_PULL_DISTANCE, delta * 0.48));
  };

  const handleTouchEnd = () => {
    const shouldRefresh = distance >= REFRESH_THRESHOLD;
    reset();
    if (!shouldRefresh) return;

    haptics.medium();
    startTransition(() => {
      router.refresh();
    });
  };

  const activeDistance = isPending ? 48 : distance;
  const ready = distance >= REFRESH_THRESHOLD;

  return (
    <div
      className="relative touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={reset}
    >
      <div
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center pt-safe transition-opacity ${activeDistance > 5 ? "opacity-100" : "opacity-0"}`}
      >
        <div
          className="flex items-center gap-2 rounded-full border border-arca-border-strong bg-arca-surface-1/95 px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-arca-text-secondary shadow-xl backdrop-blur-xl"
          style={{ transform: `translateY(${Math.max(-44, activeDistance - 52)}px)` }}
        >
          {isPending ? <LoaderCircle className="animate-spin text-arca-accent" size={15} /> : <ArrowDown className={`text-arca-accent transition-transform ${ready ? "rotate-180" : ""}`} size={15} />}
          {isPending ? "Actualizando…" : ready ? "Suelta para actualizar" : "Desliza para actualizar"}
        </div>
      </div>

      <div
        className="transition-transform duration-150 ease-out"
        style={{ transform: activeDistance > 0 ? `translateY(${activeDistance}px)` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
