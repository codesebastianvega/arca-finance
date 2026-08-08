"use client";

import React from "react";
import { motion } from "motion/react";

type NovaLiquidOrbProps = {
  size?: number;
  isThinking?: boolean;
  className?: string;
};

export function NovaLiquidOrb({
  size = 36,
  isThinking = false,
  className = "",
}: NovaLiquidOrbProps) {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer Ambient Glowing Aura */}
      <motion.div
        className={`absolute inset-0 rounded-full transition-colors duration-500 blur-md pointer-events-none ${
          isThinking
            ? "bg-gradient-to-tr from-amber-500/50 via-orange-500/40 to-purple-600/50"
            : "bg-amber-500/15"
        }`}
        animate={
          isThinking
            ? {
                scale: [1, 1.35, 1],
                opacity: [0.5, 0.9, 0.5],
                rotate: [0, 180, 360],
              }
            : {
                scale: 1,
                opacity: 0.25,
                rotate: 0,
              }
        }
        transition={
          isThinking
            ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
      />

      {/* Outer Layer: Static Greyish Sphere (Idle) vs Fluid Morphing Liquid (Thinking) */}
      <motion.div
        className={`absolute inset-0 transition-colors duration-500 ${
          isThinking
            ? "bg-gradient-to-br from-amber-300 via-amber-500 to-purple-600 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
            : "bg-gradient-to-br from-zinc-600 via-neutral-700 to-amber-900/70 border border-white/10 shadow-sm"
        }`}
        style={{
          borderRadius: isThinking
            ? "42% 58% 65% 35% / 45% 40% 60% 55%"
            : "50%",
        }}
        animate={
          isThinking
            ? {
                borderRadius: [
                  "42% 58% 65% 35% / 45% 40% 60% 55%",
                  "60% 40% 30% 70% / 60% 30% 70% 40%",
                  "35% 65% 55% 45% / 40% 60% 40% 60%",
                  "42% 58% 65% 35% / 45% 40% 60% 55%",
                ],
                rotate: [0, 120, 240, 360],
                scale: [1, 1.08, 0.96, 1],
              }
            : {
                borderRadius: "50%",
                rotate: 0,
                scale: 1,
              }
        }
        transition={{
          duration: isThinking ? 2 : 0,
          repeat: isThinking ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* Inner Layer */}
      <motion.div
        className={`absolute inset-[15%] transition-colors duration-500 opacity-90 ${
          isThinking
            ? "bg-gradient-to-tr from-amber-200 via-orange-400 to-indigo-500"
            : "bg-gradient-to-tr from-zinc-500 via-neutral-600 to-amber-700/50"
        }`}
        style={{
          borderRadius: isThinking
            ? "55% 45% 35% 65% / 50% 60% 40% 50%"
            : "50%",
        }}
        animate={{
          rotate: isThinking ? [360, 0] : 0,
          scale: isThinking ? [0.9, 1.1, 0.9] : 1,
        }}
        transition={{
          duration: isThinking ? 1.5 : 0,
          repeat: isThinking ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* Center Specular Reflection Sparkle */}
      <div className="absolute top-[18%] left-[20%] w-[25%] h-[20%] rounded-full bg-white/50 blur-[0.6px]" />
    </div>
  );
}
