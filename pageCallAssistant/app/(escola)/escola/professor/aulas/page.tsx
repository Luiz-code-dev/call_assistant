"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CalendarDays, Plus, Clock, Users } from "lucide-react";

interface Lesson { id: string; title: string; date: string; status: string; skillIds: string[]; dueAt: string | null; }

export default function AulasDaTurmaPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/escola/professor/aulas", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setLessons(d.lessons ?? []); setLoading(false); })
      .catch(() => { setError("Erro ao carregar aulas. Tente novamente."); setLoading(false); });
  }, []);

  const statusLabel = (s: string) => s === "PUBLISHED" ? "Publicada" : "Rascunho";
  const statusColor = (s: string) => s === "PUBLISHED"
    ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1A2E]">Atividades da turma</h1>
          <p className="text-[#5B5470] text-sm mt-1">Registre aulas e publique atividades para seus alunos.</p>
        </div>
        <Link href="/escola/professor/aulas/nova"
          className="bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Aula de hoje
        </Link>
      </div>

      {loading && (
        <div className="text-center py-16 text-[#5B5470]">Carregando...</div>
      )}

      {!loading && error && (
        <div className="bg-[#FEE2E2] border border-[#B91C1C]/20 rounded-xl p-4 text-[#B91C1C]">
          {error} <button onClick={() => window.location.reload()} className="underline ml-2">Tentar novamente</button>
        </div>
      )}

      {!loading && !error && lessons.length === 0 && (
        <div className="border border-dashed border-[#DDD6EE] rounded-xl p-10 text-center">
          <CalendarDays className="w-10 h-10 text-[#DDD6EE] mx-auto mb-3" />
          <div className="text-[#1F1A2E] font-medium mb-1">Nenhuma aula registrada</div>
          <div className="text-[#5B5470] text-sm mb-4">Registre a aula de hoje e publique atividades para a turma.</div>
          <Link href="/escola/professor/aulas/nova"
            className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] transition-colors">
            <Plus className="w-4 h-4" /> Registrar primeira aula
          </Link>
        </div>
      )}

      {!loading && !error && lessons.length > 0 && (
        <div className="space-y-3">
          {lessons.map(l => (
            <Link key={l.id} href={`/escola/professor/aulas/${l.id}`}
              className="block bg-white border border-[#E9E5F5] rounded-xl p-4 hover:border-[#6D28D9] transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[#1F1A2E] font-medium">{l.title}</div>
                  <div className="flex items-center gap-3 mt-1 text-[#5B5470] text-xs">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {new Date(l.date).toLocaleDateString("pt-BR")}</span>
                    {l.dueAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> até {new Date(l.dueAt).toLocaleDateString("pt-BR")}</span>}
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {l.skillIds.length} habilidade(s)</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(l.status)}`}>{statusLabel(l.status)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
