import Link from "next/link";
import { ArrowRightLeft, ChevronRight, LogOut, Plus } from "lucide-react";
import { signOutAction } from "@/app/auth-actions";
import { Badge, Button, Logo } from "@/components/ui-kit";
import type { WorkspaceContext } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MobileShellNav } from "./mobile-shell-nav";
import { primaryNavigation, resolveActiveGroup, superAdminNavigation, utilityNavigation } from "./nav";

export function AppShell({
  currentPath,
  context,
  children,
}: {
  currentPath: string;
  context: WorkspaceContext;
  children: React.ReactNode;
}) {
  const utilityItems = context.profile.isSuperAdmin ? [...utilityNavigation, ...superAdminNavigation] : utilityNavigation;
  const accountLabel = context.subscription?.status === "active" ? "Lista" : "Pendiente";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[320px] shrink-0 border-r border-[var(--line)] bg-[var(--surface)] lg:flex lg:flex-col">
          <div className="border-b border-[var(--line)] p-6">
            <div className="space-y-3">
              <Logo href="/" compact />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-[var(--foreground)]">{context.workspace.name}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              <div>
                <p className="px-3 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Principal</p>
                <nav className="mt-3 space-y-2">
                  {primaryNavigation.map((item) => {
                    const Icon = item.icon;
                    const active = resolveActiveGroup(currentPath, item.href, item.children);

                    return (
                      <div key={item.href} className="rounded-2xl">
                        <Link
                          href={item.href}
                          title={item.description}
                          className={cn(
                            "block rounded-2xl border px-4 py-3 transition",
                            active
                              ? "border-[color:color-mix(in_srgb,var(--accent)_72%,var(--border)_28%)] border-t-[var(--border-top-highlight)] bg-[var(--accent-gradient)] text-[var(--on-accent)] shadow-[var(--elevation-soft)]"
                              : "border-transparent bg-transparent hover:border-[var(--border)] hover:border-t-[var(--border-top-highlight)] hover:bg-[color:color-mix(in_srgb,var(--surface)_84%,var(--surface-strong)_16%)]"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border",
                                active
                                  ? "border-[color:color-mix(in_srgb,var(--surface-strong)_18%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-strong)_10%,transparent)]"
                                  : "border-[var(--border)] border-t-[var(--border-top-highlight)] bg-[color:color-mix(in_srgb,var(--surface)_84%,var(--surface-strong)_16%)]"
                              )}
                            >
                              <Icon size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{item.label}</p>
                              <p
                                className={cn(
                                  "mt-1 text-xs leading-5",
                                  active
                                    ? "text-[color:color-mix(in_srgb,var(--on-accent)_82%,transparent)]"
                                    : "text-[var(--muted)]"
                                )}
                              >
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </Link>
                        {item.children?.length ? (
                          <div className="mt-2 space-y-1 pl-12">
                            {item.children.map((child) => {
                              const childActive = currentPath === child.href || currentPath.startsWith(`${child.href}/`);

                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  title={child.description}
                                  className={cn(
                                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                                    childActive
                                      ? "arca-soft-block font-semibold text-[var(--foreground)]"
                                      : "text-[var(--muted)] hover:bg-[color:color-mix(in_srgb,var(--surface)_84%,var(--surface-strong)_16%)] hover:text-[var(--foreground)]"
                                  )}
                                >
                                  <span>{child.label}</span>
                                  <ChevronRight size={14} />
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </nav>
              </div>

              <div>
                <p className="px-3 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Utilidades</p>
                <nav className="mt-3 space-y-1">
                  {utilityItems.map((item) => {
                    const Icon = item.icon;
                    const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.description}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                          active
                            ? "arca-soft-block font-semibold text-[var(--foreground)]"
                            : "text-[var(--muted)] hover:bg-[color:color-mix(in_srgb,var(--surface)_84%,var(--surface-strong)_16%)] hover:text-[var(--foreground)]"
                        )}
                      >
                        {Icon ? <Icon size={16} /> : null}
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--line)] p-4">
            <div className="arca-soft-block rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Estado</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-[var(--foreground)]">Cuenta activa</p>
                <Badge tone={context.subscription?.status === "active" ? "success" : "neutral"}>{accountLabel}</Badge>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--header-backdrop)] backdrop-blur">
            <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-10">
              <div className="min-w-0">
                <div className="hidden lg:block">
                  <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Arca</p>
                  <p className="truncate text-sm text-[var(--foreground)]">{context.profile.fullName ?? context.profile.email ?? "Usuario"}</p>
                </div>
                <MobileShellNav currentPath={currentPath} workspaceName={context.workspace.name} mode="trigger" />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/app/registrar">
                  <Button size="sm">
                    <Plus size={16} />
                    <span className="hidden sm:inline">Registrar</span>
                  </Button>
                </Link>
                <Link href="/app/transferir">
                  <Button size="sm" variant="secondary">
                    <ArrowRightLeft size={16} />
                    <span className="hidden sm:inline">Transferir</span>
                  </Button>
                </Link>
                <form action={signOutAction}>
                  <Button type="submit" variant="secondary" size="sm">
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Salir</span>
                  </Button>
                </form>
              </div>
            </div>
          </header>

          <main className="shell-grid min-h-[calc(100vh-73px)]">
            <div className="mx-auto max-w-[1240px] px-4 py-6 pb-28 sm:px-6 lg:pb-6 xl:px-10">{children}</div>
          </main>
        </div>
      </div>
      <MobileShellNav currentPath={currentPath} workspaceName={context.workspace.name} mode="bottom" />
    </div>
  );
}
