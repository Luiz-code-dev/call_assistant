"use client";
/** Redações que o professor abriu para a turma do aluno. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine, ChevronRight } from "lucide-react";
import { Capa, Carregando } from "@/components/escola/reforco-ui";
import { RoboFlow } from "@/components/escola/aluno/Mascote";

type Proposta = { id: string; titulo: string; genero: string; prazo: string | null; aberta: boolean; situacao: string; versao: number };

const SITUACAO: Record<string, { texto: string; cor: string }> = {
  nova:          { texto: "Para escrever",          cor: "bg-[#EDE9FE] text-[#5B21B6]" },
  rascunho:      { texto: "Rascunho guardado",      cor: "bg-[#FEF3C7] text-[#92400E]" },
  aguardando:    { texto: "Com o professor",        cor: "bg-[#E0F2FE] text-[#075985]" },
  "com-retorno": { texto: "Retorno do Flow",        cor: "bg-[#DCFCE7] text-[#166534]" },
  revisada:      { texto: "Professor comentou",     cor: "bg-[#DCFCE7] text-[#166534]" },
};

export default function RedacoesAlunoPage() {
  const router = useRouter();
  const [lista, setLista] = useState<Proposta[] | null>(null);

  useEffect(() => {
    fetch("/api/escola/aluno/redacoes", { cache: "no-store" })
      .then((r) => { if (r.status === 401) router.replace("/escola/aluno/entrar"); return r.json(); })
      .then((d) => setLista(d.propostas ?? []))
      .catch(() => setLista([]));
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F6F4FE]">
      <Capa compacta titulo="Redação" subtitulo="Escreva e o Flow te ajuda a melhorar" voltar={{ href: "/escola/aluno", texto: "Início" }} />
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-3 pb-8">
        {lista === null ? <Carregando /> : lista.length === 0 ? (
          <section className="flex items-end gap-3 rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(91,33,182,0.12)]">
            <RoboFlow tamanho={72} />
            <p className="flex-1 rounded-3xl rounded-bl-md bg-[#F5F3FF] border border-[#E9E5F5] px-4 py-3 text-[15px] font-bold text-[#1F1A2E]">
              Ainda não tem redação para você. Quando o professor abrir uma, ela aparece aqui.
            </p>
          </section>
        ) : lista.map((p) => {
          const s = SITUACAO[p.situacao] ?? SITUACAO.nova;
          return (
            <Link key={p.id} href={`/escola/aluno/redacao/${p.id}`} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_4px_18px_rgba(91,33,182,0.08)] active:scale-[0.99] transition-transform">
              <span className="w-12 h-12 rounded-2xl bg-[#6D28D9] text-white flex items-center justify-center shrink-0"><PenLine className="size-6" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-extrabold text-[#1F1A2E] leading-tight">{p.titulo}</span>
                <span className="block text-[13px] text-[#5B5470] mt-0.5">{p.genero}{p.prazo ? ` · até ${new Date(p.prazo).toLocaleDateString("pt-BR")}` : ""}</span>
                <span className={`inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${s.cor}`}>{s.texto}</span>
              </span>
              <ChevronRight className="size-5 text-[#6D28D9] shrink-0" />
            </Link>
          );
        })}
      </main>
    </div>
  );
}
