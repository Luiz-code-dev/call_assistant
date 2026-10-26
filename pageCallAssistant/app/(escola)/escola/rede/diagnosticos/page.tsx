"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, AlertCircle, RefreshCw } from "lucide-react";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";

interface Diagnostic {
  id: string; title: string; gradeYear: number; cycle: number;
  status: string; createdAt: string; subjectId: string;
  items?: { id: string }[];
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Rascunho", cls: "bg-[#FAF9FD] text-[#5B5470]" },
  OPEN: { label: "Aberto", cls: "bg-[#DCFCE7] text-[#166534]" },
  PUBLISHED: { label: "Aberto", cls: "bg-[#DCFCE7] text-[#166534]" },
  CLOSED: { label: "Encerrado", cls: "bg-[#EDE9FE] text-[#6D28D9]" },
};

export default function DiagnosticosRedePage() {
  const [items, setItems] = useState<Diagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true); setError(false);
    try {
      const r = await fetch("/api/escola/diagnosticos");
      if (!r.ok) { setError(true); return; }
      const d = await r.json();
      setItems(d.diagnostics ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede", href: "/escola/rede" }, { label: "Diagnósticos" }]}
        title="Diagnósticos"
        subtitle="Acompanhe os diagnósticos da rede. A coordenação cria e aplica os diagnósticos."
      />

      <div className="px-7 py-6 max-w-[1440px] mx-auto w-full">
        {loading ? (
          <div className="text-[#5B5470] text-center py-16">Carregando…</div>
        ) : error ? (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} className="text-[#B91C1C]" />
            </div>
            <h2 className="text-[16px] font-bold text-[#1F1A2E] mb-1">Não foi possível carregar os diagnósticos.</h2>
            <button onClick={load} className="mt-3 inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]">
              <RefreshCw size={15} /> Tentar de novo
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E9E5F5] flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-4">
              <ClipboardList size={26} className="text-[#6D28D9]" />
            </div>
            <p className="text-[#1F1A2E] text-[15px] font-semibold">Nenhum diagnóstico ainda</p>
            <p className="text-[#5B5470] text-sm mt-1 max-w-sm">A coordenação cria e aplica os diagnósticos.</p>
            <Link href="/escola/rede/habilidades" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6D28D9] hover:text-[#5B21B6] transition-colors">
              Ver habilidades prioritárias
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[#5B5470] text-[12px] border-b border-[#E9E5F5]">
                    <th className="px-5 py-2.5 font-medium">Diagnóstico</th>
                    <th className="px-4 py-2.5 font-medium">Ano</th>
                    <th className="px-4 py-2.5 font-medium">Ciclo</th>
                    <th className="px-4 py-2.5 font-medium">Situação</th>
                    <th className="px-4 py-2.5 font-medium text-right">Responderam</th>
                    <th className="px-4 py-2.5 font-medium text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDF9]">
                  {items.map((d) => {
                    const st = STATUS_LABEL[d.status] ?? { label: d.status, cls: "bg-[#FAF9FD] text-[#5B5470]" };
                    return (
                      <tr key={d.id} className="hover:bg-[#FAF9FD] transition-colors">
                        <td className="px-5 py-3 font-medium text-[#1F1A2E]">{d.title}</td>
                        <td className="px-4 py-3 text-[#5B5470]">{d.gradeYear}º</td>
                        <td className="px-4 py-3 text-[#5B5470]">{d.cycle}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${st.cls}`}>{st.label}</span></td>
                        <td className="px-4 py-3 text-right text-[#5B5470]">—</td>
                        <td className="px-4 py-3 text-right text-[#5B5470]">{new Date(d.createdAt).toLocaleDateString("pt-BR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
