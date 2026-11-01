"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { use } from "react";
import { Users, CheckCircle, AlertCircle, Clock, RotateCcw, Award, Send, RefreshCw } from "lucide-react";

interface ObjetivoStat { code: string; description: string; pctCorreto: number; totalRespostas: number; }
interface PerguntaMaisErrada { question: string; wrongCount: number; misconceptionCode: string | null; commonError: string | null; }
interface AlunoNaoFez { enrollmentId: string; studentName: string; }
interface Lesson { id: string; title: string; date: string; status: string; }
interface PainelData {
  lesson: Lesson;
  result: { totalStudents: number; done: number; notDone: number; byLevel: { MASTERED: number; ALMOST: number; NOT_YET: number } };
  objetivos: ObjetivoStat[];
  perguntaMaisErrada: PerguntaMaisErrada | null;
  naoFizeram: AlunoNaoFez[];
}

function PctBar({ pct }: { pct: number }) {
  const cor = pct >= 70 ? "#166534" : pct >= 40 ? "#92400E" : "#B91C1C";
  return (
    <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden mt-1 mb-0.5">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cor }} />
    </div>
  );
}

export default function PainelDaAulaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<PainelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [acao, setAcao] = useState<string | null>(null);
  const [acaoMsg, setAcaoMsg] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch(`/api/escola/professor/aulas/${id}`, { credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro ao carregar painel.");
      setData(d);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function publish() {
    setPublishing(true);
    await fetch(`/api/escola/professor/aulas/${id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    setPublishing(false); load();
  }

  async function executarAcao(tipo: "retomar-em-sala" | "segunda-chance" | "enviar-reforco") {
    if (acao) return;
    setAcao(tipo); setAcaoMsg("");
    const r = await fetch(`/api/escola/professor/aulas/${id}/${tipo}`, { method: "POST", credentials: "include" });
    const d = await r.json();
    setAcao(null);
    setAcaoMsg(r.ok ? "Ação concluída com sucesso." : (d.error ?? "Erro ao executar ação."));
    setTimeout(() => setAcaoMsg(""), 5000);
    load();
  }

  if (loading) return <div className="p-8 text-center text-[#5B5470]">Carregando...</div>;
  if (error || !data) return (
    <div className="p-8 text-center">
      <div className="text-[#B91C1C] mb-2">{error || "Aula não encontrada."}</div>
      <button onClick={load} className="flex items-center gap-1 mx-auto text-[#6D28D9] hover:underline text-sm min-h-[44px]">
        <RefreshCw size={14} /> Tentar novamente
      </button>
    </div>
  );

  const { lesson, result, objetivos, perguntaMaisErrada, naoFizeram } = data;
  const pct = (n: number) => result.totalStudents > 0 ? Math.round(n / result.totalStudents * 100) : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-2"><Link href="/escola/professor/aulas" className="text-[#5B5470] text-sm hover:text-[#1F1A2E]">← Atividades da turma</Link></div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1A2E]">{lesson.title}</h1>
          <p className="text-[#5B5470] text-sm">{new Date(lesson.date).toLocaleDateString("pt-BR")}</p>
        </div>
        {lesson.status === "DRAFT" && (
          <button onClick={publish} disabled={publishing}
            className="bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2 rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-50">
            {publishing ? "Publicando..." : "Publicar para a turma"}
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: result.totalStudents, icon: <Users className="w-4 h-4" />, color: "#6D28D9" },
          { label: "Respondeu", value: result.done, icon: <CheckCircle className="w-4 h-4" />, color: "#166534" },
          { label: "Domina", value: result.byLevel.MASTERED, icon: null, color: "#166534" },
          { label: "Ainda não", value: result.byLevel.NOT_YET, icon: <AlertCircle className="w-4 h-4" />, color: "#B91C1C" },
        ].map(item => (
          <div key={item.label} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
            <div className="flex items-center gap-1 text-xs mb-1" style={{ color: item.color }}>
              {item.icon}<span>{item.label}</span>
            </div>
            <div className="text-2xl font-bold text-[#1F1A2E]">{item.value}</div>
            <div className="text-[#5B5470] text-xs">{pct(item.value)}%</div>
          </div>
        ))}
      </div>

      {/* % por objetivo */}
      {objetivos.length > 0 && (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-[#1F1A2E] mb-4">Por objetivo</h2>
          <div className="space-y-4">
            {objetivos.map(o => (
              <div key={o.code}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-[#5B5470] bg-[#F8F7FC] px-1.5 py-0.5 rounded">{o.code}</span>
                  <span className="text-[13px] text-[#1F1A2E] truncate flex-1">{o.description}</span>
                  <span className="text-[13px] font-semibold flex-shrink-0" style={{ color: o.pctCorreto >= 70 ? "#166534" : o.pctCorreto >= 40 ? "#92400E" : "#B91C1C" }}>{o.pctCorreto}%</span>
                </div>
                <PctBar pct={o.pctCorreto} />
                <p className="text-[11px] text-[#5B5470]">{o.totalRespostas} resposta{o.totalRespostas !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pergunta mais errada + erro comum */}
      {perguntaMaisErrada && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-[#92400E] mb-2">Pergunta mais errada</h2>
          <p className="text-[#1F1A2E] text-sm mb-1">{perguntaMaisErrada.question}</p>
          <p className="text-[#92400E] text-xs">{perguntaMaisErrada.wrongCount} aluno{perguntaMaisErrada.wrongCount !== 1 ? "s" : ""} erraram</p>
          {perguntaMaisErrada.commonError && (
            <div className="mt-2 bg-white rounded-xl p-3 border border-[#FDE68A]">
              <p className="text-[11px] font-semibold text-[#92400E] mb-0.5">Erro frequente</p>
              <p className="text-[13px] text-[#1F1A2E]">{perguntaMaisErrada.commonError}</p>
            </div>
          )}
        </div>
      )}

      {/* Alunos que não fizeram */}
      {naoFizeram.length > 0 && (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-[#1F1A2E] mb-3 flex items-center gap-2">
            <Clock size={16} className="text-[#92400E]" /> Não fizeram ({naoFizeram.length})
          </h2>
          <div className="space-y-1">
            {naoFizeram.slice(0, 8).map(a => (
              <p key={a.enrollmentId} className="text-[13px] text-[#5B5470]">· {a.studentName}</p>
            ))}
            {naoFizeram.length > 8 && <p className="text-[12px] text-[#8B7FA8]">+ {naoFizeram.length - 8} outros</p>}
          </div>
        </div>
      )}

      {/* 3 botões de ação */}
      {lesson.status === "PUBLISHED" && (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-[#1F1A2E] mb-1">Ações</h2>
          {acaoMsg && <p className="text-sm font-medium text-[#166534] bg-[#DCFCE7] rounded-xl px-3 py-2">{acaoMsg}</p>}
          <button onClick={() => executarAcao("retomar-em-sala")} disabled={!!acao}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#6D28D9] text-white rounded-xl text-sm font-semibold hover:bg-[#5B21B6] min-h-[48px] disabled:opacity-50">
            <RotateCcw size={16} />
            {acao === "retomar-em-sala" ? "Aguardando..." : "Retomar em sala"}
          </button>
          <button onClick={() => executarAcao("segunda-chance")} disabled={!!acao}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#EDE9FE] text-[#4C1D95] rounded-xl text-sm font-semibold hover:bg-[#DDD6EE] min-h-[48px] disabled:opacity-50">
            <Award size={16} />
            {acao === "segunda-chance" ? "Aguardando..." : "Segunda chance"}
          </button>
          <button onClick={() => executarAcao("enviar-reforco")} disabled={!!acao}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#EDE9FE] text-[#4C1D95] rounded-xl text-sm font-semibold hover:bg-[#DDD6EE] min-h-[48px] disabled:opacity-50">
            <Send size={16} />
            {acao === "enviar-reforco" ? "Enviando..." : "Enviar para reforço"}
          </button>
        </div>
      )}
    </div>
  );
}
