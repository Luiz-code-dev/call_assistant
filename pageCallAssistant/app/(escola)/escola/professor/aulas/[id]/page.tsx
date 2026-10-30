"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import { Users, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface Lesson { id: string; title: string; date: string; status: string; objectives: { id: string; text: string; skillId: string | null }[]; }
interface Result { totalStudents: number; done: number; notDone: number; byLevel: { MASTERED: number; ALMOST: number; NOT_YET: number }; }

export default function PainelDaAulaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  function load() {
    fetch(`/api/escola/professor/aulas/${id}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setLesson(d.lesson); setResult(d.result); setLoading(false); })
      .catch(() => { setError("Erro ao carregar painel."); setLoading(false); });
  }
  useEffect(load, [id]);

  async function publish() {
    setPublishing(true);
    await fetch(`/api/escola/professor/aulas/${id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    setPublishing(false); load();
  }

  if (loading) return <div className="p-8 text-center text-[#5B5470]">Carregando...</div>;
  if (error || !lesson) return (
    <div className="p-8 text-center">
      <div className="text-[#B91C1C] mb-2">{error || "Aula não encontrada."}</div>
      <button onClick={load} className="text-[#6D28D9] hover:underline text-sm">Tentar novamente</button>
    </div>
  );

  const pct = (n: number) => result && result.totalStudents > 0 ? Math.round(n / result.totalStudents * 100) : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-2"><Link href="/escola/professor/aulas" className="text-[#5B5470] text-sm">← Atividades da turma</Link></div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1A2E]">{lesson.title}</h1>
          <p className="text-[#5B5470] text-sm">{new Date(lesson.date).toLocaleDateString("pt-BR")}</p>
        </div>
        {lesson.status === "DRAFT" && (
          <button onClick={publish} disabled={publishing}
            className="bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] disabled:opacity-50">
            {publishing ? "Publicando..." : "Publicar para a turma"}
          </button>
        )}
      </div>

      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: result.totalStudents, icon: <Users className="w-4 h-4" />, color: "#6D28D9" },
            { label: "Respondeu", value: result.done, icon: <CheckCircle className="w-4 h-4" />, color: "#166534" },
            { label: "Domina", value: result.byLevel.MASTERED, icon: null, color: "#166534" },
            { label: "Ainda não", value: result.byLevel.NOT_YET, icon: <AlertCircle className="w-4 h-4" />, color: "#B91C1C" },
          ].map(item => (
            <div key={item.label} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
              <div className="flex items-center gap-1 text-[#5B5470] text-xs mb-1" style={{ color: item.color }}>
                {item.icon}<span>{item.label}</span>
              </div>
              <div className="text-2xl font-bold text-[#1F1A2E]">{item.value}</div>
              <div className="text-[#5B5470] text-xs">{pct(item.value)}%</div>
            </div>
          ))}
        </div>
      )}

      {result && result.notDone > 0 && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4 mb-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#92400E] shrink-0" />
          <div>
            <div className="text-[#92400E] font-medium text-sm">{result.notDone} aluno(s) não respondeu(ram) ainda</div>
            <div className="text-[#92400E] text-xs">Você pode re-publicar a aula para enviar lembretes.</div>
          </div>
        </div>
      )}

      {lesson.objectives.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#1F1A2E] mb-3">Objetivos da aula</h2>
          <div className="space-y-2">
            {lesson.objectives.map((o, i) => (
              <div key={o.id} className="bg-white border border-[#E9E5F5] rounded-lg p-3 text-[#1F1A2E] text-sm">
                <span className="text-[#5B5470] mr-2">{i + 1}.</span>{o.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && result.byLevel.NOT_YET > 0 && (
        <div className="mt-6 p-4 bg-[#EDE9FE] border border-[#DDD6EE] rounded-xl">
          <div className="text-[#4C1D95] font-semibold text-sm mb-1">Enviar para reforço</div>
          <div className="text-[#5B5470] text-sm">{result.byLevel.NOT_YET} aluno(s) com "Ainda não" podem receber a trilha de reforço da habilidade automaticamente, conforme as configurações da rede.</div>
        </div>
      )}
    </div>
  );
}
