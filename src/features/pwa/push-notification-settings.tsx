"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, CheckCircle2, LoaderCircle, Smartphone } from "lucide-react";
import { disablePushSubscription, getPushConfiguration, savePushSubscription, sendTestPush } from "@/app/push-actions";

type PushState = "checking" | "unsupported" | "blocked" | "available" | "enabled" | "error";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

export function PushNotificationSettings() {
  const [state, setState] = useState<PushState>("checking");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }
    void navigator.serviceWorker.getRegistration("/").then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      setState(subscription ? "enabled" : "available");
    }).catch(() => setState("available"));
  }, []);

  const enable = () => startTransition(async () => {
    try {
      setMessage("");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "available");
        return;
      }
      const config = await getPushConfiguration();
      if (!config.publicKey) throw new Error("Falta configurar la clave pública VAPID en el servidor.");
      const registration = await navigator.serviceWorker.getRegistration("/") ?? await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(config.publicKey) });
      const serialized = subscription.toJSON();
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys?.auth) throw new Error("El navegador no entregó una suscripción válida.");
      await savePushSubscription({ endpoint: serialized.endpoint, expirationTime: serialized.expirationTime, keys: { p256dh: serialized.keys.p256dh, auth: serialized.keys.auth }, userAgent: navigator.userAgent });
      setState("enabled");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "No pudimos activar las notificaciones.");
    }
  });

  const disable = () => startTransition(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await disablePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("available");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "No pudimos desactivar las notificaciones.");
    }
  });

  const testPush = () => startTransition(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) throw new Error("Este dispositivo no tiene una suscripción activa.");
      await sendTestPush(subscription.endpoint);
      setMessage("Prueba enviada. Debe aparecer como una notificación del sistema.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos enviar la prueba.");
    }
  });

  if (state === "checking") return <div className="flex items-center gap-2 text-[10px] text-arca-text-dim"><LoaderCircle className="animate-spin" size={14} /> Revisando este dispositivo…</div>;

  return (
    <div className="rounded-2xl border border-arca-border bg-arca-surface-2/60 p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${state === "enabled" ? "bg-arca-positive/10 text-arca-positive" : "bg-arca-accent/10 text-arca-accent"}`}>{state === "enabled" ? <CheckCircle2 size={19} /> : <BellRing size={19} />}</span>
        <div className="min-w-0 flex-1"><p className="text-xs font-black text-arca-text-primary">{state === "enabled" ? "Avisos activos en este dispositivo" : "Recibe avisos con Arca cerrada"}</p><p className="mt-1 text-[10px] leading-4 text-arca-text-dim">{state === "blocked" ? "Los avisos están bloqueados. Habilítalos desde los ajustes del navegador o del sistema." : state === "unsupported" ? "Este navegador no admite Web Push. En iPhone instala Arca y ábrela desde la pantalla de inicio." : "Arca puede recordarte pagos próximos, vencimientos y cobros importantes."}</p></div>
      </div>
      {message ? <p className={`mt-3 text-[10px] leading-4 ${state === "enabled" ? "text-arca-positive" : "text-arca-alert"}`}>{message}</p> : null}
      {state !== "unsupported" && state !== "blocked" ? <div className={`mt-3 grid gap-2 ${state === "enabled" ? "grid-cols-2" : "grid-cols-1"}`}>{state === "enabled" ? <button type="button" disabled={isPending} onClick={testPush} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-arca-accent text-[10px] font-black text-black disabled:opacity-50"><BellRing size={14} /> Enviar prueba</button> : null}<button type="button" disabled={isPending} onClick={state === "enabled" ? disable : enable} className={`flex h-10 items-center justify-center gap-2 rounded-xl text-[10px] font-black disabled:opacity-50 ${state === "enabled" ? "border border-arca-border bg-arca-surface-1 text-arca-text-secondary" : "bg-arca-accent text-black"}`}>{isPending ? <LoaderCircle className="animate-spin" size={14} /> : <Smartphone size={14} />}{isPending ? "Procesando…" : state === "enabled" ? "Desactivar" : "Activar avisos"}</button></div> : null}
    </div>
  );
}
