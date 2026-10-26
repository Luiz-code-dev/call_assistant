"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DiagnosticItem { id: string; order: number; skill: { code: string; shortLabel: string | null }; }
interface Diagnostic {
  id: string;
  title: string;
  status: string;
  gradeYear: number;
  cycle: number;
  createdAt: string;
  items: DiagnosticItem[];
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberto",
  CLOSED: "Encerrado",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-800 text-gray-400",
  OPEN: "bg-green-900 text-green-300",
  CLOSED: "bg-gray-700 text-gray-500",
};

export default function DiagnosticosPage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/escola/diagnosticos");
    if (r.ok) { const d = await r.json(); setDiagnostics(d.diagnostics ?? []); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function abrir(id: string) {
    await fetch(`/api/escola/diagnosticos/${id}/abrir`, { method: "POST" });
    load();
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-white text-xl font-bold">Diagnósticos</h1>
          <p className="text-gray-400 text-xs mt-0.5">Identifique lacunas BNCC por turma</p>
        </div>
        <Link
          href="/escola/coordenacao/diagnosticos/novo"
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Novo
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Carregando diagnósticos...</div>
      ) : diagnostics.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3">📋</div>
          <p>Nenhum diagnóstico criado.</p>
          <p className="text-sm mt-1">Crie um diagnóstico para mapear o domínio das habilidades da turma.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {diagnostics.map(d => (
            <div key={d.id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-white font-semibold">{d.title}</h2>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {d.gradeYear}º ano · Ciclo {d.cycle} · {d.items.length} habilidades
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[d.status] ?? "bg-gray-800 text-gray-400"}`}>
                  {STATUS_LABELS[d.status] ?? d.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {d.items.slice(0, 6).map(item => (
                  <span key={item.id} className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-full" title={item.skill.code}>
                    {item.skill.shortLabel ?? item.skill.code}
                  </span>
                ))}
                {d.items.length > 6 && (
                  <span className="text-gray-500 text-xs px-2 py-0.5">+{d.items.length - 6}</span>
                )}
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/escola/coordenacao/diagnosticos/${d.id}`}
                  className="flex-1 text-center text-purple-400 border border-purple-800 hover:border-purple-600 text-sm py-2 rounded-xl transition-colors"
                >
                  Ver resultados
                </Link>
                {d.status === "DRAFT" && (
                  <button
                    onClick={() => abrir(d.id)}
                    className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm py-2 rounded-xl transition-colors"
                  >
                    Abrir para alunos
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
