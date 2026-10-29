"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, TrendingUp } from "lucide-react";

interface SkillProgress { subjectName: string; subjectColor: string; skills: { code: string; description: string; level: string }[] }

const levelLabel: Record<string, string> = { NOT_YET: "Ainda nao", ALMOST: "Quase la", MASTERED: "Domina" };
const levelColor: Record<string, string> = { NOT_YET: "bg-[#FEE2E2] text-[#B91C1C]", ALMOST: "bg-[#FEF3C7] text-[#92400E]", MASTERED: "bg-[#DCFCE7] text-[#166534]" };

export default function EvolucaoPage() {
  const [data, setData] = useState<SkillProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/escola/aluno/evolucao").then(r => r.ok ? r.json() : { subjects: [] })
      .then(d => { setData(d.subjects ?? []); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F7FC] px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/escola/aluno" className="p-2 rounded-xl text-[#5B5470] hover:text-[#1F1A2E]"><ChevronLeft size={20}/></Link>
        <div className="flex items-center gap-2">
          <TrendingUp className="text-[#6D28D9]" size={20}/>
          <h1 className="text-[#1F1A2E] font-bold text-xl">Minha evolucao</h1>
        </div>
      </div>
      {loading ? <p className="text-[#5B5470] text-center py-8">Carregando...</p> : data.length === 0 ? (
        <p className="text-[#5B5470] text-center py-8">Nenhuma atividade feita ainda. Pratique sua primeira trilha!</p>
      ) : data.map(subj => (
        <div key={subj.subjectName} className="bg-white border border-[#E9E5F5] rounded-2xl p-4 mb-4">
          <h2 className="font-bold text-sm mb-3" style={{ color: subj.subjectColor || "#6D28D9" }}>{subj.subjectName}</h2>
          <div className="space-y-2">
            {subj.skills.map(sk => (
              <div key={sk.code} className="flex items-start gap-2">
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${levelColor[sk.level] ?? "bg-gray-100 text-gray-700"}`}>{levelLabel[sk.level] ?? sk.level}</span>
                <span className="text-[#5B5470] text-xs leading-relaxed">{sk.description}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
