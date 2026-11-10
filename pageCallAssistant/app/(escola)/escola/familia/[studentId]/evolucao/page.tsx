"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import FamilyShell from "@/components/escola/familia/FamilyShell";
import { IconeMateria } from "@/components/escola/reforco-ui";

const LEVELS = [
  { key: "MASTERED", label: "Domina", fg: "#166534", bg: "#DCFCE7" },
  { key: "ALMOST", label: "Quase lá", fg: "#92400E", bg: "#FEF3C7" },
  { key: "NOT_YET", label: "Praticando", fg: "#6D28D9", bg: "#EDE9FE" },
] as const;
const lv = (k: string | null) => LEVELS.find((l) => l.key === k);

interface Evo {
  aluno: { fullName: string | null; className: string | null };
  resumo: { MASTERED: number; ALMOST: number; NOT_YET: number };
  componentes: { name: string; color: string; habilidades: { skillId: string; code: string; label: string; level: string; levelInicial: string | null }[] }[];
}

export default function EvolucaoCompleta() {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<Evo | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>("TODAS");

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const r = await fetch(`/api/escola/familia/filhos/${studentId}/evolucao`);
      if (!r.ok) { setError(true); return; }
      setData(await r.json());
    } catch { setError(true); } finally { setLoading(false); }
  }, [studentId]);
  useEffect(() => { load(); }, [load]);

  const total = data ? data.resumo.MASTERED + data.resumo.ALMOST + data.resumo.NOT_YET : 0;

  return (
    <FamilyShell activeStudentId={studentId}>
      <div className="max-w-[760px] mx-auto space-y-4">
        <Link href={`/escola/familia/${studentId}`} className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#6D28D9] bg-white rounded-full px-3 min-h-[40px] shadow-sm"><ArrowLeft size={16} /> Voltar</Link>

        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-3xl bg-white/70 animate-pulse" />)}</div>
        ) : error ? (
          <div className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4"><AlertTriangle size={26} className="text-[#B91C1C]" /></div>
            <p className="text-[#1F1A2E] font-semibold mb-3">Não foi possível carregar. Tente de novo.</p>
            <button onClick={load} className="inline-flex items-center gap-2 bg-[#6D28D9] text-white px-5 min-h-[48px] rounded-2xl text-sm font-bold"><RefreshCw size={15} /> Tentar de novo</button>
          </div>
        ) : data ? (
          <>
            <div>
              <h1 className="text-[20px] font-extrabold text-[#1F1A2E]">{data.aluno.fullName}</h1>
              {data.aluno.className && <p className="text-[#5B5470] text-sm">{data.aluno.className}</p>}
            </div>

            {total === 0 ? (
              <div className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-6 text-center text-[#5B5470] text-sm">O diagnóstico ainda não foi feito. Assim que for realizado, você verá aqui as habilidades já dominadas e as que serão praticadas.</div>
            ) : (
              <>
                {/* Resumo barra empilhada */}
                <div className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-4">
                  <div className="flex h-3 rounded-full overflow-hidden mb-3">
                    {LEVELS.map((l) => total ? <div key={l.key} style={{ width: `${(data.resumo[l.key] / total) * 100}%`, backgroundColor: l.fg }} /> : null)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LEVELS.map((l) => <span key={l.key} className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ color: l.fg, backgroundColor: l.bg }}>{l.label} {data.resumo[l.key]}</span>)}
                  </div>
                </div>

                {/* Filtros */}
                <div className="flex gap-2 flex-wrap">
                  {[{ k: "TODAS", l: "Todas" }, ...LEVELS.map((l) => ({ k: l.key, l: l.label }))].map((f) => (
                    <button key={f.k} onClick={() => setFiltro(f.k)} className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium ${filtro === f.k ? "bg-[#6D28D9] text-white" : "bg-white border border-[#E9E5F5] text-[#5B5470]"}`}>{f.l}</button>
                  ))}
                </div>

                {/* Lista por componente */}
                {data.componentes.map((c) => {
                  const habs = c.habilidades.filter((h) => filtro === "TODAS" || h.level === filtro);
                  if (!habs.length) return null;
                  return (
                    <div key={c.name} className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-4">
                      <div className="flex items-center gap-3 mb-3"><IconeMateria chave={c.name} tamanho={40} /><h2 className="text-[16px] font-extrabold text-[#1F1A2E]">{c.name}</h2></div>
                      <div className="space-y-3">
                        {habs.map((h) => {
                          const cur = lv(h.level); const ini = lv(h.levelInicial);
                          return (
                            <div key={h.skillId} className="flex items-start gap-2 border-t border-[#F0EDF9] pt-3 first:border-0 first:pt-0">
                              <div className="flex-1">
                                <p className="text-[14px] text-[#1F1A2E]">{h.label}</p>
                                {ini && h.levelInicial !== h.level && <p className="text-[12px] text-[#5B5470] mt-0.5">desde o diagnóstico: {ini.label} → {cur?.label}</p>}
                              </div>
                              {cur && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ color: cur.fg, backgroundColor: cur.bg }}>{cur.label}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        ) : null}
      </div>
    </FamilyShell>
  );
}
