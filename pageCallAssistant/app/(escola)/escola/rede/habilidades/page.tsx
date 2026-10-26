"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";

interface SkillStat {
  skillId: string; code: string; shortLabel: string | null; subjectCode: string;
  total: number; NOT_YET: number; ALMOST: number; MASTERED: number; pctMastered: number;
}

const SUBJECTS: Record<string, { label: string; color: string; bg: string }> = {
  LP: { label: "Português", color: "#BE185D", bg: "#FCE7F3" },
  PT: { label: "Português", color: "#BE185D", bg: "#FCE7F3" },
  MA: { label: "Matemática", color: "#1D4ED8", bg: "#DBEAFE" },
  CI: { label: "Ciências", color: "#0F766E", bg: "#CCFBF1" },
  EN: { label: "Inglês", color: "#6D28D9", bg: "#EDE9FE" },
  HI: { label: "História", color: "#C2410C", bg: "#FFEDD5" },
  GE: { label: "Geografia", color: "#15803D", bg: "#DCFCE7" },
  ES: { label: "Espanhol", color: "#A16207", bg: "#FEF9C3" },
};

function SubjectTag({ code }: { code: string }) {
  const s = SUBJECTS[code?.toUpperCase?.()] ?? { label: code, color: "#6D28D9", bg: "#EDE9FE" };
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: s.color, backgroundColor: s.bg }}>{s.label}</span>;
}

const inputCls =
  "bg-white text-[#1F1A2E] rounded-[10px] px-3 h-11 text-sm border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none transition-colors";

export default function HabilidadesPrioritariasPage() {
  const [stats, setStats] = useState<SkillStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [componente, setComponente] = useState("");

  useEffect(() => {
    fetch("/api/escola/rede/habilidades-prioritarias")
      .then((r) => (r.ok ? r.json() : { stats: [] }))
      .then((d) => { setStats(d.stats ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const components = useMemo(() => Array.from(new Set(stats.map((s) => s.subjectCode))), [stats]);
  const filtered = componente ? stats.filter((s) => s.subjectCode === componente) : stats;

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede", href: "/escola/rede" }, { label: "Habilidades prioritárias" }]}
        title="Habilidades prioritárias"
        subtitle="Habilidades com menor domínio na rede, por ano e componente."
      />

      <div className="px-7 py-6 max-w-3xl mx-auto w-full">
        {!loading && stats.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-5">
            <select className={inputCls} defaultValue="">
              <option value="">Todos os anos</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((a) => <option key={a} value={a}>{a}º ano</option>)}
            </select>
            <select value={componente} onChange={(e) => setComponente(e.target.value)} className={inputCls}>
              <option value="">Todos os componentes</option>
              {components.map((c) => <option key={c} value={c}>{SUBJECTS[c?.toUpperCase()]?.label ?? c}</option>)}
            </select>
          </div>
        )}

        {loading ? (
          <div className="text-[#5B5470] text-center py-16">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E9E5F5] flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-4"><Target size={26} className="text-[#6D28D9]" /></div>
            <p className="text-[#1F1A2E] text-[15px] font-semibold">Ainda não há resultados de diagnóstico</p>
            <p className="text-[#5B5470] text-sm mt-1 max-w-sm">Quando a coordenação aplicar o primeiro diagnóstico, as habilidades aparecem aqui.</p>
            <Link href="/escola/rede/diagnosticos" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6D28D9] hover:text-[#5B21B6] transition-colors">
              Ver diagnósticos
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const total = s.total || 1;
              const pNot = Math.round((s.NOT_YET / total) * 100);
              const pAlmost = Math.round((s.ALMOST / total) * 100);
              const pMast = Math.max(0, 100 - pNot - pAlmost);
              return (
                <div key={s.skillId} className="bg-white rounded-2xl p-4 border border-[#E9E5F5]">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[#1F1A2E] text-sm font-semibold">{s.shortLabel ?? s.code}</span>
                    <span className="text-[#5B5470] text-xs font-mono">{s.code}</span>
                    <SubjectTag code={s.subjectCode} />
                  </div>
                  <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-[#FAF9FD]">
                    <div style={{ width: `${pNot}%` }} className="bg-[#DC2626]" />
                    <div style={{ width: `${pAlmost}%` }} className="bg-[#F59E0B]" />
                    <div style={{ width: `${pMast}%` }} className="bg-[#16A34A]" />
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-[#5B5470]">
                    <span><span className="inline-block w-2 h-2 rounded-full bg-[#DC2626] mr-1 align-middle" />Ainda não {pNot}%</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-[#F59E0B] mr-1 align-middle" />Quase lá {pAlmost}%</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-[#16A34A] mr-1 align-middle" />Domina {pMast}%</span>
                    <span className="ml-auto">{s.total} aluno{s.total !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
