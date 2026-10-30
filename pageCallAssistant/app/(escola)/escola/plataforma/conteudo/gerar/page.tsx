"use client";
import Link from "next/link";
export default function GerarPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-4"><Link href="/escola/plataforma/conteudo" className="text-[#5B5470] text-sm">← Estúdio de Conteúdo</Link></div>
      <h1 className="text-2xl font-bold text-[#1F1A2E] mb-2">Gerar conteúdo com IA</h1>
      <p className="text-[#5B5470] text-sm mb-6">Gere lotes de atividades, trilhas ou diagnósticos para uma combinação de componente e ano.</p>
      <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4 text-[#92400E] text-sm">
        Esta funcionalidade estará disponível em breve. O conteúdo gerado pela IA sempre passa pela fila de revisão antes de ser publicado para as redes.
      </div>
    </div>
  );
}
