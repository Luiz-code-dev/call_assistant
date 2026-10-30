"use client";
import Link from "next/link";
export default function RevisarPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-4"><Link href="/escola/plataforma/conteudo" className="text-[#5B5470] text-sm">← Estúdio de Conteúdo</Link></div>
      <h1 className="text-2xl font-bold text-[#1F1A2E] mb-2">Fila de revisão</h1>
      <p className="text-[#5B5470] text-sm mb-6">Conteúdos em DRAFT aguardando aprovação antes de serem publicados.</p>
      <div className="border border-dashed border-[#DDD6EE] rounded-xl p-10 text-center text-[#5B5470]">Nenhum conteúdo aguardando revisão no momento.</div>
    </div>
  );
}
