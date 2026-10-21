"use client";

import { useEffect, useMemo, useState } from "react";

export interface BadgeDef {
  slug: string;
  emoji: string;
  name: string;
  description: string;
}

interface Props {
  badges: BadgeDef[];
  onDone: () => void;
}

const COLORS = ["#7c3aed", "#4f46e5", "#f59e0b", "#10b981", "#ec4899", "#ef4444", "#0ea5e9", "#a855f7"];

export function BadgeCelebration({ badges, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const particles = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        left: `${(i / 90) * 100 + (Math.sin(i) * 5)}%`,
        delay: `${(i % 15) * 0.08}s`,
        duration: `${2.2 + (i % 7) * 0.25}s`,
        color: COLORS[i % COLORS.length],
        size: `${6 + (i % 6)}px`,
        rounded: i % 3 === 0 ? "50%" : "2px",
      })),
    []
  );

  const close = () => {
    setLeaving(true);
    setTimeout(onDone, 400);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (idx < badges.length - 1) {
        setIdx((i) => i + 1);
      } else {
        close();
      }
    }, 4000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, badges.length]);

  if (badges.length === 0) return null;

  const badge = badges[idx];

  return (
    <>
      <style>{`
        @keyframes sf-confetti-fall {
          0%   { transform: translateY(-15px) rotate(0deg); opacity: 1; }
          80%  { opacity: 0.8; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        @keyframes sf-badge-pop {
          0%   { transform: scale(0.4) translateY(20px); opacity: 0; }
          65%  { transform: scale(1.08) translateY(-4px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes sf-badge-leave {
          0%   { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.85); opacity: 0; }
        }
        @keyframes sf-emoji-bounce {
          0%, 100% { transform: scale(1) rotate(-3deg); }
          50%       { transform: scale(1.15) rotate(3deg); }
        }
      `}</style>

      <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
        {/* Confetti particles */}
        {particles.map((p) => (
          <span
            key={p.id}
            style={{
              position: "fixed",
              top: "-20px",
              left: p.left,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.rounded,
              animation: `sf-confetti-fall ${p.duration} ${p.delay} ease-in forwards`,
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Badge card */}
        <div
          className="pointer-events-auto relative bg-card border border-violet-500/40 shadow-2xl shadow-violet-500/20 rounded-2xl px-8 py-8 flex flex-col items-center gap-4 max-w-xs w-full mx-4 text-center"
          style={{
            animation: leaving
              ? "sf-badge-leave 0.4s ease-in forwards"
              : "sf-badge-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-2xl bg-violet-500/5 pointer-events-none" />

          <span
            className="text-6xl select-none"
            style={{ animation: "sf-emoji-bounce 1.2s ease-in-out infinite" }}
          >
            {badge.emoji}
          </span>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-[0.15em]">
              Conquista desbloqueada!
            </p>
            <p className="text-xl font-bold">{badge.name}</p>
            <p className="text-sm text-muted-foreground leading-snug">{badge.description}</p>
          </div>

          {badges.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {idx + 1} de {badges.length}
            </p>
          )}

          <button
            onClick={close}
            className="mt-1 px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            Incrível! 🎉
          </button>
        </div>
      </div>
    </>
  );
}
