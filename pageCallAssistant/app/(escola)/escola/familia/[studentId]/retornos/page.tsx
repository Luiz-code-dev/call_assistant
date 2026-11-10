"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, RefreshCw, MessageSquare } from "lucide-react";
import FamilyShell from "@/components/escola/familia/FamilyShell";
import { IconeMateria } from "@/components/escola/reforco-ui";

const LEVELS = [
  { key: "MASTERED", label: "Domina", fg: "#166534", bg: "#DCFCE7" },
  { key: "ALMOST", label: "Quase lá", fg: "#92400E", bg: "#FEF3C7" },
  { key: "NOT_YET", label: "Praticando", fg: "#6D28D9", bg: "#EDE9FE" },
];
const lv = (k: string | null) => LEVELS.find((l) => l.key === k);

interface Retorno { subjectName: string; when: string; level: string | null; acertou: string | null; melhorar: string | null }

export default function RetornosTodos() {
  const { studentId } = useParams<{ studentId: string }>();
  const [list, setList] = useState<Retorno[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const r = await fetch(`/api/escola/familia/filhos/${studentId}/retornos`);
      if (!r.ok) { setError(true); return; }
      setList((await r.json()).retornos ?? []);
    } catch { setError(true); } finally { setLoading(false); }
  }, [studentId]);
  useEffect(() => { load(); }, [load]);

  return (
    <FamilyShell activeStudentId={studentId}>
      <div className="max-w-[720px] mx-auto space-y-4">
        <Link href={`/escola/familia/${studentId}`} className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#6D28D9] bg-white rounded-full px-3 min-h-[40px] shadow-sm"><ArrowLeft size={16} /> Voltar</Link>
        <h1 className="text-[20px] font-extrabold text-[#1F1A2E] px-1">Retornos recentes</h1>

        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-3xl bg-white/70 animate-pulse" />)}</div>
        ) : error ? (
          <div className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4"><AlertTriangle size={26} className="text-[#B91C1C]" /></div>
            <p className="text-[#1F1A2E] font-semibold mb-3">Não foi possível carregar. Tente de novo.</p>
            <button onClick={load} className="inline-flex items-center gap-2 bg-[#6D28D9] text-white px-5 min-h-[48px] rounded-2xl text-sm font-bold"><RefreshCw size={15} /> Tentar de novo</button>
          </div>
        ) : list && list.length ? (
          <div className="space-y-3">
            {list.map((r, i) => {
              const level = lv(r.level);
              return (
                <div key={i} className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <IconeMateria chave={r.subjectName} tamanho={32} /><span className="text-[14px] font-bold text-[#1F1A2E]">{r.subjectName}</span>
                    <span className="text-[12px] text-[#5B5470]">· {r.when}</span>
                    {level && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full ml-auto" style={{ color: level.fg, backgroundColor: level.bg }}>{level.label}</span>}
                  </div>
                  {r.acertou && <p className="text-[13px] text-[#1F1A2E]"><b className="font-medium text-[#166534]">Acertou:</b> {r.acertou}</p>}
                  {r.melhorar && <p className="text-[13px] text-[#1F1A2E]"><b className="font-medium text-[#92400E]">Pode melhorar:</b> {r.melhorar}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-10 text-center text-[#5B5470]">
            <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><MessageSquare size={24} className="text-[#6D28D9]" /></div>
            Ainda não há retornos.
          </div>
        )}
      </div>
    </FamilyShell>
  );
}
