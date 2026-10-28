"use client";
import { useEffect, useState } from "react";
import { ASSESSMENT_TYPE_LABEL, ASSESSMENT_STATUS_LABEL, EduAssessmentType } from "@/lib/escola/types";
import Link from "next/link";

interface Assessment { id: string; title: string; type: EduAssessmentType; status: string; weight: number; maxScore: string; termId: string | null; term: { name: string } | null; _count?: { entries: number }; }
interface Term { id: string; name: string; status: string; }

export default function AvaliacoesPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "EXAM" as EduAssessmentType, termId: "", weight: 1, maxScore: "10" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const [ar, tr] = await Promise.all([fetch(`/api/escola/ofertas/${id}/avaliacoes`), fetch("/api/escola/periodos-ativos")]);
    const [ad, td] = await Promise.all([ar.json(), tr.json()]);
    setAssessments(ad.assessments ?? []); setTerms(td.terms ?? []);
    if (td.terms?.[0]) setForm(f => ({...f, termId: td.terms[0].id}));
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const r = await fetch(`/api/escola/ofertas/${id}/avaliacoes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, weight: +form.weight, maxScore: +form.maxScore }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setSaving(false); return; }
    setShowForm(false); load(); setSaving(false);
  }

  async function changeStatus(assessmentId: string, action: "abrir" | "iniciar-correcao") {
    await fetch(`/api/escola/avaliacoes/${assessmentId}/${action}`, { method: "POST" });
    load();
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-2">
        <Link href={`/escola/professor/ofertas/${id}`} className="text-[#5B5470] hover:text-[#3F3A4F] text-sm transition-colors">← Oferta</Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1F1A2E]">Avaliações</h1>
        <button onClick={() => setShowForm(true)} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]">+ Nova avaliação</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-[#1F1A2E]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD6EE] rounded-xl p-6 w-full max-w-md">
            <h2 className="text-[#1F1A2E] font-semibold mb-4">Nova Avaliação</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Título *</label>
                <input className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Tipo *</label>
                  <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value as EduAssessmentType}))} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-sm border border-[#DDD6EE] outline-none min-h-[44px]">
                    {Object.entries(ASSESSMENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Período</label>
                  <select value={form.termId} onChange={e => setForm(f => ({...f, termId: e.target.value}))} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-sm border border-[#DDD6EE] outline-none min-h-[44px]">
                    {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Peso</label>
                  <input type="number" min={0.1} step={0.1} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={form.weight} onChange={e => setForm(f => ({...f, weight: +e.target.value}))} />
                </div>
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Nota máxima</label>
                  <input type="number" min={1} max={100} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={form.maxScore} onChange={e => setForm(f => ({...f, maxScore: e.target.value}))} />
                </div>
              </div>
              {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] min-h-[44px]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-purple-700 text-white font-medium min-h-[44px] disabled:opacity-50">{saving ? "Criando..." : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="text-[#5B5470] text-center py-12">Carregando...</div> : assessments.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]"><div className="text-4xl mb-3">📊</div><div>Nenhuma avaliação</div></div>
      ) : (
        <div className="space-y-3">
          {assessments.map(a => (
            <div key={a.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[#1F1A2E] font-medium">{a.title}</div>
                  <div className="text-[#5B5470] text-xs">{ASSESSMENT_TYPE_LABEL[a.type]} · {a.term?.name} · peso {a.weight} · máx {a.maxScore}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs ${a.status === "PUBLISHED" ? "bg-[#DCFCE7] text-green-300" : a.status === "GRADING" ? "bg-[#FEF3C7] text-yellow-300" : "bg-[#FAF9FD] text-[#5B5470]"}`}>{ASSESSMENT_STATUS_LABEL[a.status as keyof typeof ASSESSMENT_STATUS_LABEL] ?? a.status}</span>
                  {a.status === "DRAFT" && <button onClick={() => changeStatus(a.id, "abrir")} className="text-xs text-[#1D4ED8] hover:text-blue-300 px-2 py-1 min-h-[44px] flex items-center">Abrir</button>}
                  {a.status === "OPEN" && <button onClick={() => changeStatus(a.id, "iniciar-correcao")} className="text-xs text-[#92400E] hover:text-yellow-300 px-2 py-1 min-h-[44px] flex items-center">Iniciar correção</button>}
                  {["OPEN","GRADING"].includes(a.status) && (
                    <Link href={`/escola/professor/ofertas/${id}/notas?assessment=${a.id}`} className="text-xs text-purple-400 hover:text-purple-300 px-2 py-1 min-h-[44px] flex items-center">Lançar notas →</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
