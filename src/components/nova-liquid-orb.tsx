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
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/40 via-orange-500/30 to-purple-600/40 blur-md pointer-events-none"
        animate={
          isThinking
            ? {
                scale: [1, 1.35, 1],
                opacity: [0.5, 0.9, 0.5],
                rotate: [0, 180, 360],
              }
            : {
                scale: [1, 1.15, 1],
                opacity: [0.35, 0.6, 0.35],
              }
        }
        transition={
          isThinking
            ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
        }
      />

      {/* Outer Liquid Morphing Mesh Layer */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-amber-300 via-amber-500 to-purple-600 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
        style={{ borderRadius: "42% 58% 65% 35% / 45% 40% 60% 55%" }}
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
                borderRadius: [
                  "42% 58% 65% 35% / 45% 40% 60% 55%",
                  "50% 50% 40% 60% / 55% 45% 55% 45%",
                  "42% 58% 65% 35% / 45% 40% 60% 55%",
                ],
                rotate: [0, 90, 180, 360],
                scale: [1, 1.04, 1],
              }
        }
        transition={{
          duration: isThinking ? 2 : 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Inner Fluid Shimmer Layer */}
      <motion.div
        className="absolute inset-[15%] bg-gradient-to-tr from-amber-200 via-orange-400 to-indigo-500 opacity-95"
        style={{ borderRadius: "55% 45% 35% 65% / 50% 60% 40% 50%" }}
        animate={{
          rotate: isThinking ? [360, 0] : [0, 360],
          scale: isThinking ? [0.9, 1.1, 0.9] : [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: isThinking ? 1.5 : 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Center Specular Reflection Sparkle */}
      <div className="absolute top-[20%] left-[22%] w-[25%] h-[20%] rounded-full bg-white/70 blur-[0.6px]" />
    </div>
  );
}
