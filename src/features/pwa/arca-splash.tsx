"use client";

import { useEffect, useState } from "react";

const SPLASH_SESSION_KEY = "arca:splash:v2";

export function ArcaSplash() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SPLASH_SESSION_KEY)) {
        setVisible(false);
        return;
      }
      window.sessionStorage.setItem(SPLASH_SESSION_KEY, "shown");
    } catch {
      // The splash still works when storage is unavailable.
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const exitTimer = window.setTimeout(() => setLeaving(true), reduceMotion ? 450 : 1_420);
    const removeTimer = window.setTimeout(() => setVisible(false), reduceMotion ? 620 : 1_780);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`arca-splash ${leaving ? "arca-splash--leaving" : ""}`}
      role="status"
      aria-label="Iniciando Arca"
    >
      <div className="arca-splash__glow" />
      <div className="arca-splash__identity">
        <svg
          className="arca-splash__mark"
          width="184"
          height="206"
          viewBox="0 0 180 200"
          aria-hidden="true"
        >
          <path
            className="arca-splash__vault"
            d="M 28,150 Q 14,62 90,18 Q 166,62 152,150"
            fill="none"
            stroke="#F2EBDD"
            strokeWidth="21"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
          />
          <circle className="arca-splash__nova" cx="90" cy="106" r="12" fill="#D89C56" />
        </svg>

        <div className="arca-splash__wordmark" aria-hidden="true">
          <span>ARCA.</span>
          <small>CON NOVA</small>
        </div>
      </div>

      <style jsx>{`
        .arca-splash {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: #090b0a;
          opacity: 1;
          transition: opacity 340ms ease, visibility 340ms ease;
        }

        .arca-splash--leaving {
          visibility: hidden;
          opacity: 0;
        }

        .arca-splash__glow {
          position: absolute;
          width: min(82vw, 360px);
          aspect-ratio: 1;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(216, 156, 86, 0.12), transparent 68%);
          opacity: 0;
          animation: arca-glow 1.2s 420ms ease-out forwards;
        }

        .arca-splash__identity {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translateY(-2vh);
        }

        .arca-splash__mark {
          overflow: visible;
          filter: drop-shadow(0 12px 34px rgba(0, 0, 0, 0.38));
        }

        .arca-splash__vault {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: arca-draw 820ms 120ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }

        .arca-splash__nova {
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: arca-nova 520ms 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .arca-splash__wordmark {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: -12px;
          opacity: 0;
          transform: translateY(12px);
          animation: arca-wordmark 440ms 850ms ease-out forwards;
        }

        .arca-splash__wordmark span {
          color: #f2ebdd;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          font-size: 2.35rem;
          font-weight: 750;
          letter-spacing: -0.055em;
          line-height: 1;
        }

        .arca-splash__wordmark small {
          margin-top: 12px;
          color: #d89c56;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          font-size: 0.68rem;
          font-weight: 650;
          letter-spacing: 0.42em;
          line-height: 1;
          padding-left: 0.42em;
        }

        @keyframes arca-draw {
          to { stroke-dashoffset: 0; }
        }

        @keyframes arca-nova {
          0% { opacity: 0; transform: scale(0.35); }
          62% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes arca-wordmark {
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes arca-glow {
          0% { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .arca-splash,
          .arca-splash__glow,
          .arca-splash__vault,
          .arca-splash__nova,
          .arca-splash__wordmark {
            animation: none;
            transition-duration: 160ms;
          }

          .arca-splash__glow,
          .arca-splash__nova,
          .arca-splash__wordmark {
            opacity: 1;
            transform: none;
          }

          .arca-splash__vault { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
