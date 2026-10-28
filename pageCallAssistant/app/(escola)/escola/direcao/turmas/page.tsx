"use client";
import { useEffect, useState } from "react";
import { Key, QrCode, Users } from "lucide-react";
import Link from "next/link";
import { STAGE_LABEL, SHIFT_LABEL, EduStage, EduShift } from "@/lib/escola/types";

interface Offer { id: string; subjectId: string; teacherId: string | null; subject: { name: string; color: string | null }; }
interface Class { id: string; name: string; stage: EduStage; gradeYear: number; shift: EduShift; accessCode: string; isActive: boolean; schoolYear: { year: number }; _count: { enrollments: number; subjects: number }; subjects: Offer[]; }
interface Student { id: string; fullName: string; enrollmentNumber: string; hasGuardian: boolean; }

export default function DirecaoTurmasPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<{id:string;name:string}[]>([]);
  const [years, setYears] = useState<{id:string;year:number;isCurrent:boolean}[]>([]);
  const [members, setMembers] = useState<{id:string;userId:string;role:string;user:{name:string;email:string}}[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ schoolId: "", schoolYearId: "", name: "", stage: "ELEMENTARY_LATE" as EduStage, gradeYear: 6, shift: "MORNING" as EduShift });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [classStudents, setClassStudents] = useState<Record<string, Student[]>>({});
  const [studentsLoading, setStudentsLoading] = useState<string | null>(null);
  const [pinMsg, setPinMsg] = useState<Record<string, string>>({});

  async function loadStudents(classId: string) {
    if (classStudents[classId]) return;
    setStudentsLoading(classId);
    try {
      const r = await fetch(`/api/escola/turmas/${classId}/alunos`);
      const d = await r.json();
      setClassStudents(prev => ({ ...prev, [classId]: d.students ?? [] }));
    } catch { /* ignore */ }
    setStudentsLoading(null);
  }

  async function resetPin(studentId: string, classId: string) {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const r = await fetch(`/api/escola/alunos/${studentId}/pin`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (r.ok) {
      setPinMsg(prev => ({ ...prev, [studentId]: `Novo PIN: ${pin}` }));
      setTimeout(() => setPinMsg(prev => { const n = { ...prev }; delete n[studentId]; return n; }), 15000);
    }
  }

  function toggleExpand(classId: string) {
    if (expandedClass === classId) { setExpandedClass(null); return; }
    setExpandedClass(classId);
    loadStudents(classId);
  }

  async function load() {
    setLoading(true);
    const [cr, sr, yr, mr] = await Promise.all([fetch("/api/escola/turmas"), fetch("/api/escola/escolas"), fetch("/api/escola/anos-letivos"), fetch("/api/escola/vinculos")]);
    const [cd, sd, yd, md] = await Promise.all([cr.json(), sr.json(), yr.json(), mr.json()]);
    setClasses(cd.classes ?? []); setSchools(sd.schools ?? []); setYears(yd.years ?? []); setMembers(md.members ?? []);
    const cy = yd.years?.find((y: {isCurrent:boolean;id:string}) => y.isCurrent);
    if (cy) setForm(f => ({...f, schoolYearId: cy.id}));
    if (sd.schools?.[0]) setForm(f => ({...f, schoolId: sd.schools[0].id}));
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

  async function assignTeacher(classId: string, subjectId: string, teacherId: string) {
    await fetch(`/api/escola/turmas/${classId}/ofertas`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subjectId, teacherId: teacherId || null }) });
    load();
  }

  const teachers = members.filter(m => m.role === "TEACHER");

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1F1A2E]">Turmas</h1>
        <button onClick={() => setShowForm(true)} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]">+ Nova turma</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-[#1F1A2E]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD6EE] rounded-xl p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto">
            <h2 className="text-[#1F1A2E] font-semibold mb-4">Nova Turma</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Escola *</label>
                <select value={form.schoolId} onChange={e => setForm(f => ({...f, schoolId: e.target.value}))} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] outline-none min-h-[44px]" required>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Ano letivo *</label>
                <select value={form.schoolYearId} onChange={e => setForm(f => ({...f, schoolYearId: e.target.value}))} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] outline-none min-h-[44px]" required>
                  {years.map(y => <option key={y.id} value={y.id}>{y.year}{y.isCurrent ? " (atual)" : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Nome *</label>
                <input className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" placeholder="7º B" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Etapa</label>
                  <select value={form.stage} onChange={e => setForm(f => ({...f, stage: e.target.value as EduStage}))} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-sm border border-[#DDD6EE] outline-none min-h-[44px]">
                    {(["ELEMENTARY_EARLY","ELEMENTARY_LATE","HIGH_SCHOOL","EARLY_CHILDHOOD","EJA"] as EduStage[]).map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[#5B5470] text-sm block mb-1">Ano/série</label>
                  <input type="number" min={1} max={9} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={form.gradeYear} onChange={e => setForm(f => ({...f, gradeYear: +e.target.value}))} required />
                </div>
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Turno</label>
                <select value={form.shift} onChange={e => setForm(f => ({...f, shift: e.target.value as EduShift}))} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] outline-none min-h-[44px]">
                  {(["MORNING","AFTERNOON","EVENING","FULL_TIME"] as EduShift[]).map(s => <option key={s} value={s}>{SHIFT_LABEL[s]}</option>)}
                </select>
              </div>
              {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] min-h-[44px]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-purple-700 text-white font-medium min-h-[44px] disabled:opacity-50">{saving ? "Criando..." : "Criar turma"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="text-[#5B5470] text-center py-12">Carregando...</div> : classes.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]"><div className="w-12 h-12 rounded-xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><Users size={22} className="text-[#6D28D9]" /></div><div>Nenhuma turma</div></div>
      ) : (
        <div className="space-y-3">
          {classes.map(c => (
            <div key={c.id} className="bg-white border border-[#E9E5F5] rounded-xl overflow-hidden">
              <button onClick={() => toggleExpand(c.id)} className="w-full p-4 flex items-center justify-between text-left min-h-[44px]">
                <div>
                  <div className="text-[#1F1A2E] font-semibold">{c.name}</div>
                  <div className="text-[#5B5470] text-xs">{STAGE_LABEL[c.stage]} · {c.gradeYear}º ano · {SHIFT_LABEL[c.shift]} · {c.schoolYear?.year}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[#5B5470] text-xs">{c._count?.enrollments} alunos · {c._count?.subjects} componentes</span>
                  <span className="text-[#5B5470] text-sm">{expandedClass === c.id ? "▲" : "▼"}</span>
                </div>
              </button>
              {expandedClass === c.id && (
                <div className="border-t border-[#E9E5F5]">
                  {/* Atribuições de professores */}
                  {c.subjects && c.subjects.length > 0 && (
                    <div className="p-4 border-b border-[#E9E5F5]">
                      <p className="text-[#5B5470] text-xs font-semibold mb-3 uppercase tracking-wide">Componentes e professores</p>
                      <div className="text-[#5B5470] text-xs mb-2">Código de acesso: <span className="text-[#6D28D9] font-mono">{c.accessCode}</span></div>
                      <div className="space-y-2">
                        {c.subjects.map((offer: Offer) => (
                          <div key={offer.id} className="flex items-center justify-between gap-3 bg-[#FAF9FD] rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: offer.subject?.color ?? "#7C3AED" }} />
                              <span className="text-[#1F1A2E] text-sm truncate">{offer.subject?.name}</span>
                            </div>
                            <select
                              value={offer.teacherId ?? ""}
                              onChange={e => assignTeacher(c.id, offer.subjectId, e.target.value)}
                              className="bg-[#EDE9FE] text-[#1F1A2E] rounded px-2 py-1 text-xs border border-[#DDD6EE] outline-none min-h-[36px] max-w-[180px]"
                            >
                              <option value="">— Professor —</option>
                              {teachers.map(t => <option key={t.id} value={t.userId}>{t.user?.name || t.user?.email}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Alunos da turma */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#5B5470] text-xs font-semibold uppercase tracking-wide">Alunos</p>
                      <Link href={`/escola/professor/turmas/${c.id}/cartoes`} className="flex items-center gap-1.5 text-[#6D28D9] text-xs font-medium hover:underline">
                        <QrCode size={12} /> Imprimir cartões
                      </Link>
                    </div>
                    {studentsLoading === c.id ? (
                      <p className="text-[#5B5470] text-sm text-center py-4">Carregando alunos…</p>
                    ) : (classStudents[c.id] ?? []).length === 0 ? (
                      <p className="text-[#5B5470] text-sm text-center py-4">Nenhum aluno matriculado.</p>
                    ) : (
                      <div className="space-y-2">
                        {(classStudents[c.id] ?? []).map((s) => (
                          <div key={s.id} className="flex items-center justify-between gap-3 bg-[#FAF9FD] rounded-xl px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-[#1F1A2E] text-sm font-medium truncate">{s.fullName}</p>
                              <p className="text-[#5B5470] text-xs">
                                Matrícula {s.enrollmentNumber} ·{" "}
                                <span className={s.hasGuardian ? "text-[#166534]" : "text-[#92400E]"}>
                                  {s.hasGuardian ? "Com responsável" : "Sem responsável"}
                                </span>
                              </p>
                              {pinMsg[s.id] && (
                                <p className="text-[#6D28D9] text-xs font-mono mt-1 bg-[#EDE9FE] px-2 py-0.5 rounded">{pinMsg[s.id]}</p>
                              )}
                            </div>
                            <button
                              onClick={() => resetPin(s.id, c.id)}
                              title="Gerar PIN novo"
                              className="flex items-center gap-1 text-xs text-[#5B5470] border border-[#DDD6EE] hover:border-[#C4B5FD] hover:text-[#6D28D9] px-2.5 py-1.5 rounded-lg min-h-[36px] transition-colors whitespace-nowrap"
                            >
                              <Key size={12} /> PIN novo
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
