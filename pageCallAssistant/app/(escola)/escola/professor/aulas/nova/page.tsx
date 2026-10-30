"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface ClassSubject { id: string; subjectName: string; className: string; }

function AulaNovaInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const prefillClassSubjectId = sp.get("classSubjectId") ?? "";

  const [offers, setOffers] = useState<ClassSubject[]>([]);
  const [classSubjectId, setClassSubjectId] = useState(prefillClassSubjectId);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [objectives, setObjectives] = useState([{ text: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/escola/professor/turmas-componentes", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setOffers(d.offers ?? []); })
      .catch(() => {});
  }, []);

  function addObjective() { if (objectives.length < 3) setObjectives([...objectives, { text: "" }]); }
  function updateObjective(i: number, v: string) {
    const next = [...objectives]; next[i] = { text: v }; setObjectives(next);
  }

  async function publish() {
    if (!classSubjectId || !date || !title) { setError("Preencha turma, data e tema."); return; }
    setSaving(true); setError("");
    const r = await fetch("/api/escola/professor/aulas", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classSubjectId, date, title, dueAt: dueAt || null, objectives: objectives.filter(o => o.text), status: "PUBLISHED" }),
    });
    if (r.ok) {
      const d = await r.json();
      router.push(`/escola/professor/aulas/${d.lesson.id}`);
    } else {
      const d = await r.json();
      setError(d.error ?? "Erro ao registrar aula.");
    }
    setSaving(false);
  }

  const INPUT = "w-full h-[48px] border border-[#DDD6EE] rounded-lg px-3 text-[#1F1A2E] bg-white outline-none focus:border-[#6D28D9] text-sm";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-4">
        <Link href="/escola/professor/aulas" className="text-[#5B5470] hover:text-[#3F3A4F] text-sm">← Atividades da turma</Link>
      </div>
      <h1 className="text-2xl font-bold text-[#1F1A2E] mb-6">Aula de hoje</h1>

      {error && <div className="bg-[#FEE2E2] border border-[#B91C1C]/20 rounded-lg p-3 text-[#B91C1C] text-sm mb-4">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="text-[#5B5470] text-xs block mb-1">Turma e componente *</label>
          <select value={classSubjectId} onChange={e => setClassSubjectId(e.target.value)} className={INPUT}>
            <option value="">Selecionar...</option>
            {offers.map(o => <option key={o.id} value={o.id}>{o.subjectName} — {o.className}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[#5B5470] text-xs block mb-1">Data *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[#5B5470] text-xs block mb-1">Tema da aula *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Frações equivalentes" className={INPUT} />
        </div>
        <div>
          <label className="text-[#5B5470] text-xs block mb-1">Prazo para resposta (opcional)</label>
          <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[#5B5470] text-xs block mb-2">Objetivos da aula (até 3)</label>
          {objectives.map((o, i) => (
            <input key={i} value={o.text} onChange={e => updateObjective(i, e.target.value)}
              placeholder={`Objetivo ${i + 1}`} className={`${INPUT} mb-2`} />
          ))}
          {objectives.length < 3 && (
            <button onClick={addObjective} className="text-[#6D28D9] text-sm hover:underline">+ Adicionar objetivo</button>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={publish} disabled={saving || !classSubjectId || !date || !title}
          className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white py-3 rounded-lg font-semibold min-h-[44px] disabled:opacity-50 transition-colors">
          {saving ? "Publicando..." : "Publicar para a turma"}
        </button>
      </div>
    </div>
  );
}

export default function AulaNovaPage() {
  return <Suspense><AulaNovaInner /></Suspense>;
}
