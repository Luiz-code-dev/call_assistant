"use client";
import Link from "next/link";
export default function PrerequisitosPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-4"><Link href="/escola/plataforma/conteudo" className="text-[#5B5470] text-sm">← Estúdio de Conteúdo</Link></div>
      <h1 className="text-2xl font-bold text-[#1F1A2E] mb-2">Mapa de pré-requisitos</h1>
      <p className="text-[#5B5470] text-sm mb-6">Relações de pré-requisito entre habilidades BNCC. Sugestões da IA ficam em DRAFT até aprovação do pedagogo.</p>
      <div className="border border-dashed border-[#DDD6EE] rounded-xl p-10 text-center text-[#5B5470]">Carregando mapa de pré-requisitos...</div>
    </div>
  );
}
