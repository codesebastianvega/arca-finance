import type React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "arca-focus inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "arca-primary-action",
        secondary:
          "border border-[var(--border)] border-t-[var(--border-top-highlight)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[color:color-mix(in_srgb,var(--surface-2)_78%,var(--surface-strong)_22%)]",
        ghost: "bg-transparent text-[var(--text-primary)] hover:bg-[color:color-mix(in_srgb,var(--surface)_58%,transparent)]",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

const cardVariants = cva("rounded-2xl", {
  variants: {
    variant: {
      default: "arca-panel",
      featured: "arca-panel-featured",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export function Card({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants>) {
  return <div className={cn(cardVariants({ variant, className }))} {...props} />;
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "bg-[color:color-mix(in_srgb,var(--surface-2)_78%,var(--surface-strong)_22%)] text-[var(--text-primary)]",
    success: "bg-[var(--success-bg)] text-[var(--success)]",
    warning: "bg-[var(--warning-bg)] text-[var(--warning)]",
    danger: "bg-[var(--danger-bg)] text-[var(--danger)]",
  } as const;
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", tones[tone], className)} {...props} />;
}

export function MetricCard({
  label,
  value,
  delta,
  tone = "neutral",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneLabels = {
    neutral: "Info",
    success: "Bien",
    warning: "Atento",
    danger: "Riesgo",
  } as const;

  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xl font-semibold text-[var(--foreground)] xl:text-2xl">{value}</p>
          {delta ? <p className="mt-1 text-sm text-[var(--muted)]">{delta}</p> : null}
        </div>
        <Badge tone={tone}>{toneLabels[tone]}</Badge>
      </div>
    </Card>
  );
}

export function Logo({
  compact = false,
  withWordmark = true,
  href,
  className,
}: {
  compact?: boolean;
  withWordmark?: boolean;
  href?: string;
  className?: string;
}) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] border-t-[var(--border-top-highlight)] bg-[color:color-mix(in_srgb,var(--surface)_90%,var(--surface-strong)_10%)] shadow-[var(--elevation-soft)]">
        <img
          src="/brand/arca/logo-mark-transparent.svg"
          alt="Arca"
          className={cn("h-7 w-7 object-contain", compact ? "h-6 w-6" : "h-7 w-7")}
        />
      </div>
      {withWordmark ? (
        <div className="flex min-w-0 flex-col">
          <div className="flex items-baseline gap-1 leading-none">
            <span
              className={cn(
                "font-semibold uppercase text-[var(--accent)]",
                compact ? "text-[0.82rem] tracking-[0.24em]" : "text-[1rem] tracking-[0.28em]"
              )}
            >
              A
            </span>
            <span
              className={cn(
                "font-semibold uppercase text-[var(--foreground)]",
                compact ? "text-[0.74rem] tracking-[0.28em]" : "text-[0.92rem] tracking-[0.34em]"
              )}
            >
              RCA
            </span>
          </div>
          {!compact ? <p className="mt-1 text-sm text-[var(--muted)]">Control claro de dinero</p> : null}
        </div>
      ) : null}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-4xl", align === "center" ? "mx-auto text-center" : "")}>
      {eyebrow ? <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">{eyebrow}</p> : null}
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">{title}</h1>
      {description ? <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base sm:leading-8">{description}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("arca-muted-block rounded-2xl p-6", className)}>
      <h3 className="text-xl font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">{description}</p>
      {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
