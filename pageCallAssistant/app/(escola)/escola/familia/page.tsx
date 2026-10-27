"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, AlertTriangle, RefreshCw } from "lucide-react";
import FamilyShell, { useFilhos } from "@/components/escola/familia/FamilyShell";

export default function FamiliaHome() {
  const router = useRouter();
  const { data, error, loading } = useFilhos();

  useEffect(() => {
    if (!data?.filhos?.length) return;
    const last = typeof window !== "undefined" ? localStorage.getItem("sf_familia_ultimo_filho") : null;
    const alvo = data.filhos.find((f) => f.studentId === last) ?? data.filhos[0];
    router.replace(`/escola/familia/${alvo.studentId}`);
  }, [data, router]);

  return (
    <FamilyShell>
      {loading ? (
        <div className="text-center py-20 text-[#5B5470]">Carregando…</div>
      ) : error ? (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl px-6 py-12 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-xl bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4"><AlertTriangle size={26} className="text-[#B91C1C]" /></div>
          <p className="text-[#1F1A2E] font-semibold mb-3">Não foi possível carregar. Tente de novo.</p>
          <button onClick={() => location.reload()} className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-lg text-sm font-semibold"><RefreshCw size={15} /> Tentar de novo</button>
        </div>
      ) : !data?.filhos?.length ? (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl px-6 py-14 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-4"><Users size={26} className="text-[#6D28D9]" /></div>
          <p className="text-[#1F1A2E] font-semibold mb-1">Nenhum filho ligado à sua conta ainda.</p>
          <p className="text-[#5B5470] text-sm mb-5">Use o código de família do cartão do aluno para adicionar.</p>
          <Link href="/escola/familia/adicionar-filho" className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-lg text-sm font-semibold">Adicionar filho</Link>
        </div>
      ) : (
        <div className="text-center py-20 text-[#5B5470]">Abrindo o painel…</div>
      )}
    </FamilyShell>
  );
}
