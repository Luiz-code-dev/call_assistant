"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import { CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, Rocket } from "lucide-react";

interface Step {
  step: number; label: string; done: boolean; count: number; hint: string;
}
interface Status {
  steps: Step[]; stepsCompleted: number; totalSteps: number; ready: boolean; canComplete: boolean;
  pending: {
    schoolsWithoutDirector: number; offersWithoutTeacher: number; invitesPending: number;
    studentsCount: number; classesCount: number; studentsWithoutClass: number; studentsWithoutGuardian: number;
  };
}

const STEP_LINKS: Record<number, string> = {
  1: "/escola/rede/escolas",
  2: "/escola/rede/anos-letivos",
  3: "/escola/rede/componentes",
  4: "/escola/rede/servidores",
  5: "/escola/rede/importacoes",
  6: "/escola/rede/turmas",
  7: "/escola/rede/importacoes",
  8: "#revisao",
};

const STEP_CTA: Record<number, string> = {
  1: "Importar escolas",
  2: "Configurar ano letivo",
  3: "Revisar matriz",
  4: "Importar servidores",
  5: "Importar turmas e alunos",
  6: "Abrir atribuições",
  7: "Gerar cartões",
  8: "Revisar pendências",
};

export default function ImplantacaoPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch("/api/escola/implantacao/status");
      if (!r.ok) { setError(true); setStatus(null); return; }
      setStatus(await r.json());
    } catch {
      setError(true);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const progress = status ? Math.round((status.stepsCompleted / status.totalSteps) * 100) : 0;

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede", href: "/escola/rede" }, { label: "Implantação" }]}
        title="Assistente de Implantação"
        subtitle="Siga os passos para colocar a rede em funcionamento."
        action={
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-[#DDD6EE] hover:border-[#C4B5FD] text-[#5B5470] hover:text-[#1F1A2E] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        }
      />

      <div className="px-7 py-6 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="text-[#5B5470] text-center py-16">Carregando…</div>
        ) : error || !status ? (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={26} className="text-[#B91C1C]" />
            </div>
            <h2 className="text-[16px] font-bold text-[#1F1A2E] mb-1">Não foi possível carregar a implantação.</h2>
            <p className="text-[14px] text-[#5B5470] mb-5">Tente novamente em instantes.</p>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            >
              <RefreshCw size={15} />
              Tentar de novo
            </button>
          </div>
        ) : (
          <>
            {/* Progresso */}
            <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#1F1A2E] font-semibold">{status.stepsCompleted} de {status.totalSteps} passos concluídos</span>
                <span className="text-[#5B5470] text-sm">{progress}%</span>
              </div>
              <div className="bg-[#EDE9FE] rounded-full h-3 overflow-hidden">
                <div className="bg-[#6D28D9] h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              {status.ready && (
                <div className="mt-3 flex items-center gap-2 text-[#166534] text-sm">
                  <CheckCircle2 size={16} />
                  <span>Rede pronta para uso em sala de aula!</span>
                </div>
              )}
            </div>

            {/* Passos */}
            <div className="space-y-3 mb-6">
              {status.steps.map((step) => {
                const state: "done" | "doing" | "todo" = step.done ? "done" : step.count > 0 ? "doing" : "todo";
                const circle =
                  state === "done" ? "bg-[#166534] text-white"
                  : state === "doing" ? "bg-[#6D28D9] text-white"
                  : "bg-[#FAF9FD] text-[#5B5470]";
                const border =
                  state === "done" ? "border-[#BBF7D0] bg-[#F0FDF4]"
                  : "border-[#E9E5F5] bg-white hover:border-[#C4B5FD] hover:bg-[#F5F3FF]";
                return (
                  <Link
                    key={step.step}
                    href={STEP_LINKS[step.step] ?? "#"}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors group ${border}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${circle}`}>
                      {state === "done" ? <CheckCircle2 size={20} /> : <span className="text-[15px] font-bold">{step.step}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#1F1A2E]">{step.label}</span>
                        {step.count > 0 && (
                          <span className="text-xs text-[#5B5470] bg-[#FAF9FD] border border-[#E9E5F5] px-2 py-0.5 rounded-full">
                            {step.count.toLocaleString("pt-BR")}
                          </span>
                        )}
                      </div>
                      <div className="text-[#5B5470] text-sm mt-0.5 truncate">{step.hint}</div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#6D28D9] shrink-0">
                      {STEP_CTA[step.step]} <ArrowRight size={13} />
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Revisão / pendências */}
            <div id="revisao" className="bg-white border border-[#E9E5F5] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-[#FAF9FD] border-b border-[#E9E5F5]">
                <span className="text-[13px] font-semibold text-[#1F1A2E]">Revisão final</span>
              </div>
              <div className="px-5 py-4">
                {status.canComplete ? (
                  <div className="flex items-center gap-2 text-[#166534] text-sm mb-4">
                    <CheckCircle2 size={16} />
                    <span>Nenhuma pendência crítica. A rede pode ser concluída.</span>
                  </div>
                ) : (
                  <ul className="space-y-1.5 text-sm mb-4">
                    {status.pending.schoolsWithoutDirector > 0 && (
                      <li className="text-[#92400E]">• {status.pending.schoolsWithoutDirector} escola{status.pending.schoolsWithoutDirector !== 1 ? "s" : ""} sem diretor</li>
                    )}
                    {status.pending.offersWithoutTeacher > 0 && (
                      <li className="text-[#92400E]">• {status.pending.offersWithoutTeacher} aula{status.pending.offersWithoutTeacher !== 1 ? "s" : ""} sem professor atribuído</li>
                    )}
                    {status.pending.studentsWithoutClass > 0 && (
                      <li className="text-[#92400E]">• {status.pending.studentsWithoutClass} aluno{status.pending.studentsWithoutClass !== 1 ? "s" : ""} sem turma</li>
                    )}
                    {status.pending.classesCount === 0 && (
                      <li className="text-[#92400E]">• Nenhuma turma criada</li>
                    )}
                    {status.pending.studentsCount === 0 && (
                      <li className="text-[#92400E]">• Nenhum aluno importado</li>
                    )}
                    {status.pending.invitesPending > 0 && (
                      <li className="text-[#5B5470]">• {status.pending.invitesPending} convite{status.pending.invitesPending !== 1 ? "s" : ""} de servidor pendente{status.pending.invitesPending !== 1 ? "s" : ""}</li>
                    )}
                    {status.pending.studentsWithoutGuardian > 0 && (
                      <li className="text-[#5B5470]">• {status.pending.studentsWithoutGuardian} aluno{status.pending.studentsWithoutGuardian !== 1 ? "s" : ""} sem responsável cadastrado</li>
                    )}
                  </ul>
                )}
                <Link
                  href={status.canComplete ? "/escola/rede" : "#revisao"}
                  aria-disabled={!status.canComplete}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] transition-colors ${
                    status.canComplete
                      ? "bg-[#6D28D9] hover:bg-[#5B21B6] text-white"
                      : "bg-[#EDE9FE] text-[#A79BC2] pointer-events-none"
                  }`}
                >
                  <Rocket size={15} />
                  Concluir implantação
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
