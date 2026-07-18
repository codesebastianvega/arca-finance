"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaContextValue = {
  canInstall: boolean;
  install: () => Promise<"accepted" | "dismissed" | "ios" | "unavailable">;
  isIOS: boolean;
  isInstalled: boolean;
};

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  install: async () => "unavailable",
  isIOS: false,
  isInstalled: false,
});

export function usePwa() {
  return useContext(PwaContext);
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
    const iosStandalone = Boolean(iosNavigator.standalone);
    const ios = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
    setIsIOS(ios);
    setIsInstalled(standalone || iosStandalone);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let intervalId: number | undefined;

    const register = async () => {
      try {
        const nextRegistration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (disposed) return;
        setRegistration(nextRegistration);

        const watchInstallingWorker = () => {
          const worker = nextRegistration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        };

        nextRegistration.addEventListener("updatefound", watchInstallingWorker);
        intervalId = window.setInterval(() => void nextRegistration.update(), 60 * 60 * 1000);
      } catch (error) {
        console.error("No se pudo registrar el service worker de Arca.", error);
      }
    };

    void register();
    return () => {
      disposed = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  const value = useMemo<PwaContextValue>(
    () => ({
      canInstall: !isInstalled && Boolean(installPrompt || isIOS),
      install: async () => {
        if (isIOS && !installPrompt) return "ios";
        if (!installPrompt) return "unavailable";
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        setInstallPrompt(null);
        return choice.outcome;
      },
      isIOS,
      isInstalled,
    }),
    [installPrompt, isIOS, isInstalled],
  );

  const applyUpdate = () => {
    if (!registration?.waiting) {
      window.location.reload();
      return;
    }

    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <PwaContext.Provider value={value}>
      {children}
      {updateAvailable ? (
        <div className="fixed inset-x-4 top-4 z-[500] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-arca-accent/30 bg-arca-surface-1/95 p-3 shadow-2xl backdrop-blur-xl pt-safe">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-arca-text-primary">Nueva versión disponible</p>
            <p className="text-[10px] text-arca-text-dim">Actualiza Arca sin perder tu sesión.</p>
          </div>
          <button type="button" onClick={applyUpdate} className="flex h-9 items-center gap-1.5 rounded-xl bg-arca-accent px-3 text-[10px] font-black text-[#15110c]">
            <RefreshCw size={13} />
            Actualizar
          </button>
        </div>
      ) : null}
    </PwaContext.Provider>
  );
}
