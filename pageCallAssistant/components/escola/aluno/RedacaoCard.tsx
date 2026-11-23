"use client";
/** Atalho da tela inicial para a redação: só aparece quando o professor abriu alguma. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { PenLine, ChevronRight } from "lucide-react";

export default function RedacaoCard() {
  const [pendentes, setPendentes] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/escola/aluno/redacoes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { propostas: [] }))
      .then((d) => {
        const lista: { aberta: boolean; situacao: string }[] = d.propostas ?? [];
        setPendentes(lista.length ? lista.filter((p) => p.aberta && (p.situacao === "nova" || p.situacao === "rascunho" || p.situacao === "com-retorno" || p.situacao === "revisada")).length : null);
      })
      .catch(() => setPendentes(null));
  }, []);

  if (pendentes === null) return null;
  return (
    <Link href="/escola/aluno/redacao" className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] border border-[#DDD6FE] p-4 shadow-[0_4px_18px_rgba(91,33,182,0.10)] active:scale-[0.99] transition-transform">
      <span className="w-12 h-12 rounded-2xl bg-[#6D28D9] text-white flex items-center justify-center shrink-0"><PenLine className="size-6" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-extrabold text-[#1F1A2E] leading-tight">Redação</span>
        <span className="block text-[13px] text-[#4C1D95] mt-0.5">{pendentes > 0 ? "Tem redação para você escrever ou melhorar" : "Veja as suas redações e os retornos"}</span>
      </span>
      <ChevronRight className="size-5 text-[#6D28D9] shrink-0" />
    </Link>
  );
}
