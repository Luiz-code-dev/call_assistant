"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { User, TrendingUp, AlertCircle } from "lucide-react";

interface Mastery { skillId: string; level: string; skill: { code: string; subjectCode: string; description: string; thematicUnit: string | null; } }
interface Guide { skillId: string; commonErrors: { code: string; description: string }[] }
interface Student { id: string; fullName: string; enrollmentCode: string; }

const LEVEL_LABEL: Record<string, string> = { MASTERED: "Domina", ALMOST: "Quase lá", NOT_YET: "Ainda não" };
const LEVEL_COLOR: Record<string, string> = { MASTERED: "bg-[#DCFCE7] text-[#166534]", ALMOST: "bg-[#FEF3C7] text-[#92400E]", NOT_YET: "bg-[#FEE2E2] text-[#B91C1C]" };

export default function FichaAlunoPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [masteries, setMasteries] = useState<Mastery[]>([]);
  const [guideMap, setGuideMap] = useState<Record<string, Guide["commonErrors"]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/escola/ficha/${studentId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setStudent(d.student); setMasteries(d.masteries ?? []); setGuideMap(d.guideMap ?? {}); setLoading(false); })
      .catch(() => { setError("Erro ao carregar ficha."); setLoading(false); });
  }, [studentId]);

  if (loading) return <div className="p-8 text-center text-[#5B5470]">Carregando...</div>;
  if (error || !student) return (
    <div className="p-8 text-center">
      <AlertCircle className="w-8 h-8 text-[#B91C1C] mx-auto mb-2" />
      <div className="text-[#B91C1C] text-sm">{error || "Aluno não encontrado."}</div>
    </div>
  );

  const bySubject: Record<string, Mastery[]> = {};
  for (const m of masteries) {
    const s = m.skill.subjectCode;
    if (!bySubject[s]) bySubject[s] = [];
    bySubject[s].push(m);
  }

  const byUnit: Record<string, Record<string, Mastery[]>> = {};
  for (const m of masteries) {
    const s = m.skill.subjectCode;
    const u = m.skill.thematicUnit ?? "Geral";
    if (!byUnit[s]) byUnit[s] = {};
    if (!byUnit[s][u]) byUnit[s][u] = [];
    byUnit[s][u].push(m);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-4"><Link href="/escola/professor/mapa" className="text-[#5B5470] text-sm">← Mapa da turma</Link></div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-[#EDE9FE] rounded-full flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-[#6D28D9]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1F1A2E]">{student.fullName}</h1>
          <p className="text-[#5B5470] text-sm">Matrícula: {student.enrollmentCode}</p>
        </div>
      </div>

      {masteries.length === 0 && (
        <div className="border border-dashed border-[#DDD6EE] rounded-xl p-10 text-center text-[#5B5470]">
          <TrendingUp className="w-10 h-10 text-[#DDD6EE] mx-auto mb-3" />
          <div>Nenhum nível de habilidade registrado ainda.</div>
          <div className="text-sm mt-1">O perfil é atualizado à medida que o aluno realiza diagnósticos e atividades.</div>
        </div>
      )}

      {Object.entries(byUnit).map(([subjectCode, units]) => (
        <div key={subjectCode} className="mb-8">
          <h2 className="text-lg font-bold text-[#1F1A2E] mb-4">{subjectCode}</h2>
          {Object.entries(units).map(([unit, mList]) => (
            <div key={unit} className="mb-4">
              <h3 className="text-sm font-semibold text-[#5B5470] mb-2 uppercase tracking-wide">{unit}</h3>
              <div className="space-y-2">
                {mList.map(m => (
                  <div key={m.skillId} className="bg-white border border-[#E9E5F5] rounded-xl p-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-[#6D28D9] mb-0.5">{m.skill.code}</div>
                      <div className="text-[#1F1A2E] text-sm">{m.skill.description.slice(0, 100)}{m.skill.description.length > 100 ? "..." : ""}</div>
                      {guideMap[m.skillId]?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(guideMap[m.skillId] as {code:string;description:string}[]).slice(0, 2).map((e) => (
                            <div key={e.code} className="text-xs text-[#92400E] bg-[#FEF3C7] px-2 py-1 rounded">{e.description}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${LEVEL_COLOR[m.level] ?? "bg-[#FAF9FD] text-[#5B5470]"}`}>
                      {LEVEL_LABEL[m.level] ?? m.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
