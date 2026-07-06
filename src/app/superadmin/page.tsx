import { Card } from "@/components/ui-kit";
import { AppShell } from "@/features/app-shell/app-shell";
import { requireSuperAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const context = await requireSuperAdmin();
  const admin = getSupabaseAdminClient();

  const [workspacesResult, subscriptionsResult] = admin
    ? await Promise.all([
        admin.from("workspaces").select("id, name, slug, status, created_at").order("created_at", { ascending: false }).limit(20),
        admin
          .from("workspace_subscriptions")
          .select("id, workspace_id, plan_code, status, provider, trial_ends_at, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  return (
    <AppShell currentPath="/superadmin" context={context}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Superadmin</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Vista operativa del SaaS.</h1>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Workspaces</p>
            <div className="mt-4 space-y-3">
              {(workspacesResult.data ?? []).map((workspace) => (
                <div key={String(workspace.id)} className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                  <p className="font-medium">{String(workspace.name)}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {String(workspace.slug)} · {String(workspace.status)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Suscripciones</p>
            <div className="mt-4 space-y-3">
              {(subscriptionsResult.data ?? []).map((subscription) => (
                <div key={String(subscription.id)} className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                  <p className="font-medium">
                    {String(subscription.plan_code)} · {String(subscription.status)}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    workspace {String(subscription.workspace_id)} · {String(subscription.provider)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
