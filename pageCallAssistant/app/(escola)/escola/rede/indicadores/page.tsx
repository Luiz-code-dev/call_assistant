"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, BookOpen, Sparkles, HeartHandshake, Download, AlertCircle, RefreshCw } from "lucide-react";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";

interface SchoolStat {
  id: string; name: string; matriculados: number;
  praticaram: number; atividades: number; habilidades: number; familias: number;
}
interface Totais { praticaram: number; atividades: number; habilidades: number; familias: number; }
interface IndicadoresData { totais: Totais; bySchool: SchoolStat[] }
interface School { id: string; name: string }

const inputCls =
  "bg-white text-[#1F1A2E] rounded-[10px] px-3 h-11 text-sm border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none transition-colors";

function fmt(v: number | undefined, pct = false): string {
  if (v === undefined || v === null) return "—";
  return pct ? `${v}%` : String(v);
}

export default function IndicadoresPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [data, setData] = useState<IndicadoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState({ periodo: "7d", escola: "" });

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const params = new URLSearchParams();
      if (filters.periodo) params.set("periodo", filters.periodo);
      if (filters.escola) params.set("escolaId", filters.escola);

      const [rSchools, rInd] = await Promise.all([
        fetch("/api/escola/escolas"),
        fetch(`/api/escola/rede/indicadores?${params}`),
      ]);
      if (!rSchools.ok || !rInd.ok) { setError(true); return; }
      const [dSchools, dInd] = await Promise.all([rSchools.json(), rInd.json()]);
      setSchools(dSchools.schools ?? []);
      setData(dInd);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    if (!data) return;
    const header = ["Escola", "Matriculados", "Praticaram (%)", "Atividades", "Habilidades recuperadas", "Famílias (%)"];
    const rows = data.bySchool.map((s) => [s.name, s.matriculados, s.praticaram, s.atividades, s.habilidades, s.familias]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "indicadores-rede.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const totais = data?.totais;
  const KPIS = [
    { label: "Alunos que praticaram na semana", value: totais ? `${totais.praticaram}%` : "—", icon: <Activity size={18} className="text-[#6D28D9]" />, bg: "bg-[#EDE9FE]" },
    { label: "Atividades concluídas", value: totais ? String(totais.atividades) : "—", icon: <BookOpen size={18} className="text-[#1D4ED8]" />, bg: "bg-[#DBEAFE]" },
    { label: "Habilidades recuperadas no período", value: totais ? String(totais.habilidades) : "—", icon: <Sparkles size={18} className="text-[#166534]" />, bg: "bg-[#DCFCE7]" },
    { label: "Famílias acompanhando", value: totais ? `${totais.familias}%` : "—", icon: <HeartHandshake size={18} className="text-[#BE185D]" />, bg: "bg-[#FCE7F3]" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede", href: "/escola/rede" }, { label: "Indicadores" }]}
        title="Indicadores de reforço"
        subtitle="Acompanhe a prática em casa e a recuperação de habilidades na rede."
        action={
          <button onClick={exportCsv} disabled={!data}
            className="inline-flex items-center gap-2 border border-[#DDD6EE] hover:border-[#C4B5FD] text-[#5B5470] hover:text-[#1F1A2E] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] disabled:opacity-50">
            <Download size={14} /> Exportar CSV
          </button>
        }
      />

      <div className="px-7 py-6 max-w-[1440px] mx-auto w-full space-y-6">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filters.periodo} onChange={(e) => setFilters((f) => ({ ...f, periodo: e.target.value }))} className={inputCls}>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
          <select value={filters.escola} onChange={(e) => setFilters((f) => ({ ...f, escola: e.target.value }))} className={inputCls}>
            <option value="">Todas as escolas</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={load} className="inline-flex items-center gap-2 border border-[#DDD6EE] text-[#5B5470] px-4 h-11 rounded-[10px] text-sm hover:border-[#C4B5FD] transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map((k) => (
            <div key={k.label} className="bg-white rounded-2xl p-4 border border-[#E9E5F5]">
              <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>{k.icon}</div>
              <div className="text-[26px] font-extrabold text-[#1F1A2E] leading-none">{loading ? "…" : k.value}</div>
              <div className="text-[12px] text-[#5B5470] mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {error ? (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} className="text-[#B91C1C]" />
            </div>
            <h2 className="text-[16px] font-bold text-[#1F1A2E] mb-1">Não foi possível carregar os indicadores.</h2>
            <button onClick={load} className="mt-3 inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]">
              <RefreshCw size={15} /> Tentar de novo
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-[#FAF9FD] border-b border-[#E9E5F5]">
              <span className="text-[13px] font-semibold text-[#1F1A2E]">Por escola</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[#5B5470] text-[12px] border-b border-[#E9E5F5]">
                    <th className="px-5 py-2.5 font-medium">Escola</th>
                    <th className="px-4 py-2.5 font-medium text-right">Praticaram (%)</th>
                    <th className="px-4 py-2.5 font-medium text-right">Atividades</th>
                    <th className="px-4 py-2.5 font-medium text-right">Habilidades recuperadas</th>
                    <th className="px-4 py-2.5 font-medium text-right">Famílias (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDF9]">
                  {loading ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-[#5B5470]">Carregando…</td></tr>
                  ) : (data?.bySchool ?? []).length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-[#5B5470]">Nenhuma escola cadastrada.</td></tr>
                  ) : (
                    (data?.bySchool ?? []).map((s) => (
                      <tr key={s.id} className="hover:bg-[#FAF9FD] transition-colors">
                        <td className="px-5 py-3 font-medium text-[#1F1A2E]">{s.name}</td>
                        <td className="px-4 py-3 text-right text-[#5B5470]">{fmt(s.praticaram, true)}</td>
                        <td className="px-4 py-3 text-right text-[#5B5470]">{fmt(s.atividades)}</td>
                        <td className="px-4 py-3 text-right text-[#5B5470]">{fmt(s.habilidades)}</td>
                        <td className="px-4 py-3 text-right text-[#5B5470]">{fmt(s.familias, true)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && data && data.totais.praticaram === 0 && data.totais.atividades === 0 && (
              <div className="px-5 py-4 text-[13px] text-[#5B5470] text-center border-t border-[#F0EDF9]">
                Sem dados no período. Os números aparecem após os alunos praticarem.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
