"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ChevronRight, Mic, PenLine, HelpCircle } from "lucide-react";
import { Capa, Conteudo, NavAluno, CARTAO, FUNDO, IconeMateria, SeloNivel } from "@/components/escola/reforco-ui";

interface Atividade {
  id: string; title: string; type: "WRITTEN" | "SPOKEN" | "QUIZ";
  subject: { name: string; color: string | null } | null;
  dueAt: string | null; isDone: boolean;
  submission: { status: string; masteryLevel: string | null; submittedAt: string | null } | null;
}

const TYPE_ICON = { WRITTEN: PenLine, SPOKEN: Mic, QUIZ: HelpCircle };

export default function HistoricoPage() {
  const router = useRouter();
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/escola/aluno/atividades?filter=feito")
      .then((r) => { if (r.status === 401) router.replace("/escola/aluno/entrar"); return r.json(); })
      .then((d) => setAtividades(d.atividades ?? []))
      .finally(() => setLoading(false));
  }, [router]);

  const grouped: Record<string, Atividade[]> = {};
  for (const a of atividades) {
    const key = a.subject?.name ?? "Outros";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }

  return (
    <div className={FUNDO}>
      <Capa titulo="Atividades feitas" subtitulo="Tudo o que você já entregou, com o retorno de cada uma."
        voltar={{ href: "/escola/aluno", texto: "Início" }} />
      <Conteudo>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-3xl animate-pulse bg-[#E9E5F5]" />)}</div>
        ) : atividades.length === 0 ? (
          <section className={`${CARTAO} p-8 text-center`}>
            <CheckCircle2 className="size-10 text-[#C4B5FD] mx-auto mb-3" />
            <p className="font-extrabold text-[#1F1A2E]">Nenhuma atividade concluída ainda</p>
            <p className="text-sm text-[#5B5470] mt-1">Quando você terminar uma etapa da trilha, ela aparece aqui.</p>
          </section>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([subject, items]) => (
              <section key={subject} className={`${CARTAO} p-4`}>
                <div className="flex items-center gap-3 mb-3">
                  <IconeMateria chave={subject} tamanho={40} />
                  <h2 className="font-extrabold text-[#1F1A2E]">{subject}</h2>
                </div>
                <div className="space-y-2">
                  {items.map((a) => {
                    const Icon = TYPE_ICON[a.type];
                    const nivel = a.submission?.masteryLevel ?? null;
                    const isPending = a.submission?.status === "SUBMITTED";
                    return (
                      <Link key={a.id} href={`/escola/aluno/atividades/${a.id}/retorno`}
                        className="flex items-center gap-3 rounded-2xl bg-[#F8F7FC] px-3 py-3 active:scale-[0.99] transition-transform">
                        <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0"><Icon className="size-4 text-[#6D28D9]" /></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1F1A2E] truncate">{a.title}</p>
                          {a.submission?.submittedAt && (
                            <p className="text-xs text-[#8B84A0]">{new Date(a.submission.submittedAt).toLocaleDateString("pt-BR")}</p>
                          )}
                        </div>
                        {isPending ? (
                          <span className="text-xs text-[#92400E] font-semibold flex items-center gap-1 shrink-0"><Clock className="size-3" />Analisando</span>
                        ) : nivel ? <SeloNivel nivel={nivel} /> : (
                          <span className="text-xs text-[#5B5470] shrink-0">Aguardando</span>
                        )}
                        <ChevronRight className="size-4 text-[#A59FB8] shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </Conteudo>
      <NavAluno ativo="feitas" />
    </div>
  );
}
