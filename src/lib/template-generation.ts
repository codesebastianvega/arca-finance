import "server-only";

type QueryClient = {
  from: (table: string) => {
    select: (query?: string) => any;
    insert: (values: Record<string, unknown> | Record<string, unknown>[]) => any;
  };
};

type TemplateRow = {
  id: string;
  workspace_id: string;
  name: string;
  kind: string;
  status: string;
  recurrence_mode: string;
  frequency: string;
  days_of_month?: number[] | null;
  start_date: string;
  end_date?: string | null;
  occurrence_limit?: number | null;
  default_amount: number | string;
  default_account_id?: string | null;
  business_unit_key: string;
  income_source_id?: string | null;
  notes?: string | null;
};

type ScheduledEventRow = {
  id: string;
  due_date: string;
  template_id?: string | null;
  title: string;
  amount: number | string;
  kind: string;
  status: string;
};

function normalizeDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isMissingRelationMessage(message?: string) {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("does not exist") ||
    normalized.includes("relation") ||
    normalized.includes("column") ||
    normalized.includes("schema cache") ||
    normalized.includes("could not find the table")
  );
}

function toNumber(value: number | string | null | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function occursOnDate(template: TemplateRow, date: Date) {
  const start = parseDate(template.start_date);
  const end = template.end_date ? parseDate(template.end_date) : null;

  if (date < start) return false;
  if (end && date > end) return false;

  const day = date.getDate();

  switch (template.recurrence_mode) {
    case "one_time":
      return normalizeDate(date) === template.start_date;
    case "manual_variable":
      return false;
    default:
      break;
  }

  switch (template.frequency) {
    case "weekly":
      return date.getDay() === start.getDay();
    case "biweekly": {
      const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000);
      return diffDays >= 0 && diffDays % 14 === 0;
    }
    case "monthly":
      return day === start.getDate();
    case "bimonthly":
      return day === start.getDate() && (date.getMonth() - start.getMonth() + (date.getFullYear() - start.getFullYear()) * 12) % 2 === 0;
    case "custom_days_of_month":
      return (template.days_of_month ?? []).includes(day);
    default:
      return false;
  }
}

function countOccurrencesUntil(template: TemplateRow, targetDate: Date) {
  if (!template.occurrence_limit) return 0;

  let count = 0;
  const start = parseDate(template.start_date);
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  while (cursor <= end && count < template.occurrence_limit) {
    if (occursOnDate(template, cursor)) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

function shouldGenerateForDate(template: TemplateRow, date: Date) {
  if (template.status !== "active") return false;
  if (!occursOnDate(template, date)) return false;

  if (template.recurrence_mode === "occurrence_bounded" && template.occurrence_limit) {
    const count = countOccurrencesUntil(template, date);
    return count <= template.occurrence_limit;
  }

  return true;
}

function computeTimingStatus(dueDate: string, confirmedDate: string) {
  if (confirmedDate < dueDate) return "early";
  if (confirmedDate > dueDate) return "late";
  return "on_time";
}

export function getScheduledEventStatusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return "confirmado";
    case "cancelled":
      return "cancelado";
    case "overdue":
      return "vencido";
    default:
      return "programado";
  }
}

export async function ensureScheduledEventsForWorkspace(client: QueryClient, workspaceId: string) {
  const incomeTemplatesResult = await client
    .from("income_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  if (incomeTemplatesResult.error && isMissingRelationMessage(incomeTemplatesResult.error.message)) {
    return;
  }

  if (incomeTemplatesResult.error) {
    throw new Error(`No se pudieron leer las plantillas de ingreso: ${incomeTemplatesResult.error.message}`);
  }

  const expenseTemplatesResult = await client
    .from("expense_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  if (expenseTemplatesResult.error && isMissingRelationMessage(expenseTemplatesResult.error.message)) {
    return;
  }

  if (expenseTemplatesResult.error) {
    throw new Error(`No se pudieron leer las plantillas de gasto: ${expenseTemplatesResult.error.message}`);
  }

  const templates = [...(incomeTemplatesResult.data ?? []), ...(expenseTemplatesResult.data ?? [])] as TemplateRow[];

  if (!templates.length) {
    return;
  }

  const start = new Date();
  start.setDate(1);
  const end = endOfMonth(addMonths(start, 2));

  const eventsResult = await client
    .from("scheduled_events")
    .select("id, due_date, template_id, title, amount, kind, status")
    .eq("workspace_id", workspaceId);

  if (eventsResult.error) {
    throw new Error(`No se pudieron leer los eventos programados: ${eventsResult.error.message}`);
  }

  const existing = new Set(
    ((eventsResult.data ?? []) as ScheduledEventRow[]).map((item) => `${item.template_id ?? "manual"}::${item.due_date}`)
  );

  const inserts: Record<string, unknown>[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  while (cursor <= end) {
    for (const template of templates) {
      if (!shouldGenerateForDate(template, cursor)) {
        continue;
      }

      const dueDate = normalizeDate(cursor);
      const key = `${template.id}::${dueDate}`;

      if (existing.has(key)) {
        continue;
      }

      inserts.push({
        workspace_id: workspaceId,
        due_date: dueDate,
        title: template.name,
        amount: toNumber(template.default_amount),
        kind: template.kind,
        status: dueDate < normalizeDate(new Date()) ? "overdue" : "scheduled",
        business_unit_key: template.business_unit_key,
        account_id: template.default_account_id ?? null,
        linked_entity_type: "template",
        linked_entity_id: template.id,
        template_id: template.id,
        notes: template.notes ?? null,
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  if (inserts.length) {
    const insertResult = await client.from("scheduled_events").insert(inserts);
    if (insertResult.error && !isMissingRelationMessage(insertResult.error.message)) {
      throw new Error(`No se pudieron generar eventos programados: ${insertResult.error.message}`);
    }
  }
}

export async function buildScheduledEventUpdateOnConfirm(
  client: QueryClient,
  workspaceId: string,
  eventId: string,
  transactionId: string,
  confirmedAt: string
) {
  const eventResult = await client
    .from("scheduled_events")
    .select("id, due_date")
    .eq("workspace_id", workspaceId)
    .eq("id", eventId)
    .single();

  if (eventResult.error || !eventResult.data) {
    throw new Error(`No se pudo releer el evento programado: ${eventResult.error?.message ?? "sin respuesta"}`);
  }

  const dueDate = String((eventResult.data as { due_date: string }).due_date);

  return {
    status: "confirmed",
    timing_status: computeTimingStatus(dueDate, confirmedAt),
    confirmed_transaction_id: transactionId,
  };
}

export function getMonthRangeLabel(date: Date) {
  return monthKey(date);
}
