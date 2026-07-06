"use client";

import { AccountEditorFields } from "@/features/accounts/account-editor-fields";

const fieldClass = "arca-focus arca-input text-sm";
const labelClass = "text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]";

export function AccountFormFields() {
  return (
    <>
      <label className="space-y-2">
        <span className={labelClass}>Saldo inicial</span>
        <input
          name="balance"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          className={fieldClass}
          defaultValue="0"
        />
      </label>
      <AccountEditorFields initialType="wallet" initialColor="nequi" />
    </>
  );
}
