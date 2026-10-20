"use client";
import { useEffect, useState } from "react";
import { STAGE_LABEL, SHIFT_LABEL, EduStage, EduShift } from "@/lib/escola/types";
import Link from "next/link";

interface Class { id: string; name: string; stage: EduStage; gradeYear: number; shift: EduShift; accessCode: string; isActive: boolean; school: { name: string }; schoolYear: { year: number }; _count?: { enrollments: number; subjects: number }; }

export default function TurmasRedePage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<{id:string;name:string}[]>([]);
  const [years, setYears] = useState<{id:string;year:number;isCurrent:boolean}[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ schoolId: "", schoolYearId: "", name: "", stage: "ELEMENTARY_LATE" as EduStage, gradeYear: 6, shift: "MORNING" as EduShift });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterSchool, setFilterSchool] = useState("");

  async function load() {
    setLoading(true);
    const [cr, sr, yr] = await Promise.all([fetch("/api/escola/turmas"), fetch("/api/escola/escolas"), fetch("/api/escola/anos-letivos")]);
    const [cd, sd, yd] = await Promise.all([cr.json(), sr.json(), yr.json()]);
    setClasses(cd.classes ?? []); setSchools(sd.schools ?? []); setYears(yd.years ?? []);
    const currentYear = yd.years?.find((y: {isCurrent:boolean;id:string}) => y.isCurrent);
    if (currentYear) setForm(f => ({ ...f, schoolYearId: currentYear.id }));
    if (sd.schools?.[0]) setForm(f => ({ ...f, schoolId: sd.schools[0].id }));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const r = await fetch("/api/escola/turmas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setSaving(false); return; }
    setShowForm(false); load(); setSaving(false);
  }

  const filtered = filterSchool ? classes.filter(c => c.school?.name === filterSchool) : classes;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Turmas da Rede</h1>
        <button onClick={() => setShowForm(true)} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]">+ Nova turma</button>
      </div>

      {schools.length > 1 && (
        <div className="mb-4">
          <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 outline-none min-h-[44px]">
            <option value="">Todas as escolas</option>
            {schools.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto">
            <h2 className="text-white font-semibold mb-4">Nova Turma</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Escola *</label>
                <select value={form.schoolId} onChange={e => setForm(f => ({...f, schoolId: e.target.value}))} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-base border border-gray-700 outline-none min-h-[44px]" required>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Ano letivo *</label>
                <select value={form.schoolYearId} onChange={e => setForm(f => ({...f, schoolYearId: e.target.value}))} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-base border border-gray-700 outline-none min-h-[44px]" required>
                  {years.map(y => <option key={y.id} value={y.id}>{y.year}{y.isCurrent ? " (atual)" : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Nome da turma *</label>
                <input className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-base border border-gray-700 focus:border-purple-500 outline-none" placeholder="7º B" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Etapa *</label>
                  <select value={form.stage} onChange={e => setForm(f => ({...f, stage: e.target.value as EduStage}))} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 outline-none min-h-[44px]">
                    {(["ELEMENTARY_EARLY","ELEMENTARY_LATE","HIGH_SCHOOL","EARLY_CHILDHOOD","EJA"] as EduStage[]).map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Ano/série *</label>
                  <input type="number" min={1} max={9} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-base border border-gray-700 focus:border-purple-500 outline-none" value={form.gradeYear} onChange={e => setForm(f => ({...f, gradeYear: +e.target.value}))} required />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Turno *</label>
                <select value={form.shift} onChange={e => setForm(f => ({...f, shift: e.target.value as EduShift}))} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-base border border-gray-700 outline-none min-h-[44px]">
                  {(["MORNING","AFTERNOON","EVENING","FULL_TIME"] as EduShift[]).map(s => <option key={s} value={s}>{SHIFT_LABEL[s]}</option>)}
                </select>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 min-h-[44px]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-purple-700 text-white font-medium min-h-[44px] disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="text-gray-400 text-center py-12">Carregando...</div> : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500"><div className="text-4xl mb-3">👥</div><div>Nenhuma turma encontrada</div></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-white font-semibold">{c.name}</div>
                  <div className="text-gray-400 text-xs">{c.school?.name}</div>
                </div>
                <span className="text-gray-500 text-xs bg-gray-800 px-2 py-0.5 rounded">{c.schoolYear?.year}</span>
              </div>
              <div className="text-gray-500 text-xs space-y-1">
                <div>{STAGE_LABEL[c.stage]} · {c.gradeYear}º ano · {SHIFT_LABEL[c.shift]}</div>
                <div>Código: <span className="text-purple-400 font-mono">{c.accessCode}</span></div>
                {c._count && <div>{c._count.enrollments} alunos · {c._count.subjects} componentes</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
