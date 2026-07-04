import type React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "arca-focus inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "arca-primary-action",
        secondary: "border border-[var(--line)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[#e5d7c5]",
        ghost: "bg-transparent text-[var(--foreground)] hover:bg-black/5",
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

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("arca-panel rounded-2xl", className)} {...props} />;
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "bg-black/7 text-[var(--foreground)]",
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
