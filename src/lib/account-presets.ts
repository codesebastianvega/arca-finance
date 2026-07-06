import type { AccountType } from "@/lib/types";

export type AccountColorPreset =
  | "accent"
  | "copper"
  | "success"
  | "olive"
  | "danger"
  | "nequi"
  | "daviplata"
  | "davivienda"
  | "dale"
  | "movii"
  | "nu"
  | "bancolombia"
  | "bbva"
  | "bogota"
  | "falabella"
  | "rappi"
  | "paypal"
  | "cash";

export type AccountPresetVisual = {
  value: AccountColorPreset;
  label: string;
  shellClassName: string;
  badgeClassName: string;
  dotClassName: string;
};

const presetMap: Record<AccountColorPreset, AccountPresetVisual> = {
  accent: {
    value: "accent",
    label: "Marca Arca",
    shellClassName:
      "border-[color:color-mix(in_srgb,var(--accent)_44%,var(--border)_56%)] bg-[color:color-mix(in_srgb,var(--accent)_12%,var(--surface)_88%)]",
    badgeClassName:
      "border-[color:color-mix(in_srgb,var(--accent)_44%,var(--border)_56%)] bg-[color:color-mix(in_srgb,var(--accent)_16%,var(--surface)_84%)] text-[var(--foreground)]",
    dotClassName: "bg-[var(--accent)]",
  },
  copper: {
    value: "copper",
    label: "Cobre",
    shellClassName:
      "border-[color:color-mix(in_srgb,var(--copper)_44%,var(--border)_56%)] bg-[color:color-mix(in_srgb,var(--copper)_16%,var(--surface)_84%)]",
    badgeClassName:
      "border-[color:color-mix(in_srgb,var(--copper)_48%,var(--border)_52%)] bg-[color:color-mix(in_srgb,var(--copper)_18%,var(--surface)_82%)] text-[var(--foreground)]",
    dotClassName: "bg-[var(--copper)]",
  },
  success: {
    value: "success",
    label: "Verde",
    shellClassName:
      "border-[color:color-mix(in_srgb,var(--success)_40%,var(--border)_60%)] bg-[color:color-mix(in_srgb,var(--success)_12%,var(--surface)_88%)]",
    badgeClassName:
      "border-[color:color-mix(in_srgb,var(--success)_46%,var(--border)_54%)] bg-[color:color-mix(in_srgb,var(--success)_14%,var(--surface)_86%)] text-[var(--foreground)]",
    dotClassName: "bg-[var(--success)]",
  },
  olive: {
    value: "olive",
    label: "Oliva",
    shellClassName:
      "border-[color:color-mix(in_srgb,var(--olive)_38%,var(--border)_62%)] bg-[color:color-mix(in_srgb,var(--olive)_14%,var(--surface)_86%)]",
    badgeClassName:
      "border-[color:color-mix(in_srgb,var(--olive)_42%,var(--border)_58%)] bg-[color:color-mix(in_srgb,var(--olive)_18%,var(--surface)_82%)] text-[var(--foreground)]",
    dotClassName: "bg-[var(--olive)]",
  },
  danger: {
    value: "danger",
    label: "Rojo",
    shellClassName:
      "border-[color:color-mix(in_srgb,var(--danger)_40%,var(--border)_60%)] bg-[color:color-mix(in_srgb,var(--danger)_10%,var(--surface)_90%)]",
    badgeClassName:
      "border-[color:color-mix(in_srgb,var(--danger)_44%,var(--border)_56%)] bg-[color:color-mix(in_srgb,var(--danger)_14%,var(--surface)_86%)] text-[var(--foreground)]",
    dotClassName: "bg-[var(--danger)]",
  },
  nequi: {
    value: "nequi",
    label: "Nequi",
    shellClassName: "border-[rgba(212,67,149,0.42)] bg-[rgba(212,67,149,0.14)]",
    badgeClassName: "border-[rgba(212,67,149,0.48)] bg-[rgba(212,67,149,0.18)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(212,67,149)]",
  },
  daviplata: {
    value: "daviplata",
    label: "Daviplata",
    shellClassName: "border-[rgba(212,53,49,0.42)] bg-[rgba(212,53,49,0.12)]",
    badgeClassName: "border-[rgba(212,53,49,0.5)] bg-[rgba(212,53,49,0.18)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(212,53,49)]",
  },
  davivienda: {
    value: "davivienda",
    label: "Davivienda",
    shellClassName: "border-[rgba(214,58,58,0.42)] bg-[rgba(214,58,58,0.12)]",
    badgeClassName: "border-[rgba(214,58,58,0.5)] bg-[rgba(214,58,58,0.18)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(214,58,58)]",
  },
  dale: {
    value: "dale",
    label: "Dale!",
    shellClassName: "border-[rgba(255,142,51,0.42)] bg-[rgba(255,142,51,0.12)]",
    badgeClassName: "border-[rgba(255,142,51,0.5)] bg-[rgba(255,142,51,0.18)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(255,142,51)]",
  },
  movii: {
    value: "movii",
    label: "Movii",
    shellClassName: "border-[rgba(121,67,255,0.42)] bg-[rgba(121,67,255,0.12)]",
    badgeClassName: "border-[rgba(121,67,255,0.5)] bg-[rgba(121,67,255,0.18)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(121,67,255)]",
  },
  nu: {
    value: "nu",
    label: "Nu",
    shellClassName: "border-[rgba(124,58,237,0.42)] bg-[rgba(124,58,237,0.12)]",
    badgeClassName: "border-[rgba(124,58,237,0.5)] bg-[rgba(124,58,237,0.18)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(124,58,237)]",
  },
  bancolombia: {
    value: "bancolombia",
    label: "Bancolombia",
    shellClassName: "border-[rgba(242,201,76,0.46)] bg-[rgba(242,201,76,0.16)]",
    badgeClassName: "border-[rgba(242,201,76,0.52)] bg-[rgba(242,201,76,0.22)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(242,201,76)]",
  },
  bbva: {
    value: "bbva",
    label: "BBVA",
    shellClassName: "border-[rgba(0,84,166,0.42)] bg-[rgba(0,84,166,0.12)]",
    badgeClassName: "border-[rgba(0,84,166,0.5)] bg-[rgba(0,84,166,0.18)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(0,84,166)]",
  },
  bogota: {
    value: "bogota",
    label: "Banco de Bogota",
    shellClassName: "border-[rgba(230,144,39,0.42)] bg-[rgba(230,144,39,0.14)]",
    badgeClassName: "border-[rgba(230,144,39,0.48)] bg-[rgba(230,144,39,0.2)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(230,144,39)]",
  },
  falabella: {
    value: "falabella",
    label: "Falabella",
    shellClassName: "border-[rgba(80,160,70,0.42)] bg-[rgba(80,160,70,0.12)]",
    badgeClassName: "border-[rgba(80,160,70,0.5)] bg-[rgba(80,160,70,0.18)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(80,160,70)]",
  },
  rappi: {
    value: "rappi",
    label: "RappiCard",
    shellClassName: "border-[rgba(255,84,73,0.42)] bg-[rgba(255,84,73,0.12)]",
    badgeClassName: "border-[rgba(255,84,73,0.5)] bg-[rgba(255,84,73,0.18)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(255,84,73)]",
  },
  paypal: {
    value: "paypal",
    label: "PayPal",
    shellClassName: "border-[rgba(0,112,186,0.42)] bg-[rgba(0,112,186,0.12)]",
    badgeClassName: "border-[rgba(0,112,186,0.5)] bg-[rgba(0,112,186,0.18)] text-[var(--foreground)]",
    dotClassName: "bg-[rgb(0,112,186)]",
  },
  cash: {
    value: "cash",
    label: "Fondo fisico",
    shellClassName:
      "border-[color:color-mix(in_srgb,var(--copper)_46%,var(--border)_54%)] bg-[color:color-mix(in_srgb,var(--copper)_12%,var(--surface)_88%)]",
    badgeClassName:
      "border-[color:color-mix(in_srgb,var(--copper)_48%,var(--border)_52%)] bg-[color:color-mix(in_srgb,var(--copper)_18%,var(--surface)_82%)] text-[var(--foreground)]",
    dotClassName: "bg-[var(--copper)]",
  },
};

export const accountNameSuggestions = [
  "Nequi",
  "Daviplata",
  "Davivienda",
  "Dale!",
  "Movii",
  "Nu",
  "Bancolombia",
  "BBVA",
  "Banco de Bogota",
  "Banco Caja Social",
  "Falabella",
  "RappiCard",
  "PayPal",
  "Efectivo",
] as const;

export const accountColorOptionsByType: Record<AccountType, { value: AccountColorPreset; label: string }[]> = {
  cash: [
    { value: "success", label: "Efectivo" },
    { value: "copper", label: "Caja manual" },
    { value: "cash", label: "Fondo fisico" },
  ],
  bank: [
    { value: "nu", label: "Nu" },
    { value: "bancolombia", label: "Bancolombia" },
    { value: "davivienda", label: "Davivienda" },
    { value: "bbva", label: "BBVA" },
    { value: "bogota", label: "Banco de Bogota" },
    { value: "olive", label: "Banco Caja Social" },
    { value: "falabella", label: "Falabella" },
    { value: "accent", label: "Otro banco" },
  ],
  wallet: [
    { value: "nequi", label: "Nequi" },
    { value: "daviplata", label: "Daviplata" },
    { value: "dale", label: "Dale!" },
    { value: "movii", label: "Movii" },
    { value: "paypal", label: "PayPal" },
    { value: "accent", label: "Otra billetera" },
  ],
  savings: [
    { value: "success", label: "Ahorro general" },
    { value: "olive", label: "Ahorro objetivo" },
    { value: "nu", label: "Nu ahorro" },
    { value: "bancolombia", label: "Bancolombia ahorro" },
    { value: "davivienda", label: "Davivienda ahorro" },
    { value: "bbva", label: "BBVA ahorro" },
    { value: "accent", label: "Otro ahorro" },
  ],
  other: [
    { value: "accent", label: "Otra entidad" },
    { value: "olive", label: "Banco Caja Social" },
    { value: "bogota", label: "Banco de Bogota" },
    { value: "paypal", label: "PayPal" },
    { value: "falabella", label: "Falabella" },
    { value: "rappi", label: "RappiCard" },
  ],
};

export function getAccountPresetVisual(color?: string): AccountPresetVisual {
  if (!color) return presetMap.accent;
  return presetMap[(color as AccountColorPreset)] ?? presetMap.accent;
}
