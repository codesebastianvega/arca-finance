import { redirect } from "next/navigation";
import type { Profile, Workspace, WorkspaceContext, WorkspaceMembership, WorkspaceSubscription } from "@/lib/types";
import { createSupabaseServerComponentClient, getSupabaseAdminClient } from "@/lib/supabase";

type SchemaState = "ready" | "missing";

async function readSessionUser() {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

export async function getCurrentUser() {
  return readSessionUser();
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

async function readProfile(userId: string) {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_superadmin, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const profile: Profile = {
    id: String(data.id),
    email: data.email ? String(data.email) : undefined,
    fullName: data.full_name ? String(data.full_name) : undefined,
    isSuperAdmin: Boolean(data.is_superadmin),
    createdAt: data.created_at ? String(data.created_at) : undefined,
  };

  return profile;
}

async function readWorkspaceContext(userId: string) {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    return { schemaState: "missing" as SchemaState, context: null };
  }

  const membershipResult = await supabase
    .from("workspace_members")
    .select(
      "workspace_id, user_id, role, created_at, workspaces(id, owner_user_id, slug, name, currency_code, timezone, status, created_at)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipResult.error) {
    return { schemaState: "missing" as SchemaState, context: null };
  }

  const membershipRow = membershipResult.data as
    | {
        workspace_id: string;
        user_id: string;
        role?: string | null;
        created_at?: string | null;
        workspaces?:
          | {
              id: string;
              owner_user_id: string;
              slug: string;
              name: string;
              currency_code?: string | null;
              timezone?: string | null;
              status?: string | null;
              created_at?: string | null;
            }
          | {
              id: string;
              owner_user_id: string;
              slug: string;
              name: string;
              currency_code?: string | null;
              timezone?: string | null;
              status?: string | null;
              created_at?: string | null;
            }[]
          | null;
      }
    | null;

  if (!membershipRow || !membershipRow.workspaces) {
    return { schemaState: "ready" as SchemaState, context: null };
  }

  const workspaceRow = Array.isArray(membershipRow.workspaces) ? membershipRow.workspaces[0] : membershipRow.workspaces;

  const membership: WorkspaceMembership = {
    workspaceId: String(membershipRow.workspace_id),
    userId: String(membershipRow.user_id),
    role: (membershipRow.role as WorkspaceMembership["role"]) ?? "owner",
    createdAt: membershipRow.created_at ? String(membershipRow.created_at) : undefined,
  };

  const workspace: Workspace = {
    id: String(workspaceRow.id),
    ownerUserId: String(workspaceRow.owner_user_id),
    slug: String(workspaceRow.slug),
    name: String(workspaceRow.name),
    currencyCode: String(workspaceRow.currency_code ?? "COP"),
    timezone: String(workspaceRow.timezone ?? "America/Bogota"),
    status: (workspaceRow.status as Workspace["status"]) ?? "active",
    createdAt: workspaceRow.created_at ? String(workspaceRow.created_at) : undefined,
  };

  const subscriptionResult = await supabase
    .from("workspace_subscriptions")
    .select("id, workspace_id, plan_code, status, provider, starts_at, ends_at, trial_ends_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let subscription: WorkspaceSubscription | undefined;

  if (!subscriptionResult.error && subscriptionResult.data) {
    subscription = {
      id: String(subscriptionResult.data.id),
      workspaceId: String(subscriptionResult.data.workspace_id),
      planCode: subscriptionResult.data.plan_code as WorkspaceSubscription["planCode"],
      status: subscriptionResult.data.status as WorkspaceSubscription["status"],
      provider: String(subscriptionResult.data.provider ?? "manual"),
      startsAt: subscriptionResult.data.starts_at ? String(subscriptionResult.data.starts_at) : undefined,
      endsAt: subscriptionResult.data.ends_at ? String(subscriptionResult.data.ends_at) : undefined,
      trialEndsAt: subscriptionResult.data.trial_ends_at ? String(subscriptionResult.data.trial_ends_at) : undefined,
    };
  }

  const profile = await readProfile(userId);

  if (!profile) {
    return { schemaState: "ready" as SchemaState, context: null };
  }

  const context: WorkspaceContext = {
    profile,
    workspace,
    membership,
    subscription,
  };

  return { schemaState: "ready" as SchemaState, context };
}

export async function getCurrentWorkspaceContext() {
  const user = await getCurrentUser();

  if (!user) {
    return { schemaState: "ready" as SchemaState, context: null };
  }

  return readWorkspaceContext(user.id);
}

export async function requireWorkspaceContext() {
  const user = await requireUser();
  const result = await readWorkspaceContext(user.id);

  if (result.schemaState === "missing") {
    redirect("/onboarding?mode=schema");
  }

  if (!result.context) {
    redirect("/onboarding");
  }

  return result.context;
}

export async function requireSuperAdmin() {
  const context = await requireWorkspaceContext();

  if (!context.profile.isSuperAdmin) {
    redirect("/app/hoy");
  }

  return context;
}

export async function bootstrapWorkspaceForUser(params: { userId: string; email?: string; fullName?: string; workspaceName?: string }) {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    throw new Error("Supabase admin client no disponible.");
  }

  const workspaceName = params.workspaceName?.trim() || "Arca principal";
  const slugBase = workspaceName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "arca";
  const slug = `${slugBase}-${params.userId.slice(0, 8)}`;

  const profileInsert = {
    id: params.userId,
    email: params.email ?? null,
    full_name: params.fullName ?? null,
    is_superadmin: false,
  };

  const { error: profileError } = await admin.from("profiles").upsert(profileInsert, { onConflict: "id" });

  if (profileError) {
    throw new Error(`No se pudo crear el perfil: ${profileError.message}`);
  }

  const existingMembership = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", params.userId)
    .limit(1)
    .maybeSingle();

  if (existingMembership.data?.workspace_id) {
    return String(existingMembership.data.workspace_id);
  }

  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .insert({
      owner_user_id: params.userId,
      slug,
      name: workspaceName,
      currency_code: "COP",
      timezone: "America/Bogota",
      status: "active",
    })
    .select("id")
    .single();

  if (workspaceError || !workspace) {
    throw new Error(`No se pudo crear el workspace: ${workspaceError?.message ?? "sin respuesta"}`);
  }

  const workspaceId = String(workspace.id);

  const { error: membershipError } = await admin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: params.userId,
    role: "owner",
  });

  if (membershipError) {
    throw new Error(`No se pudo crear la membresia: ${membershipError.message}`);
  }

  await admin.from("workspace_subscriptions").insert({
    workspace_id: workspaceId,
    plan_code: "personal_pro",
    status: "trialing",
    provider: "manual",
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return workspaceId;
}
