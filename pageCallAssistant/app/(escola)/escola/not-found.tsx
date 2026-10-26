import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";
import { getEduContext, rotaDoPapel } from "@/lib/escola/context";

export default async function EscolaNotFound() {
  const ctx = await getEduContext();
  const home = ctx ? rotaDoPapel(ctx.role) : "/escola/entrar";

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-24 min-h-full">
      <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-5">
        <SearchX size={28} className="text-[#6D28D9]" />
      </div>
      <h1 className="text-[22px] font-extrabold text-[#1F1A2E] mb-1">Esta página não existe</h1>
      <p className="text-[15px] text-[#5B5470] mb-6 max-w-sm">
        A página que você procura não foi encontrada ou ainda não está disponível.
      </p>
      <Link
        href={home}
        className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
      >
        <ArrowLeft size={15} />
        Voltar ao início
      </Link>
    </div>
  );
}
