"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Target, Zap, TrendingUp, Users, Star, BookOpen, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Stats {
  totalSubmissions: number;
  evaluatedSubmissions: number;
  avgScore: number;
  quizCount: number;
  quizTotalPts: number;
  quizAccuracy: number;
}

interface SubmissionItem {
  id: string;
  createdAt: string;
  content: string;
  challenge: { id: string; title: string; type: string; circleId: string } | null;
  evaluation: { totalScore: number; feedback: string } | null;
}

interface CircleRank {
  id: string;
  name: string;
  focus: string;
  role: string;
  rank: number | null;
  totalMembers: number | null;
}

interface SpinStatus {
  canSpin: boolean;
  currentStreak: number;
  longestStreak: number;
  isPremiumSpin: boolean;
  history: { id: string; credits: number; prizeLabel: string; isPremium: boolean; spunAt: string }[];
}

interface ProgressData {
  stats: Stats;
  submissions: SubmissionItem[];
  circles: CircleRank[];
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function typeLabel(type: string) {
  if (type === "quiz") return { text: "Quiz", cls: "bg-violet-500/20 text-violet-400" };
  if (type === "spoken") return { text: "Voz", cls: "bg-red-500/20 text-red-400" };
  return { text: "Escrito", cls: "bg-emerald-500/20 text-emerald-400" };
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [spin, setSpin] = useState<SpinStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/progress").then((r) => r.json()),
      fetch("/api/spin").then((r) => r.json()),
    ]).then(([prog, sp]) => {
      setData(prog);
      setSpin(sp);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-2xl mx-auto">
      <div className="h-8 w-40 rounded bg-card animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />)}
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Erro ao carregar progresso.</p>
    </div>
  );

  const { stats, submissions, circles } = data;

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/home"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Meu Progresso</h1>
            <p className="text-xs text-muted-foreground">Sua evolução nos desafios</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Target} label="Desafios feitos" value={stats.totalSubmissions} color="bg-violet-600" />
          <StatCard icon={Star} label="Score médio" value={stats.avgScore > 0 ? `${stats.avgScore}/10` : "—"} sub={`${stats.evaluatedSubmissions} avaliados`} color="bg-amber-500" />
          <StatCard icon={Zap} label="Quizzes" value={stats.quizCount} sub={`${stats.quizTotalPts} pts acumulados`} color="bg-emerald-600" />
          <StatCard icon={TrendingUp} label="Acertos quiz" value={stats.quizAccuracy > 0 ? `${stats.quizAccuracy}%` : "—"} sub="de precisão média" color="bg-pink-600" />
        </div>

        {/* Circle rankings */}
        {circles.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-400" />
                Meus Circles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {circles.map((c) => (
                <Link key={c.id} href={`/network/${c.id}`}>
                  <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-4 py-3 hover:border-violet-500/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.focus}</p>
                    </div>
                    {c.rank ? (
                      <div className="text-right">
                        <p className="text-sm font-bold text-violet-400">#{c.rank}</p>
                        <p className="text-[11px] text-muted-foreground">de {c.totalMembers}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem dados</span>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Spin / streak card */}
        {spin && (
          <Card className="border-border/50">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" /> Giro da Sorte
              </p>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/spin" className="text-xs text-violet-400 hover:underline">
                  {spin.canSpin ? "🎰 Girar agora" : "Ver histórico"} →
                </Link>
              </Button>
            </div>
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/20 py-2">
                  <p className="text-lg font-black text-orange-400">{spin.currentStreak}</p>
                  <p className="text-[10px] text-muted-foreground">dias seguidos</p>
                </div>
                <div className="rounded-lg bg-muted/20 py-2">
                  <p className="text-lg font-black text-amber-400">{spin.longestStreak}</p>
                  <p className="text-[10px] text-muted-foreground">recorde</p>
                </div>
                <div className="rounded-lg bg-muted/20 py-2">
                  <p className="text-lg font-black text-violet-400">
                    {spin.history.reduce((s, h) => s + h.credits, 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">cr ganhos (7d)</p>
                </div>
              </div>
              {spin.history.length > 0 && (
                <div className="space-y-1.5">
                  {spin.history.slice(0, 5).map((h, i) => (
                    <div key={h.id + i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span>{h.isPremium ? "🔥" : "🎰"}</span>
                        <span className="text-muted-foreground">{new Date(h.spunAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <span className="font-bold text-amber-400">+{h.credits} cr</span>
                    </div>
                  ))}
                </div>
              )}
              {spin.isPremiumSpin && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-center text-xs text-amber-400 font-semibold">
                  🔥 Giro Premium disponível — prêmios em dobro!
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent activity */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-400" />
              Atividade recente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {submissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum desafio feito ainda.</p>
                <Link href="/network" className="mt-2 inline-block text-xs text-violet-400 hover:underline">Explorar Circles →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {submissions.map((s) => {
                  const tl = s.challenge ? typeLabel(s.challenge.type) : { text: "—", cls: "" };
                  let quizScore: number | null = null;
                  if (s.challenge?.type === "quiz") {
                    try { quizScore = JSON.parse(s.content)?.score ?? null; } catch {}
                  }
                  return (
                    <Link key={s.id} href={s.challenge ? `/network/${s.challenge.circleId}/challenge/${s.challenge.id}` : "#"}>
                      <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 px-4 py-3 hover:border-violet-500/20 transition-colors gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tl.cls}`}>{tl.text}</span>
                            <span className="text-[11px] text-muted-foreground">{new Date(s.createdAt).toLocaleDateString("pt-BR")}</span>
                          </div>
                          <p className="text-sm font-medium truncate">{s.challenge?.title ?? "Desafio"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          {quizScore !== null ? (
                            <p className="text-sm font-bold text-violet-400">{quizScore.toFixed(1)} pts</p>
                          ) : s.evaluation ? (
                            <p className="text-sm font-bold text-amber-400">{s.evaluation.totalScore}/10</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Pendente</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
