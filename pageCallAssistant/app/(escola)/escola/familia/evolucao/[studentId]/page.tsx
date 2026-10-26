"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Mastery {
  skillId: string;
  level: "NOT_YET" | "ALMOST" | "MASTERED";
  skill: { code: string; shortLabel: string | null; subjectCode: string };
  updatedAt: string;
}

interface MasteryByLevel { NOT_YET: number; ALMOST: number; MASTERED: number; }

const LEVEL_CONFIG = {
  NOT_YET:  { label: "Ainda aprendendo", color: "bg-red-500",    text: "text-red-400",    icon: "🔴" },
  ALMOST:   { label: "Quase lá",         color: "bg-yellow-500", text: "text-yellow-400", icon: "🟡" },
  MASTERED: { label: "Conquistado",       color: "bg-green-500",  text: "text-green-400",  icon: "🟢" },
};

export default function EvolucaoPage({ params }: { params: { studentId: string } }) {
  const [masteries, setMasteries] = useState<Mastery[]>([]);
  const [byLevel, setByLevel] = useState<MasteryByLevel>({ NOT_YET: 0, ALMOST: 0, MASTERED: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "NOT_YET" | "ALMOST" | "MASTERED">("all");

  useEffect(() => {
    fetch(`/api/escola/familia/evolucao/${params.studentId}`)
      .then(r => r.ok ? r.json() : { masteries: [], masteryByLevel: { NOT_YET: 0, ALMOST: 0, MASTERED: 0 } })
      .then(d => {
        setMasteries(d.masteries ?? []);
        setByLevel(d.masteryByLevel ?? { NOT_YET: 0, ALMOST: 0, MASTERED: 0 });
        setLoading(false);
      });
  }, [params.studentId]);

  const total = byLevel.NOT_YET + byLevel.ALMOST + byLevel.MASTERED;
  const filtered = filter === "all" ? masteries : masteries.filter(m => m.level === filter);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
      Carregando evolução...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 p-4 max-w-lg mx-auto">
      <Link href="/escola/familia" className="text-purple-400 text-sm flex items-center gap-1 mt-4 mb-6">
        ← Voltar
      </Link>

      <h1 className="text-white text-xl font-bold mb-4">Evolução por habilidade</h1>

      {total > 0 && (
        <div className="bg-gray-900 rounded-2xl p-4 mb-6 border border-gray-800">
          <p className="text-gray-400 text-xs mb-3">{total} habilidades avaliadas</p>
          <div className="w-full h-3 rounded-full overflow-hidden flex gap-0.5">
            {byLevel.MASTERED > 0 && (
              <div className="bg-green-500 h-full rounded-l-full" style={{ width: `${(byLevel.MASTERED / total) * 100}%` }} />
            )}
            {byLevel.ALMOST > 0 && (
              <div className="bg-yellow-500 h-full" style={{ width: `${(byLevel.ALMOST / total) * 100}%` }} />
            )}
            {byLevel.NOT_YET > 0 && (
              <div className="bg-red-500 h-full rounded-r-full" style={{ width: `${(byLevel.NOT_YET / total) * 100}%` }} />
            )}
          </div>
          <div className="flex gap-4 mt-3 flex-wrap">
            {(["MASTERED", "ALMOST", "NOT_YET"] as const).map(l => (
              <div key={l} className="flex items-center gap-1.5">
                <span className={`text-xs ${LEVEL_CONFIG[l].text}`}>{LEVEL_CONFIG[l].icon}</span>
                <span className="text-gray-400 text-xs">{LEVEL_CONFIG[l].label}: <strong className="text-white">{byLevel[l]}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "NOT_YET", "ALMOST", "MASTERED"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {f === "all" ? "Todas" : LEVEL_CONFIG[f].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <p>Nenhuma habilidade encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <div key={m.skillId} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-3">
              <span className="text-lg">{LEVEL_CONFIG[m.level].icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{m.skill.shortLabel ?? m.skill.code}</p>
                <p className="text-gray-500 text-xs">{m.skill.subjectCode} · Código {m.skill.code}</p>
              </div>
              <span className={`text-xs font-medium ${LEVEL_CONFIG[m.level].text}`}>
                {LEVEL_CONFIG[m.level].label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
