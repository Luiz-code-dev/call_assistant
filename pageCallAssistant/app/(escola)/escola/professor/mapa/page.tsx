"use client";
import { useEffect, useState, useCallback } from "react";
import { AlertCircle, X, Users } from "lucide-react";

interface Skill    { id: string; code: string; shortLabel: string | null; subjectCode: string; }
interface Student  { id: string; fullName: string; }
interface Mastery  { studentId: string; skillId: string; level: "NOT_YET"|"ALMOST"|"MASTERED"; }
interface EduClass { id: string; name: string; gradeYear: number; }

const LEVEL_COLOR: Record<string, string> = {
  NOT_YET:  "#DC2626",
  ALMOST:   "#D97706",
  MASTERED: "#16A34A",
};
const LEVEL_BG: Record<string, string> = {
  NOT_YET:  "#FEE2E2",
  ALMOST:   "#FEF3C7",
  MASTERED: "#DCFCE7",
};
const LEVEL_LABEL: Record<string, string> = {
  NOT_YET: "Ainda não", ALMOST: "Quase lá", MASTERED: "Domina",
};

function nivelCell(level: string | undefined) {
  if (!level) return { bg: "#F8F7FC", color: "#5B5470", label: "—" };
  return { bg: LEVEL_BG[level] ?? "#F8F7FC", color: LEVEL_COLOR[level] ?? "#5B5470", label: LEVEL_LABEL[level] ?? "—" };
}

export default function MapaTurmaPage() {
  const [skills, setSkills]       = useState<Skill[]>([]);
  const [students, setStudents]   = useState<Student[]>([]);
  const [masteries, setMasteries] = useState<Mastery[]>([]);
  const [loading, setLoading]     = useState(true);
  const [erro, setErro]           = useState("");
  const [classId, setClassId]     = useState("");
  const [classes, setClasses]     = useState<EduClass[]>([]);
  const [subjectFilter, setSubjectFilter] = useState("todos");
  const [painelHab, setPainelHab]   = useState<Skill | null>(null);
  const [painelAluno, setPainelAluno] = useState<Student | null>(null);

  useEffect(() => {
    fetch("/api/escola/professor/turmas")
      .then(r => r.ok ? r.json() : { classes: [] })
      .then(d => { setClasses(d.classes ?? []); if (d.classes?.[0]) setClassId(d.classes[0].id); });
  }, []);

  const carregarMapa = useCallback(async (cid: string) => {
    if (!cid) return;
    setLoading(true); setErro("");
    const [sd, md] = await Promise.all([
      fetch(`/api/escola/professor/turmas/${cid}/alunos`).then(r => r.ok ? r.json() : { students: [] }).catch(() => ({ students: [] })),
      fetch(`/api/escola/professor/turmas/${cid}/mastery`).then(r => r.ok ? r.json() : { masteries: [], skills: [] }).catch(() => ({ masteries: [], skills: [] })),
    ]);
    setStudents(sd.students ?? []);
    setMasteries(md.masteries ?? []);
    const raw: Skill[] = md.skills ?? [];
    setSkills(raw.map((s: { id: string; code?: string; shortLabel?: string | null; name?: string; subjectCode?: string }) => ({
      id: s.id,
      code: s.code ?? s.id,
      shortLabel: s.shortLabel ?? null,
      subjectCode: s.subjectCode ?? "",
    })));
    setLoading(false);
  }, []);

  useEffect(() => { carregarMapa(classId); }, [classId, carregarMapa]);

  const masteryMap: Record<string, Record<string, string>> = {};
  for (const m of masteries) {
    if (!masteryMap[m.studentId]) masteryMap[m.studentId] = {};
    masteryMap[m.studentId][m.skillId] = m.level;
  }

  const subjects = skills.map(s => s.subjectCode).filter((v,i,a) => v && a.indexOf(v) === i);
  const filteredSkills = subjectFilter === "todos" ? skills : skills.filter(s => s.subjectCode === subjectFilter);

  function skillStats(skillId: string) {
    const counts = { NOT_YET: 0, ALMOST: 0, MASTERED: 0, none: 0 };
    for (const st of students) {
      const lvl = masteryMap[st.id]?.[skillId];
      if (lvl === "NOT_YET" || lvl === "ALMOST" || lvl === "MASTERED") counts[lvl]++;
      else counts.none++;
    }
    return counts;
  }

  return (
    <div className="p-4 md:p-6 max-w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1A2E]">Mapa da Turma</h1>
          <p className="text-[#5B5470] text-sm mt-0.5">Alunos × habilidades por nível de domínio</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="bg-white border border-[#DDD6EE] text-[#1F1A2E] rounded-lg px-3 py-2 text-sm outline-none min-h-[44px]">
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.gradeYear}º ano</option>)}
          </select>
          {subjects.length > 1 && (
            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
              className="bg-white border border-[#DDD6EE] text-[#1F1A2E] rounded-lg px-3 py-2 text-sm outline-none min-h-[44px]">
              <option value="todos">Todos os componentes</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
        {Object.entries(LEVEL_LABEL).map(([k,v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: LEVEL_BG[k] }} />
            <span style={{ color: LEVEL_COLOR[k] }} className="font-medium">{v}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-[#F8F7FC] border border-[#E9E5F5]" />
          <span className="text-[#5B5470]">Não avaliado</span>
        </span>
      </div>

      {loading ? (
        <div className="text-[#5B5470] text-center py-16">Carregando mapa...</div>
      ) : erro ? (
        <div className="text-center py-16">
          <AlertCircle className="mx-auto mb-3 text-[#B91C1C]" size={32} />
          <p className="text-[#5B5470]">{erro}</p>
          <button onClick={() => carregarMapa(classId)} className="mt-3 text-[#6D28D9] text-sm hover:underline">Tentar de novo</button>
        </div>
      ) : filteredSkills.length === 0 || students.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]">
          <Users className="mx-auto mb-3" size={36} strokeWidth={1.5} />
          <p>{students.length === 0 ? "Nenhum aluno nesta turma." : "Nenhuma habilidade avaliada ainda."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E9E5F5]">
          <table className="text-xs border-collapse min-w-full">
            <thead>
              <tr className="bg-white border-b border-[#E9E5F5]">
                <th className="text-left text-[#5B5470] font-medium p-3 sticky left-0 bg-white z-10 min-w-[160px]">Aluno</th>
                {filteredSkills.map(s => {
                  const stats = skillStats(s.id);
                  return (
                    <th key={s.id} className="text-center p-2 min-w-[90px] cursor-pointer hover:bg-[#F8F7FC] transition-colors"
                      onClick={() => setPainelHab(s)}>
                      <span className="font-mono text-[#4C1D95] block">{s.code}</span>
                      <span className="text-[#5B5470] text-[10px] block leading-tight">{s.shortLabel?.slice(0,20) ?? ""}</span>
                      <div className="flex justify-center gap-0.5 mt-1">
                        {stats.NOT_YET > 0  && <span className="px-1 py-0.5 rounded text-white text-[9px] font-bold" style={{ background: LEVEL_COLOR.NOT_YET  }}>{stats.NOT_YET}</span>}
                        {stats.ALMOST > 0   && <span className="px-1 py-0.5 rounded text-white text-[9px] font-bold" style={{ background: LEVEL_COLOR.ALMOST   }}>{stats.ALMOST}</span>}
                        {stats.MASTERED > 0 && <span className="px-1 py-0.5 rounded text-white text-[9px] font-bold" style={{ background: LEVEL_COLOR.MASTERED }}>{stats.MASTERED}</span>}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {students.map(st => (
                <tr key={st.id} className="border-b border-[#F8F7FC] hover:bg-[#FAFAFA]">
                  <td className="p-3 sticky left-0 bg-white z-10 border-r border-[#F8F7FC]">
                    <button className="text-left text-[#1F1A2E] font-medium hover:text-[#6D28D9] transition-colors" onClick={() => setPainelAluno(st)}>
                      {st.fullName}
                    </button>
                  </td>
                  {filteredSkills.map(s => {
                    const lvl = masteryMap[st.id]?.[s.id];
                    const cell = nivelCell(lvl);
                    return (
                      <td key={s.id} className="p-1 text-center">
                        <span className="inline-block w-full text-center py-1 rounded text-[10px] font-medium" style={{ background: cell.bg, color: cell.color }}>
                          {cell.label}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Painel lateral: habilidade */}
      {painelHab && (
        <PainelHabilidade
          skill={painelHab}
          classId={classId}
          students={students}
          masteryMap={masteryMap}
          onClose={() => setPainelHab(null)}
        />
      )}

      {/* Painel lateral: aluno */}
      {painelAluno && (
        <PainelAluno
          student={painelAluno}
          classId={classId}
          skills={filteredSkills}
          masteryMap={masteryMap}
          onClose={() => setPainelAluno(null)}
        />
      )}
    </div>
  );
}

/* ─── Painel de habilidade ─────────────────────────── */
function PainelHabilidade({ skill, classId, students, masteryMap, onClose }: {
  skill: Skill; classId: string; students: Student[];
  masteryMap: Record<string, Record<string, string>>; onClose: () => void;
}) {
  const counts = { NOT_YET: 0, ALMOST: 0, MASTERED: 0, none: 0 };
  for (const st of students) {
    const lvl = masteryMap[st.id]?.[skill.id];
    if (lvl === "NOT_YET" || lvl === "ALMOST" || lvl === "MASTERED") counts[lvl]++;
    else counts.none++;
  }

  return (
    <aside className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white border-l border-[#E9E5F5] shadow-xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-[#E9E5F5] px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-mono text-[#4C1D95] font-bold">{skill.code}</span>
          {skill.shortLabel && <p className="text-[#5B5470] text-xs mt-0.5">{skill.shortLabel}</p>}
        </div>
        <button onClick={onClose} className="text-[#5B5470] hover:text-[#1F1A2E] p-1"><X size={20} /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[["NOT_YET","Ainda não"],["ALMOST","Quase lá"],["MASTERED","Domina"],["none","Não avaliado"]] .map(([k,l]) => (
            <div key={k} className="bg-[#F8F7FC] border border-[#E9E5F5] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: LEVEL_COLOR[k] ?? "#5B5470" }}>{counts[k as keyof typeof counts]}</p>
              <p className="text-xs text-[#5B5470] mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        {(counts.NOT_YET > 0 || counts.ALMOST > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#1F1A2E]">Ações rápidas</p>
            <a href={`/escola/professor/trilhas?skill=${skill.id}&classId=${classId}`}
              className="block w-full text-center border border-[#6D28D9] text-[#6D28D9] hover:bg-[#EDE9FE] py-2.5 rounded-xl text-sm font-medium min-h-[44px] flex items-center justify-center transition-colors">
              Sugerir trilha para esta habilidade
            </a>
          </div>
        )}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-[#1F1A2E] mb-2">Alunos</p>
          {students.map(st => {
            const lvl = masteryMap[st.id]?.[skill.id];
            const cell = nivelCell(lvl);
            return (
              <div key={st.id} className="flex items-center justify-between py-2 border-b border-[#F8F7FC] last:border-0">
                <span className="text-sm text-[#1F1A2E]">{st.fullName}</span>
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: cell.bg, color: cell.color }}>{cell.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

/* ─── Painel de aluno ──────────────────────────────── */
function PainelAluno({ student, classId: _cid, skills, masteryMap, onClose }: {
  student: Student; classId: string; skills: Skill[];
  masteryMap: Record<string, Record<string, string>>; onClose: () => void;
}) {
  return (
    <aside className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white border-l border-[#E9E5F5] shadow-xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-[#E9E5F5] px-6 py-4 flex items-center justify-between">
        <p className="font-semibold text-[#1F1A2E]">{student.fullName}</p>
        <button onClick={onClose} className="text-[#5B5470] hover:text-[#1F1A2E] p-1"><X size={20} /></button>
      </div>
      <div className="p-6 space-y-2">
        <p className="text-sm font-semibold text-[#1F1A2E] mb-3">Habilidades avaliadas</p>
        {skills.length === 0 && <p className="text-[#5B5470] text-sm">Nenhuma habilidade avaliada.</p>}
        {skills.map(s => {
          const lvl = masteryMap[student.id]?.[s.id];
          const cell = nivelCell(lvl);
          return (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-[#F8F7FC] last:border-0">
              <div>
                <span className="font-mono text-xs text-[#4C1D95] font-bold">{s.code}</span>
                {s.shortLabel && <p className="text-xs text-[#5B5470] mt-0.5">{s.shortLabel}</p>}
              </div>
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: cell.bg, color: cell.color }}>{cell.label}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
