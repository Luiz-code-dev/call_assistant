"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface TrackItem { id: string; order: number; estMinutes: number; }
interface Track {
  id: string;
  title: string;
  status: string;
  gradeYear: number;
  items: TrackItem[];
  createdAt: string;
}

export default function TrilhasProfessorPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/escola/trilhas")
      .then(r => r.ok ? r.json() : { tracks: [] })
      .then(d => { setTracks(d.tracks ?? []); setLoading(false); });
  }, []);

  async function assign(trackId: string, classId: string) {
    await fetch(`/api/escola/trilhas/${trackId}/atribuir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    });
    alert("Trilha atribuída à turma!");
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mt-4 mb-6">
        <h1 className="text-white text-xl font-bold">Trilhas de Reforço</h1>
        <Link
          href="/escola/professor/trilhas/nova"
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Nova trilha
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Carregando trilhas...</div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3">🛤️</div>
          <p>Nenhuma trilha criada ainda.</p>
          <p className="text-sm mt-1">Crie trilhas curtas de 3–8 atividades para os alunos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tracks.map(t => (
            <div key={t.id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-white font-semibold">{t.title}</h2>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {t.items.length} atividades · {t.gradeYear}º ano
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  t.status === "PUBLISHED" ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"
                }`}>
                  {t.status === "PUBLISHED" ? "Publicada" : "Rascunho"}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <Link
                  href={`/escola/professor/trilhas/${t.id}`}
                  className="flex-1 text-center text-purple-400 border border-purple-800 hover:border-purple-600 text-sm py-2 rounded-xl transition-colors"
                >
                  Ver / editar
                </Link>
                <button
                  onClick={() => {
                    const classId = prompt("ID da turma para atribuir:");
                    if (classId) assign(t.id, classId);
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-sm py-2 rounded-xl transition-colors"
                >
                  Atribuir à turma
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
