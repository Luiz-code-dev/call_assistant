"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { User, TrendingUp, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

interface Mastery { skillId: string; level: string; skill: { code: string; subjectCode: string; description: string; shortLabel: string | null; thematicUnit: string | null; knowledgeObject: string | null } }
interface StudentError { code: string; count: number; description: string }
interface Student { id: string; fullName: string; enrollmentCode: string }
interface SuggestedAssignment { id: string; trackId: string; trackTitle: string }

const LEVEL_LABEL: Record<string, string> = { MASTERED: "Domina", ALMOST: "Quase la", NOT_YET: "Ainda nao" };
const LEVEL_COLOR: Record<string, string> = { MASTERED: "bg-[#DCFCE7] text-[#166534]", ALMOST: "bg-[#FEF3C7] text-[#92400E]", NOT_YET: "bg-[#FEE2E2] text-[#B91C1C]" };

export default function FichaAlunoPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [masteries, setMasteries] = useState<Mastery[]>([]);
  const [guideMap, setGuideMap] = useState<Record<string, { code: string; description: string }[]>>({});
  const [studentErrorMap, setStudentErrorMap] = useState<Record<string, StudentError[]>>({});
  const [suggested, setSuggested] = useState<SuggestedAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedErrors, setExpandedErrors] = useState<Record<string, boolean>>({});
  const [aceitando, setAceitando] = useState(false);
  const [aceitoMsg, setAceitoMsg] = useState("");

  useEffect(() => {
    fetch(`/api/escola/ficha/${studentId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setStudent(d.student);
        setMasteries(d.masteries ?? []);
        setGuideMap(d.guideMap ?? {});
        setStudentErrorMap(d.studentErrorMap ?? {});
        setSuggested(d.suggestedAssignment ?? null);
        setLoading(false);
      })
      .catch(() => { setError("Erro ao carregar ficha."); setLoading(false); });
  }, [studentId]);

  async function aceitarTrilha() {
    if (!suggested) return;
    setAceitando(true);
    const r = await fetch(`/api/escola/ficha/${studentId}/atribuir-trilha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: suggested.trackId, acceptSuggestion: true, assignmentId: suggested.id }),
    });
    const d = await r.json();
    setAceitando(false);
    if (r.ok) { setAceitoMsg("Trilha aceita! O aluno ja pode comecar."); setSuggested(null); }
    else setAceitoMsg(d.error ?? "Erro ao aceitar trilha.");
  }

  if (loading) return <div className="p-8 text-center text-[#5B5470]">Carregando...</div>;
  if (error || !student) return (
    <div className="p-8 text-center">
      <AlertCircle className="w-8 h-8 text-[#B91C1C] mx-auto mb-2" />
      <div className="text-[#B91C1C] text-sm">{error || "Aluno nao encontrado."}</div>
    </div>
  );

  const bySubject: Record<string, Mastery[]> = {};
  for (const m of masteries) {
    if (!bySubject[m.skill.subjectCode]) bySubject[m.skill.subjectCode] = [];
    bySubject[m.skill.subjectCode].push(m);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/escola/professor/mapa" className="text-[#5B5470] text-sm hover:text-[#6D28D9]">&#8592; Mapa da turma</Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-[#EDE9FE] rounded-full flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-[#6D28D9]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1F1A2E]">{student.fullName}</h1>
          <p className="text-[#5B5470] text-sm">Matricula: {student.enrollmentCode}</p>
        </div>
      </div>

      {/* Trilha sugerida */}
      {suggested && (
        <div className="mb-6 rounded-xl border-2 border-[#6D28D9] bg-[#EDE9FE] p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#6D28D9] uppercase tracking-wide mb-0.5">Trilha sugerida pela IA</p>
            <p className="font-bold text-[#1F1A2E]">{suggested.trackTitle}</p>
          </div>
          <button
            onClick={aceitarTrilha}
            disabled={aceitando}
            className="shrink-0 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-bold px-4 py-2.5 rounded-xl min-h-[44px] transition-colors disabled:opacity-50"
          >
            {aceitando ? "Aceitando..." : "Aceitar trilha"}
          </button>
        </div>
      )}
      {aceitoMsg && (
        <div className={`mb-4 rounded-xl p-3 text-sm font-medium ${aceitoMsg.startsWith("Erro") ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#DCFCE7] text-[#166534]"}`}>
          {aceitoMsg}
        </div>
      )}

      {/* Habilidades por componente */}
      {Object.entries(bySubject).map(([subject, skills]) => (
        <div key={subject} className="mb-6">
          <h2 className="text-base font-semibold text-[#1F1A2E] mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#6D28D9]" />
            {subject}
          </h2>
          <div className="space-y-3">
            {skills.map(m => {
              const studentErrors = studentErrorMap[m.skillId] ?? [];
              const genericErrors = (guideMap[m.skillId] ?? []) as { code: string; description: string }[];
              const isExpanded = expandedErrors[m.skillId] ?? false;
              return (
                <div key={m.skillId} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="font-mono text-xs font-semibold text-[#6D28D9] bg-[#EDE9FE] px-2 py-1 rounded shrink-0">{m.skill.code}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1F1A2E] leading-tight">{m.skill.shortLabel ?? m.skill.description}</p>
                      {m.skill.knowledgeObject && <p className="text-xs text-[#5B5470] mt-0.5">{m.skill.knowledgeObject}</p>}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${LEVEL_COLOR[m.level] ?? "bg-[#F8F7FC] text-[#5B5470]"}`}>
                      {LEVEL_LABEL[m.level] ?? m.level}
                    </span>
                  </div>

                  {/* Erros REAIS deste aluno */}
                  {studentErrors.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {studentErrors.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-[#92400E] bg-[#FEF3C7] rounded-lg px-3 py-2">
                          <span className="shrink-0 mt-0.5 font-bold">&#9888;</span>
                          <span>Erro comum ({e.count}x): {e.description}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Erros genericos da habilidade (colapsados) */}
                  {genericErrors.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setExpandedErrors(prev => ({ ...prev, [m.skillId]: !isExpanded }))}
                        className="flex items-center gap-1 text-xs text-[#5B5470] hover:text-[#6D28D9] transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        Ver erros comuns desta habilidade
                      </button>
                      {isExpanded && (
                        <ul className="mt-2 space-y-1.5">
                          {genericErrors.map((e, i) => (
                            <li key={i} className="text-xs text-[#5B5470] flex items-start gap-2">
                              <span className="shrink-0 text-[#DDD6EE]">&#8226;</span>{e.description}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {masteries.length === 0 && (
        <div className="text-center py-16 text-[#5B5470]">Nenhuma habilidade avaliada ainda.</div>
      )}
    </div>
  );
}
