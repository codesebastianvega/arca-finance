"use client";

import { useState } from "react";
import { Chrome, LoaderCircle } from "lucide-react";
import { Button } from "@/src/components/ui-kit";
import { getSupabaseBrowserClient } from "@/src/lib/supabase-browser";

export function GoogleAuthButton({ next = "/app" }: { next?: string }) {
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

    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    const baseOrigin = isLocalhost ? "http://localhost:3000" : window.location.origin;
    const redirectTo = `${baseOrigin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (authError || !data?.url) {
      setLoading(false);
      setError("No pudimos completar el acceso. Intenta de nuevo.");
      return;
    }

    window.location.assign(data.url);
  }

  return (
    <div className="space-y-3">
      <Button type="button" size="lg" className="w-full" onClick={handleClick} disabled={loading}>
        {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Chrome size={16} />}
        Continuar con Google
      </Button>
      {error ? <p className="rounded-2xl bg-arca-alert/10 px-4 py-3 text-sm text-arca-alert">{error}</p> : null}
    </div>
  );
}
