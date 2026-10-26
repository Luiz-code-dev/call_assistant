"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface TrackItem { id: string; activityId: string; order: number; estMinutes: number; }
interface Track { id: string; title: string; items: TrackItem[]; }
interface Assignment { id: string; track: Track; dueAt: string | null; }
interface Progress { completedItemIds: string[]; lastActivityAt: string | null; }

export default function MinhaTrilhaPage() {
  const [assignments, setAssignments] = useState<{ assignment: Assignment; progress: Progress | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const r = await fetch("/api/escola/aluno/trilhas");
      if (r.ok) {
        const data = await r.json();
        setAssignments(data.assignments ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#F8F7FC] flex items-center justify-center">
      <div className="text-[#5B5470] text-lg">Carregando sua trilha...</div>
    </div>
  );

  if (assignments.length === 0) return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">🎯</div>
      <h1 className="text-[#1F1A2E] text-xl font-bold mb-2">Nenhuma trilha ainda</h1>
      <p className="text-[#5B5470] text-sm max-w-xs">Quando seu professor atribuir uma trilha de reforço, ela aparecerá aqui.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F7FC] p-4 max-w-lg mx-auto">
      <h1 className="text-[#1F1A2E] text-2xl font-bold mb-1 mt-4">Minha Trilha</h1>
      <p className="text-[#5B5470] text-sm mb-6">Pratique no seu ritmo. Você consegue!</p>

      <div className="space-y-4">
        {assignments.map(({ assignment, progress }) => {
          const completed = progress?.completedItemIds?.length ?? 0;
          const total = assignment.track.items.length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const allDone = completed >= total;

          return (
            <div key={assignment.id} className="bg-white rounded-2xl p-5 border border-[#E9E5F5]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-[#1F1A2E] font-semibold text-base">{assignment.track.title}</h2>
                  {assignment.dueAt && (
                    <p className="text-[#5B5470] text-xs mt-0.5">
                      Prazo: {new Date(assignment.dueAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                {allDone && <span className="text-[#166534] text-lg">✅</span>}
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-[#5B5470] mb-1">
                  <span>{completed} de {total} atividades</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-[#FAF9FD] rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {assignment.track.items.map((item, idx) => {
                  const done = progress?.completedItemIds?.includes(item.id);
                  return (
                    <Link
                      key={item.id}
                      href={`/escola/aluno/atividade/${item.activityId}?assignmentId=${assignment.id}&trackItemId=${item.id}`}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                        done
                          ? "bg-[#DCFCE7] border border-green-800/40"
                          : "bg-[#FAF9FD] border border-[#DDD6EE] hover:bg-gray-750"
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${done ? "bg-green-700 text-white" : "bg-[#EDE9FE] text-[#3F3A4F]"}`}>
                        {done ? "✓" : idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${done ? "text-green-300" : "text-[#1F1A2E]"}`}>
                          Atividade {idx + 1}
                        </span>
                        <span className="text-[#5B5470] text-xs block">~{item.estMinutes} min</span>
                      </div>
                      {!done && <span className="text-[#5B5470] text-sm">→</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pb-8 text-center">
        <Link href="/escola/aluno/entrar" className="text-[#5B5470] text-xs underline">Sair</Link>
      </div>
    </div>
  );
}
