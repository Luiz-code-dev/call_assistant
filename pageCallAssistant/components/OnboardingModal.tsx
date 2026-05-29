"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronRight, ChevronLeft, Wand2, Mic2, Users, Zap } from "lucide-react";

const LEVELS = [
  { value: "A1", label: "A1", desc: "Conheço palavras básicas" },
  { value: "A2", label: "A2", desc: "Consigo frases simples" },
  { value: "B1", label: "B1", desc: "Me viro em conversas" },
  { value: "B2", label: "B2", desc: "Trabalho com inglês mas travo às vezes" },
  { value: "C1", label: "C1", desc: "Inglês fluente, quero refinar" },
];

const FEATURES = [
  {
    icon: Wand2,
    color: "from-emerald-500 to-teal-500",
    title: "Ferramentas de IA",
    desc: "Melhore textos, gere respostas e simule entrevistas com IA",
  },
  {
    icon: Mic2,
    color: "from-violet-600 to-indigo-600",
    title: "SpeakFlow Live",
    desc: "Copiloto em tempo real durante suas calls em inglês",
  },
  {
    icon: Users,
    color: "from-amber-500 to-orange-500",
    title: "Circles",
    desc: "Grupos de prática com desafios semanais",
  },
];

function getRecommendation(level: string | null) {
  if (!level || level === "A1" || level === "A2") {
    return { label: "Comece melhorando um texto", href: "/tools/improve" };
  }
  if (level === "B1" || level === "B2") {
    return { label: "Tente simular uma entrevista", href: "/tools/interview" };
  }
  return { label: "Ative o Live na sua próxima call", href: "/live" };
}

interface Props {
  userName: string;
  credits: number;
  onClose: () => void;
}

export default function OnboardingModal({ userName, credits, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState<string | null>(null);
  const [featureIdx, setFeatureIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  async function complete() {
    try {
      const sfToken = sessionStorage.getItem("sf_token") ?? "";
      await fetch("/api/auth/onboarding-complete", {
        method: "PATCH",
        headers: sfToken ? { Authorization: `Bearer ${sfToken}` } : {},
      });
      if (level) {
        try { localStorage.setItem("sf_onboarding_level", level); } catch {}
      }
    } catch {}
  }

  async function handleClose() {
    await complete();
    setVisible(false);
    setTimeout(() => onClose(), 300);
  }

  async function handleCTA(href: string) {
    await complete();
    setVisible(false);
    setTimeout(() => { onClose(); router.push(href); }, 300);
  }

  const rec = getRecommendation(level);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300
        ${visible ? "opacity-100" : "opacity-0 translate-y-4"}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className={`relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60
        transition-all duration-300 ${visible ? "scale-100" : "scale-95"}`}>

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-6 pb-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`rounded-full transition-all duration-300 ${
                s === step ? "w-6 h-2 bg-violet-500" : s < step ? "w-2 h-2 bg-violet-500/40" : "w-2 h-2 bg-zinc-700"
              }`}
            />
          ))}
        </div>

        <div className="px-6 pb-6 pt-4 min-h-[340px] flex flex-col">

          {/* ── Step 1: Boas-vindas ── */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center flex-1 justify-center gap-4">
              <div className="text-5xl">🎉</div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Bem-vindo ao SpeakFlow, {userName.split(" ")[0]}!
                </h2>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  Você está a um passo de evoluir seu inglês profissional com IA.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
                <Zap className="size-4 text-violet-400 shrink-0" />
                <span className="text-sm text-violet-300 font-medium">
                  Você recebeu <strong>{credits} créditos</strong> para começar
                </span>
              </div>
              <button
                onClick={() => setStep(2)}
                className="mt-2 w-full rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
              >
                Começar →
              </button>
            </div>
          )}

          {/* ── Step 2: Nível ── */}
          {step === 2 && (
            <div className="flex flex-col flex-1 gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Me conta sobre seu inglês</h2>
                <p className="text-sm text-zinc-500 mt-1">Qual nível te descreve melhor hoje?</p>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all
                      ${level === l.value
                        ? "border-violet-500 bg-violet-500/15 text-white"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-white"}`}
                  >
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold
                      ${level === l.value ? "bg-violet-500 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                      {l.label}
                    </span>
                    <span className="text-sm">{l.desc}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 px-4 py-2.5 text-sm text-zinc-500 hover:text-white transition-colors">
                  <ChevronLeft className="size-4" /> Voltar
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!level}
                  className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Tour ── */}
          {step === 3 && (
            <div className="flex flex-col flex-1 gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">O que você vai encontrar</h2>
                <p className="text-sm text-zinc-500 mt-1">Toque para explorar cada ferramenta</p>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {FEATURES.map((f, i) => (
                  <button
                    key={f.title}
                    onClick={() => setFeatureIdx(i)}
                    className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all
                      ${featureIdx === i ? "border-violet-500/50 bg-violet-500/10" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"}`}
                  >
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${f.color}`}>
                      <f.icon className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{f.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {/* Dots */}
              <div className="flex justify-center gap-1.5">
                {FEATURES.map((_, i) => (
                  <button key={i} onClick={() => setFeatureIdx(i)}
                    className={`rounded-full transition-all ${i === featureIdx ? "w-4 h-2 bg-violet-500" : "w-2 h-2 bg-zinc-700"}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 px-4 py-2.5 text-sm text-zinc-500 hover:text-white transition-colors">
                  <ChevronLeft className="size-4" /> Voltar
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  Entendi <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Primeira ação ── */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center flex-1 justify-center gap-5">
              <div className="text-4xl">🚀</div>
              <div>
                <h2 className="text-lg font-bold text-white">Pronto para começar!</h2>
                <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
                  Com base no seu nível, aqui está a melhor primeira ação:
                </p>
              </div>
              <div className="w-full rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                <p className="text-xs text-violet-400 uppercase tracking-wider font-semibold mb-1">Recomendado para você</p>
                <p className="text-base font-semibold text-white">{rec.label}</p>
              </div>
              <button
                onClick={() => handleCTA(rec.href)}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-violet-500/25"
              >
                {rec.label} →
              </button>
              <button
                onClick={handleClose}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Explorar por conta própria
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
