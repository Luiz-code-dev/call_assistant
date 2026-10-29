"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho", OPEN: "Aberto", CLOSED: "Encerrado",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-[#F8F7FC] text-[#5B5470]",
  OPEN:  "bg-[#DCFCE7] text-[#166534]",
  CLOSED: "bg-[#FEE2E2] text-[#B91C1C]",
};
const MASTERY_COLOR: Record<string, string> = {
  mastered: "#166534", almost: "#92400E", notYet: "#B91C1C", naoAval: "#5B5470",
};

interface DiagData {
  diag: { id: string; title: string; status: string; gradeYear: number; cycle: number; createdAt: string };
  participacao: { responderam: number; total: number };
  bySkill: { skillCode: string; skillLabel: string; mastered: number; almost: number; notYet: number; naoAval: number; total: number }[];
}

export default function DiagnosticoResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<DiagData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const r = await fetch(`/api/escola/diagnosticos/${id}`).catch(() => null);
    if (!r?.ok) { setError("Não foi possível carregar o diagnóstico."); setLoading(false); return; }
    setData(await r.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function acao(action: "abrir" | "encerrar") {
    setActing(true);
    const r = await fetch(`/api/escola/diagnosticos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (r.ok) { await load(); }
    setActing(false);
  }

  const d = data?.diag;
  const part = data?.participacao;
  const pct = part && part.total > 0 ? Math.round((part.responderam / part.total) * 100) : 0;

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[
          { label: "Coordenação", href: "/escola/coordenacao" },
          { label: "Diagnósticos", href: "/escola/coordenacao/diagnosticos" },
          { label: d?.title ?? "Resultado" },
        ]}
        title={d?.title ?? "Carregando…"}
        subtitle={d ? `${d.gradeYear}º ano · ${d.cycle}º ciclo` : ""}
        action={
          d ? (
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[d.status] ?? ""}`}>
                {STATUS_LABEL[d.status] ?? d.status}
              </span>
              {d.status === "DRAFT" && (
                <button onClick={() => acao("abrir")} disabled={acting}
                  className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-60">
                  <CheckCircle size={15} /> Abrir
                </button>
              )}
              {d.status === "OPEN" && (
                <button onClick={() => acao("encerrar")} disabled={acting}
                  className="flex items-center gap-2 border border-[#DDD6EE] text-[#B91C1C] px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] hover:border-[#B91C1C] disabled:opacity-60">
                  <XCircle size={15} /> Encerrar
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="px-7 py-6 max-w-[1200px] mx-auto w-full space-y-6">
        {loading ? (
          <div className="text-[#5B5470] text-center py-16">Carregando…</div>
        ) : error ? (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl p-8 text-center">
            <AlertCircle className="mx-auto mb-3 text-[#B91C1C]" size={32} />
            <p className="text-[#1F1A2E] font-semibold mb-3">{error}</p>
            <button onClick={load} className="inline-flex items-center gap-2 bg-[#6D28D9] text-white px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">
              <RefreshCw size={14} /> Tentar de novo
            </button>
          </div>
        ) : (
          <>
            {/* Participação */}
            <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5">
              <h2 className="text-[#1F1A2E] font-semibold mb-4">Participação</h2>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[36px] font-extrabold text-[#6D28D9] leading-none">{pct}%</div>
                  <div className="text-[#5B5470] text-sm">{part?.responderam} de {part?.total} alunos responderam</div>
                </div>
                <div className="flex-1 h-3 bg-[#EDE9FE] rounded-full overflow-hidden">
                  <div className="h-full bg-[#6D28D9] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>

            {/* Resultado por habilidade */}
            {(data?.bySkill ?? []).length > 0 && (
              <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5">
                <h2 className="text-[#1F1A2E] font-semibold mb-4">Resultado por habilidade</h2>
                <div className="space-y-4">
                  {data!.bySkill.map((s) => {
                    const tot = s.total || 1;
                    return (
                      <div key={s.skillCode}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-[#6D28D9] text-xs font-bold">{s.skillCode}</span>
                          <span className="text-[#1F1A2E] text-sm">{s.skillLabel}</span>
                        </div>
                        <div className="flex h-6 rounded-lg overflow-hidden">
                          {[
                            { k: "mastered", v: s.mastered, label: "Domina" },
                            { k: "almost",   v: s.almost,   label: "Quase lá" },
                            { k: "notYet",   v: s.notYet,   label: "Ainda não" },
                            { k: "naoAval",  v: s.naoAval,  label: "Não avaliado" },
                          ].filter(x => x.v > 0).map(x => (
                            <div key={x.k} title={`${x.label}: ${x.v}`}
                              style={{ width: `${(x.v / tot) * 100}%`, backgroundColor: MASTERY_COLOR[x.k] }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-4 mt-1 text-[11px] text-[#5B5470]">
                          <span><span className="font-bold text-[#166534]">{s.mastered}</span> Domina</span>
                          <span><span className="font-bold text-[#92400E]">{s.almost}</span> Quase lá</span>
                          <span><span className="font-bold text-[#B91C1C]">{s.notYet}</span> Ainda não</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Próximo passo */}
            {d?.status === "CLOSED" && (
              <div className="bg-[#EDE9FE] border border-[#C4B5FD] rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#4C1D95]">Próximo passo</p>
                  <p className="text-[#5B5470] text-sm">Sugira trilhas para as habilidades com mais "Ainda não".</p>
                </div>
                <button onClick={() => router.push("/escola/coordenacao/trilhas")}
                  className="bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">
                  Ver trilhas
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
