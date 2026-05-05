"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, Trophy, Coins, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SpinWheel, type SpinResult } from "@/components/SpinWheel";
import { toast } from "sonner";

const REGULAR_PRIZES = ["2 cr", "2 cr", "5 cr", "5 cr", "10 cr", "25 cr", "50 cr", "💎100"];
const PREMIUM_PRIZES = ["4 cr", "4 cr", "10 cr", "10 cr", "20 cr", "50 cr", "100cr", "🔥200"];

interface SpinStatus {
  canSpin: boolean;
  currentStreak: number;
  longestStreak: number;
  isPremiumSpin: boolean;
  history: { id: string; credits: number; prizeLabel: string; isPremium: boolean; spunAt: string }[];
}

function StreakBar({ current, target = 10 }: { current: number; target?: number }) {
  const pct = Math.min((current % target) / target, 1) * 100;
  const daysLeft = target - (current % target);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {current % target === 0 && current > 0 ? "🔥 Giro Premium disponível!" : `${daysLeft} dia${daysLeft !== 1 ? "s" : ""} para o Giro Premium`}
        </span>
        <span className="font-bold text-violet-400">{current % target}/{target}</span>
      </div>
      <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(to right, #7c3aed, #f59e0b)",
          }}
        />
      </div>
      <div className="flex justify-between">
        {Array.from({ length: target }).map((_, i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
              ${i < (current % target) ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-600"}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SpinPage() {
  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/spin")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => toast.error("Erro ao carregar status do giro."))
      .finally(() => setLoading(false));
  }, []);

  const handleSpin = async (): Promise<SpinResult> => {
    const r = await fetch("/api/spin", { method: "POST" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Erro ao girar.");
    return data;
  };

  const handleResult = (result: SpinResult) => {
    toast.success(`+${result.credits} créditos ganhos! 🎉`, { duration: 4000 });
    setStatus((prev) => prev
      ? {
          ...prev,
          canSpin: false,
          currentStreak: result.newStreak,
          isPremiumSpin: result.newStreak % 10 === 0 && result.newStreak > 0,
          history: [
            { id: "new", credits: result.credits, prizeLabel: result.prizeLabel, isPremium: result.isPremium, spunAt: new Date().toISOString() },
            ...prev.history,
          ].slice(0, 7),
        }
      : prev
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-64 h-64 rounded-full bg-card animate-pulse" />
    </div>
  );

  if (!status) return null;

  const totalWon = status.history.reduce((s, h) => s + h.credits, 0);

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/home"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              🎰 Giro da Sorte
              {status.isPremiumSpin && (
                <span className="text-xs bg-amber-500/20 text-amber-400 rounded-full px-2 py-0.5 font-semibold">PREMIUM</span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">Gire 1× por dia e acumule créditos</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <Flame className="h-5 w-5 text-orange-400 mx-auto mb-1" />
              <p className="text-xl font-black">{status.currentStreak}</p>
              <p className="text-[10px] text-muted-foreground">dias seguidos</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <Trophy className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <p className="text-xl font-black">{status.longestStreak}</p>
              <p className="text-[10px] text-muted-foreground">recorde</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <Coins className="h-5 w-5 text-violet-400 mx-auto mb-1" />
              <p className="text-xl font-black">{totalWon}</p>
              <p className="text-[10px] text-muted-foreground">cr ganhos (7d)</p>
            </CardContent>
          </Card>
        </div>

        {/* Streak bar */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-400" /> Sequência para Giro Premium
            </p>
            <StreakBar current={status.currentStreak} />
          </CardContent>
        </Card>

        {/* Rules card */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 space-y-1.5">
            <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" /> Como funciona</p>
            <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
              <li>1 giro gratuito por dia — ganhe de <strong className="text-white">2 a 100 créditos</strong></li>
              <li>Complete <strong className="text-amber-400">10 dias seguidos</strong> → Giro Premium com prêmios em dobro!</li>
              <li>Sequência quebra se você pular um dia</li>
              <li>Pratique desafios, Live ou ferramentas para manter a sequência</li>
            </ul>
          </CardContent>
        </Card>

        {/* The wheel */}
        <div className="flex justify-center py-2">
          <SpinWheel
            regularPrizes={REGULAR_PRIZES}
            premiumPrizes={PREMIUM_PRIZES}
            isPremiumSpin={status.isPremiumSpin}
            canSpin={status.canSpin}
            onSpin={handleSpin}
            onResult={handleResult}
          />
        </div>

        {/* History */}
        {status.history.length > 0 && (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Últimos giros</p>
              <div className="space-y-2">
                {status.history.map((h, i) => (
                  <div key={h.id + i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{h.isPremium ? "🔥" : "🎰"}</span>
                      <span className="text-muted-foreground text-xs">{new Date(h.spunAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <span className="font-bold text-amber-400">+{h.credits} cr</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
