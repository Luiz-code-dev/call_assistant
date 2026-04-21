"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Zap, TrendingUp, ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Submission {
  id: string;
  content: string;
  createdAt: string;
  circleId: string;
  challenge: { title: string; circleId: string };
  evaluation?: { totalScore: number; fluencyScore: number; contentScore: number; clarityScore: number; feedback: string } | null;
}

interface Circle { id: string; name: string; myRole: string }

export default function ProgressPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/network/circles?filter=mine").then((r) => r.json()),
    ])
      .then(async ([me, myCircles]) => {
        setUserId(me.id);
        const circs: Circle[] = Array.isArray(myCircles) ? myCircles : [];
        setCircles(circs);
        const allSubs: Submission[] = [];
        await Promise.all(
          circs.map(async (c) => {
            const chRes = await fetch(`/api/network/challenges?circleId=${c.id}`);
            if (!chRes.ok) return;
            const chs = await chRes.json();
            await Promise.all(
              chs.map(async (ch: { id: string; title: string }) => {
                const sRes = await fetch(`/api/network/submissions?challengeId=${ch.id}`);
                if (!sRes.ok) return;
                const subs: Submission[] = await sRes.json();
                const mine = subs.filter((s) => (s as any).user?.id === me.id);
                allSubs.push(...mine.map((s) => ({ ...s, challenge: { title: ch.title, circleId: c.id } })));
              })
            );
          })
        );
        allSubs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissions(allSubs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const evaluated = submissions.filter((s) => s.evaluation);
  const totalScore = evaluated.reduce((acc, s) => acc + (s.evaluation?.totalScore ?? 0), 0);
  const avgScore = evaluated.length > 0 ? (totalScore / evaluated.length).toFixed(1) : "—";
  const streak = calcStreak(submissions);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link href="/network"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold">Meu Progresso</h1>
          <p className="text-sm text-muted-foreground">Sua evolução no SpeakFlow Network</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Zap className="h-5 w-5 text-violet-400" />} label="Respostas" value={String(submissions.length)} />
        <StatCard icon={<Star className="h-5 w-5 text-amber-400" />} label="Avaliadas" value={String(evaluated.length)} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} label="Score médio" value={String(avgScore)} />
        <StatCard icon={<Trophy className="h-5 w-5 text-orange-400" />} label="Streak (dias)" value={String(streak)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {evaluated.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Scores por critério</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(["fluencyScore","contentScore","clarityScore"] as const).map((k) => {
                const label = k === "fluencyScore" ? "Fluência" : k === "contentScore" ? "Conteúdo" : "Clareza";
                const avg = evaluated.reduce((acc, s) => acc + (s.evaluation?.[k] ?? 0), 0) / evaluated.length;
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium">{avg.toFixed(1)}/10</span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500" style={{ width: `${avg * 10}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card className={`border-border/50 ${evaluated.length > 0 ? "md:col-span-2" : "md:col-span-3"}`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Meus Circles ({circles.length})</CardTitle></CardHeader>
          <CardContent>
            {circles.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <p className="mb-3">Nenhum Circle ainda.</p>
                <Button size="sm" asChild><Link href="/network/circles">Descobrir Circles</Link></Button>
              </div>
            ) : (
              <div className="space-y-2">
                {circles.map((c) => (
                  <Link key={c.id} href={`/network/${c.id}`} className="flex items-center justify-between rounded-lg border border-border/50 p-2.5 hover:border-violet-500/30 transition-colors">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{c.myRole}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">Histórico de respostas</h2>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-card/50 animate-pulse border border-border/50" />)}</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>Nenhuma resposta ainda. Participe de um desafio!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => (
              <Link key={s.id} href={`/network/${s.challenge.circleId}/challenge/${(s as any).challengeId ?? ""}`}>
                <Card className="border-border/50 hover:border-violet-500/30 transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.challenge.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(s.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                    {s.evaluation ? (
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-violet-400">{s.evaluation.totalScore}/10</div>
                        <div className="text-[10px] text-muted-foreground">avaliado</div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">Sem avaliação</span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function calcStreak(submissions: Submission[]): number {
  if (submissions.length === 0) return 0;
  const days = Array.from(new Set(submissions.map((s) => new Date(s.createdAt).toDateString()))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  let streak = 1;
  for (let i = 0; i < days.length - 1; i++) {
    const diff = (new Date(days[i]).getTime() - new Date(days[i + 1]).getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}
