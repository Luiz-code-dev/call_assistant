"use client";
/** Professor: uma proposta de redação e a situação de cada aluno da turma. */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

type Aluno = { studentId: string; nome: string; enviadoId: string | null; texto: { id: string; versao: number; status: string; palavras: number; enviadoEm: string | null; atencao: boolean } | null };
type Dados = {
  proposta: { id: string; titulo: string; enunciado: string; generoNome: string; minPalavras: number; maxPalavras: number; maxVersoes: number; prazo: string | null; aberta: boolean };
  turma: { name: string; schoolName: string };
  alunos: Aluno[];
};

function situacao(a: Aluno): { texto: string; cor: string } {
  const t = a.texto;
  if (!t) return { texto: "Não começou", cor: "bg-[#F3F4F6] text-[#4B5563]" };
  if (t.status === "DRAFT") return { texto: t.versao > 1 ? `Reescrevendo (versão ${t.versao})` : "Escrevendo", cor: "bg-[#FEF3C7] text-[#92400E]" };
  if (t.status === "SUBMITTED") return { texto: "Aguarda sua leitura", cor: "bg-[#FEE2E2] text-[#991B1B]" };
  if (t.status === "FEEDBACK") return { texto: "Retorno do Flow · revisar", cor: "bg-[#E0F2FE] text-[#075985]" };
  return { texto: "Revisado", cor: "bg-[#DCFCE7] text-[#166534]" };
}

export default function PropostaProfessorPage() {
  const { id } = useParams<{ id: string }>();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    fetch(`/api/escola/professor/redacoes/${id}`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; })
      .then(setDados)
      .catch((e) => setErro(e.message || "Não foi possível carregar."));
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  async function alternar() {
    if (!dados) return;
    const r = await fetch(`/api/escola/professor/redacoes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aberta: !dados.proposta.aberta }) });
    if (r.ok) carregar();
  }

  if (erro) return <div className="px-4 sm:px-7 py-8"><p className="text-[#B91C1C]">{erro}</p></div>;
  if (!dados) return <div className="px-4 sm:px-7 py-8 text-[#5B5470]">Carregando...</div>;
  const p = dados.proposta;

  return (
    <div className="px-4 sm:px-7 py-8 max-w-5xl mx-auto space-y-5">
      <Link href="/escola/professor/redacoes" className="inline-flex items-center gap-1 text-sm font-semibold text-[#6D28D9]"><ChevronLeft size={16} />Redações</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[#1F1A2E] font-bold text-[22px] sm:text-2xl leading-tight break-words">{p.titulo}</h1>
          <p className="text-sm text-[#5B5470]">{dados.turma.name}{dados.turma.schoolName ? ` · ${dados.turma.schoolName}` : ""} · {p.generoNome} · {p.minPalavras} a {p.maxPalavras} palavras · até {p.maxVersoes} versões{p.prazo ? ` · prazo ${new Date(p.prazo).toLocaleDateString("pt-BR")}` : ""}</p>
        </div>
        <button type="button" onClick={alternar} className="border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] w-full sm:w-auto">
          {p.aberta ? "Encerrar proposta" : "Reabrir proposta"}
        </button>
      </div>
      <p className="bg-white border border-[#E9E5F5] rounded-xl p-4 text-sm text-[#1F1A2E] whitespace-pre-wrap">{p.enunciado}</p>

      {dados.alunos.length === 0 ? (
        <p className="bg-white border border-[#E9E5F5] rounded-2xl px-4 py-6 text-center text-[#5B5470] text-sm">Nenhum aluno ativo nesta turma.</p>
      ) : (
        <ul className="bg-white border border-[#E9E5F5] rounded-2xl divide-y divide-[#F1EEF9] overflow-hidden">
          {dados.alunos.map((a) => {
            const s = situacao(a);
            const detalhe = a.texto ? [`versão ${a.texto.versao}`, a.texto.status !== "DRAFT" ? `${a.texto.palavras} palavras` : ""].filter(Boolean).join(" · ") : "";
            const conteudo = (
              <>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5 text-[15px] font-semibold text-[#1F1A2E] break-words">
                    <span className="min-w-0 break-words">{a.nome}</span>
                    {a.texto?.atencao && <AlertTriangle size={15} className="text-[#B45309] shrink-0" aria-label="Ler com atenção" />}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.cor}`}>{s.texto}</span>
                    {detalhe && <span className="text-[12px] text-[#5B5470]">{detalhe}</span>}
                  </span>
                </span>
                {a.enviadoId && <span className="inline-flex items-center gap-0.5 text-[14px] font-bold text-[#6D28D9] shrink-0">Abrir<ChevronRight size={16} /></span>}
              </>
            );
            return (
              <li key={a.studentId}>
                {a.enviadoId
                  ? <Link href={`/escola/professor/redacoes/${p.id}/${a.enviadoId}`} className="flex items-center gap-3 px-4 py-3 min-h-[60px] hover:bg-[#FBFAFF]">{conteudo}</Link>
                  : <div className="flex items-center gap-3 px-4 py-3 min-h-[60px]">{conteudo}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
