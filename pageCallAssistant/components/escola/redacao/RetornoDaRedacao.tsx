"use client";
/**
 * Mostra o texto do aluno parágrafo por parágrafo, com os trechos apontados pelo Flow
 * marcados e as perguntas logo abaixo. Usado pelo aluno e pelo professor.
 */
import type { ReactNode } from "react";
import { marcarTrechos, nomeDoCriterio, type Apontamento, type Criterio } from "@/lib/escola/redacao";

export const COR_DO_CRITERIO: Record<Criterio, { fundo: string; texto: string; marca: string }> = {
  PROPOSTA:     { fundo: "bg-[#EDE9FE]", texto: "text-[#5B21B6]", marca: "bg-[#EDE9FE] decoration-[#7C3AED]" },
  COESAO:       { fundo: "bg-[#DBEAFE]", texto: "text-[#1E40AF]", marca: "bg-[#DBEAFE] decoration-[#2563EB]" },
  ARGUMENTACAO: { fundo: "bg-[#FEF3C7]", texto: "text-[#92400E]", marca: "bg-[#FEF3C7] decoration-[#D97706]" },
  GRAMATICA:    { fundo: "bg-[#FFE4E6]", texto: "text-[#9F1239]", marca: "bg-[#FFE4E6] decoration-[#E11D48]" },
};

export function SeloCriterio({ criterio, genero }: { criterio: Criterio; genero?: string | null }) {
  const c = COR_DO_CRITERIO[criterio] ?? COR_DO_CRITERIO.PROPOSTA;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold ${c.fundo} ${c.texto}`}>{nomeDoCriterio(criterio, genero)}</span>;
}

export function TextoMarcado({ paragrafo, apontamentos }: { paragrafo: string; apontamentos: Apontamento[] }) {
  const porId = new Map(apontamentos.map((a) => [a.id, a]));
  return (
    <p className="text-[16px] leading-relaxed text-[#1F1A2E]">
      {marcarTrechos(paragrafo, apontamentos).map((p, i) => {
        const a = p.marca ? porId.get(p.marca) : null;
        if (!a) return <span key={i}>{p.texto}</span>;
        const cor = COR_DO_CRITERIO[a.criterio] ?? COR_DO_CRITERIO.PROPOSTA;
        return <mark key={i} className={`rounded px-0.5 underline decoration-2 underline-offset-4 text-inherit ${cor.marca}`}>{p.texto}</mark>;
      })}
    </p>
  );
}

/** Um parágrafo com o retorno embaixo. `extra` permite ao professor pôr controles em cada apontamento. */
export function ParagrafoComRetorno({
  numero, paragrafo, apontamentos, pontoForte, comentarioProfessor, genero, extraDoApontamento, rodape,
}: {
  numero: number;
  paragrafo: string;
  apontamentos: Apontamento[];
  pontoForte?: string | null;
  comentarioProfessor?: string | null;
  genero?: string | null;
  extraDoApontamento?: (a: Apontamento) => ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-4 sm:p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)] space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6D28D9]">Parágrafo {numero}</p>
      <TextoMarcado paragrafo={paragrafo} apontamentos={apontamentos} />
      {pontoForte && (
        <p className="rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-2 text-[14px] text-[#065F46]"><span className="font-bold">Ponto forte: </span>{pontoForte}</p>
      )}
      {apontamentos.length > 0 && (
        <ul className="space-y-2">
          {apontamentos.map((a) => (
            <li key={a.id} className="rounded-2xl border border-[#E9E5F5] px-3 py-2.5 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SeloCriterio criterio={a.criterio} genero={genero} />
                {extraDoApontamento?.(a)}
              </div>
              {a.trecho && <p className="text-[13px] text-[#5B5470]">No trecho: <span className="italic">&ldquo;{a.trecho}&rdquo;</span></p>}
              <p className="text-[15px] font-semibold text-[#1F1A2E]">{a.pergunta}</p>
            </li>
          ))}
        </ul>
      )}
      {comentarioProfessor && (
        <p className="rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] px-3 py-2 text-[14px] text-[#3B0764] whitespace-pre-wrap"><span className="font-bold">Professor: </span>{comentarioProfessor}</p>
      )}
      {rodape}
    </section>
  );
}
