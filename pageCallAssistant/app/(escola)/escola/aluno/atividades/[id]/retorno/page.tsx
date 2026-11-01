"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lightbulb, Quote, Mic, RefreshCw, Clock } from "lucide-react";

interface AiFeedback {
  acertos: string[];
  melhorar: string[];
  exemplo: string;
  quizDetail?: { questionId: string; correct: boolean; explanation?: string | null }[];
}
interface Activity { id: string; title: string; prompt: string; maxAttempts: number; type: string }
interface RetornoData {
  submissionId: string;
  attempt: number;
  status: string;
  masteryLevel: string | null;
  aiFeedback: AiFeedback | null;
  teacherNote: string | null;
  transcript: string | null;
  evaluatedAt: string | null;
  reviewedAt: string | null;
  activity: Activity;
}

const LEVEL: Record<string, { label: string; fg: string; bg: string; border: string }> = {
  MASTERED: { label: "Domina",    fg: "#166534", bg: "#DCFCE7", border: "#86EFAC" },
  ALMOST:   { label: "Quase la",  fg: "#92400E", bg: "#FEF3C7", border: "#FDE68A" },
  NOT_YET:  { label: "Ainda nao", fg: "#B91C1C", bg: "#FEE2E2", border: "#FCA5A5" },
};

export default function RetornoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<RetornoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [showDomina, setShowDomina] = useState(false);
  const prevLevel = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/escola/aluno/atividades/${id}/retorno`);
    if (res.status === 401) { router.replace("/escola/aluno/entrar"); return; }
    if (res.ok) {
      const d = await res.json();
      setData((prev) => {
        // animar "Domina!" quando nivel sobe para MASTERED
        if (prev?.masteryLevel !== "MASTERED" && d.masteryLevel === "MASTERED") {
          setShowDomina(true);
          setTimeout(() => setShowDomina(false), 3000);
        }
        return d;
      });
      if (d.status === "SUBMITTED") setPolling(true);
      else setPolling(false);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(loadData, 4000);
    return () => clearInterval(timer);
  }, [polling, loadData]);

  void prevLevel;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F7FC]">
      <RefreshCw className="size-6 text-[#6D28D9] animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F7FC]">
      <p className="text-[#5B5470]">Retorno nao encontrado.</p>
    </div>
  );

  const { aiFeedback, status, teacherNote, transcript, activity, masteryLevel } = data;
  const isPending = status === "SUBMITTED";
  const canRetry = data.attempt < activity.maxAttempts && status !== "REVIEWED";
  const nivel = masteryLevel ? LEVEL[masteryLevel] ?? null : null;

  return (
    <div className="min-h-screen bg-[#F8F7FC] relative">
      {/* Animacao Domina! */}
      {showDomina && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-[#DCFCE7] border-2 border-[#86EFAC] rounded-3xl px-10 py-8 text-center animate-bounce shadow-2xl">
            <p className="text-5xl font-extrabold text-[#166534]">Domina!</p>
            <p className="text-[#166534] mt-2 text-lg">Habilidade conquistada</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-10 border-b border-[#E9E5F5] bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push("/escola/aluno")} className="p-1.5 rounded-lg hover:bg-[#F8F7FC] transition-colors">
            <ArrowLeft className="size-5 text-[#5B5470]" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#5B5470]">Retorno da atividade</p>
            <h1 className="font-semibold text-[#1F1A2E] truncate">{activity.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Aguardando avaliacao */}
        {isPending && (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FEF3C7] p-6 flex items-center gap-4">
            <Clock className="size-8 text-[#92400E] shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold text-[#92400E]">Analisando sua resposta...</p>
              <p className="text-sm text-[#92400E] mt-0.5">Aguarde alguns segundos.</p>
            </div>
          </div>
        )}

        {/* Nivel de dominio */}
        {nivel && (
          <div className="rounded-xl border-2 p-5 flex items-center gap-4" style={{ background: nivel.bg, borderColor: nivel.border }}>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: nivel.fg }}>Nivel desta habilidade</p>
              <p className="text-2xl font-extrabold" style={{ color: nivel.fg }}>{nivel.label}</p>
            </div>
            {masteryLevel === "MASTERED" && <CheckCircle2 className="size-10 shrink-0" style={{ color: nivel.fg }} />}
          </div>
        )}

        {/* Nota do professor (sem pontuacao) */}
        {teacherNote && (
          <div className="rounded-xl border border-[#E9E5F5] bg-white p-4">
            <p className="text-xs font-semibold text-[#5B5470] mb-1">Observacao do professor</p>
            <p className="text-sm text-[#1F1A2E] italic">&ldquo;{teacherNote}&rdquo;</p>
          </div>
        )}

        {/* Transcricao (fala) */}
        {activity.type === "SPOKEN" && transcript && (
          <div className="rounded-xl border border-[#E9E5F5] bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="size-4 text-[#6D28D9]" />
              <span className="text-sm font-semibold text-[#1F1A2E]">O que voce disse</span>
            </div>
            <p className="text-sm text-[#5B5470] italic leading-relaxed">&ldquo;{transcript}&rdquo;</p>
          </div>
        )}

        {aiFeedback && (
          <>
            {/* O que acertou */}
            {aiFeedback.acertos?.length > 0 && (
              <div className="rounded-xl border border-[#E9E5F5] bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="size-4 text-[#166534]" />
                  <span className="text-sm font-semibold text-[#1F1A2E]">O que voce acertou</span>
                </div>
                <ul className="space-y-2">
                  {aiFeedback.acertos.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1A2E]">
                      <span className="text-[#166534] mt-0.5 shrink-0">&#10003;</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Como melhorar */}
            {aiFeedback.melhorar?.length > 0 && (
              <div className="rounded-xl border border-[#E9E5F5] bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="size-4 text-[#92400E]" />
                  <span className="text-sm font-semibold text-[#1F1A2E]">Como melhorar</span>
                </div>
                <ul className="space-y-2">
                  {aiFeedback.melhorar.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1A2E]">
                      <span className="text-[#92400E] mt-0.5 shrink-0">&#8594;</span>{m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Exemplo */}
            {aiFeedback.exemplo && (
              <div className="rounded-xl border border-[#E9E5F5] bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Quote className="size-4 text-[#6D28D9]" />
                  <span className="text-sm font-semibold text-[#1F1A2E]">Exemplo</span>
                </div>
                <p className="text-sm text-[#5B5470] italic leading-relaxed border-l-2 border-[#DDD6EE] pl-3">
                  {aiFeedback.exemplo}
                </p>
              </div>
            )}
          </>
        )}

        {/* Tentar de novo */}
        {canRetry && (
          <button onClick={() => router.push(`/escola/aluno/atividades/${id}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#DDD6EE] font-medium text-[#1F1A2E] hover:border-[#6D28D9] transition-all min-h-[44px]">
            <RefreshCw className="size-4" />Tentar de novo (tentativa {data.attempt + 1} de {activity.maxAttempts})
          </button>
        )}

        <button onClick={() => router.push("/escola/aluno")}
          className="w-full py-4 rounded-2xl font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] transition-colors min-h-[52px]">
          Voltar ao inicio
        </button>
      </main>
    </div>
  );
}
