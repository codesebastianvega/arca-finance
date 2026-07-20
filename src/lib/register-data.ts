import type { WorkspaceContext } from "@/src/lib/auth-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";

export type RegisterOption = {
  id: string;
  label: string;
  value: string;
  meta?: string;
  amount?: number;
  entity?: string | null;
  color?: string | null;
  parentId?: string | null;
  icon?: string | null;
};

export type RegisterViewModel = {
  accounts: RegisterOption[];
  categories: RegisterOption[];
  units: RegisterOption[];
  incomeSources: Array<{
    id: string;
    label: string;
    unitKey: string;
    defaultAccountId: string | null;
  }>;
};

type IncomeSourceRow = {
  id: string;
  name: string;
  business_unit_key: string;
  default_account_id?: string | null;
};

type BusinessUnitRow = {
  id: string;
  name: string;
  key: string;
  archived?: boolean;
};

async function loadBusinessUnitsForRegister(
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerComponentClient>>,
) {
  const primaryResult = await supabase
    .from("business_units")
    .select("id, name, key, archived")
    .eq("workspace_id", workspaceId)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  if (!primaryResult.error) {
    return primaryResult as { data: BusinessUnitRow[] | null; error: null };
  }

  if (!primaryResult.error.message.includes("archived")) {
    return primaryResult as { data: BusinessUnitRow[] | null; error: typeof primaryResult.error };
  }

  const fallbackResult = await supabase
    .from("business_units")
    .select("id, name, key")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  return fallbackResult as { data: BusinessUnitRow[] | null; error: typeof primaryResult.error };
}

async function loadIncomeSourcesForRegister(
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerComponentClient>>,
) {
  const primaryResult = await supabase
    .from("income_sources")
    .select("id, name, business_unit_key, default_account_id")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (!primaryResult.error) {
    return primaryResult as { data: IncomeSourceRow[] | null; error: null };
  }

  if (!primaryResult.error.message.includes("default_account_id")) {
    return primaryResult as { data: IncomeSourceRow[] | null; error: typeof primaryResult.error };
  }

  const fallbackResult = await supabase
    .from("income_sources")
    .select("id, name, business_unit_key")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (fallbackResult.error) {
    return fallbackResult as { data: IncomeSourceRow[] | null; error: typeof fallbackResult.error };
  }

  return {
    data: (fallbackResult.data ?? []).map((row) => ({
      ...row,
      default_account_id: null,
    })),
    error: null,
  };
}

export async function loadRegisterViewModel(context: WorkspaceContext): Promise<RegisterViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const workspaceId = context.workspace.id;
  const sourcesPromise = loadIncomeSourcesForRegister(workspaceId, supabase);
  const unitsPromise = loadBusinessUnitsForRegister(workspaceId, supabase);

  const [accountsResult, categoriesResult, unitsResult, sourcesResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, entity, type, balance, color")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("expense_categories")
      .select("id, name, parent_id, icon")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    unitsPromise,
    sourcesPromise,
  ]);

  if (accountsResult.error) {
    throw new Error(`No se pudieron leer las cuentas para registrar: ${accountsResult.error.message}`);
  }
  if (categoriesResult.error) {
    throw new Error(`No se pudieron leer las categorias para registrar: ${categoriesResult.error.message}`);
  }
  if (unitsResult.error) {
    throw new Error(`No se pudieron leer los proyectos para registrar: ${unitsResult.error.message}`);
  }
  if (sourcesResult.error) {
    throw new Error(`No se pudieron leer las fuentes de ingreso para registrar: ${sourcesResult.error.message}`);
  }

  return {
    accounts: (accountsResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: String(row.name),
      value: String(row.id),
      meta: String(row.type ?? "cuenta"),
      amount: typeof row.balance === "number" ? row.balance : Number(row.balance ?? 0),
      entity: row.entity ? String(row.entity) : null,
      color: row.color ? String(row.color) : null,
    })),
    categories: (categoriesResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: String(row.name),
      value: String(row.name),
      parentId: row.parent_id ? String(row.parent_id) : null,
      icon: row.icon ? String(row.icon) : null,
    })),
    units: (unitsResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: String(row.name),
      value: String(row.key),
    })),
    incomeSources: (sourcesResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: String(row.name),
      unitKey: String(row.business_unit_key),
      defaultAccountId: row.default_account_id ? String(row.default_account_id) : null,
    })),
  };
}
