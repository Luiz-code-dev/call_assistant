"use client";
import Link from "next/link";
export default function FichasPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-4"><Link href="/escola/plataforma/conteudo" className="text-[#5B5470] text-sm">← Estúdio de Conteúdo</Link></div>
      <h1 className="text-2xl font-bold text-[#1F1A2E] mb-2">Fichas pedagógicas</h1>
      <p className="text-[#5B5470] text-sm mb-6">O que o aluno faz, erros comuns, tipos de atividade indicados por habilidade BNCC.</p>
      <div className="border border-dashed border-[#DDD6EE] rounded-xl p-10 text-center text-[#5B5470]">Selecione um componente e ano para ver as fichas.</div>
    </div>
  );
}
