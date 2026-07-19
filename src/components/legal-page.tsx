import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] bg-arca-base px-5 py-10 text-arca-text-primary sm:px-8 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-arca-accent"
          href="/sign-in"
        >
          <span aria-hidden="true">←</span> Volver a Arca
        </Link>

        <header className="mt-8 border-b border-arca-border pb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-arca-accent">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-arca-text-secondary sm:text-base">{description}</p>
          <p className="mt-4 text-xs text-arca-text-dim">Última actualización: 19 de julio de 2026</p>
        </header>

        <div className="legal-content py-8">{children}</div>

        <footer className="border-t border-arca-border py-6 text-xs text-arca-text-dim">
          Arca Finanzas · Colombia · arcafinanzas26@gmail.com
        </footer>
      </article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold tracking-[-0.02em] text-arca-text-primary">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-arca-text-secondary">{children}</div>
    </section>
  );
}
