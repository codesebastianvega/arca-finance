import type React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163a5f]/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[#163a5f] text-white hover:bg-[#102d49]",
        secondary: "bg-[#f4ece2] text-[#111111] hover:bg-[#eadfce]",
        ghost: "bg-transparent text-[#111111] hover:bg-black/5",
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
  return <div className={cn("rounded-2xl border border-black/8 bg-[var(--surface)] shadow-[0_1px_0_rgba(17,17,17,0.04)]", className)} {...props} />;
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "bg-black/5 text-black/75",
    success: "bg-[rgba(22,115,91,0.12)] text-[var(--success)]",
    warning: "bg-[rgba(184,106,30,0.12)] text-[var(--warning)]",
    danger: "bg-[rgba(164,61,49,0.12)] text-[var(--danger)]",
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
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-black/55">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold text-[#111111]">{value}</p>
          {delta ? <p className="mt-1 text-sm text-black/55">{delta}</p> : null}
        </div>
        <Badge tone={tone}>{tone}</Badge>
      </div>
    </Card>
  );
}
