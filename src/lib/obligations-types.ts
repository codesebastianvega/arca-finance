export type ObligationFilter = "vencido" | "semana" | "mes" | "todo";

export type ObligationItem = {
  id: string;
  name: string;
  amount: number;
  amountLabel: string;
  date: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "overdue" | "today" | "upcoming";
  kind: string;
  notes: string | null;
  accountId: string | null;
  suggestedAccountId: string | null;
  templateId: string | null;
  groupedOccurrences: number;
};

export function canEditObligation(item: ObligationItem) {
  return item.groupedOccurrences <= 1;
}

export type ObligationsViewModel = {
  items: ObligationItem[];
  accountOptions: Array<{
    id: string;
    label: string;
  }>;
};

function startOfTodayInBogota() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${date}T00:00:00-05:00`);
}

function monthBoundsInBogota() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  });
  const [yearStr, monthStr] = formatter.format(new Date()).split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = `${yearStr}-${monthStr}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${yearStr}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, nextMonth };
}

export function filterObligations(items: ObligationItem[], filter: ObligationFilter) {
  const today = startOfTodayInBogota();
  const month = monthBoundsInBogota();

  if (filter === "todo") return items;

  if (filter === "vencido") {
    return items.filter((item) => item.status === "overdue");
  }

  if (filter === "semana") {
    return items.filter((item) => {
      const due = new Date(`${item.dueDate}T00:00:00-05:00`);
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
      return diff >= 0 && diff <= 7;
    });
  }

  return items.filter((item) => item.dueDate >= month.start && item.dueDate < month.nextMonth);
}
