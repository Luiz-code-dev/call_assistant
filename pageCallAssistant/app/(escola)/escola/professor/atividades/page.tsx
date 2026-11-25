"use client";
/** Atividades que o professor passou para as suas turmas. Cada uma abre as entregas dos alunos. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, ChevronRight, PenLine, Mic, ListChecks, CalendarClock, Inbox, type LucideIcon } from "lucide-react";

interface Atividade {
  id: string; title: string; type: string; status: string; dueAt: string | null;
  _count?: { submissions: number };
  classSubject?: { class?: { name: string } | null; subject?: { name: string } | null } | null;
}

const TIPO: Record<string, { rotulo: string; icone: LucideIcon }> = {
  WRITTEN: { rotulo: "Escrita", icone: PenLine },
  SPOKEN: { rotulo: "Fala", icone: Mic },
  QUIZ: { rotulo: "Perguntas", icone: ListChecks },
};
const SITUACAO: Record<string, { rotulo: string; cor: string }> = {
  DRAFT: { rotulo: "Rascunho", cor: "bg-[#F1EEF9] text-[#5B5470]" },
  PUBLISHED: { rotulo: "Aberta", cor: "bg-[#DCFCE7] text-[#166534]" },
  CLOSED: { rotulo: "Encerrada", cor: "bg-[#FEE2E2] text-[#991B1B]" },
};

export default function AtividadesPage() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/escola/professor/atividades", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { setAtividades(d.atividades ?? d.activities ?? []); setCarregando(false); })
      .catch(() => { setErro("Não foi possível carregar as atividades."); setCarregando(false); });
  }, []);

  return (
    <div className="px-4 sm:px-7 py-6 sm:py-8 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0"><BookOpen size={22} /></span>
          <div className="min-w-0">
            <h1 className="text-[#1F1A2E] font-extrabold text-[22px] sm:text-2xl leading-tight">Atividades</h1>
            <p className="text-[#5B5470] text-[14px] leading-snug mt-1">O que você passou para as turmas. Toque em uma atividade para ver as entregas.</p>
          </div>
        </div>
        <Link href="/escola/professor/atividades/nova" className="inline-flex items-center justify-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 rounded-xl text-sm font-bold min-h-[48px] w-full sm:w-auto shrink-0">
          <Plus size={16} />Nova atividade
        </Link>
      </div>

      {erro && <p role="alert" className="text-[#B91C1C] text-sm mt-5">{erro}</p>}
      {carregando ? <p className="text-[#5B5470] text-center py-10">Carregando...</p> : erro ? null : !atividades.length ? (
        <div className="mt-5 bg-white border border-[#E9E5F5] rounded-2xl p-8 text-center">
          <Inbox className="mx-auto text-[#C4B5FD] mb-3" size={40} />
          <p className="text-[#1F1A2E] font-semibold">Você ainda não criou atividades.</p>
          <p className="text-[#5B5470] text-[14px] mt-1">Crie a primeira em &quot;Nova atividade&quot;. Os alunos da turma recebem na hora.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {atividades.map((a) => {
            const tipo = TIPO[a.type] ?? { rotulo: "Atividade", icone: BookOpen };
            const Icone = tipo.icone;
            const situacao = SITUACAO[a.status];
            const entregas = a._count?.submissions ?? 0;
            const onde = [a.classSubject?.class?.name, a.classSubject?.subject?.name].filter(Boolean).join(" · ");
            return (
              <li key={a.id}>
                <Link href={`/escola/professor/atividades/${a.id}/entregas`} className="bg-white border border-[#E9E5F5] hover:border-[#C4B5FD] rounded-2xl p-4 flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center shrink-0"><Icone size={19} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-bold text-[#1F1A2E] leading-snug break-words">{a.title}</span>
                    <span className="block text-[13px] text-[#5B5470] mt-0.5 break-words">{[onde, tipo.rotulo].filter(Boolean).join(" · ")}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                      {situacao && <span className={`text-[12px] font-bold rounded-full px-2.5 py-1 ${situacao.cor}`}>{situacao.rotulo}</span>}
                      <span className="text-[13px] font-semibold text-[#3B3550]">{entregas} {entregas === 1 ? "entrega" : "entregas"}</span>
                      {a.dueAt && <span className="inline-flex items-center gap-1 text-[13px] text-[#5B5470]"><CalendarClock size={13} />até {new Date(a.dueAt).toLocaleDateString("pt-BR")}</span>}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-[#8B84A0] shrink-0 mt-2.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
