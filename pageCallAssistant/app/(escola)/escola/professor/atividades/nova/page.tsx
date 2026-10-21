"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Sparkles, Plus, Trash2, CheckCircle2, RefreshCw } from "lucide-react";

interface ClassSubject { id: string; subjectName: string; className: string; gradeYear: number }
interface QuizQ { question: string; options: string[]; correctIndex: number; explanation: string }

type ActivityType = "WRITTEN" | "SPOKEN" | "QUIZ";

const TYPE_OPTS = [
  { value: "WRITTEN", label: "Escrita", desc: "Resposta em texto" },
  { value: "SPOKEN", label: "Fala", desc: "Resposta em áudio" },
  { value: "QUIZ", label: "Quiz", desc: "Múltipla escolha" },
] as const;

export default function NovaAtividadePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [form, setForm] = useState({
    classSubjectId: searchParams.get("cs") ?? "",
    type: "WRITTEN" as ActivityType,
    title: "",
    prompt: "",
    rubric: [{ criterio: "Conteúdo e coerência", peso: 0.6, descricao: "" }, { criterio: "Clareza e organização", peso: 0.4, descricao: "" }],
    maxScore: 10,
    maxAttempts: 2,
    maxAudioSec: 90,
    dueAt: "",
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
  });
  const [questions, setQuestions] = useState<QuizQ[]>([{ question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/escola/professor/turmas-componentes")
      .then((r) => r.json())
      .then((d) => setClassSubjects(d.items ?? []));
  }, []);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const suggest = async () => {
    const cs = classSubjects.find((c) => c.id === form.classSubjectId);
    if (!cs) return;
    setSuggesting(true);
    const res = await fetch("/api/escola/professor/atividades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sugerir", subjectName: cs.subjectName, gradeYear: cs.gradeYear, type: form.type }),
    });
    if (res.ok) {
      const { suggestion } = await res.json();
      setForm((prev) => ({
        ...prev,
        title: suggestion.title ?? prev.title,
        prompt: suggestion.prompt ?? prev.prompt,
        rubric: suggestion.rubric?.criterios ?? prev.rubric,
      }));
      if (form.type === "QUIZ" && suggestion.questions?.length) setQuestions(suggestion.questions);
    }
    setSuggesting(false);
  };

  const updateRubric = (i: number, field: string, val: string | number) =>
    setForm((prev) => {
      const r = [...prev.rubric];
      r[i] = { ...r[i], [field]: val };
      return { ...prev, rubric: r };
    });

  const addRubric = () => setForm((prev) => ({ ...prev, rubric: [...prev.rubric, { criterio: "", peso: 0, descricao: "" }] }));
  const removeRubric = (i: number) => setForm((prev) => ({ ...prev, rubric: prev.rubric.filter((_, j) => j !== i) }));

  const updateQ = (qi: number, field: string, val: string | number) =>
    setQuestions((prev) => { const q = [...prev]; q[qi] = { ...q[qi], [field]: val as never }; return q; });
  const updateOpt = (qi: number, oi: number, val: string) =>
    setQuestions((prev) => { const q = [...prev]; q[qi].options[oi] = val; return q; });
  const addQ = () => setQuestions((prev) => [...prev, { question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]);
  const removeQ = (i: number) => setQuestions((prev) => prev.filter((_, j) => j !== i));

  const totalPeso = form.rubric.reduce((s, r) => s + Number(r.peso), 0);

  const handleSave = async (publishNow: boolean) => {
    setSaving(true);
    const body = {
      classSubjectId: form.classSubjectId,
      type: form.type,
      title: form.title,
      prompt: form.prompt,
      rubric: { criterios: form.rubric },
      maxScore: form.maxScore,
      maxAttempts: form.maxAttempts,
      maxAudioSec: form.type === "SPOKEN" ? form.maxAudioSec : null,
      dueAt: form.dueAt || null,
      status: publishNow ? "PUBLISHED" : "DRAFT",
      questions: form.type === "QUIZ" ? questions : undefined,
    };
    const res = await fetch("/api/escola/professor/atividades", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => router.push("/escola/professor"), 1000); }
  };

  if (saved) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--esc-bg,#f8f9fc)" }}>
      <CheckCircle2 className="size-16 text-green-500" />
      <p className="text-lg font-semibold text-zinc-800">Atividade salva!</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--esc-bg,#f8f9fc)" }}>
      <header className="sticky top-0 z-10 border-b" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-zinc-100"><ArrowLeft className="size-5 text-zinc-600" /></button>
          <h1 className="font-semibold text-zinc-900 flex-1">Nova atividade</h1>
          <button onClick={suggest} disabled={!form.classSubjectId || suggesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 transition-colors">
            {suggesting ? <RefreshCw className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            Sugerir com IA
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Turma/Componente */}
        <div className="rounded-xl border p-4 space-y-3" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
          <label className="text-sm font-semibold text-zinc-700">Turma / Componente</label>
          <select value={form.classSubjectId} onChange={(e) => set("classSubjectId", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-white text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }}>
            <option value="">Selecione…</option>
            {classSubjects.map((cs) => (
              <option key={cs.id} value={cs.id}>{cs.className} — {cs.subjectName}</option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div className="rounded-xl border p-4 space-y-3" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
          <label className="text-sm font-semibold text-zinc-700">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTS.map((t) => (
              <button key={t.value} onClick={() => set("type", t.value as ActivityType)}
                className={`rounded-lg border p-3 text-left transition-all ${form.type === t.value ? "border-violet-500 bg-violet-50" : "border-zinc-200"}`}>
                <p className={`text-sm font-semibold ${form.type === t.value ? "text-violet-700" : "text-zinc-800"}`}>{t.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Título + Enunciado */}
        <div className="rounded-xl border p-4 space-y-3" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
          <div>
            <label className="text-sm font-semibold text-zinc-700 block mb-1">Título</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex: Redação — Meio ambiente"
              className="w-full text-sm border rounded-lg px-3 py-2 text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-700 block mb-1">Enunciado para o aluno</label>
            <textarea value={form.prompt} onChange={(e) => set("prompt", e.target.value)} rows={5}
              placeholder="Escreva o que o aluno deve fazer…"
              className="w-full text-sm border rounded-lg px-3 py-2 text-zinc-900 resize-none" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
          </div>
        </div>

        {/* Rubrica (não para quiz) */}
        {form.type !== "QUIZ" && (
          <div className="rounded-xl border p-4 space-y-3" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-700">Critérios de avaliação</label>
              <span className={`text-xs font-medium ${Math.abs(totalPeso - 1) < 0.01 ? "text-green-600" : "text-rose-500"}`}>
                Soma dos pesos: {totalPeso.toFixed(2)}
              </span>
            </div>
            {form.rubric.map((r, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <input value={r.criterio} onChange={(e) => updateRubric(i, "criterio", e.target.value)}
                    placeholder="Nome do critério" className="w-full text-sm border rounded-lg px-3 py-2 text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
                  <input value={r.descricao} onChange={(e) => updateRubric(i, "descricao", e.target.value)}
                    placeholder="Descrição (opcional)" className="w-full text-xs border rounded-lg px-3 py-1.5 text-zinc-600" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
                </div>
                <input type="number" min="0" max="1" step="0.1" value={r.peso}
                  onChange={(e) => updateRubric(i, "peso", Number(e.target.value))}
                  className="w-16 text-sm border rounded-lg px-2 py-2 text-center text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
                {form.rubric.length > 1 && (
                  <button onClick={() => removeRubric(i)} className="p-2 text-zinc-400 hover:text-rose-500 transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {form.rubric.length < 5 && (
              <button onClick={addRubric} className="text-sm text-violet-600 flex items-center gap-1 hover:underline">
                <Plus className="size-3.5" />Adicionar critério
              </button>
            )}
          </div>
        )}

        {/* Questões quiz */}
        {form.type === "QUIZ" && (
          <div className="rounded-xl border p-4 space-y-4" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
            <label className="text-sm font-semibold text-zinc-700">Questões</label>
            {questions.map((q, qi) => (
              <div key={qi} className="border rounded-lg p-4 space-y-3" style={{ borderColor: "var(--esc-border,#e5e7eb)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500">Questão {qi + 1}</span>
                  {questions.length > 1 && <button onClick={() => removeQ(qi)} className="text-zinc-400 hover:text-rose-500"><Trash2 className="size-4" /></button>}
                </div>
                <input value={q.question} onChange={(e) => updateQ(qi, "question", e.target.value)}
                  placeholder="Enunciado da questão"
                  className="w-full text-sm border rounded-lg px-3 py-2 text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${qi}`} checked={q.correctIndex === oi}
                        onChange={() => updateQ(qi, "correctIndex", oi)} className="accent-violet-500" />
                      <input value={opt} onChange={(e) => updateOpt(qi, oi, e.target.value)}
                        placeholder={`Alternativa ${String.fromCharCode(65 + oi)}`}
                        className="flex-1 text-sm border rounded-lg px-3 py-1.5 text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
                    </div>
                  ))}
                </div>
                <input value={q.explanation} onChange={(e) => updateQ(qi, "explanation", e.target.value)}
                  placeholder="Explicação (mostrada ao aluno após responder)"
                  className="w-full text-xs border rounded-lg px-3 py-1.5 text-zinc-500" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
              </div>
            ))}
            {questions.length < 10 && (
              <button onClick={addQ} className="text-sm text-violet-600 flex items-center gap-1 hover:underline">
                <Plus className="size-3.5" />Adicionar questão
              </button>
            )}
          </div>
        )}

        {/* Configurações */}
        <div className="rounded-xl border p-4 grid grid-cols-2 gap-4" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Nota máxima</label>
            <input type="number" min="1" max="100" value={form.maxScore} onChange={(e) => set("maxScore", Number(e.target.value))}
              className="w-full text-sm border rounded-lg px-3 py-2 text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Tentativas</label>
            <input type="number" min="1" max="5" value={form.maxAttempts} onChange={(e) => set("maxAttempts", Number(e.target.value))}
              className="w-full text-sm border rounded-lg px-3 py-2 text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
          </div>
          {form.type === "SPOKEN" && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 block mb-1">Tempo máx. de áudio (s)</label>
              <input type="number" min="30" max="300" step="10" value={form.maxAudioSec} onChange={(e) => set("maxAudioSec", Number(e.target.value))}
                className="w-full text-sm border rounded-lg px-3 py-2 text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Prazo (opcional)</label>
            <input type="datetime-local" value={form.dueAt} onChange={(e) => set("dueAt", e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3 pb-8">
          <button onClick={() => handleSave(false)} disabled={saving || !form.classSubjectId || !form.title}
            className="flex-1 py-3 rounded-xl border font-medium text-zinc-700 disabled:opacity-50"
            style={{ borderColor: "var(--esc-border,#e5e7eb)" }}>
            {saving ? <RefreshCw className="size-4 animate-spin mx-auto" /> : "Salvar rascunho"}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving || !form.classSubjectId || !form.title}
            className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-all"
            style={{ background: "var(--esc-primary,#7c3aed)" }}>
            {saving ? <RefreshCw className="size-4 animate-spin mx-auto" /> : "Publicar agora"}
          </button>
        </div>
      </main>
    </div>
  );
}
