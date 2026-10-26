"use client";
import { useEffect, useState } from "react";
import { PLAN_STATUS_LABEL, STAGE_LABEL, EduStage, EduPlanStatus } from "@/lib/escola/types";
import Link from "next/link";

interface Plan { id: string; title: string; status: EduPlanStatus; stage: EduStage; gradeYear: number; version: number; subject: { name: string; color: string | null }; schoolYear: { year: number }; createdAt?: string; }

const STATUS_COLOR: Record<EduPlanStatus, string> = { DRAFT: "bg-[#EDE9FE] text-[#3F3A4F]", IN_REVIEW: "bg-[#FEF3C7] text-yellow-300", APPROVED: "bg-[#DCFCE7] text-green-300", ARCHIVED: "bg-[#FAF9FD] text-[#5B5470]" };

export default function PlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<{id:string;name:string;color:string|null}[]>([]);
  const [years, setYears] = useState<{id:string;year:number;isCurrent:boolean}[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subjectId: "", stage: "ELEMENTARY_LATE" as EduStage, gradeYear: 6, schoolYearId: "", title: "", objectives: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<EduPlanStatus | "">("");

  async function load() {
    setLoading(true);
    const [pr, sr, yr] = await Promise.all([fetch("/api/escola/planos"), fetch("/api/escola/componentes"), fetch("/api/escola/anos-letivos")]);
    const [pd, sd, yd] = await Promise.all([pr.json(), sr.json(), yr.json()]);
    setPlans(pd.plans ?? []); setSubjects(sd.subjects ?? []); setYears(yd.years ?? []);
    const cy = yd.years?.find((y: {isCurrent:boolean;id:string}) => y.isCurrent);
    if (cy) setForm(f => ({...f, schoolYearId: cy.id}));
    if (sd.subjects?.[0]) setForm(f => ({...f, subjectId: sd.subjects[0].id}));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const r = await fetch("/api/escola/planos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setSaving(false); return; }
    setShowForm(false); load(); setSaving(false);
  }

  async function changeStatus(id: string, action: "enviar" | "aprovar" | "arquivar") {
    await fetch(`/api/escola/planos/${id}/${action}`, { method: "POST" });
    load();
  }

  const filtered = filterStatus ? plans.filter(p => p.status === filterStatus) : plans;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-[#1F1A2E]">Planos de Ensino</h1>
        <button onClick={() => setShowForm(true)} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]">+ Novo plano</button>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {["", "DRAFT", "IN_REVIEW", "APPROVED", "ARCHIVED"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s as EduPlanStatus | "")}
            className={`px-3 py-1.5 rounded-lg text-sm min-h-[44px] transition-colors ${filterStatus === s ? "bg-purple-700 text-white" : "bg-[#FAF9FD] text-[#5B5470] hover:text-[#1F1A2E]"}`}>
            {s === "" ? "Todos" : PLAN_STATUS_LABEL[s as EduPlanStatus]}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-[#1F1A2E]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD6EE] rounded-xl p-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto">
            <h2 className="text-[#1F1A2E] font-semibold mb-4">Novo Plano de Ensino</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Componente *</label>
                <select value={form.subjectId} onChange={e => setForm(f => ({...f, subjectId: e.target.value}))} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] outline-none min-h-[44px]" required>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Etapa *</label>
                  <select value={form.stage} onChange={e => setForm(f => ({...f, stage: e.target.value as EduStage}))} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-sm border border-[#DDD6EE] outline-none min-h-[44px]">
                    {(["ELEMENTARY_EARLY","ELEMENTARY_LATE","HIGH_SCHOOL","EARLY_CHILDHOOD","EJA"] as EduStage[]).map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Ano/série *</label>
                  <input type="number" min={1} max={9} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={form.gradeYear} onChange={e => setForm(f => ({...f, gradeYear: +e.target.value}))} required />
                </div>
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Ano letivo *</label>
                <select value={form.schoolYearId} onChange={e => setForm(f => ({...f, schoolYearId: e.target.value}))} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] outline-none min-h-[44px]" required>
                  {years.map(y => <option key={y.id} value={y.id}>{y.year}{y.isCurrent ? " (atual)" : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Título *</label>
                <input className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Objetivos gerais *</label>
                <textarea rows={4} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none resize-y" value={form.objectives} onChange={e => setForm(f => ({...f, objectives: e.target.value}))} required />
              </div>
              {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] min-h-[44px]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-purple-700 text-white font-medium min-h-[44px] disabled:opacity-50">{saving ? "Salvando..." : "Criar rascunho"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="text-[#5B5470] text-center py-12">Carregando...</div> : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]"><div className="text-4xl mb-3">📋</div><div>Nenhum plano encontrado</div></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.subject?.color ?? "#7C3AED" }} />
                    <span className="text-[#1F1A2E] font-medium">{p.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[p.status]}`}>{PLAN_STATUS_LABEL[p.status]}</span>
                    {p.version > 1 && <span className="text-[#5B5470] text-xs">v{p.version}</span>}
                  </div>
                  <div className="text-[#5B5470] text-xs">{p.subject?.name} · {STAGE_LABEL[p.stage]} {p.gradeYear}º ano · {p.schoolYear?.year}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/escola/coordenacao/planos/${p.id}`} className="text-xs text-[#5B5470] hover:text-purple-400 px-2 py-1 min-h-[44px] flex items-center transition-colors">Ver detalhes</Link>
                  {p.status === "DRAFT" && <button onClick={() => changeStatus(p.id, "enviar")} className="text-xs text-[#92400E] hover:text-yellow-300 px-2 py-1 min-h-[44px] flex items-center transition-colors">Enviar para análise</button>}
                  {p.status === "IN_REVIEW" && <button onClick={() => changeStatus(p.id, "aprovar")} className="text-xs text-[#166534] hover:text-green-300 px-2 py-1 min-h-[44px] flex items-center transition-colors">Aprovar</button>}
                  {p.status === "APPROVED" && <button onClick={() => changeStatus(p.id, "arquivar")} className="text-xs text-[#5B5470] hover:text-[#5B5470] px-2 py-1 min-h-[44px] flex items-center transition-colors">Arquivar</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
