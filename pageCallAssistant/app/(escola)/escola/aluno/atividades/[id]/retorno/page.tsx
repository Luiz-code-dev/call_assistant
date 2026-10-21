"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Target, Lightbulb, Quote, Mic, RefreshCw, Clock, Star } from "lucide-react";

interface CriterioResult { criterio: string; nota: number; comentario: string }
interface AiFeedback {
  score: number;
  porCriterio: CriterioResult[];
  acertos: string[];
  melhorar: string[];
  exemplo: string;
  quizDetail?: { questionId: string; correct: boolean; explanation?: string | null }[];
}
interface Activity { id: string; title: string; prompt: string; maxScore: number; maxAttempts: number; type: string }
interface RetornoData {
  submissionId: string;
  attempt: number;
  status: string;
  aiScore: number | null;
  aiFeedback: AiFeedback | null;
  teacherScore: number | null;
  teacherNote: string | null;
  transcript: string | null;
  evaluatedAt: string | null;
  reviewedAt: string | null;
  activity: Activity;
}

function ScoreRing({ score, max }: { score: number; max: number }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 70 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const r = 36;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative size-24 shrink-0">
      <svg className="size-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
          strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-zinc-900">{Number(score).toFixed(1)}</span>
        <span className="text-[10px] text-zinc-400">de {max}</span>
      </div>
    </div>
  );
}

export default function RetornoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<RetornoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/escola/aluno/atividades/${id}/retorno`);
      if (res.status === 401) { router.replace("/escola/aluno/entrar"); return; }
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if (d.status === "SUBMITTED") setPolling(true);
      }
      setLoading(false);
    };
    load();
  }, [id, router]);

  // Poll enquanto aguardando avaliação
  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/escola/aluno/atividades/${id}/retorno`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if (d.status !== "SUBMITTED") setPolling(false);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [polling, id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--esc-bg,#f8f9fc)" }}>
      <RefreshCw className="size-6 text-violet-500 animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-zinc-500">Retorno não encontrado.</p>
    </div>
  );

  const { aiFeedback, status, aiScore, teacherScore, teacherNote, transcript, activity } = data;
  const finalScore = teacherScore ?? aiScore;
  const isTeacherReviewed = status === "REVIEWED";
  const isPending = status === "SUBMITTED";
  const canRetry = data.attempt < activity.maxAttempts && !isTeacherReviewed;

  return (
    <div className="min-h-screen" style={{ background: "var(--esc-bg,#f8f9fc)" }}>
      <header className="sticky top-0 z-10 border-b" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push("/escola/aluno")} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
            <ArrowLeft className="size-5 text-zinc-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500">Retorno da atividade</p>
            <h1 className="font-semibold text-zinc-900 truncate">{activity.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Status aguardando professor */}
        {isPending && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex items-center gap-4">
            <Clock className="size-8 text-amber-500 shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold text-amber-800">Analisando sua resposta…</p>
              <p className="text-sm text-amber-600 mt-0.5">Aguarde alguns segundos.</p>
            </div>
          </div>
        )}

        {/* Nota */}
        {finalScore != null && (
          <div className="rounded-xl border p-5 flex items-center gap-5" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
            <ScoreRing score={Number(finalScore)} max={Number(activity.maxScore)} />
            <div>
              <p className="text-sm font-medium text-zinc-500">
                {isTeacherReviewed ? (
                  <span className="flex items-center gap-1 text-green-600"><Star className="size-3.5" />Nota confirmada pelo professor</span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1"><Clock className="size-3.5" />Nota sugerida pela IA — o professor ainda vai confirmar</span>
                )}
              </p>
              {teacherNote && (
                <p className="text-sm text-zinc-600 mt-2 italic">&ldquo;{teacherNote}&rdquo;</p>
              )}
            </div>
          </div>
        )}

        {/* Transcrição (fala) */}
        {activity.type === "SPOKEN" && transcript && (
          <div className="rounded-xl border p-4" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Mic className="size-4 text-violet-500" />
              <span className="text-sm font-semibold text-zinc-700">O que você disse</span>
            </div>
            <p className="text-sm text-zinc-600 italic leading-relaxed">&ldquo;{transcript}&rdquo;</p>
          </div>
        )}

        {aiFeedback && (
          <>
            {/* Por critério */}
            {aiFeedback.porCriterio?.length > 0 && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--esc-border,#e5e7eb)" }}>
                <div className="px-4 py-3 border-b flex items-center gap-2" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
                  <Target className="size-4 text-violet-500" />
                  <span className="text-sm font-semibold text-zinc-700">Por critério</span>
                </div>
                <div className="divide-y divide-zinc-100">
                  {aiFeedback.porCriterio.map((c, i) => (
                    <div key={i} className="px-4 py-3 flex items-start gap-3" style={{ background: "var(--esc-surface,#fff)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800">{c.criterio}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{c.comentario}</p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${c.nota >= 7 ? "text-green-600" : c.nota >= 5 ? "text-amber-600" : "text-rose-600"}`}>
                        {c.nota.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acertos */}
            {aiFeedback.acertos?.length > 0 && (
              <div className="rounded-xl border p-4" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="size-4 text-green-500" />
                  <span className="text-sm font-semibold text-zinc-700">O que você acertou</span>
                </div>
                <ul className="space-y-2">
                  {aiFeedback.acertos.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="text-green-500 mt-0.5">✓</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Como melhorar */}
            {aiFeedback.melhorar?.length > 0 && (
              <div className="rounded-xl border p-4" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="size-4 text-amber-500" />
                  <span className="text-sm font-semibold text-zinc-700">Como melhorar</span>
                </div>
                <ul className="space-y-2">
                  {aiFeedback.melhorar.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="text-amber-500 mt-0.5">→</span>{m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Exemplo */}
            {aiFeedback.exemplo && (
              <div className="rounded-xl border p-4" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Quote className="size-4 text-violet-500" />
                  <span className="text-sm font-semibold text-zinc-700">Exemplo de resposta melhorada</span>
                </div>
                <p className="text-sm text-zinc-600 italic leading-relaxed border-l-2 border-violet-300 pl-3">
                  {aiFeedback.exemplo}
                </p>
              </div>
            )}
          </>
        )}

        {/* Tentar de novo */}
        {canRetry && (
          <button onClick={() => router.push(`/escola/aluno/atividades/${id}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-zinc-700 hover:border-violet-300 transition-all"
            style={{ borderColor: "var(--esc-border,#e5e7eb)" }}>
            <RefreshCw className="size-4" />Tentar de novo (tentativa {data.attempt + 1} de {activity.maxAttempts})
          </button>
        )}

        <button onClick={() => router.push("/escola/aluno")}
          className="w-full py-3 rounded-xl font-semibold text-white"
          style={{ background: "var(--esc-primary,#7c3aed)" }}>
          Voltar ao início
        </button>
      </main>
    </div>
  );
}
