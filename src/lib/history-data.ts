import type { WorkspaceContext } from "@/src/lib/auth-types";
import type { HistoryItem, HistoryViewModel } from "@/src/lib/history-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s?COP$/, "")
    .trim();
}

function isPositiveKind(kind: string) {
  return kind === "income" || kind === "transfer_in";
}

function formatSignedAmount(kind: string, amount: number) {
  const base = formatCurrency(amount);
  return `${isPositiveKind(kind) ? "+" : "-"}${base}`;
}

function formatDate(raw: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(raw));
}

function cleanLabel(value: string | null | undefined, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function buildTags(category: string, unit: string) {
  const tags: string[] = [];
  if (category) tags.push(`#${category.toLowerCase()}`);
  if (unit) tags.push(`#${unit.toLowerCase()}`);
  return tags.slice(0, 3);
}

function isEditable(item: { source_type: string | null; kind: string; account_id: string | null }) {
  // Ahora permitimos que todas sean "editables" en la UI para que aparezca el botón de Borrar.
  // Si viene de una tarjeta ('card_purchase') también lo permitiremos por si fue un error, 
  // pero mantendremos la regla de que se controle bien el borrado.
  return true;
}

export async function loadHistoryViewModel(context: WorkspaceContext): Promise<HistoryViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const workspaceId = context.workspace.id;
  const { data, error } = await supabase
    .from("transactions")
    .select("id, concept, amount, date, category, unit, kind, status, source_type, account_id, created_at, accounts(name)")
    .eq("workspace_id", workspaceId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    throw new Error(`No se pudieron leer los movimientos: ${error.message}`);
  }

  const items: HistoryItem[] = ((data ?? []) as Array<{
    id: string;
    concept: string;
    amount: number | string;
    date: string;
    category: string;
    unit: string;
    kind: string;
    status: string;
    source_type: string | null;
    account_id: string | null;
    accounts?: { name?: string | null } | Array<{ name?: string | null }> | null;
  }>).map((row) => {
    const amount = toNumber(row.amount);
    const accountName = Array.isArray(row.accounts) ? row.accounts[0]?.name ?? null : row.accounts?.name ?? null;
    const category = cleanLabel(row.category, "general");
    const unit = cleanLabel(row.unit, "general");

    return {
      id: String(row.id),
      concept: cleanLabel(row.concept, "Movimiento"),
      amount,
      amountLabel: formatCurrency(amount),
      signedAmountLabel: formatSignedAmount(String(row.kind), amount),
      dateLabel: formatDate(String(row.date)),
      dateInputValue: String(row.date).slice(0, 10),
      category,
      unit,
      kind: String(row.kind),
      method: accountName ? `Cuenta · ${accountName}` : "Sin cuenta",
      tags: buildTags(category, unit),
      accountId: row.account_id ? String(row.account_id) : null,
      accountName,
      status: String(row.status),
      sourceType: row.source_type ? String(row.source_type) : null,
      editable: isEditable({
        source_type: row.source_type ? String(row.source_type) : null,
        kind: String(row.kind),
        account_id: row.account_id ? String(row.account_id) : null,
      }),
    };
  });

  return { items };
}
