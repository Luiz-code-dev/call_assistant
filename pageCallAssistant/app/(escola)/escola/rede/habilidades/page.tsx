"use client";
import { useEffect, useState } from "react";

interface SkillStat {
  skillId: string;
  code: string;
  shortLabel: string | null;
  subjectCode: string;
  total: number;
  NOT_YET: number;
  ALMOST: number;
  MASTERED: number;
  pctMastered: number;
}

export default function HabilidadesPrioritariasPage() {
  const [stats, setStats] = useState<SkillStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/escola/rede/habilidades-prioritarias")
      .then(r => r.ok ? r.json() : { stats: [] })
      .then(d => { setStats(d.stats ?? []); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 p-4 max-w-3xl mx-auto">
      <div className="mt-4 mb-6">
        <h1 className="text-white text-xl font-bold">Habilidades Prioritárias</h1>
        <p className="text-gray-400 text-xs mt-1">Habilidades com menor domínio — ordenadas por urgência</p>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Carregando...</div>
      ) : stats.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3">🎯</div>
          <p>Nenhum dado de domínio ainda.</p>
          <p className="text-sm mt-1">Execute diagnósticos para ver as habilidades prioritárias.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stats.map((s, idx) => (
            <div key={s.skillId} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
              <span className="text-gray-600 text-sm w-6 text-right flex-shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-medium">{s.shortLabel ?? s.code}</span>
                  <span className="text-gray-500 text-xs font-mono">{s.code}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${s.pctMastered}%` }}
                  />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white text-sm font-semibold">{s.pctMastered}%</p>
                <p className="text-gray-500 text-xs">{s.MASTERED}/{s.total} alunos</p>
              </div>
              <div className="text-lg flex-shrink-0">
                {s.pctMastered < 30 ? "🔴" : s.pctMastered < 60 ? "🟡" : "🟢"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
