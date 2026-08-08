import * as React from "react";
import { cn } from "@/lib/utils";

const auroraKeyframes = `
  @keyframes rocket-aurora-travel {
    0% { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: -100; }
  }
  @keyframes rocket-aurora-rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export interface NovaRocketLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  isThinking?: boolean;
  className?: string;
}

export const NovaRocketLoader = React.forwardRef<HTMLDivElement, NovaRocketLoaderProps>(
  ({ className, size = 44, isThinking = true, ...props }, ref) => {
    const id = React.useId();
    const gradientId = `aurora-grad-${id}`;

    // SVG path of a sleek rocket icon
    const rocketPath = "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z M12 15l-3-3 M15 12l-3-3 M9 18l3 3 M4.5 19.5L9 15 M15 9l4.5-4.5 M16.5 4.5c2.5 0 5-1.5 6-3 -1.5 1-3 3.5-3 6 0 3 2.5 5 4 5 1.5 0 3.5-2 4.5-3.5-1.5 1-3.5 2-6 2s-4-2.5-4-4.5z M12 6.5C12 9.5 8.5 13 4.5 15L3 13.5C5 9.5 8.5 6 11.5 6l.5.5z";

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn("relative flex items-center justify-center shrink-0 select-none", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <style>{auroraKeyframes}</style>

        {/* Ambient Glowing Backing */}
        {isThinking && (
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/40 via-pink-500/40 to-purple-600/40 blur-md pointer-events-none animate-pulse"
          />
        )}

        <svg
          viewBox="0 0 24 24"
          height={size}
          width={size}
          aria-hidden="true"
          className="relative z-10 overflow-visible"
        >
          <defs>
            {/* Aurora Gradient: Amber -> Pink -> Purple -> Cyan */}
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="35%" stopColor="#EC4899" />
              <stop offset="70%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>

          {/* Base Rocket Outline */}
          <path
            d={rocketPath}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("transition-colors duration-500", isThinking ? "text-amber-500/30" : "text-zinc-600")}
          />

          {/* Animated Aurora Dash Stroke (Active when thinking) */}
          {isThinking && (
            <path
              d={rocketPath}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={2.4}
              strokeDasharray="25, 75"
              strokeDashoffset={0}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              style={{ animation: `rocket-aurora-travel 1.6s linear infinite` }}
            />
          )}
        </svg>

        <span className="sr-only">Nova procesando...</span>
      </div>
    );
  }
);

NovaRocketLoader.displayName = "NovaRocketLoader";
