export type IncomeRecurrenceFrequency =
  | 'once'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly';

export type IncomeRecurrenceEndMode = 'indefinite' | 'until_date' | 'count';

export const INCOME_RECURRENCE_OPTIONS: Array<{
  value: IncomeRecurrenceFrequency;
  label: string;
  helper: string;
}> = [
  { value: 'once', label: 'Una vez', helper: 'Solo en la fecha elegida.' },
  { value: 'daily', label: 'Diario', helper: 'Todos los días desde la fecha inicial.' },
  { value: 'weekly', label: 'Semanal', helper: 'Cada 7 días, el mismo día de la semana.' },
  { value: 'biweekly', label: 'Cada 2 semanas', helper: 'Cada 14 días desde la fecha inicial.' },
  { value: 'semimonthly', label: 'Quincenal', helper: 'Dos pagos al mes en los días que elijas.' },
  { value: 'monthly', label: 'Mensual', helper: 'Uno o varios días específicos de cada mes.' },
];

type GenerateIncomeOccurrenceDatesInput = {
  frequency: IncomeRecurrenceFrequency;
  startDate: string;
  recurrenceDays?: number[];
  endMode?: IncomeRecurrenceEndMode;
  endDate?: string | null;
  occurrenceCount?: number | null;
  maxOccurrences?: number;
  generationHorizonDays?: number;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) throw new Error('La fecha inicial no es válida.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('La fecha inicial no es válida.');
  }
  return date;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateForMonthDay(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

export function normalizeRecurrenceDays(days: number[] | undefined) {
  return [...new Set((days ?? []).map(Number).filter((day) => Number.isInteger(day) && day >= 1 && day <= 31))].sort((a, b) => a - b);
}

export function defaultSemimonthlyDays(startDate: string) {
  const startDay = parseIsoDate(startDate).getUTCDate();
  if (startDay <= 15) return [startDay, Math.min(30, startDay + 15)];
  return [15, startDay];
}

export function validateIncomeRecurrence(input: {
  frequency: IncomeRecurrenceFrequency;
  startDate: string;
  recurrenceDays?: number[];
  endMode?: IncomeRecurrenceEndMode;
  endDate?: string | null;
  occurrenceCount?: number | null;
}) {
  const start = parseIsoDate(input.startDate);
  const days = normalizeRecurrenceDays(input.recurrenceDays);
  const endMode = input.endMode ?? 'indefinite';

  if (input.frequency === 'once') return { start, days, endMode };

  if (input.frequency === 'monthly' && days.length === 0) {
    throw new Error('Elige al menos un día del mes para el ingreso mensual.');
  }
  if (input.frequency === 'semimonthly' && days.length !== 2) {
    throw new Error('El ingreso quincenal necesita exactamente dos días de pago al mes.');
  }
  if (endMode === 'until_date') {
    if (!input.endDate) throw new Error('Debes elegir la fecha final de la recurrencia.');
    if (parseIsoDate(input.endDate) < start) throw new Error('La fecha final debe ser posterior a la fecha inicial.');
  }
  if (endMode === 'count' && (!Number.isInteger(input.occurrenceCount) || Number(input.occurrenceCount) < 1)) {
    throw new Error('La cantidad de veces debe ser un número mayor a cero.');
  }
  if (endMode === 'count' && Number(input.occurrenceCount) > 1000) {
    throw new Error('Puedes programar hasta 1.000 cobros en una sola recurrencia.');
  }

  return { start, days, endMode };
}

export function generateIncomeOccurrenceDates(input: GenerateIncomeOccurrenceDatesInput): string[] {
  const { start, days, endMode } = validateIncomeRecurrence(input);
  if (input.frequency === 'once') return [toIsoDate(start)];

  const hardLimit = Math.min(Math.max(input.maxOccurrences ?? 500, 1), 1000);
  const requestedCount = endMode === 'count' ? Number(input.occurrenceCount) : hardLimit;
  const resultLimit = Math.min(requestedCount, hardLimit);
  const horizonEnd = addUtcDays(start, Math.max(input.generationHorizonDays ?? 366, 1));
  const configuredEnd = endMode === 'until_date' && input.endDate ? parseIsoDate(input.endDate) : horizonEnd;
  const effectiveEnd = configuredEnd < horizonEnd ? configuredEnd : horizonEnd;
  const dates = new Set<string>();

  const addIfAllowed = (date: Date) => {
    if (date < start || date > effectiveEnd || dates.size >= resultLimit) return false;
    dates.add(toIsoDate(date));
    return true;
  };

  if (input.frequency === 'daily' || input.frequency === 'weekly' || input.frequency === 'biweekly') {
    const step = input.frequency === 'daily' ? 1 : input.frequency === 'weekly' ? 7 : 14;
    for (let date = start; date <= effectiveEnd && dates.size < resultLimit; date = addUtcDays(date, step)) {
      addIfAllowed(date);
    }
    return [...dates];
  }

  for (let offset = 0; dates.size < resultLimit; offset += 1) {
    const monthDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
    if (monthDate > effectiveEnd) break;
    for (const day of days) {
      addIfAllowed(dateForMonthDay(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), day));
      if (dates.size >= resultLimit) break;
    }
  }

  return [...dates].sort();
}
