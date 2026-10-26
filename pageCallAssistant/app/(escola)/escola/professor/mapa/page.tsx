"use client";
import { useEffect, useState } from "react";

interface Skill { id: string; code: string; shortLabel: string | null; subjectCode: string; }
interface Student { id: string; fullName: string; }
interface Mastery { studentId: string; skillId: string; level: "NOT_YET" | "ALMOST" | "MASTERED"; }

const LEVEL_BG: Record<string, string> = {
  NOT_YET: "bg-red-700",
  ALMOST: "bg-yellow-600",
  MASTERED: "bg-green-700",
  none: "bg-[#FAF9FD]",
};
const LEVEL_LABEL: Record<string, string> = {
  NOT_YET: "🔴", ALMOST: "🟡", MASTERED: "🟢", none: "—",
};

export default function MapaTurmaPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [masteries, setMasteries] = useState<Mastery[]>([]);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/escola/professor/turmas")
      .then(r => r.ok ? r.json() : { classes: [] })
      .then(d => { setClasses(d.classes ?? []); if (d.classes?.[0]) setClassId(d.classes[0].id); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/escola/professor/turmas/${classId}/alunos`).then(r => r.ok ? r.json() : { students: [] }),
      fetch(`/api/escola/professor/turmas/${classId}/mastery`).then(r => r.ok ? r.json() : { masteries: [], skills: [] }),
    ]).then(([studData, mastData]) => {
      setStudents(studData.students ?? []);
      setMasteries(mastData.masteries ?? []);
      setSkills(mastData.skills ?? []);
      setLoading(false);
    });
  }, [classId]);

  function getLevel(studentId: string, skillId: string) {
    return masteries.find(m => m.studentId === studentId && m.skillId === skillId)?.level ?? "none";
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] p-4">
      <div className="flex items-center gap-4 mb-6 mt-2">
        <h1 className="text-[#1F1A2E] text-xl font-bold flex-1">Mapa da Turma</h1>
        {classes.length > 1 && (
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            className="bg-[#FAF9FD] text-[#1F1A2E] rounded-xl px-3 py-2 text-sm border border-[#DDD6EE]"
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-[#5B5470] text-center py-16">Carregando mapa...</div>
      ) : skills.length === 0 || students.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]">
          <div className="text-4xl mb-3">📊</div>
          <p>Nenhum dado de domínio disponível ainda.</p>
          <p className="text-sm mt-1">Execute diagnósticos para ver o mapa.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E9E5F5]">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-white">
                <th className="px-3 py-2 text-left text-[#5B5470] font-medium sticky left-0 bg-white min-w-[140px]">Aluno</th>
                {skills.map(s => (
                  <th key={s.id} className="px-2 py-2 text-center text-[#5B5470] font-medium min-w-[56px]" title={s.code}>
                    <span className="block truncate max-w-[52px]">{s.shortLabel ?? s.code}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((st, idx) => (
                <tr key={st.id} className={idx % 2 === 0 ? "bg-[#F8F7FC]" : "bg-white/40"}>
                  <td className="px-3 py-2 text-[#1F1A2E] font-medium sticky left-0 bg-inherit truncate max-w-[140px]">
                    {st.fullName}
                  </td>
                  {skills.map(sk => {
                    const lvl = getLevel(st.id, sk.id);
                    return (
                      <td key={sk.id} className="px-2 py-2 text-center">
                        <span
                          title={lvl === "none" ? "Sem dados" : lvl}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm ${LEVEL_BG[lvl]}`}
                        >
                          {LEVEL_LABEL[lvl]}
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

      <div className="mt-4 flex gap-4 text-xs text-[#5B5470]">
        <span>🟢 Conquistado</span>
        <span>🟡 Quase lá</span>
        <span>🔴 Ainda aprendendo</span>
        <span>— Sem dados</span>
      </div>
    </div>
  );
}
