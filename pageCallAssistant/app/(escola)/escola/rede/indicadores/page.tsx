"use client";

import { useEffect, useState } from "react";
import { Activity, BookOpen, Sparkles, HeartHandshake, Download, AlertCircle, RefreshCw } from "lucide-react";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";

interface School { id: string; name: string; inepCode?: string | null }

const inputCls =
  "bg-white text-[#1F1A2E] rounded-[10px] px-3 h-11 text-sm border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none transition-colors";

export default function IndicadoresPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState({ periodo: "atual", escola: "", ano: "", componente: "" });

  async function load() {
    setLoading(true); setError(false);
    try {
      const r = await fetch("/api/escola/escolas");
      if (!r.ok) { setError(true); return; }
      const d = await r.json();
      setSchools(d.schools ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function exportCsv() {
    const header = ["Escola", "INEP", "Alunos que praticaram (%)", "Atividades concluídas", "Habilidades recuperadas", "Famílias acompanhando (%)"];
    const rows = schools.map((s) => [s.name, s.inepCode ?? "", "", "", "", ""]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "indicadores-rede.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const KPIS = [
    { label: "Alunos que praticaram na semana", value: "—", icon: <Activity size={18} className="text-[#6D28D9]" />, bg: "bg-[#EDE9FE]" },
    { label: "Atividades concluídas", value: "—", icon: <BookOpen size={18} className="text-[#1D4ED8]" />, bg: "bg-[#DBEAFE]" },
    { label: "Habilidades recuperadas no período", value: "—", icon: <Sparkles size={18} className="text-[#166534]" />, bg: "bg-[#DCFCE7]" },
    { label: "Famílias acompanhando", value: "—", icon: <HeartHandshake size={18} className="text-[#BE185D]" />, bg: "bg-[#FCE7F3]" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede", href: "/escola/rede" }, { label: "Indicadores" }]}
        title="Indicadores de reforço"
        subtitle="Acompanhe a prática em casa e a recuperação de habilidades na rede."
        action={
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 border border-[#DDD6EE] hover:border-[#C4B5FD] text-[#5B5470] hover:text-[#1F1A2E] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            <Download size={14} /> Exportar CSV
          </button>
        }
      />

      <div className="px-7 py-6 max-w-[1440px] mx-auto w-full space-y-6">
        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <select value={filters.periodo} onChange={(e) => setFilters((f) => ({ ...f, periodo: e.target.value }))} className={inputCls}>
            <option value="atual">Período atual</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
          <select value={filters.escola} onChange={(e) => setFilters((f) => ({ ...f, escola: e.target.value }))} className={inputCls}>
            <option value="">Todas as escolas</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filters.ano} onChange={(e) => setFilters((f) => ({ ...f, ano: e.target.value }))} className={inputCls}>
            <option value="">Todos os anos</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((a) => <option key={a} value={a}>{a}º ano</option>)}
          </select>
          <select value={filters.componente} onChange={(e) => setFilters((f) => ({ ...f, componente: e.target.value }))} className={inputCls}>
            <option value="">Todos os componentes</option>
            <option value="LP">Língua Portuguesa</option>
            <option value="MA">Matemática</option>
            <option value="CI">Ciências</option>
          </select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map((k) => (
            <div key={k.label} className="bg-white rounded-2xl p-4 border border-[#E9E5F5]">
              <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>{k.icon}</div>
              <div className="text-[26px] font-extrabold text-[#1F1A2E] leading-none">{k.value}</div>
              <div className="text-[12px] text-[#5B5470] mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-[#5B5470] text-center py-12">Carregando…</div>
        ) : error ? (
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
                  {schools.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-[#5B5470]">Cadastre escolas para ver os indicadores por escola.</td></tr>
                  ) : (
                    schools.map((s) => (
                      <tr key={s.id} className="hover:bg-[#FAF9FD] transition-colors">
                        <td className="px-5 py-3 font-medium text-[#1F1A2E]">{s.name}</td>
                        <td className="px-4 py-3 text-right text-[#5B5470]">—</td>
                        <td className="px-4 py-3 text-right text-[#5B5470]">—</td>
                        <td className="px-4 py-3 text-right text-[#5B5470]">—</td>
                        <td className="px-4 py-3 text-right text-[#5B5470]">—</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 text-[13px] text-[#5B5470] text-center border-t border-[#F0EDF9]">
              Os números aparecem após o lançamento de atividades e diagnósticos.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
