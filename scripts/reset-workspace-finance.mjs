import { createClient } from "@supabase/supabase-js";

const workspaceId = process.argv[2];

if (!workspaceId) {
  console.error("Usage: node scripts/reset-workspace-finance.mjs <workspace_id>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const deleteOrder = [
  "financial_events",
  "scheduled_events",
  "savings_transactions",
  "credit_card_payments",
  "credit_card_purchases",
  "debt_payments",
  "expenses",
  "incomes",
  "transactions",
  "savings_goals",
  "credit_cards",
  "debts",
  "monthly_projections",
  "income_sources",
  "expense_categories",
  "business_units",
  "accounts",
];

const defaultExpenseCategories = [
  { name: "Alimentacion", group_name: "vida" },
  { name: "Transporte", group_name: "vida" },
  { name: "Servicios", group_name: "vida" },
  { name: "Arriendo", group_name: "vida" },
  { name: "Salud", group_name: "vida" },
  { name: "Educacion", group_name: "vida" },
  { name: "Mascotas", group_name: "vida" },
  { name: "Mercado", group_name: "vida" },
  { name: "Deuda personal", group_name: "deuda" },
  { name: "Tarjeta de credito", group_name: "deuda" },
  { name: "Software", group_name: "operacion" },
  { name: "Marketing", group_name: "operacion" },
  { name: "Impuestos", group_name: "operacion" },
  { name: "Ahorro", group_name: "patrimonio" },
  { name: "General", group_name: "general" },
];

async function ensureWorkspace() {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id,name,slug")
    .eq("id", workspaceId)
    .single();

  if (error || !data) {
    throw new Error(`Workspace no encontrado: ${error?.message ?? workspaceId}`);
  }

  return data;
}

async function deleteWorkspaceData() {
  for (const table of deleteOrder) {
    const { error } = await supabase.from(table).delete().eq("workspace_id", workspaceId);
    if (error) {
      throw new Error(`No se pudo limpiar ${table}: ${error.message}`);
    }
  }
}

async function seedDefaults() {
  const categoryRows = defaultExpenseCategories.map((item) => ({
    workspace_id: workspaceId,
    name: item.name,
    group_name: item.group_name,
    active: true,
  }));

  const { error: categoryError } = await supabase.from("expense_categories").insert(categoryRows);
  if (categoryError) {
    throw new Error(`No se pudieron recrear expense_categories: ${categoryError.message}`);
  }
}

async function verifyCounts() {
  const tables = [
    "accounts",
    "transactions",
    "debts",
    "credit_cards",
    "savings_goals",
    "scheduled_events",
    "business_units",
    "expense_categories",
    "income_sources",
  ];

  const result = {};
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId);
    if (error) {
      throw new Error(`No se pudo verificar ${table}: ${error.message}`);
    }
    result[table] = count ?? 0;
  }

  return result;
}

async function main() {
  const workspace = await ensureWorkspace();
  console.log(`Resetting workspace ${workspace.name} (${workspace.id})`);
  await deleteWorkspaceData();
  await seedDefaults();
  const counts = await verifyCounts();
  console.log(JSON.stringify({ workspace, counts }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
