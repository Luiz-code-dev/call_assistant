"use client";
import { useEffect, useState } from "react";
import { PLAN_STATUS_LABEL, EduPlanStatus } from "@/lib/escola/types";
import Link from "next/link";

interface Unit { id: string; title: string; order: number; startWeek: number | null; endWeek: number | null; topics: string[] | null; }
interface Plan { id: string; title: string; status: EduPlanStatus; stage: string; gradeYear: number; version: number; objectives: string; subject: { name: string; color: string | null }; schoolYear: { year: number }; units: Unit[]; }

const STATUS_COLOR: Record<EduPlanStatus, string> = { DRAFT: "bg-[#EDE9FE] text-[#3F3A4F]", IN_REVIEW: "bg-[#FEF3C7] text-yellow-300", APPROVED: "bg-[#DCFCE7] text-green-300", ARCHIVED: "bg-[#FAF9FD] text-[#5B5470]" };

export default function PlanoDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitForm, setUnitForm] = useState({ title: "", order: 1, startWeek: "", endWeek: "", topicsText: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/escola/planos/${id}`);
    const data = await r.json();
    setPlan(data.plan);
    if (data.plan?.units) setUnitForm(f => ({...f, order: data.plan.units.length + 1}));
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function saveUnit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const topics = unitForm.topicsText.split("\n").map(t => t.trim()).filter(Boolean);
    const r = await fetch(`/api/escola/planos/${id}/unidades`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...unitForm, topics, startWeek: unitForm.startWeek ? +unitForm.startWeek : null, endWeek: unitForm.endWeek ? +unitForm.endWeek : null }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setSaving(false); return; }
    setShowUnitForm(false); setUnitForm({ title: "", order: (plan?.units?.length ?? 0) + 2, startWeek: "", endWeek: "", topicsText: "" }); load(); setSaving(false);
  }

  if (loading) return <div className="text-[#5B5470] text-center py-12 p-8">Carregando...</div>;
  if (!plan) return <div className="text-[#5B5470] text-center py-12 p-8">Plano não encontrado</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-2">
        <Link href="/escola/coordenacao/planos" className="text-[#5B5470] hover:text-[#3F3A4F] text-sm transition-colors">← Planos</Link>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-[#1F1A2E]">{plan.title}</h1>
            <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[plan.status]}`}>{PLAN_STATUS_LABEL[plan.status]}</span>
            {plan.version > 1 && <span className="text-[#5B5470] text-xs">v{plan.version}</span>}
          </div>
          <p className="text-[#5B5470] text-sm">{plan.subject?.name} · {plan.gradeYear}º ano · {plan.schoolYear?.year}</p>
        </div>
      </div>

      <div className="bg-white border border-[#E9E5F5] rounded-xl p-4 mb-6">
        <h2 className="text-[#5B5470] text-xs font-medium uppercase tracking-wide mb-2">Objetivos gerais</h2>
        <p className="text-[#1F1A2E] text-sm whitespace-pre-wrap">{plan.objectives}</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1F1A2E]">Unidades didáticas <span className="text-[#5B5470] text-sm">({plan.units?.length ?? 0})</span></h2>
        {plan.status !== "ARCHIVED" && (
          <button onClick={() => setShowUnitForm(true)} className="text-sm text-purple-400 hover:text-purple-300 px-2 py-1 min-h-[44px] flex items-center transition-colors">+ Unidade</button>
        )}
      </div>

      {showUnitForm && (
        <div className="fixed inset-0 bg-[#1F1A2E]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD6EE] rounded-xl p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto">
            <h2 className="text-[#1F1A2E] font-semibold mb-4">Nova Unidade</h2>
            <form onSubmit={saveUnit} className="space-y-4">
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Título *</label>
                <input className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={unitForm.title} onChange={e => setUnitForm(f => ({...f, title: e.target.value}))} required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Ordem</label>
                  <input type="number" min={1} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={unitForm.order} onChange={e => setUnitForm(f => ({...f, order: +e.target.value}))} />
                </div>
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Semana início</label>
                  <input type="number" min={1} max={52} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={unitForm.startWeek} onChange={e => setUnitForm(f => ({...f, startWeek: e.target.value}))} />
                </div>
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Semana fim</label>
                  <input type="number" min={1} max={52} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={unitForm.endWeek} onChange={e => setUnitForm(f => ({...f, endWeek: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Tópicos (um por linha)</label>
                <textarea rows={5} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-sm border border-[#DDD6EE] focus:border-purple-500 outline-none resize-y font-mono" value={unitForm.topicsText} onChange={e => setUnitForm(f => ({...f, topicsText: e.target.value}))} placeholder={"Frações\nNúmeros decimais\nPorcentagem"} />
              </div>
              {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUnitForm(false)} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] min-h-[44px]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-purple-700 text-white font-medium min-h-[44px] disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {plan.units?.length === 0 ? (
        <div className="text-center py-10 text-[#5B5470] border border-dashed border-[#E9E5F5] rounded-xl">
          <div className="text-3xl mb-2"></div>
          <div className="text-sm">Nenhuma unidade didática</div>
        </div>
      ) : (
        <div className="space-y-3">
          {(plan.units ?? []).sort((a, b) => a.order - b.order).map(unit => (
            <div key={unit.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-purple-600 font-bold text-sm w-6">{unit.order}.</span>
                  <h3 className="text-[#1F1A2E] font-medium">{unit.title}</h3>
                </div>
                {(unit.startWeek || unit.endWeek) && (
                  <span className="text-[#5B5470] text-xs">Sem. {unit.startWeek}–{unit.endWeek}</span>
                )}
              </div>
              {unit.topics && unit.topics.length > 0 && (
                <ul className="ml-9 space-y-0.5">
                  {unit.topics.map((topic, i) => (
                    <li key={i} className="text-[#5B5470] text-sm before:content-['•'] before:mr-2 before:text-purple-600">{topic}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
