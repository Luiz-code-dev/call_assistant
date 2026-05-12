"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mic2, CheckCircle2 } from "lucide-react";

const SCENARIOS = [
  { id: "meeting",   emoji: "💼", title: "Reuniões internacionais",    desc: "Calls com times globais, stakeholders e parceiros",   focus: "Reuniões de Negócios" },
  { id: "interview", emoji: "🎯", title: "Entrevistas em inglês",      desc: "Processos seletivos técnicos e comportamentais",       focus: "Entrevistas Técnicas" },
  { id: "client",    emoji: "🤝", title: "Atendimento a clientes",     desc: "Calls de suporte, demos e negociações",              focus: "Vendas & Negociação" },
  { id: "travel",    emoji: "✈️", title: "Viagens e aeroporto",        desc: "Situações do cotidiano no exterior",                   focus: "Viagem & Turismo" },
  { id: "training",  emoji: "📚", title: "Treinamentos e workshops",   desc: "Webinars, cursos e apresentações em inglês",         focus: "Apresentações Públicas" },
  { id: "daily",     emoji: "💬", title: "Conversas do dia a dia",     desc: "Restaurantes, transporte, fornecedores",              focus: "Conversa do Dia a Dia" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]         = useState<"scenario" | "ready">("scenario");
  const [selected, setSelected] = useState<string[]>([]);

  function toggleScenario(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function finish() {
    try {
      localStorage.setItem("sf_onboarding_done", "1");
      const chosen = SCENARIOS.filter(s => selected.includes(s.id));
      if (chosen.length > 0) {
        localStorage.setItem("sf_live_focus", chosen[0].focus);
        const contextDesc = chosen.map(s => s.title).join(", ");
        localStorage.setItem("sf_live_context", contextDesc);
      }
    } catch {}
    router.replace("/live");
  }

  function skip() {
    try { localStorage.setItem("sf_onboarding_done", "1"); } catch {}
    router.replace("/home");
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-500/25">
            <span className="text-lg font-bold text-white">S</span>
          </div>
          <span className="text-xl font-medium text-zinc-400 tracking-tight">SpeakFlow</span>
        </div>

        {step === "scenario" && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                Em qual situação você mais precisa comunicar em inglês?
              </h1>
              <p className="text-zinc-400 text-sm">
                Selecione uma ou mais — vamos personalizar sua experiência.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-8">
              {SCENARIOS.map((s) => {
                const active = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleScenario(s.id)}
                    className={`relative flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-150 ${
                      active
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/50"
                    }`}
                  >
                    {active && (
                      <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-violet-400 shrink-0" />
                    )}
                    <span className="text-2xl shrink-0 mt-0.5">{s.emoji}</span>
                    <div>
                      <p className={`font-semibold text-sm ${active ? "text-white" : "text-zinc-200"}`}>{s.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => selected.length > 0 && setStep("ready")}
                disabled={selected.length === 0}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={skip} className="px-5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm transition-colors">
                Pular
              </button>
            </div>
          </>
        )}

        {step === "ready" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/30">
              <Mic2 className="h-9 w-9 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-3">Tudo pronto.</h1>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto mb-8">
              O <strong className="text-white">SpeakFlow Live</strong> vai escutar a conversa, traduzir em tempo real
              e sugerir respostas contextuais para as situações que você escolheu.
              <br /><br />
              Abra o app antes da sua próxima reunião, call ou entrevista.
            </p>

            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 mb-8 text-left space-y-2.5">
              {[
                "Ative o microfone quando solicitado",
                "O áudio é processado em tempo real via OpenAI Whisper",
                "Nenhum dado de áudio é armazenado — apenas a transcrição",
              ].map((t) => (
                <div key={t} className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  {t}
                </div>
              ))}
            </div>

            <button
              onClick={finish}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-4 text-base transition-colors shadow-lg shadow-violet-500/30"
            >
              <Mic2 className="h-5 w-5" /> Abrir SpeakFlow Live
            </button>

            <button onClick={skip} className="mt-4 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Ver o dashboard primeiro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
