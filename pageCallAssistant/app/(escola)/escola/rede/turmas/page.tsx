"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Info, AlertTriangle, X } from "lucide-react";
import { STAGE_LABEL, SHIFT_LABEL, EduStage, EduShift } from "@/lib/escola/types";
import { yearsForStage, yearFromName, suggestClassName } from "@/lib/escola/stage";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";

interface Class {
  id: string; name: string; stage: EduStage; gradeYear: number; shift: EduShift;
  accessCode: string; isActive: boolean; schoolId?: string; schoolYearId?: string;
  school: { name: string }; schoolYear: { year: number };
  _count?: { enrollments: number; subjects: number };
}

const STAGES: EduStage[] = ["ELEMENTARY_EARLY", "ELEMENTARY_LATE", "HIGH_SCHOOL", "EARLY_CHILDHOOD", "EJA"];
const SHIFTS: EduShift[] = ["MORNING", "AFTERNOON", "EVENING", "FULL_TIME"];

const inputCls =
  "w-full bg-white text-[#1F1A2E] rounded-[10px] px-3 h-12 text-sm border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none transition-colors";

export default function TurmasRedePage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<{ id: string; year: number; isCurrent: boolean }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ schoolId: "", schoolYearId: "", name: "", stage: "ELEMENTARY_LATE" as EduStage, gradeYear: 6, shift: "MORNING" as EduShift });
  const [nameEdited, setNameEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterSchool, setFilterSchool] = useState("");

  async function load() {
    setLoading(true);
    const [cr, sr, yr] = await Promise.all([fetch("/api/escola/turmas"), fetch("/api/escola/escolas"), fetch("/api/escola/anos-letivos")]);
    const [cd, sd, yd] = await Promise.all([cr.json(), sr.json(), yr.json()]);
    setClasses(cd.classes ?? []); setSchools(sd.schools ?? []); setYears(yd.years ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Letras já usadas para a combinação escola+ano letivo+ano/série+turno
  function usedNames(f: typeof form) {
    return classes
      .filter((c) => c.schoolId === f.schoolId && c.schoolYearId === f.schoolYearId && c.gradeYear === f.gradeYear && c.shift === f.shift)
      .map((c) => c.name);
  }

  function openForm() {
    const currentYear = years.find((y) => y.isCurrent) ?? years[0];
    const base = {
      schoolId: schools[0]?.id ?? "",
      schoolYearId: currentYear?.id ?? "",
      name: "",
      stage: "ELEMENTARY_LATE" as EduStage,
      gradeYear: 6,
      shift: "MORNING" as EduShift,
    };
    base.name = suggestClassName(base.gradeYear, usedNames(base));
    setForm(base);
    setNameEdited(false);
    setError("");
    setShowForm(true);
  }

  // Atualiza o form garantindo ano válido para a etapa e re-sugerindo o nome
  function patch(partial: Partial<typeof form>) {
    setForm((prev) => {
      const next = { ...prev, ...partial };
      if (partial.stage) {
        const allowed = yearsForStage(next.stage);
        if (!allowed.includes(next.gradeYear)) next.gradeYear = allowed[0] ?? next.gradeYear;
      }
      if (!nameEdited) next.name = suggestClassName(next.gradeYear, usedNames(next));
      return next;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const r = await fetch("/api/escola/turmas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await r.json();
    if (!r.ok) { setError(data.error ?? "Não foi possível salvar."); setSaving(false); return; }
    setShowForm(false); setSaving(false); load();
  }

  const nameYear = yearFromName(form.name);
  const nameMismatch = nameYear !== null && nameYear !== form.gradeYear;
  const filtered = filterSchool ? classes.filter((c) => c.school?.name === filterSchool) : classes;

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede", href: "/escola/rede" }, { label: "Turmas e alunos" }]}
        title="Turmas da Rede"
        subtitle="Crie turmas avulsas ou importe a planilha para cadastrar em massa."
        action={
          <button onClick={openForm} className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]">
            + Nova turma
          </button>
        }
      />

      <div className="px-7 py-6 max-w-[1440px] mx-auto w-full">
        {schools.length > 1 && (
          <div className="mb-4">
            <select value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)} className="bg-white text-[#1F1A2E] rounded-[10px] px-3 h-11 text-sm border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none">
              <option value="">Todas as escolas</option>
              {schools.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        )}

        {loading ? (
          <div className="text-[#5B5470] text-center py-16">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E9E5F5] flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-4"><Users size={26} className="text-[#6D28D9]" /></div>
            <p className="text-[#1F1A2E] text-[15px] font-semibold">Nenhuma turma ainda</p>
            <p className="text-[#5B5470] text-sm mt-1 max-w-sm">Crie uma turma ou importe a planilha (Modelo C), que já traz alunos e responsáveis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <div key={c.id} className="bg-white border border-[#E9E5F5] rounded-2xl p-4 hover:border-[#C4B5FD] transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[#1F1A2E] font-semibold">{c.name}</div>
                    <div className="text-[#5B5470] text-xs">{c.school?.name}</div>
                  </div>
                  <span className="text-[#5B5470] text-xs bg-[#FAF9FD] border border-[#E9E5F5] px-2 py-0.5 rounded-full">{c.schoolYear?.year}</span>
                </div>
                <div className="text-[#5B5470] text-xs space-y-1">
                  <div>{STAGE_LABEL[c.stage]} · {c.gradeYear}º ano · {SHIFT_LABEL[c.shift]}</div>
                  <div>Código: <span className="text-[#6D28D9] font-mono font-medium">{c.accessCode}</span></div>
                  {c._count && <div>{c._count.enrollments} alunos · {c._count.subjects} componentes</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1A2E]/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#1F1A2E] font-semibold text-[15px]">Nova turma</h2>
              <button onClick={() => setShowForm(false)} className="text-[#5B5470] hover:text-[#1F1A2E] p-1"><X size={18} /></button>
            </div>

            <div className="flex items-start gap-2 p-3 mb-4 bg-[#EDE9FE] rounded-lg">
              <Info size={15} className="text-[#6D28D9] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#4C1D95]">
                Para várias turmas, use <Link href="/escola/rede/importacoes?modelo=C" className="font-semibold underline">Importar planilha (Modelo C)</Link>, que já traz alunos e responsáveis.
              </p>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-[#1F1A2E] text-[13px] font-medium block mb-1">Escola *</label>
                <select value={form.schoolId} onChange={(e) => patch({ schoolId: e.target.value })} className={inputCls} required>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#1F1A2E] text-[13px] font-medium block mb-1">Ano letivo *</label>
                <select value={form.schoolYearId} onChange={(e) => patch({ schoolYearId: e.target.value })} className={inputCls} required>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.year}{y.isCurrent ? " (atual)" : ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#1F1A2E] text-[13px] font-medium block mb-1">Etapa *</label>
                  <select value={form.stage} onChange={(e) => patch({ stage: e.target.value as EduStage })} className={inputCls}>
                    {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[#1F1A2E] text-[13px] font-medium block mb-1">Ano/série *</label>
                  <select value={form.gradeYear} onChange={(e) => patch({ gradeYear: +e.target.value })} className={inputCls}>
                    {yearsForStage(form.stage).map((y) => <option key={y} value={y}>{y}º</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[#1F1A2E] text-[13px] font-medium block mb-1">Nome da turma *</label>
                <input
                  className={inputCls}
                  placeholder="6º A"
                  value={form.name}
                  onChange={(e) => { setNameEdited(true); setForm((f) => ({ ...f, name: e.target.value })); }}
                  required
                />
                {nameMismatch && (
                  <p className="flex items-center gap-1.5 text-[12px] text-[#92400E] mt-1">
                    <AlertTriangle size={13} /> O nome indica {nameYear}º ano, mas o ano/série escolhido é {form.gradeYear}º.
                  </p>
                )}
              </div>
              <div>
                <label className="text-[#1F1A2E] text-[13px] font-medium block mb-1">Turno *</label>
                <select value={form.shift} onChange={(e) => patch({ shift: e.target.value as EduShift })} className={inputCls}>
                  {SHIFTS.map((s) => <option key={s} value={s}>{SHIFT_LABEL[s]}</option>)}
                </select>
              </div>
              <p className="text-[12px] text-[#5B5470]">O código de acesso é gerado pelo sistema (ex.: SF{years.find((y) => y.id === form.schoolYearId)?.year ?? ""}-{form.name.replace(/[^A-Za-z0-9]/g, "").toUpperCase()}).</p>
              {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] min-h-[44px]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold min-h-[44px] disabled:opacity-50">{saving ? "Salvando…" : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
