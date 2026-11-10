"use client";
import { useState, useEffect } from "react";
import { CalendarDays, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Capa, Conteudo, NavAluno, FUNDO, Carregando } from "@/components/escola/reforco-ui";

interface Lesson { id: string; title: string; date: string; dueAt: string | null; done: boolean; overdue: boolean; objectives: { text: string }[]; }

export default function AtividadesTurmaPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/escola/aluno/atividades-turma", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setLessons(d.lessons ?? []); setLoading(false); })
      .catch(() => { setError("Erro ao carregar atividades."); setLoading(false); });
  }, []);

  const pending = lessons.filter(l => !l.done);
  const done = lessons.filter(l => l.done);

  if (loading) return <Carregando />;
  if (error) return (
    <div className={`${FUNDO} p-8 text-center`}>
      <AlertCircle className="w-8 h-8 text-[#B91C1C] mx-auto mb-2" />
      <div className="text-[#B91C1C] text-sm mb-2">{error}</div>
      <button onClick={() => window.location.reload()} className="text-[#6D28D9] underline text-sm">Tentar novamente</button>
    </div>
  );

  return (
    <div className={FUNDO}>
      <Capa titulo="Atividades da turma" subtitulo="Atividades enviadas pelo seu professor."
        voltar={{ href: "/escola/aluno", texto: "Início" }} />
      <Conteudo>

      {lessons.length === 0 && (
        <div className="rounded-3xl bg-white shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-10 text-center">
          <CalendarDays className="w-10 h-10 text-[#DDD6EE] mx-auto mb-3" />
          <div className="text-[#1F1A2E] font-medium mb-1">Nenhuma atividade da turma</div>
          <div className="text-[#5B5470] text-sm">Quando seu professor publicar uma atividade, ela aparece aqui.</div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-[#1F1A2E] mb-3">Para fazer</h2>
          <div className="space-y-3">
            {pending.map(l => (
              <div key={l.id} className={`bg-white rounded-3xl p-4 shadow-[0_4px_18px_rgba(91,33,182,0.08)] ${l.overdue ? "ring-2 ring-[#FCA5A5]" : ""}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-semibold text-[#1F1A2E] text-sm">{l.title}</div>
                  {l.overdue && <span className="bg-[#FEE2E2] text-[#B91C1C] text-xs px-2 py-0.5 rounded shrink-0">Atrasada</span>}
                </div>
                {l.objectives.length > 0 && <div className="text-[#5B5470] text-xs mb-2">{l.objectives.map(o => o.text).join(" · ")}</div>}
                <div className="flex items-center gap-4 text-[#5B5470] text-xs">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{new Date(l.date).toLocaleDateString("pt-BR")}</span>
                  {l.dueAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />até {new Date(l.dueAt).toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-[#1F1A2E] mb-3">Feitas</h2>
          <div className="space-y-2">
            {done.map(l => (
              <div key={l.id} className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[#166534] shrink-0" />
                <div>
                  <div className="text-[#1F1A2E] text-sm font-medium">{l.title}</div>
                  <div className="text-[#5B5470] text-xs">{new Date(l.date).toLocaleDateString("pt-BR")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </Conteudo>
      <NavAluno ativo="" />
    </div>
  );
}
