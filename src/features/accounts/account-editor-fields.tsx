"use client";

import { useMemo, useState } from "react";
import { accountColorOptionsByType, getAccountPresetVisual } from "@/lib/account-presets";
import type { AccountType } from "@/lib/types";

const fieldClass = "arca-focus arca-input text-sm";
const labelClass = "text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]";

export function AccountEditorFields({
  initialType,
  initialColor,
}: {
  initialType: AccountType;
  initialColor: string;
}) {
  const [type, setType] = useState<AccountType>(initialType);
  const options = useMemo(() => accountColorOptionsByType[type], [type]);
  const [color, setColor] = useState<string>(() => {
    const found = accountColorOptionsByType[initialType].find((option) => option.value === initialColor);
    return found?.value ?? accountColorOptionsByType[initialType][0]?.value ?? "accent";
  });

  const handleTypeChange = (nextType: AccountType) => {
    setType(nextType);
    const nextOptions = accountColorOptionsByType[nextType];
    const stillValid = nextOptions.some((option) => option.value === color);
    setColor(stillValid ? color : (nextOptions[0]?.value ?? "accent"));
  };

  const selectedVisual = getAccountPresetVisual(color);

  return (
    <>
      <label className="space-y-2">
        <span className={labelClass}>Tipo</span>
        <select
          name="type"
          className={fieldClass}
          value={type}
          onChange={(event) => handleTypeChange(event.target.value as AccountType)}
          required
        >
          <option value="cash">Efectivo</option>
          <option value="bank">Banco</option>
          <option value="wallet">Billetera</option>
          <option value="savings">Ahorro</option>
          <option value="other">Otra</option>
        </select>
      </label>

      <label className="space-y-2">
        <span className={labelClass}>Entidad o marca</span>
        <select
          name="color"
          className={fieldClass}
          value={color}
          onChange={(event) => setColor(event.target.value)}
          required
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${selectedVisual.badgeClassName}`}>
          <span className={`h-3 w-3 rounded-full ${selectedVisual.dotClassName}`} />
          <span>{selectedVisual.label}</span>
        </div>
        <p className="text-xs leading-5 text-[var(--muted)]">
          Esta seleccion define la identidad visual de la cuenta segun la entidad o marca.
        </p>
      </label>
    </>
  );
}
