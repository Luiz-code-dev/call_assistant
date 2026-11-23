"use client";
/** Professor: uma proposta de redação e a situação de cada aluno da turma. */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, AlertTriangle } from "lucide-react";

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

  if (erro) return <div className="px-7 py-8"><p className="text-[#B91C1C]">{erro}</p></div>;
  if (!dados) return <div className="px-7 py-8 text-[#5B5470]">Carregando...</div>;
  const p = dados.proposta;

  return (
    <div className="px-4 sm:px-7 py-8 max-w-5xl mx-auto space-y-5">
      <Link href="/escola/professor/redacoes" className="inline-flex items-center gap-1 text-sm font-semibold text-[#6D28D9]"><ChevronLeft size={16} />Redações</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[#1F1A2E] font-bold text-2xl">{p.titulo}</h1>
          <p className="text-sm text-[#5B5470]">{dados.turma.name}{dados.turma.schoolName ? ` · ${dados.turma.schoolName}` : ""} · {p.generoNome} · {p.minPalavras} a {p.maxPalavras} palavras · até {p.maxVersoes} versões{p.prazo ? ` · prazo ${new Date(p.prazo).toLocaleDateString("pt-BR")}` : ""}</p>
        </div>
        <button type="button" onClick={alternar} className="border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">
          {p.aberta ? "Encerrar proposta" : "Reabrir proposta"}
        </button>
      </div>
      <p className="bg-white border border-[#E9E5F5] rounded-xl p-4 text-sm text-[#1F1A2E] whitespace-pre-wrap">{p.enunciado}</p>

      <div className="bg-white border border-[#E9E5F5] rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#5B5470] border-b border-[#E9E5F5]">
            <tr><th className="px-4 py-3 font-semibold">Aluno</th><th className="px-4 py-3 font-semibold">Situação</th><th className="px-4 py-3 font-semibold">Versão</th><th className="px-4 py-3 font-semibold">Palavras</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {dados.alunos.map((a) => {
              const s = situacao(a);
              return (
                <tr key={a.studentId} className="border-b last:border-0 border-[#F1EEF9]">
                  <td className="px-4 py-3 text-[#1F1A2E] font-medium">
                    <span className="inline-flex items-center gap-1.5">{a.nome}{a.texto?.atencao && <AlertTriangle size={15} className="text-[#B45309]" aria-label="Ler com atenção" />}</span>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.cor}`}>{s.texto}</span></td>
                  <td className="px-4 py-3 text-[#5B5470]">{a.texto?.versao ?? "-"}</td>
                  <td className="px-4 py-3 text-[#5B5470]">{a.texto && a.texto.status !== "DRAFT" ? a.texto.palavras : "-"}</td>
                  <td className="px-4 py-3 text-right">
                    {a.enviadoId && <Link href={`/escola/professor/redacoes/${p.id}/${a.enviadoId}`} className="text-[#6D28D9] font-semibold">Abrir</Link>}
                  </td>
                </tr>
              );
            })}
            {dados.alunos.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-[#5B5470]">Nenhum aluno ativo nesta turma.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
