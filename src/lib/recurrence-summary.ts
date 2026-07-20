import {
  generateIncomeOccurrenceDates,
  normalizeRecurrenceDays,
  validateIncomeRecurrence,
  type IncomeRecurrenceFrequency,
} from './income-recurrence';

export type RecurrenceEndMode = 'indefinite' | 'until_date' | 'count';

export type RecurrenceSummaryInput = {
  frequency: IncomeRecurrenceFrequency;
  startDate: string;
  recurrenceDays?: number[];
  endMode: RecurrenceEndMode;
  endDate?: string | null;
  occurrenceCount?: number | null;
  occurrenceNoun?: {
    singular: string;
    plural: string;
  };
};

export type RecurrenceSummary = {
  occurrenceCount: number | null;
  firstOccurrence: string | null;
  lastOccurrence: string | null;
  durationDays: number | null;
  durationLabel: string;
  frequencyLabel: string;
  occurrenceLabel: string;
  summary: string;
  explanation: string;
  isOpenEnded: boolean;
};

const DAY_MS = 86_400_000;
const AVERAGE_MONTH_DAYS = 365.25 / 12;
const MAX_GENERATED_OCCURRENCES = 1_000;

const DEFAULT_NOUN = {
  singular: 'ocurrencia',
  plural: 'ocurrencias',
};

/**
 * Resume una recurrencia usando fechas calendario, sin depender de zona horaria.
 * El conteo incluye la primera ocurrencia. La duración mide desde la primera
 * hasta la última; por eso 24 pagos cada dos semanas cubren 23 intervalos.
 */
export function summarizeRecurrence(input: RecurrenceSummaryInput): RecurrenceSummary {
  const start = parseDate(input.startDate, 'La fecha inicial no es válida.');
  const days = normalizeRecurrenceDays(input.recurrenceDays);
  const noun = input.occurrenceNoun ?? DEFAULT_NOUN;
  const frequencyLabel = recurrenceFrequencyLabel(input.frequency, days);

  validateIncomeRecurrence({
    frequency: input.frequency,
    startDate: input.startDate,
    recurrenceDays: days,
    endMode: input.endMode,
    endDate: input.endDate,
    occurrenceCount: input.occurrenceCount,
  });

  if (input.frequency === 'once') {
    return buildSummary([start], frequencyLabel, noun, false);
  }

  if (input.endMode === 'indefinite') {
    const occurrenceLabel = `Sin límite de ${noun.plural}`;
    return {
      occurrenceCount: null,
      firstOccurrence: formatDate(start),
      lastOccurrence: null,
      durationDays: null,
      durationLabel: 'Sin fecha de finalización',
      frequencyLabel,
      occurrenceLabel,
      summary: `${capitalize(frequencyLabel)} · sin fecha de finalización`,
      explanation: `Se repetirá ${frequencyLabel} desde el ${formatLongDate(start)} hasta que la detengas.`,
      isOpenEnded: true,
    };
  }

  if (input.endMode === 'count') {
    const count = normalizePositiveInteger(input.occurrenceCount, 'El número de ocurrencias debe ser mayor que cero.');
    const dates = generateIncomeOccurrenceDates({
      frequency: input.frequency,
      startDate: input.startDate,
      recurrenceDays: days,
      endMode: 'count',
      occurrenceCount: count,
      maxOccurrences: count,
      generationHorizonDays: 36_525,
    }).map((date) => parseDate(date, 'La fecha calculada no es válida.'));
    return buildSummary(dates, frequencyLabel, noun, false);
  }

  const end = parseDate(input.endDate ?? '', 'La fecha final no es válida.');
  if (end.getTime() < start.getTime()) {
    throw new Error('La fecha final no puede ser anterior a la fecha inicial.');
  }
  assertSummaryLimit(input.frequency, start, end, days);

  const generationHorizonDays = Math.ceil((end.getTime() - start.getTime()) / DAY_MS) + 1;
  const dates = generateIncomeOccurrenceDates({
    frequency: input.frequency,
    startDate: input.startDate,
    recurrenceDays: days,
    endMode: 'until_date',
    endDate: input.endDate,
    maxOccurrences: MAX_GENERATED_OCCURRENCES,
    generationHorizonDays,
  }).map((date) => parseDate(date, 'La fecha calculada no es válida.'));
  return buildSummary(dates, frequencyLabel, noun, false);
}

export function recurrenceFrequencyLabel(
  frequency: IncomeRecurrenceFrequency,
  recurrenceDays: number[] = [],
): string {
  const days = normalizeRecurrenceDays(recurrenceDays);
  switch (frequency) {
    case 'once':
      return 'una sola vez';
    case 'daily':
      return 'cada día';
    case 'weekly':
      return 'cada semana';
    case 'biweekly':
      return 'cada dos semanas';
    case 'semimonthly':
      return days.length
        ? `${formatDayList(days)} de cada mes`
        : 'dos veces al mes';
    case 'monthly':
      return days.length
        ? `${formatDayList(days)} de cada mes`
        : 'cada mes';
  }
}

export function formatEstimatedDuration(durationDays: number | null): string {
  if (durationDays === null) return 'Sin fecha de finalización';
  if (durationDays === 0) return 'el mismo día';
  if (durationDays < 14) return `${durationDays} ${durationDays === 1 ? 'día' : 'días'}`;
  if (durationDays < 60) {
    const weeks = Math.round(durationDays / 7);
    return `${durationDays % 7 === 0 ? '' : '≈ '}${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }
  if (durationDays < 548) {
    const months = Math.max(1, Math.round(durationDays / AVERAGE_MONTH_DAYS));
    return `≈ ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  const years = durationDays / 365.25;
  const rounded = Math.round(years * 10) / 10;
  return `≈ ${formatDecimal(rounded)} ${rounded === 1 ? 'año' : 'años'}`;
}

function buildSummary(
  dates: Date[],
  frequencyLabel: string,
  noun: { singular: string; plural: string },
  isOpenEnded: boolean,
): RecurrenceSummary {
  if (!dates.length) {
    return {
      occurrenceCount: 0,
      firstOccurrence: null,
      lastOccurrence: null,
      durationDays: 0,
      durationLabel: 'Sin ocurrencias en ese periodo',
      frequencyLabel,
      occurrenceLabel: `0 ${noun.plural}`,
      summary: `0 ${noun.plural} · sin ocurrencias en ese periodo`,
      explanation: `No hay ${noun.plural} entre las fechas seleccionadas.`,
      isOpenEnded,
    };
  }

  const first = dates[0];
  const last = dates[dates.length - 1];
  const durationDays = Math.round((last.getTime() - first.getTime()) / DAY_MS);
  const durationLabel = formatEstimatedDuration(durationDays);
  const occurrenceLabel = `${dates.length} ${dates.length === 1 ? noun.singular : noun.plural}`;
  const summary = `${occurrenceLabel} ${frequencyLabel} · ${durationLabel}`;
  const explanation = dates.length === 1
    ? `${capitalize(occurrenceLabel)} el ${formatLongDate(first)}.`
    : `${capitalize(occurrenceLabel)} desde el ${formatLongDate(first)} hasta el ${formatLongDate(last)}; duración estimada: ${durationLabel}.`;

  return {
    occurrenceCount: dates.length,
    firstOccurrence: formatDate(first),
    lastOccurrence: formatDate(last),
    durationDays,
    durationLabel,
    frequencyLabel,
    occurrenceLabel,
    summary,
    explanation,
    isOpenEnded,
  };
}

function normalizePositiveInteger(value: number | null | undefined, message: string): number {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(message);
  }
  if (normalized > MAX_GENERATED_OCCURRENCES) {
    throw new Error(`Puedes calcular hasta ${MAX_GENERATED_OCCURRENCES} ocurrencias a la vez.`);
  }
  return normalized;
}

function assertSummaryLimit(
  frequency: IncomeRecurrenceFrequency,
  start: Date,
  end: Date,
  recurrenceDays: number[],
): void {
  const totalDays = Math.floor((end.getTime() - start.getTime()) / DAY_MS);
  const fixedInterval = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : null;
  if (fixedInterval && Math.floor(totalDays / fixedInterval) + 1 > MAX_GENERATED_OCCURRENCES) {
    throw new Error(`Ese periodo supera el límite de ${MAX_GENERATED_OCCURRENCES} ocurrencias.`);
  }

  if (frequency === 'monthly' || frequency === 'semimonthly') {
    const monthSpan = (end.getUTCFullYear() - start.getUTCFullYear()) * 12
      + end.getUTCMonth() - start.getUTCMonth() + 1;
    if (monthSpan * Math.max(1, recurrenceDays.length) > MAX_GENERATED_OCCURRENCES) {
      throw new Error(`Ese periodo supera el límite de ${MAX_GENERATED_OCCURRENCES} ocurrencias.`);
    }
  }
}

function parseDate(value: string, message: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(message);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(message);
  }
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatDayList(days: number[]): string {
  if (days.length === 1) return `el día ${days[0]}`;
  const head = days.slice(0, -1).join(', ');
  return `los días ${head} y ${days[days.length - 1]}`;
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
