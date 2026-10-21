"use client";

import { useState, useRef } from "react";

export interface SpinResult {
  slot: number;
  credits: number;
  prizeLabel: string;
  isPremium: boolean;
  newStreak: number;
  newBalance: number;
}

interface Props {
  regularPrizes: string[];
  premiumPrizes: string[];
  isPremiumSpin: boolean;
  canSpin: boolean;
  onSpin: () => Promise<SpinResult>;
  onResult: (result: SpinResult) => void;
}

const SEG = 8;
const DEG = 360 / SEG;

const COLORS_REGULAR = [
  "#4c1d95", "#1e3a5f", "#064e3b", "#78350f",
  "#312e81", "#7c2d12", "#134e4a", "#3b0764",
];
const COLORS_PREMIUM = [
  "#7c3aed", "#2563eb", "#059669", "#d97706",
  "#4f46e5", "#ea580c", "#0891b2", "#9333ea",
];

export function SpinWheel({ regularPrizes, premiumPrizes, isPremiumSpin, canSpin, onSpin, onResult }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const rotRef = useRef(0);

  const prizes = isPremiumSpin ? premiumPrizes : regularPrizes;
  const colors = isPremiumSpin ? COLORS_PREMIUM : COLORS_REGULAR;

  const gradient = colors
    .map((c, i) => `${c} ${i * DEG}deg ${(i + 1) * DEG}deg`)
    .join(", ");

  const handleSpin = async () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    // Start fast spin while API runs
    const fastSpin = rotRef.current + 1440;
    rotRef.current = fastSpin;
    setRotation(fastSpin);

    try {
      const res = await onSpin();

      // Land on correct slot: slot 0 is at top (0°). Pointer is at top.
      // segment center = slot * DEG + DEG/2
      // we want that center to face the pointer (top = 0°), rotating clockwise.
      // We need: (rotation - segCenter) % 360 == 0 → rotation = k*360 + (360 - segCenter)
      const segCenter = res.slot * DEG + DEG / 2;
      const finalRot = rotRef.current + (360 - (fastSpin % 360) + 360 - segCenter + 720);
      rotRef.current = finalRot;
      setRotation(finalRot);

      setTimeout(() => {
        setResult(res);
        setSpinning(false);
        onResult(res);
      }, 3200);
    } catch {
      setSpinning(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 select-none">
      {/* Premium badge */}
      {isPremiumSpin && (
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30">
          🔥 GIRO PREMIUM — prêmios em dobro!
        </div>
      )}

      {/* Pointer */}
      <div className="text-3xl leading-none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.6))" }}>
        ▼
      </div>

      {/* Wheel */}
      <div className="relative" style={{ width: 280, height: 280 }}>
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${gradient})`,
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? `transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)`
              : "transform 0.1s linear",
            boxShadow: isPremiumSpin
              ? "0 0 40px rgba(245, 158, 11, 0.5), 0 0 80px rgba(245, 158, 11, 0.2)"
              : "0 0 30px rgba(109, 40, 217, 0.5)",
            position: "relative",
          }}
        >
          {/* Segment labels */}
          {prizes.map((prize, i) => {
            const angle = i * DEG + DEG / 2;
            const rad = (angle - 90) * (Math.PI / 180);
            const r = 95;
            const x = 140 + r * Math.cos(rad);
            const y = 140 + r * Math.sin(rad);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#fff",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {prize}
              </div>
            );
          })}

          {/* Dividers */}
          {Array.from({ length: SEG }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "50%",
                height: 2,
                background: "rgba(255,255,255,0.15)",
                transformOrigin: "left center",
                transform: `rotate(${i * DEG}deg)`,
              }}
            />
          ))}
        </div>

        {/* Center hub */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#09090b",
            border: `4px solid ${isPremiumSpin ? "#f59e0b" : "#7c3aed"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            boxShadow: "0 0 20px rgba(0,0,0,0.8)",
            zIndex: 10,
          }}
        >
          {isPremiumSpin ? "🔥" : "🎰"}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="text-center space-y-1 animate-bounce">
          <p className="text-3xl font-black text-amber-400">+{result.credits} créditos!</p>
          <p className="text-sm text-muted-foreground">{result.prizeLabel}</p>
          <p className="text-xs text-violet-400">Saldo: {result.newBalance} créditos</p>
        </div>
      )}

      {/* Spin button */}
      <button
        onClick={handleSpin}
        disabled={!canSpin || spinning}
        className={`px-10 py-3.5 rounded-full text-base font-black text-white transition-all shadow-lg
          ${isPremiumSpin
            ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-orange-500/30 hover:from-amber-400 hover:to-orange-400"
            : "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-violet-500/30 hover:from-violet-500 hover:to-indigo-500"
          }
          disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
      >
        {spinning ? "🌀 Girando…" : canSpin ? (isPremiumSpin ? "🔥 Giro Premium!" : "🎰 Girar!") : "✅ Já girado hoje"}
      </button>

      {!canSpin && !spinning && (
        <p className="text-xs text-muted-foreground">Volte amanhã para seu próximo giro 🌙</p>
      )}
    </div>
  );
}
