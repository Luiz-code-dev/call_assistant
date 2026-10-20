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
        <h1 className="text-2xl font-bold text-white">Assistente de Implantação</h1>
        <p className="text-gray-400 text-sm mt-1">Siga os passos para colocar a rede em funcionamento.</p>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-12">Carregando...</div>
      ) : !status ? (
        <div className="text-red-400 text-center py-12">Erro ao carregar status.</div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold">{status.stepsCompleted} de {status.totalSteps} passos concluídos</span>
              <span className="text-gray-400 text-sm">{progress}%</span>
            </div>
            <div className="bg-gray-800 rounded-full h-3">
              <div className="bg-purple-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {status.ready && (
              <div className="mt-3 flex items-center gap-2 text-green-400 text-sm"><span>✅</span><span>Rede pronta para uso em sala de aula!</span></div>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {status.steps.map(step => (
              <a key={step.step} href={STEP_LINKS[step.step] ?? "#"}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer group ${step.done ? "bg-green-900/20 border-green-800 hover:bg-green-900/30" : "bg-gray-900 border-gray-800 hover:bg-gray-800"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${step.done ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 group-hover:bg-gray-700"}`}>
                  {step.done ? "✓" : step.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold ${step.done ? "text-green-300" : "text-white"}`}>{step.label}</span>
                    {step.count > 0 && <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{step.count.toLocaleString("pt-BR")}</span>}
                  </div>
                  <div className="text-gray-500 text-sm mt-0.5 truncate">{step.hint}</div>
                </div>
                <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
              </a>
            ))}
          </div>

          {/* Pending issues */}
          {!status.ready && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-5">
              <h2 className="text-yellow-300 font-semibold mb-3">⚠️ Pendências antes de liberar</h2>
              <ul className="space-y-1.5 text-sm">
                {status.pending.schoolsWithoutDirector > 0 && (
                  <li className="text-yellow-400">• {status.pending.schoolsWithoutDirector} escola{status.pending.schoolsWithoutDirector !== 1 ? "s" : ""} sem diretor</li>
                )}
                {status.pending.offersWithoutTeacher > 0 && (
                  <li className="text-yellow-400">• {status.pending.offersWithoutTeacher} aula{status.pending.offersWithoutTeacher !== 1 ? "s" : ""} sem professor atribuído</li>
                )}
                {status.pending.invitesPending > 0 && (
                  <li className="text-yellow-400">• {status.pending.invitesPending} convite{status.pending.invitesPending !== 1 ? "s" : ""} de servidor pendente{status.pending.invitesPending !== 1 ? "s" : ""}</li>
                )}
                {status.pending.studentsCount === 0 && (
                  <li className="text-yellow-400">• Nenhum aluno importado</li>
                )}
                {status.pending.classesCount === 0 && (
                  <li className="text-yellow-400">• Nenhuma turma criada</li>
                )}
              </ul>
            </div>
          )}

          <div className="mt-4 text-right">
            <button onClick={load} className="text-gray-500 hover:text-gray-400 text-sm min-h-[44px] transition-colors">↻ Atualizar</button>
          </div>
        </>
      )}
    </div>
  );
}
