"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Trophy, Zap, ArrowLeft, LogOut, Crown, Shield, Loader2, Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Member { id: string; role: string; user: { id: string; name: string; avatarUrl?: string | null } }
interface Challenge { id: string; title: string; prompt: string; endsAt: string; isActive: boolean; hasSubmitted: boolean; _count: { submissions: number } }
interface Circle {
  id: string; name: string; description?: string; focus: string; level: string;
  visibility: string; maxMembers: number; myRole: string | null;
  _count: { members: number }; members: Member[]; challenges: Challenge[];
}

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-violet-600 to-indigo-600","from-emerald-500 to-teal-600","from-rose-500 to-pink-600","from-amber-500 to-orange-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`h-${size} w-${size} rounded-full object-cover ring-2 ring-border`} />;
  return <div className={`h-${size} w-${size} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>{initials}</div>;
}

const roleIcon = (role: string) => {
  if (role === "owner") return <Crown className="h-3 w-3 text-amber-400" />;
  if (role === "moderator") return <Shield className="h-3 w-3 text-blue-400" />;
  return null;
};

export default function CircleDetailPage() {
  const { circleId } = useParams<{ circleId: string }>();
  const router = useRouter();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [tab, setTab] = useState<"feed" | "members" | "ranking">("feed");

  const load = useCallback(async () => {
    const [cRes, chRes] = await Promise.all([
      fetch(`/api/network/circles/${circleId}`),
      fetch(`/api/network/challenges?circleId=${circleId}`),
    ]);
    if (cRes.ok) setCircle(await cRes.json());
    else { toast.error("Circle não encontrado."); router.push("/network"); }
    if (chRes.ok) setChallenges(await chRes.json());
    setLoading(false);
  }, [circleId, router]);

  useEffect(() => { load(); }, [load]);

  const leave = async () => {
    if (!confirm("Sair deste Circle?")) return;
    setLeaving(true);
    const r = await fetch(`/api/network/circles/${circleId}/leave`, { method: "POST" });
    if (r.ok) { toast.success("Você saiu do Circle."); router.push("/network"); }
    else { const d = await r.json(); toast.error(d.error ?? "Erro ao sair."); setLeaving(false); }
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="h-32 rounded-xl bg-card/50 animate-pulse border border-border/50" />
      <div className="h-48 rounded-xl bg-card/50 animate-pulse border border-border/50" />
    </div>
  );
  if (!circle) return null;

  const activeChallenge = challenges.find((c) => c.isActive);
  const isMember = !!circle.myRole;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link href="/network"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{circle.name}</h1>
          <p className="text-sm text-muted-foreground">{circle.focus} · {circle.level} · {circle._count.members}/{circle.maxMembers} membros</p>
        </div>
        {isMember && ["owner","moderator"].includes(circle.myRole ?? "") && (
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href={`/network/${circleId}/manage`}><Settings className="h-4 w-4 mr-1" />Gerenciar</Link>
          </Button>
        )}
        {isMember && circle.myRole !== "owner" && (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-400" onClick={leave} disabled={leaving}>
            {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4 mr-1" />Sair</>}
          </Button>
        )}
      </div>

      {circle.description && <p className="text-sm text-muted-foreground">{circle.description}</p>}

      {activeChallenge && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">Desafio Ativo</span>
                </div>
                <h3 className="font-semibold">{activeChallenge.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activeChallenge.prompt}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Encerra {new Date(activeChallenge.endsAt).toLocaleDateString("pt-BR")}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{activeChallenge._count.submissions} respostas</span>
                </div>
              </div>
              <Button size="sm" asChild className={activeChallenge.hasSubmitted ? "" : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0"}>
                <Link href={`/network/${circleId}/challenge/${activeChallenge.id}`}>
                  {activeChallenge.hasSubmitted ? "Ver minha resposta" : "Responder"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 border-b border-border/50">
        {(["feed", "members", "ranking"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-violet-500 text-violet-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "feed" ? "Desafios" : t === "members" ? "Membros" : "Ranking"}
          </button>
        ))}
      </div>

      {tab === "feed" && (
        <div className="space-y-3">
          {challenges.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Nenhum desafio ainda.</p>
              {["owner","moderator"].includes(circle.myRole ?? "") && (
                <p className="text-xs mt-1">Como moderador, você pode criar desafios.</p>
              )}
            </div>
          ) : challenges.map((ch) => (
            <Link key={ch.id} href={`/network/${circleId}/challenge/${ch.id}`}>
              <Card className={`border-border/50 hover:border-violet-500/30 transition-all cursor-pointer ${ch.isActive ? "bg-emerald-500/3" : ""}`}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {ch.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Ativo</span>}
                      {ch.hasSubmitted && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-medium">Respondido</span>}
                    </div>
                    <h4 className="font-medium text-sm truncate">{ch.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{ch._count.submissions} respostas · encerra {new Date(ch.endsAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {tab === "members" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {circle.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3">
              <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size={9} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{m.user.name}</span>
                  {roleIcon(m.role)}
                </div>
                <span className="text-xs text-muted-foreground capitalize">{m.role}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "ranking" && <RankingTab circleId={circleId} />}
    </div>
  );
}

function RankingTab({ circleId }: { circleId: string }) {
  const [period, setPeriod] = useState<"all" | "weekly">("all");
  const [data, setData] = useState<{ rank: number; name: string; avatarUrl?: string | null; totalScore: number; avgScore: number; submissionCount: number; isMe: boolean; role: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/network/leaderboard/${circleId}?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d.rankings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [circleId, period]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all","weekly"] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${period === p ? "border-violet-500 bg-violet-500/20 text-violet-300" : "border-border/50 text-muted-foreground"}`}>
            {p === "all" ? "Geral" : "Esta semana"}
          </button>
        ))}
      </div>
      {loading ? <div className="h-40 rounded-xl bg-card/50 animate-pulse border border-border/50" /> : (
        <div className="space-y-2">
          {data.map((entry) => (
            <div key={entry.rank} className={`flex items-center gap-3 rounded-lg border p-3 ${entry.isMe ? "border-violet-500/40 bg-violet-500/5" : "border-border/50"}`}>
              <span className={`w-7 text-center text-sm font-bold ${entry.rank <= 3 ? ["text-amber-400","text-slate-300","text-amber-600"][entry.rank-1] : "text-muted-foreground"}`}>
                {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank-1] : `#${entry.rank}`}
              </span>
              <Avatar name={entry.name} avatarUrl={entry.avatarUrl} size={8} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{entry.name}</span>
                  {roleIcon(entry.role)}
                  {entry.isMe && <span className="text-[10px] px-1 py-0.5 rounded bg-violet-500/20 text-violet-400">você</span>}
                </div>
                <span className="text-xs text-muted-foreground">{entry.submissionCount} respostas · média {entry.avgScore}/10</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-violet-400">{entry.totalScore}</div>
                <div className="text-[10px] text-muted-foreground">pts</div>
              </div>
            </div>
          ))}
          {data.length === 0 && <div className="text-center py-12 text-muted-foreground"><Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" /><p>Nenhuma avaliação ainda.</p></div>}
        </div>
      )}
    </div>
  );
}
