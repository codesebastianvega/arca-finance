"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/src/lib/supabase-browser";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-.9 6.8-2.3l-3.3-2.6c-.9.6-2.1 1-3.5 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.4 14a6 6 0 0 1 0-3.9V7.4H3a10 10 0 0 0 0 9.3L6.4 14Z" fill="#FBBC05" />
      <path d="M12 6c1.5 0 2.9.5 3.9 1.5l3-3A10 10 0 0 0 3 7.4l3.4 2.7C7.2 7.7 9.4 6 12 6Z" fill="#EA4335" />
    </svg>
  );
}

export function GoogleAuthButton() {
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
    const redirectTo = `${baseOrigin}/auth/callback`;
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
      <button
        type="button"
        className="group flex h-14 w-full items-center justify-between rounded-2xl bg-[#F4F7F5] px-4 text-[#101412] shadow-[0_12px_30px_-18px_rgba(244,247,245,0.65)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arca-accent focus-visible:ring-offset-2 focus-visible:ring-offset-arca-surface-1 disabled:cursor-wait disabled:opacity-70"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
      >
        <span className="flex items-center gap-3">
          {loading ? <LoaderCircle size={20} className="animate-spin" /> : <GoogleMark />}
          <span className="text-sm font-bold">{loading ? "Abriendo Google…" : "Continuar con Google"}</span>
        </span>
        <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={18} />
      </button>
      {error ? (
        <p role="alert" className="rounded-2xl border border-arca-alert/25 bg-arca-alert/10 px-4 py-3 text-sm text-arca-alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
