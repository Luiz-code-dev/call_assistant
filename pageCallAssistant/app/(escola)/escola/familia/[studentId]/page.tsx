"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Lightbulb, ChevronRight, School } from "lucide-react";
import FamilyShell from "@/components/escola/familia/FamilyShell";

const DIAS = ["S", "T", "Q", "Q", "S", "S", "D"];
const LEVELS = [
  { key: "MASTERED", label: "Domina", fg: "#166534", bg: "#DCFCE7" },
  { key: "ALMOST", label: "Quase lá", fg: "#92400E", bg: "#FEF3C7" },
  { key: "NOT_YET", label: "Ainda não", fg: "#B91C1C", bg: "#FEE2E2" },
] as const;
const levelInfo = (k: string | null) => LEVELS.find((l) => l.key === k);

interface Resumo {
  aluno: { fullName: string; firstName: string; className: string | null; schoolName: string | null; shift: string | null; gradeYear: number | null };
  semana: { dias: boolean[]; atividades: number; minutos: number; frase: string; hojeIndex: number };
  trilhaAtual: { subjectName: string; subjectColor: string; skillLabel: string; feitas: number; total: number } | null;
  outrasTrilhas: number;
  evolucao: { MASTERED: number; ALMOST: number; NOT_YET: number; avancaramNoMes: number };
  dica: string;
  retornos: { subjectName: string; when: string; level: string | null; acertou: string | null; melhorar: string | null }[];
  alertas: { tipo: "warn" | "info"; texto: string }[];
  escola: { nome: string | null; turma: string | null; turno: string | null; phone: string | null; email: string | null };
}

function Card({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="bg-white border border-[#E9E5F5] rounded-[20px] p-4 shadow-[0_1px_2px_rgba(31,26,46,0.04)]">
      {title && <div className="flex items-center justify-between mb-3"><h2 className="text-[13px] font-semibold text-[#5B5470]">{title}</h2>{right}</div>}
      {children}
    </section>
  );
}

export default function PainelFilho() {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<Resumo | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const r = await fetch(`/api/escola/familia/filhos/${studentId}/resumo`);
      if (!r.ok) { setError(true); return; }
      setData(await r.json());
      if (typeof window !== "undefined") localStorage.setItem("sf_familia_ultimo_filho", studentId);
    } catch { setError(true); } finally { setLoading(false); }
  }, [studentId]);
  useEffect(() => { load(); }, [load]);

  return (
    <FamilyShell activeStudentId={studentId}>
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2 max-w-[920px] mx-auto">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-[20px] bg-[#EDE9FE] animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl px-6 py-12 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-xl bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4"><AlertTriangle size={26} className="text-[#B91C1C]" /></div>
          <p className="text-[#1F1A2E] font-semibold mb-3">Não foi possível carregar. Tente de novo.</p>
          <button onClick={load} className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-lg text-sm font-semibold"><RefreshCw size={15} /> Tentar de novo</button>
        </div>
      ) : data ? (
        <div className="max-w-[920px] mx-auto space-y-4">
          {/* Alertas */}
          {data.alertas.map((a, i) => (
            <div key={i} className={`rounded-2xl px-4 py-3 text-[14px] ${a.tipo === "warn" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#EDE9FE] text-[#4C1D95]"}`}>{a.texto}</div>
          ))}

          {/* Cabeçalho do filho */}
          <div>
            <h1 className="text-[22px] font-extrabold text-[#1F1A2E]">{data.aluno.fullName}</h1>
            <p className="text-[#5B5470] text-sm">{[data.aluno.className, data.aluno.schoolName].filter(Boolean).join(" · ")}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Esta semana */}
            <Card title="Esta semana">
              <div className="flex justify-between mb-3">
                {DIAS.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full ${data.semana.dias[i] ? "bg-[#6D28D9]" : "border-2 border-[#DDD6EE] bg-white"} ${i === data.semana.hojeIndex ? "ring-2 ring-[#C4B5FD] ring-offset-1" : ""}`} />
                    <span className="text-[10px] font-semibold text-[#5B5470]">{d}</span>
                  </div>
                ))}
              </div>
              <p className="text-[14px] text-[#1F1A2E] leading-snug">{data.semana.frase}</p>
              {data.semana.atividades > 0 && <p className="text-[12px] text-[#5B5470] mt-1">{data.semana.atividades} atividades · cerca de {data.semana.minutos} minutos</p>}
            </Card>

            {/* Trilha atual */}
            <Card title="Trilha atual">
              {data.trilhaAtual ? (
                <>
                  <span className="inline-block text-[12px] font-semibold px-2.5 py-1 rounded-full mb-2" style={{ color: data.trilhaAtual.subjectColor, backgroundColor: data.trilhaAtual.subjectColor + "1A" }}>{data.trilhaAtual.subjectName}</span>
                  <p className="text-[15px] font-semibold text-[#1F1A2E] mb-2">{data.trilhaAtual.skillLabel}</p>
                  <div className="h-2 rounded-full bg-[#EFEAF8] overflow-hidden mb-1"><div className="h-full rounded-full bg-[#6D28D9]" style={{ width: `${data.trilhaAtual.total ? (data.trilhaAtual.feitas / data.trilhaAtual.total) * 100 : 0}%` }} /></div>
                  <p className="text-[12px] text-[#5B5470]">{data.trilhaAtual.feitas} de {data.trilhaAtual.total} atividades{data.outrasTrilhas > 0 ? ` · +${data.outrasTrilhas} trilha` : ""}</p>
                </>
              ) : (
                <p className="text-[14px] text-[#5B5470] leading-snug">A escola ainda não indicou uma trilha para {data.aluno.firstName}. Ela aparece aqui depois do diagnóstico.</p>
              )}
            </Card>

            {/* Evolução */}
            <Card title="Evolução" right={<Link href={`/escola/familia/${studentId}/evolucao`} className="text-[13px] font-medium text-[#6D28D9] inline-flex items-center gap-1">Ver evolução <ChevronRight size={14} /></Link>}>
              {(data.evolucao.MASTERED + data.evolucao.ALMOST + data.evolucao.NOT_YET) > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {LEVELS.map((l) => (
                      <span key={l.key} className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ color: l.fg, backgroundColor: l.bg }}>{l.label} {data.evolucao[l.key]}</span>
                    ))}
                  </div>
                  {data.evolucao.avancaramNoMes > 0 && <p className="text-[12px] text-[#5B5470]">{data.evolucao.avancaramNoMes} habilidades avançaram este mês</p>}
                </>
              ) : (
                <p className="text-[14px] text-[#5B5470] leading-snug">O diagnóstico de {data.aluno.firstName} ainda não foi feito. Depois dele, você vê aqui o que ele(a) já domina e o que vai praticar.</p>
              )}
            </Card>

            {/* Como ajudar */}
            <section className="bg-[#FEF3C7] border border-[#FDE68A] rounded-[20px] p-4">
              <div className="flex gap-3">
                <Lightbulb size={18} className="text-[#92400E] mt-0.5 shrink-0" />
                <div><h2 className="text-[13px] font-semibold text-[#92400E] mb-1">Como ajudar</h2><p className="text-[14px] text-[#78350F] leading-snug">{data.dica}</p></div>
              </div>
            </section>
          </div>

          {/* Últimos retornos */}
          <Card title="Últimos retornos" right={data.retornos.length ? <Link href={`/escola/familia/${studentId}/retornos`} className="text-[13px] font-medium text-[#6D28D9] inline-flex items-center gap-1">Ver todos <ChevronRight size={14} /></Link> : undefined}>
            {data.retornos.length ? (
              <div className="space-y-3">
                {data.retornos.map((r, i) => {
                  const lv = levelInfo(r.level);
                  return (
                    <div key={i} className={i > 0 ? "border-t border-[#F0EDF9] pt-3" : ""}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-semibold text-[#1F1A2E]">{r.subjectName}</span>
                        <span className="text-[12px] text-[#5B5470]">· {r.when}</span>
                        {lv && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full ml-auto" style={{ color: lv.fg, backgroundColor: lv.bg }}>{lv.label}</span>}
                      </div>
                      {r.acertou && <p className="text-[13px] text-[#1F1A2E]"><b className="font-medium text-[#166534]">Acertou:</b> {r.acertou}</p>}
                      {r.melhorar && <p className="text-[13px] text-[#1F1A2E]"><b className="font-medium text-[#92400E]">Pode melhorar:</b> {r.melhorar}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[14px] text-[#5B5470]">Ainda não há retornos. Eles aparecem quando {data.aluno.firstName} entrega uma atividade.</p>
            )}
          </Card>

          {/* Escola */}
          <Card title="Escola">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0"><School size={18} className="text-[#6D28D9]" /></div>
              <div className="text-[14px] text-[#1F1A2E]">
                <p className="font-medium">{[data.escola.nome, data.escola.turma, data.escola.turno].filter(Boolean).join(" · ")}</p>
                <p className="text-[13px] text-[#5B5470]">{[data.escola.phone, data.escola.email].filter(Boolean).join(" · ") || "Contato da secretaria não informado."}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </FamilyShell>
  );
}
