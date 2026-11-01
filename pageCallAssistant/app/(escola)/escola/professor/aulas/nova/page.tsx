"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, Plus, Trash2, BookOpen, ChevronRight, ChevronLeft, Edit3 } from "lucide-react";

interface ClassSubject { id: string; subjectName: string; className: string; }
interface Objetivo { code: string; description: string; selecionado: boolean; }
interface Pergunta { text: string; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS: Record<Step, string> = {
  1: "Turma",
  2: "Material",
  3: "Objetivos",
  4: "Perguntas",
  5: "Revisar",
  6: "Publicado",
};

function StepBar({ current }: { current: Step }) {
  const steps = [1, 2, 3, 4, 5] as const;
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((s) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
            ${current >= s ? "bg-[#6D28D9] text-white" : "bg-[#E9E5F5] text-[#5B5470]"}`}>
            {s}
          </div>
          <span className={`text-xs font-medium hidden sm:inline ${current === s ? "text-[#1F1A2E]" : "text-[#5B5470]"}`}>
            {STEP_LABELS[s]}
          </span>
          {s < 5 && <ChevronRight size={14} className="text-[#DDD6EE] flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
}

function AulaNovaInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const prefillClassSubjectId = sp.get("classSubjectId") ?? "";

  const [step, setStep] = useState<Step>(1);
  const [offers, setOffers] = useState<ClassSubject[]>([]);
  const [classSubjectId, setClassSubjectId] = useState(prefillClassSubjectId);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [material, setMaterial] = useState("");
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [loadingIA, setLoadingIA] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [aulaId, setAulaId] = useState("");

  useEffect(() => {
    fetch("/api/escola/professor/turmas-componentes", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setOffers(d.offers ?? []); })
      .catch(() => {});
  }, []);

  // Passo 1 → 2
  const goToMaterial = () => {
    if (!classSubjectId) { setError("Escolha uma turma."); return; }
    if (!date || !title) { setError("Preencha data e tema."); return; }
    setError(""); setStep(2);
  };

  // Passo 2 → 3: sugerir objetivos com IA
  const sugerirObjetivos = async () => {
    setLoadingIA(true); setError("");
    try {
      const r = await fetch("/api/escola/professor/aulas/sugerir-objetivos", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classSubjectId, material, title }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro da IA");
      setObjetivos((d.objetivos ?? []).map((o: Objetivo) => ({ ...o, selecionado: true })));
      setStep(3);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Não foi possível sugerir objetivos.");
    } finally { setLoadingIA(false); }
  };

  // Passo 3 → 4: gerar perguntas com IA
  const gerarPerguntas = async () => {
    setLoadingIA(true); setError("");
    try {
      const selected = objetivos.filter(o => o.selecionado);
      const r = await fetch("/api/escola/professor/aulas/gerar-perguntas", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classSubjectId, objetivos: selected.map(o => o.code), title }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro da IA");
      setPerguntas((d.perguntas ?? []).map((t: string) => ({ text: t })));
      setStep(4);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Não foi possível gerar perguntas.");
    } finally { setLoadingIA(false); }
  };

  // Passo 5 → 6: publicar
  const publish = async () => {
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/escola/professor/aulas", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classSubjectId, date, title, material,
          objectives: objetivos.filter(o => o.selecionado).map(o => ({ text: o.description })),
          questions: perguntas.map(p => ({ text: p.text })),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro ao publicar");
      setAulaId(d.lessonId ?? d.id ?? "");
      setStep(6);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Não foi possível publicar a aula.");
    } finally { setSaving(false); }
  };

  const errBox = error && (
    <div className="mb-4 bg-[#FEE2E2] border border-[#FECACA] rounded-xl px-4 py-3 text-[#B91C1C] text-sm">{error}</div>
  );

  // Passo 6: sucesso
  if (step === 6) return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto text-center">
      <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen size={32} className="text-[#166534]" />
      </div>
      <h1 className="text-2xl font-bold text-[#1F1A2E] mb-2">Aula publicada!</h1>
      <p className="text-[#5B5470] mb-6">Os alunos já podem responder pelo código no projetor.</p>
      <div className="flex gap-3 justify-center flex-wrap">
        {aulaId && (
          <Link href={`/escola/professor/aulas/${aulaId}`} className="px-4 py-2 bg-[#6D28D9] text-white rounded-xl text-sm font-semibold hover:bg-[#5B21B6] min-h-[44px] flex items-center">
            Ver painel da aula
          </Link>
        )}
        <Link href="/escola/professor/aulas" className="px-4 py-2 bg-white border border-[#E9E5F5] text-[#1F1A2E] rounded-xl text-sm font-semibold hover:bg-[#F8F7FC] min-h-[44px] flex items-center">
          Ver todas as aulas
        </Link>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/escola/professor/aulas" className="text-sm text-[#5B5470] hover:text-[#1F1A2E] flex items-center gap-1">
          <ChevronLeft size={14} /> Aulas
        </Link>
        <ChevronRight size={14} className="text-[#DDD6EE]" />
        <span className="text-sm text-[#1F1A2E] font-medium">Nova aula</span>
      </div>

      <h1 className="text-2xl font-bold text-[#1F1A2E] mb-4">Nova Aula</h1>
      <StepBar current={step} />
      {errBox}

      {/* PASSO 1: Turma + Data + Tema */}
      {step === 1 && (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-[#1F1A2E]">Passo 1 — Escolha a turma e o tema</h2>
          <div>
            <label className="block text-sm font-medium text-[#5B5470] mb-1">Turma / Componente</label>
            <select value={classSubjectId} onChange={e => setClassSubjectId(e.target.value)}
              className="w-full border border-[#DDD6EE] rounded-xl px-3 py-2.5 text-sm text-[#1F1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9] min-h-[44px]">
              <option value="">Selecione...</option>
              {offers.map(o => <option key={o.id} value={o.id}>{o.className} — {o.subjectName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5B5470] mb-1">Tema da aula</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Frações equivalentes"
              className="w-full border border-[#DDD6EE] rounded-xl px-3 py-2.5 text-sm text-[#1F1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9] min-h-[44px]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5B5470] mb-1">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-[#DDD6EE] rounded-xl px-3 py-2.5 text-sm text-[#1F1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9] min-h-[44px]" />
          </div>
          <button onClick={goToMaterial} className="w-full px-4 py-3 bg-[#6D28D9] text-white rounded-xl font-semibold text-sm hover:bg-[#5B21B6] min-h-[48px] flex items-center justify-center gap-2">
            Próximo <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* PASSO 2: Material */}
      {step === 2 && (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-[#1F1A2E]">Passo 2 — Descreva o conteúdo (opcional)</h2>
          <p className="text-sm text-[#5B5470]">A IA usará esse material para sugerir objetivos e perguntas.</p>
          <textarea value={material} onChange={e => setMaterial(e.target.value)} rows={5}
            placeholder="Ex.: Comparação de frações com denominadores diferentes, método da borboleta..."
            className="w-full border border-[#DDD6EE] rounded-xl px-3 py-2.5 text-sm text-[#1F1A2E] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#6D28D9]" />
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2.5 border border-[#DDD6EE] text-[#5B5470] rounded-xl text-sm font-medium hover:bg-[#F8F7FC] min-h-[44px]">
              Voltar
            </button>
            <button onClick={sugerirObjetivos} disabled={loadingIA}
              className="flex-1 px-4 py-2.5 bg-[#6D28D9] text-white rounded-xl font-semibold text-sm hover:bg-[#5B21B6] min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-60">
              {loadingIA ? "Aguardando IA..." : <><Zap size={16} /> Sugerir objetivos</>}
            </button>
            <button onClick={() => { setObjetivos([]); setStep(3); }}
              className="px-4 py-2.5 border border-[#DDD6EE] text-[#5B5470] rounded-xl text-sm font-medium hover:bg-[#F8F7FC] min-h-[44px]">
              Pular
            </button>
          </div>
        </div>
      )}

      {/* PASSO 3: Objetivos */}
      {step === 3 && (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-[#1F1A2E]">Passo 3 — Confirme os objetivos</h2>
          {objetivos.length === 0 ? (
            <p className="text-sm text-[#5B5470]">Nenhum objetivo sugerido. Continue para adicionar perguntas manualmente.</p>
          ) : (
            objetivos.map((o, i) => (
              <label key={o.code} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-[#E9E5F5] hover:border-[#C4B5FD]">
                <input type="checkbox" checked={o.selecionado} onChange={() => setObjetivos(prev => prev.map((x, j) => j === i ? { ...x, selecionado: !x.selecionado } : x))}
                  className="mt-0.5 w-4 h-4 accent-[#6D28D9]" />
                <div>
                  <span className="text-xs font-mono text-[#5B5470]">{o.code}</span>
                  <p className="text-sm text-[#1F1A2E]">{o.description}</p>
                </div>
              </label>
            ))
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-4 py-2.5 border border-[#DDD6EE] text-[#5B5470] rounded-xl text-sm font-medium hover:bg-[#F8F7FC] min-h-[44px]">
              Voltar
            </button>
            <button onClick={gerarPerguntas} disabled={loadingIA}
              className="flex-1 px-4 py-2.5 bg-[#6D28D9] text-white rounded-xl font-semibold text-sm hover:bg-[#5B21B6] min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-60">
              {loadingIA ? "Aguardando IA..." : <><Zap size={16} /> Gerar perguntas</>}
            </button>
            <button onClick={() => { setPerguntas([]); setStep(4); }}
              className="px-4 py-2.5 border border-[#DDD6EE] text-[#5B5470] rounded-xl text-sm font-medium hover:bg-[#F8F7FC] min-h-[44px]">
              Pular
            </button>
          </div>
        </div>
      )}

      {/* PASSO 4: Editar perguntas */}
      {step === 4 && (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-[#1F1A2E]">Passo 4 — Edite as perguntas</h2>
          <p className="text-sm text-[#5B5470]">Revise e ajuste antes de publicar.</p>
          {perguntas.map((p, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-6 h-6 bg-[#EDE9FE] rounded-full flex items-center justify-center flex-shrink-0 mt-2.5 text-xs font-bold text-[#6D28D9]">{i + 1}</div>
              <textarea value={p.text} onChange={e => setPerguntas(prev => prev.map((x, j) => j === i ? { text: e.target.value } : x))} rows={2}
                className="flex-1 border border-[#DDD6EE] rounded-xl px-3 py-2 text-sm text-[#1F1A2E] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#6D28D9]" />
              <button onClick={() => setPerguntas(prev => prev.filter((_, j) => j !== i))} className="mt-2 text-[#B91C1C] hover:text-red-700 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button onClick={() => setPerguntas(prev => [...prev, { text: "" }])}
            className="flex items-center gap-1 text-[#6D28D9] text-sm font-medium hover:underline">
            <Plus size={14} /> Adicionar pergunta
          </button>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(3)} className="px-4 py-2.5 border border-[#DDD6EE] text-[#5B5470] rounded-xl text-sm font-medium hover:bg-[#F8F7FC] min-h-[44px]">
              Voltar
            </button>
            <button onClick={() => setStep(5)}
              className="flex-1 px-4 py-2.5 bg-[#6D28D9] text-white rounded-xl font-semibold text-sm hover:bg-[#5B21B6] min-h-[44px] flex items-center justify-center gap-2">
              Revisar <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* PASSO 5: Revisão e publicação */}
      {step === 5 && (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-[#1F1A2E]">Passo 5 — Revisar e publicar</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2"><span className="text-[#5B5470] w-20 flex-shrink-0">Tema:</span><span className="text-[#1F1A2E] font-medium">{title}</span></div>
            <div className="flex gap-2"><span className="text-[#5B5470] w-20 flex-shrink-0">Data:</span><span className="text-[#1F1A2E]">{date}</span></div>
            <div className="flex gap-2"><span className="text-[#5B5470] w-20 flex-shrink-0">Objetivos:</span><span className="text-[#1F1A2E]">{objetivos.filter(o=>o.selecionado).length} selecionados</span></div>
            <div className="flex gap-2"><span className="text-[#5B5470] w-20 flex-shrink-0">Perguntas:</span><span className="text-[#1F1A2E]">{perguntas.length}</span></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(4)} className="px-4 py-2.5 border border-[#DDD6EE] text-[#5B5470] rounded-xl text-sm font-medium hover:bg-[#F8F7FC] min-h-[44px]">
              <Edit3 size={14} className="inline mr-1" />Editar
            </button>
            <button onClick={publish} disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[#6D28D9] text-white rounded-xl font-semibold text-sm hover:bg-[#5B21B6] min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? "Publicando..." : <><BookOpen size={16} /> Publicar aula</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AulaNovaPage() {
  return (
    <Suspense>
      <AulaNovaInner />
    </Suspense>
  );
}
