import Link from "next/link";
import { Bell } from "lucide-react";
import type { WorkspaceContext } from "@/lib/types";
import { Button } from "@/components/ui-kit";

function getDisplayName(context: WorkspaceContext) {
  return context.profile.fullName?.trim() || context.profile.email?.split("@")[0] || "usuario";
}

function getInitials(context: WorkspaceContext) {
  const base = context.profile.fullName?.trim() || context.profile.email?.split("@")[0] || "A";
  const parts = base.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "A";
}

function formatHeaderDate() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return formatter.format(now);
}

export function MobileHeader({ context }: { context: WorkspaceContext }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--header-backdrop)] backdrop-blur md:hidden">
      <div className="flex h-[72px] items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[var(--foreground)]">Hola, {getDisplayName(context)}</p>
          <p className="mt-1 truncate text-sm capitalize text-[var(--muted)]">{formatHeaderDate()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" aria-label="Notificaciones">
            <Bell size={18} />
          </Button>
          <Link
            href="/app/configuracion"
            aria-label="Abrir configuracion"
            className="arca-focus inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] border-t-[var(--border-top-highlight)] bg-[var(--bg-surface-2)] text-sm font-semibold text-[var(--text-primary)]"
          >
            {getInitials(context)}
          </Link>
        </div>
      </div>
    </header>
  );
}
