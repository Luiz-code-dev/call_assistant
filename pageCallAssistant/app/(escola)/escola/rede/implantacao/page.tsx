"use client";
import { useEffect, useState } from "react";

interface Step {
  step: number; label: string; done: boolean; count: number; hint: string;
}
interface Status {
  steps: Step[]; stepsCompleted: number; totalSteps: number; ready: boolean;
  pending: { schoolsWithoutDirector: number; offersWithoutTeacher: number; invitesPending: number; studentsCount: number; classesCount: number };
}

const STEP_LINKS: Record<number, string> = {
  1: "/escola/rede/escolas",
  2: "/escola/rede/anos-letivos",
  3: "/escola/rede/componentes",
  4: "/escola/rede/vinculos",
  5: "/escola/rede/importacoes",
  6: "/escola/direcao/atribuicoes",
  7: "/escola/rede/importacoes",
};

export default function ImplantacaoPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/escola/implantacao/status");
    if (r.ok) setStatus(await r.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const progress = status ? Math.round((status.stepsCompleted / status.totalSteps) * 100) : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1F1A2E]">Assistente de Implantação</h1>
        <p className="text-[#5B5470] text-sm mt-1">Siga os passos para colocar a rede em funcionamento.</p>
      </div>

      {loading ? (
        <div className="text-[#5B5470] text-center py-12">Carregando...</div>
      ) : !status ? (
        <div className="text-[#B91C1C] text-center py-12">Erro ao carregar status.</div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="bg-white border border-[#E9E5F5] rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#1F1A2E] font-semibold">{status.stepsCompleted} de {status.totalSteps} passos concluídos</span>
              <span className="text-[#5B5470] text-sm">{progress}%</span>
            </div>
            <div className="bg-[#FAF9FD] rounded-full h-3">
              <div className="bg-purple-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {status.ready && (
              <div className="mt-3 flex items-center gap-2 text-[#166534] text-sm"><span>✅</span><span>Rede pronta para uso em sala de aula!</span></div>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {status.steps.map(step => (
              <a key={step.step} href={STEP_LINKS[step.step] ?? "#"}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer group ${step.done ? "bg-[#DCFCE7] border-green-800 hover:bg-[#DCFCE7]" : "bg-white border-[#E9E5F5] hover:bg-[#F5F3FF]"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${step.done ? "bg-green-600 text-white" : "bg-[#FAF9FD] text-[#5B5470] group-hover:bg-[#F5F3FF]"}`}>
                  {step.done ? "✓" : step.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold ${step.done ? "text-green-300" : "text-[#1F1A2E]"}`}>{step.label}</span>
                    {step.count > 0 && <span className="text-xs text-[#5B5470] bg-[#FAF9FD] px-2 py-0.5 rounded-full">{step.count.toLocaleString("pt-BR")}</span>}
                  </div>
                  <div className="text-[#5B5470] text-sm mt-0.5 truncate">{step.hint}</div>
                </div>
                <span className="text-[#5B5470] group-hover:text-[#5B5470] transition-colors">→</span>
              </a>
            ))}
          </div>

          {/* Pending issues */}
          {!status.ready && (
            <div className="bg-[#FEF3C7] border border-yellow-800 rounded-xl p-5">
              <h2 className="text-yellow-300 font-semibold mb-3">⚠️ Pendências antes de liberar</h2>
              <ul className="space-y-1.5 text-sm">
                {status.pending.schoolsWithoutDirector > 0 && (
                  <li className="text-[#92400E]">• {status.pending.schoolsWithoutDirector} escola{status.pending.schoolsWithoutDirector !== 1 ? "s" : ""} sem diretor</li>
                )}
                {status.pending.offersWithoutTeacher > 0 && (
                  <li className="text-[#92400E]">• {status.pending.offersWithoutTeacher} aula{status.pending.offersWithoutTeacher !== 1 ? "s" : ""} sem professor atribuído</li>
                )}
                {status.pending.invitesPending > 0 && (
                  <li className="text-[#92400E]">• {status.pending.invitesPending} convite{status.pending.invitesPending !== 1 ? "s" : ""} de servidor pendente{status.pending.invitesPending !== 1 ? "s" : ""}</li>
                )}
                {status.pending.studentsCount === 0 && (
                  <li className="text-[#92400E]">• Nenhum aluno importado</li>
                )}
                {status.pending.classesCount === 0 && (
                  <li className="text-[#92400E]">• Nenhuma turma criada</li>
                )}
              </ul>
            </div>
          )}

          <div className="mt-4 text-right">
            <button onClick={load} className="text-[#5B5470] hover:text-[#5B5470] text-sm min-h-[44px] transition-colors">↻ Atualizar</button>
          </div>
        </>
      )}
    </div>
  );
}
