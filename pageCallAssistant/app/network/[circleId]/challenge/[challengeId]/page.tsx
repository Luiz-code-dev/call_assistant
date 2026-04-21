"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Star, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Evaluation { fluencyScore: number; contentScore: number; clarityScore: number; totalScore: number; feedback: string; improvedResponse: string; tip: string }
interface Submission { id: string; content: string; isPublic: boolean; evaluation?: Evaluation | null; user: { id: string; name: string; avatarUrl?: string | null } }
interface Challenge { id: string; title: string; prompt: string; type: string; startsAt: string; endsAt: string; _count: { submissions: number } }

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-violet-600 to-indigo-600","from-emerald-500 to-teal-600","from-rose-500 to-pink-600","from-amber-500 to-orange-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatarUrl) return <img src={avatarUrl} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-border" />;
  return <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>{initials}</div>;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium">{score}/10</span></div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all" style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  );
}

export default function ChallengePage() {
  const { circleId, challengeId } = useParams<{ circleId: string; challengeId: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [feed, setFeed] = useState<Submission[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [chRes, feedRes] = await Promise.all([
      fetch(`/api/network/challenges?circleId=${circleId}`),
      fetch(`/api/network/submissions?challengeId=${challengeId}`),
    ]);
    if (chRes.ok) {
      const list: Challenge[] = await chRes.json();
      setChallenge(list.find((c) => c.id === challengeId) ?? null);
    }
    if (feedRes.ok) {
      const all: Submission[] = await feedRes.json();
      const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
      setMySubmission(all.find((s) => s.user.id === me?.id) ?? null);
      setFeed(all.filter((s) => s.user.id !== me?.id));
    }
    setLoading(false);
  }, [circleId, challengeId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    const r = await fetch("/api/network/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, circleId, content: content.trim() }),
    });
    if (r.ok) { toast.success("Resposta enviada!"); await load(); setContent(""); }
    else { const d = await r.json(); toast.error(d.error ?? "Erro ao enviar."); }
    setSubmitting(false);
  };

  const evaluate = async () => {
    if (!mySubmission) return;
    setEvaluating(true);
    const r = await fetch(`/api/network/submissions/${mySubmission.id}/evaluate`, { method: "POST" });
    if (r.ok) { toast.success("Avaliação concluída!"); await load(); }
    else { const d = await r.json(); toast.error(d.error ?? "Erro na avaliação."); }
    setEvaluating(false);
  };

  const isExpired = challenge ? new Date() > new Date(challenge.endsAt) : false;

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded bg-card/50 animate-pulse" />
      <div className="h-40 rounded-xl bg-card/50 animate-pulse border border-border/50" />
    </div>
  );
  if (!challenge) return <div className="text-center py-20 text-muted-foreground">Desafio não encontrado.</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link href={`/network/${circleId}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-xl font-bold">{challenge.title}</h1>
          <p className="text-xs text-muted-foreground">
            {isExpired ? "Encerrado" : `Encerra ${new Date(challenge.endsAt).toLocaleDateString("pt-BR")}`} · {challenge._count.submissions} respostas
          </p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Contexto do desafio</CardTitle></CardHeader>
        <CardContent><p className="text-sm leading-relaxed">{challenge.prompt}</p></CardContent>
      </Card>

      {!mySubmission && !isExpired && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Sua resposta</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <textarea
                value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="Escreva sua resposta em inglês..."
                maxLength={3000} rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{content.length}/3000</span>
                <Button type="submit" size="sm" disabled={submitting || !content.trim()} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1.5" />Enviar</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {mySubmission && (
        <Card className={`border-2 ${mySubmission.evaluation ? "border-violet-500/40" : "border-border/50"}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Minha resposta</CardTitle>
              {!mySubmission.evaluation && (
                <Button size="sm" onClick={evaluate} disabled={evaluating} variant="outline">
                  {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Star className="h-3.5 w-3.5 mr-1" />Avaliar com IA</>}
                </Button>
              )}
              {mySubmission.evaluation && (
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-violet-400">{mySubmission.evaluation.totalScore}</span>
                  <span className="text-xs text-muted-foreground">/10</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{mySubmission.content}</p>
            {mySubmission.evaluation && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <ScoreBar label="Fluência" score={mySubmission.evaluation.fluencyScore} />
                  <ScoreBar label="Conteúdo" score={mySubmission.evaluation.contentScore} />
                  <ScoreBar label="Clareza" score={mySubmission.evaluation.clarityScore} />
                </div>
                <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Feedback</p>
                  <p className="text-sm">{mySubmission.evaluation.feedback}</p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                  <p className="text-xs font-medium text-emerald-400">Resposta melhorada</p>
                  <p className="text-sm">{mySubmission.evaluation.improvedResponse}</p>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs font-medium text-amber-400 mb-1">Dica</p>
                  <p className="text-sm">{mySubmission.evaluation.tip}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {feed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Respostas dos membros ({feed.length})</h3>
          {feed.map((s) => (
            <Card key={s.id} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={s.user.name} avatarUrl={s.user.avatarUrl} />
                    <span className="text-sm font-medium">{s.user.name}</span>
                  </div>
                  {s.evaluation && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-violet-400" />
                      <span className="text-sm font-bold text-violet-400">{s.evaluation.totalScore}/10</span>
                    </div>
                  )}
                </div>
                <button className="w-full text-left" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                  <p className={`text-sm ${expandedId === s.id ? "" : "line-clamp-3"}`}>{s.content}</p>
                  <span className="text-xs text-violet-400 flex items-center gap-1 mt-1">
                    {expandedId === s.id ? <><ChevronUp className="h-3 w-3" />Recolher</> : <><ChevronDown className="h-3 w-3" />Ver completo</>}
                  </span>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
