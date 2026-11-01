"use client";
import { useEffect, useState } from "react";
import { Target, BookOpen, RefreshCw, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

interface HabItem {
  skillCode: string;
  skillName: string;
  gradeYear: number;
  knowledgeObject: string;
  thematicUnit: string;
  subjectCode: string;
  notYetCount: number;
  almostCount: number;
  masteredCount: number;
  totalStudents: number;
}

interface GroupedSubject {
  subjectCode: string;
  subjectName: string;
  units: {
    unitName: string;
    objects: {
      objectName: string;
      skills: HabItem[];
    }[];
  }[];
}

const SUBJECT_NAMES: Record<string, string> = {
  MA: "Matemática", LP: "Língua Portuguesa", CI: "Ciências",
  HI: "História", GE: "Geografia", ES: "Espanhol", IN: "Inglês",
};

const SUBJECT_COLORS: Record<string, string> = {
  MA: "#1D4ED8", LP: "#BE185D", CI: "#0F766E",
  HI: "#C2410C", GE: "#15803D", ES: "#A16207", IN: "#6D28D9",
};

function SubjectBlock({ group }: { group: GroupedSubject }) {
  const [expanded, setExpanded] = useState(true);
  const color = SUBJECT_COLORS[group.subjectCode] ?? "#6D28D9";
  return (
    <div className="bg-white border border-[#E9E5F5] rounded-2xl mb-4 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F7FC] transition-colors"
      >
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="font-bold text-[#1F1A2E] flex-1">{group.subjectName}</span>
        {expanded ? <ChevronDown size={16} className="text-[#5B5470]" /> : <ChevronRight size={16} className="text-[#5B5470]" />}
      </button>
      {expanded && (
        <div className="px-5 pb-4 space-y-4">
          {group.units.map(unit => (
            <div key={unit.unitName}>
              <p className="text-xs font-semibold text-[#5B5470] uppercase tracking-wide mb-2">{unit.unitName}</p>
              {unit.objects.map(obj => (
                <div key={obj.objectName} className="mb-3">
                  <p className="text-xs text-[#5B5470] italic mb-2">{obj.objectName}</p>
                  <div className="space-y-2">
                    {obj.skills.map(s => {
                      const pct = s.totalStudents > 0 ? Math.round((s.notYetCount / s.totalStudents) * 100) : 0;
                      return (
                        <div key={s.skillCode} className="flex items-center gap-3 p-3 rounded-xl border border-[#E9E5F5] hover:border-[#C4B5FD] transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono font-semibold text-[#5B5470] bg-[#F8F7FC] px-1.5 py-0.5 rounded">{s.skillCode}</span>
                              <span className="text-[13px] text-[#1F1A2E] truncate flex-1">{s.skillName}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-[12px] text-[#B91C1C] font-medium">Ainda não: {s.notYetCount} ({pct}%)</span>
                              <span className="text-[12px] text-[#92400E]">Quase lá: {s.almostCount}</span>
                              <span className="text-[12px] text-[#166534]">Domina: {s.masteredCount}</span>
                            </div>
                          </div>
                          {s.notYetCount > 0 && (
                            <Link
                              href={`/escola/coordenacao/trilhas?skillCode=${s.skillCode}`}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#EDE9FE] text-[#6D28D9] text-[12px] font-semibold rounded-lg hover:bg-[#DDD6EE] transition-colors min-h-[36px] flex-shrink-0"
                            >
                              Atribuir trilha <ArrowRight size={12} />
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HabilidadesPage() {
  const [groups, setGroups] = useState<GroupedSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    fetch("/api/escola/coordenacao/habilidades-prioritarias")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setGroups(d.groups ?? []); setLoading(false); })
      .catch(e => { setError(e === 401 ? "Sem permissão." : "Não foi possível carregar as habilidades. Tente novamente."); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const totalNotYet = groups.flatMap(g => g.units.flatMap(u => u.objects.flatMap(o => o.skills))).reduce((a, s) => a + s.notYetCount, 0);

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#E9E5F5] rounded-xl w-64" />
        {[1,2,3].map(i => <div key={i} className="h-24 bg-[#E9E5F5] rounded-2xl" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-2xl p-6 text-center">
        <p className="text-[#B91C1C] font-medium mb-3">{error}</p>
        <button onClick={load} className="flex items-center gap-2 mx-auto px-4 py-2 bg-white border border-[#E9E5F5] rounded-xl text-sm font-semibold text-[#1F1A2E] hover:bg-[#F8F7FC]">
          <RefreshCw size={14} /> Tentar de novo
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1A2E] flex items-center gap-2">
            <Target size={24} className="text-[#6D28D9]" />
            Habilidades Prioritárias
          </h1>
          <p className="text-[#5B5470] text-sm mt-1">
            {totalNotYet > 0
              ? `${totalNotYet} ocorrências de "Ainda não" em habilidades diagnosticadas`
              : "Nenhuma habilidade pendente de reforço"}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E9E5F5] rounded-xl text-sm font-semibold text-[#1F1A2E] hover:bg-[#F8F7FC] min-h-[44px]">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-12 text-center">
          <BookOpen size={40} className="text-[#C4B5FD] mx-auto mb-4" />
          <p className="text-[#1F1A2E] font-semibold mb-2">Nenhuma habilidade com alunos em "Ainda não"</p>
          <p className="text-[#5B5470] text-sm mb-4">Execute diagnósticos para identificar lacunas de aprendizagem.</p>
          <Link href="/escola/coordenacao/diagnosticos/novo" className="inline-flex items-center gap-2 px-4 py-2 bg-[#6D28D9] text-white rounded-xl text-sm font-semibold hover:bg-[#5B21B6] min-h-[44px]">
            Novo diagnóstico
          </Link>
        </div>
      ) : (
        groups.map(g => <SubjectBlock key={g.subjectCode} group={g} />)
      )}
    </div>
  );
}
