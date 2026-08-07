export type NovaAutonomy = 'guide' | 'prepare' | 'execute';
export type NovaTone = 'clear' | 'brief' | 'coach';

export type NovaPreferences = {
  autonomy: NovaAutonomy;
  weeklySummary: boolean;
  dueReminders: boolean;
  autoConfirmIncomes: boolean;
  tone: NovaTone;
};

export const DEFAULT_NOVA_PREFERENCES: NovaPreferences = {
  autonomy: 'prepare',
  weeklySummary: true,
  dueReminders: true,
  autoConfirmIncomes: true,
  tone: 'clear',
};

export const NOVA_PREFERENCES_KEY = 'arca:nova-preferences';

export function normalizeNovaPreferences(value: unknown): NovaPreferences {
  if (!value || typeof value !== 'object') return DEFAULT_NOVA_PREFERENCES;

  const candidate = value as Partial<NovaPreferences>;
  return {
    autonomy: candidate.autonomy === 'guide' || candidate.autonomy === 'execute' ? candidate.autonomy : 'prepare',
    weeklySummary: typeof candidate.weeklySummary === 'boolean' ? candidate.weeklySummary : true,
    dueReminders: typeof candidate.dueReminders === 'boolean' ? candidate.dueReminders : true,
    autoConfirmIncomes: typeof candidate.autoConfirmIncomes === 'boolean' ? candidate.autoConfirmIncomes : true,
    tone: candidate.tone === 'brief' || candidate.tone === 'coach' ? candidate.tone : 'clear',
  };
}
