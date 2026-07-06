"use client";

import { useState } from "react";
import { Chrome, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui-kit";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function GoogleAuthButton({
  next = "/app/hoy",
}: {
  mode: "sign-in" | "sign-up";
  next?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("No pudimos completar el acceso. Intenta de nuevo.");
      return;
    }

    setLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (authError) {
      setLoading(false);
      setError("No pudimos completar el acceso. Intenta de nuevo.");
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" size="lg" className="w-full" onClick={handleClick} disabled={loading}>
        {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Chrome size={16} />}
        Continuar con Google
      </Button>
      {error ? <p className="rounded-2xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
