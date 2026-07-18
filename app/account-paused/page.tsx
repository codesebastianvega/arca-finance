import { CirclePause, LogOut } from 'lucide-react';

export default function AccountPausedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-arca-base px-6 text-arca-text-primary">
      <section className="w-full max-w-sm rounded-3xl border border-arca-border bg-arca-surface-1 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-arca-alert/10 text-arca-alert"><CirclePause size={26} /></div>
        <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-arca-alert">Cuenta suspendida</p>
        <h1 className="mt-2 text-2xl font-black">Tu acceso está pausado</h1>
        <p className="mt-3 text-sm leading-relaxed text-arca-text-dim">Tus datos permanecen protegidos. Contacta al equipo de Arca para revisar el estado de tu cuenta.</p>
        <a href="/auth/sign-out" className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-arca-surface-2 py-3 text-sm font-bold text-arca-text-primary"><LogOut size={17} /> Cerrar sesión</a>
      </section>
    </main>
  );
}
