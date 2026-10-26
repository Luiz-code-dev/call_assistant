"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Filho {
  studentId: string;
  fullName: string;
  enrollmentCode: string;
  relation: string;
  class: { name: string; gradeYear: number } | null;
}

const RELATION_LABELS: Record<string, string> = {
  MAE: "Mãe", PAI: "Pai", AVO_AVO: "Avó/Avô", TIO_TIA: "Tio/Tia",
  TUTOR_LEGAL: "Tutor(a) legal", OUTRO: "Responsável",
};

export default function FamiliaPage() {
  const [filhos, setFilhos] = useState<Filho[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/escola/familia/filhos")
      .then(r => r.ok ? r.json() : { filhos: [] })
      .then(d => { setFilhos(d.filhos ?? []); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Carregando...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Portal da Família</h1>
          <p className="text-gray-400 text-sm">Acompanhe a evolução escolar</p>
        </div>
        <form method="POST" action="/api/escola/familia/sair">
          <button className="text-gray-500 text-sm underline">Sair</button>
        </form>
      </div>

      {filhos.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">👨‍👩‍👧</div>
          <p>Nenhum aluno vinculado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filhos.map(filho => (
            <Link
              key={filho.studentId}
              href={`/escola/familia/evolucao/${filho.studentId}`}
              className="block bg-gray-900 rounded-2xl p-5 border border-gray-800 hover:border-purple-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {filho.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{filho.fullName}</p>
                  <p className="text-gray-400 text-xs">
                    {RELATION_LABELS[filho.relation] ?? filho.relation} ·{" "}
                    {filho.class ? `${filho.class.name} (${filho.class.gradeYear}º ano)` : "Turma não encontrada"}
                  </p>
                </div>
                <span className="text-gray-500 text-sm">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
