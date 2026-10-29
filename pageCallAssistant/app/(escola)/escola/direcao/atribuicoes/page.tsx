"use client";
import { useEffect, useState } from "react";
import { STAGE_LABEL, SHIFT_LABEL } from "@/lib/escola/types";

interface Teacher { id: string; name: string; email: string; }
interface Offer { id: string; subjectId: string; teacherId: string | null; subject: { id: string; name: string; color: string | null }; }
interface EduClass { id: string; name: string; stage: string; gradeYear: number; shift: string; subjects: Offer[]; }
interface Subject { id: string; name: string; color: string | null; }

export default function AtribuicoesPage() {
  const [classes, setClasses] = useState<EduClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changes, setChanges] = useState<Record<string, string | null>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    fetch("/api/escola/escolas").then(r => r.json()).then(d => {
      setSchools(d.schools ?? []);
      if (d.schools?.[0]) setSchoolId(d.schools[0].id);
    });
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    fetch(`/api/escola/escolas/${schoolId}/atribuicoes`).then(r => r.json()).then(d => {
      setClasses(d.classes ?? []);
      setSubjects(d.subjects ?? []);
      setTeachers(d.teachers ?? []);
      setChanges({});
      setLoading(false);
    });
  }, [schoolId]);

  function setTeacher(offerId: string, teacherId: string | null) {
    setChanges(c => ({ ...c, [offerId]: teacherId }));
    setSaved(false);
  }

  function getOfferTeacher(offer: Offer): string | null {
    return offer.id in changes ? changes[offer.id] : (offer.teacherId ?? null);
  }

  async function save() {
    setSaving(true);
    const assignments = Object.entries(changes).map(([classSubjectId, teacherId]) => ({ classSubjectId, teacherId }));
    const r = await fetch(`/api/escola/escolas/${schoolId}/atribuicoes`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments }),
    });
    if (r.ok) { setSaved(true); setChanges({}); }
    setSaving(false);
  }

  const pendingCount = classes.reduce((acc, cls) => acc + cls.subjects.filter(o => !getOfferTeacher(o)).length, 0);
  const changesCount = Object.keys(changes).length;

  if (loading) return <div className="text-[#5B5470] text-center py-12 p-8">Carregando...</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1F1A2E]">Quadro de Atribuições</h1>
          {pendingCount > 0 && <p className="text-[#92400E] text-sm mt-0.5">{pendingCount} aula{pendingCount !== 1 ? "s" : ""} sem professor</p>}
        </div>
        <div className="flex gap-3 flex-wrap">
          <select value={schoolId} onChange={e => setSchoolId(e.target.value)} className="bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2 text-sm border border-[#DDD6EE] outline-none min-h-[44px]">
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {changesCount > 0 && (
            <button onClick={save} disabled={saving} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] disabled:opacity-50 transition-colors">
              {saving ? "Salvando..." : `Salvar ${changesCount} alteração${changesCount !== 1 ? "ões" : ""}`}
            </button>
          )}
          {saved && <span className="text-[#166534] text-sm flex items-center gap-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg> Salvo</span>}
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]"><div className="w-12 h-12 rounded-xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div><div>Nenhuma turma encontrada</div></div>
      ) : isMobile ? (
        // Mobile: list by class
        <div className="space-y-4">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
              <div className="font-semibold text-[#1F1A2E] mb-1">{cls.name}</div>
              <div className="text-[#5B5470] text-xs mb-3">{STAGE_LABEL[cls.stage as keyof typeof STAGE_LABEL] ?? cls.stage} · {cls.gradeYear}º · {SHIFT_LABEL[cls.shift as keyof typeof SHIFT_LABEL] ?? cls.shift}</div>
              <div className="space-y-2">
                {cls.subjects.map(offer => {
                  const currentTeacher = getOfferTeacher(offer);
                  const isChanged = offer.id in changes;
                  return (
                    <div key={offer.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: offer.subject?.color ?? "#7C3AED" }} />
                      <span className="text-[#5B5470] text-sm flex-1 min-w-0 truncate">{offer.subject?.name}</span>
                      <select
                        value={currentTeacher ?? ""}
                        onChange={e => setTeacher(offer.id, e.target.value || null)}
                        className={`bg-[#FAF9FD] text-sm rounded-lg px-2 py-1.5 border outline-none min-h-[44px] min-w-[160px] ${!currentTeacher ? "border-yellow-700 text-[#92400E]" : isChanged ? "border-purple-600 text-[#1F1A2E]" : "border-[#DDD6EE] text-[#1F1A2E]"}`}
                      >
                        <option value="">— Sem professor —</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Desktop: grid table
        <div className="overflow-x-auto rounded-xl border border-[#E9E5F5]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-white border-b border-[#E9E5F5]">
                <th className="text-left text-[#5B5470] font-medium p-3 min-w-[140px] sticky left-0 bg-white z-10">Turma</th>
                {subjects.map(s => (
                  <th key={s.id} className="text-center text-[#5B5470] font-medium p-2 min-w-[140px] max-w-[180px]">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color ?? "#7C3AED" }} />
                      <span className="truncate">{s.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => (
                <tr key={cls.id} className="border-b border-[#E9E5F5] hover:bg-white/40">
                  <td className="p-3 sticky left-0 bg-[#F8F7FC] z-10">
                    <div className="text-[#1F1A2E] font-medium">{cls.name}</div>
                    <div className="text-[#5B5470] text-xs">{cls.gradeYear}º · {SHIFT_LABEL[cls.shift as keyof typeof SHIFT_LABEL] ?? cls.shift}</div>
                  </td>
                  {subjects.map(subject => {
                    const offer = cls.subjects.find(o => o.subjectId === subject.id);
                    if (!offer) return <td key={subject.id} className="p-2 text-center"><span className="text-gray-700 text-xs">—</span></td>;
                    const currentTeacher = getOfferTeacher(offer);
                    const isChanged = offer.id in changes;
                    return (
                      <td key={subject.id} className="p-1.5">
                        <select
                          value={currentTeacher ?? ""}
                          onChange={e => setTeacher(offer.id, e.target.value || null)}
                          title={teachers.find(t => t.id === currentTeacher)?.name ?? ""}
                          className={`w-full bg-[#FAF9FD] text-xs rounded px-1.5 py-1.5 border outline-none min-h-[36px] ${!currentTeacher ? "border-yellow-700 text-[#92400E] bg-[#FEF3C7]" : isChanged ? "border-purple-600 text-[#1F1A2E]" : "border-[#DDD6EE] text-[#3F3A4F]"}`}
                        >
                          <option value="">—</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.name.split(" ")[0]} {t.name.split(" ").slice(-1)[0]}</option>)}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
