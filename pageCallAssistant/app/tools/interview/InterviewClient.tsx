"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Mic2, ArrowLeft, Send, Loader2, Zap, Star,
  RotateCcw, Copy, Volume2, VolumeX, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface InterviewSetup {
  role: string;
  level: string;
  stack: string;
  interviewType: string;
}

interface AITurn {
  question: string;
  feedback: string;
  suggestion: string;
  score: number;
  tip: string;
  isFinished?: boolean;
  summary?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  aiData?: AITurn;
}

interface Props {
  userPlan: string;
  credits: number;
}

const LEVELS = ["Júnior", "Pleno", "Sênior", "Lead / Principal"];
const INTERVIEW_TYPES = ["Técnica", "Comportamental", "Mista (técnica + comportamental)"];

function speakText(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 0.95;
  utter.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(
    (v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Female"))
  ) ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
  if (enVoice) utter.voice = enVoice;
  window.speechSynthesis.speak(utter);
}

export default function InterviewClient({ userPlan, credits: initialCredits }: Props) {
  const [phase, setPhase] = useState<"setup" | "interview">("setup");
  const [setup, setSetup] = useState<InterviewSetup>({
    role: "",
    level: "Pleno",
    stack: "",
    interviewType: "Mista (técnica + comportamental)",
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [credits, setCredits] = useState(initialCredits);
  const [summary, setSummary] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isPremium = userPlan === "premium";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pre-load voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const callAPI = useCallback(async (
    msgHistory: { role: "user" | "assistant"; content: string }[],
    userMessage: string,
    isStart: boolean
  ): Promise<AITurn | null> => {
    const sfToken = sessionStorage.getItem("sf_token");
    const res = await fetch("/api/tools/interview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sfToken ? { Authorization: `Bearer ${sfToken}` } : {}),
      },
      body: JSON.stringify({
        messages: msgHistory,
        message: userMessage,
        isStart,
        setup: {
          role: setup.role || "Software Developer",
          level: setup.level,
          stack: setup.stack || "General",
          interviewType: setup.interviewType,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Erro ao processar."); return null; }
    return data as AITurn;
  }, [setup]);

  async function handleStart() {
    if (!setup.role.trim()) { toast.error("Informe a vaga/cargo desejado."); return; }
    setLoading(true);
    try {
      const ai = await callAPI([], "", true);
      if (!ai) return;
      const aiMsg: Message = { role: "assistant", content: ai.question, aiData: ai };
      setMessages([aiMsg]);
      setPhase("interview");
      if (audioEnabled && ai.question) speakText(ai.question);
    } catch { toast.error("Erro de conexão."); }
    finally { setLoading(false); }
  }

  async function handleSend() {
    if (!userInput.trim()) return;
    if (credits < 2) { toast.error("Créditos insuficientes."); return; }
    const userMsg: Message = { role: "user", content: userInput.trim() };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setUserInput("");
    setLoading(true);
    try {
      const ai = await callAPI(history, userInput.trim(), false);
      if (!ai) return;
      setCredits((c) => c - 2);
      const aiMsg: Message = { role: "assistant", content: ai.question, aiData: ai };
      setMessages((prev) => [...prev, aiMsg]);
      if (audioEnabled && ai.question && !ai.isFinished) speakText(ai.question);
      if (ai.isFinished) { setFinished(true); setSummary(ai.summary ?? ""); }
    } catch { toast.error("Erro de conexão."); }
    finally { setLoading(false); }
  }

  function handleReset() {
    window.speechSynthesis?.cancel();
    setMessages([]);
    setPhase("setup");
    setFinished(false);
    setSummary("");
    setUserInput("");
    setSetup({ role: "", level: "Pleno", stack: "", interviewType: "Mista (técnica + comportamental)" });
  }

  const inputClass = "w-full rounded-xl border border-border/50 bg-background px-4 py-2.5 text-sm outline-none focus:border-violet-500/50 transition-colors";
  const selectClass = `${inputClass} cursor-pointer`;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 px-6 py-4 shrink-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tools" onClick={() => window.speechSynthesis?.cancel()}
              className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10">
              <Mic2 className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Treino de Entrevista</h1>
              <p className="text-xs text-muted-foreground">
                {isPremium ? "Ilimitado" : "Até 3 sessões/dia"} · 2 créditos/resposta
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAudioEnabled((v) => !v); window.speechSynthesis?.cancel(); }}
              title={audioEnabled ? "Desativar áudio" : "Ativar áudio"}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${audioEnabled ? "border-violet-500/40 bg-violet-500/10 text-violet-400" : "border-border/50 text-muted-foreground"}`}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <Zap className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-sm font-medium">{credits}</span>
            </div>
            {phase === "interview" && (
              <button onClick={handleReset}
                className="flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <RotateCcw className="h-3 w-3" /> Nova sessão
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-4">

          {/* ── SETUP PHASE ── */}
          {phase === "setup" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
                    <Mic2 className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="font-bold">Configure sua entrevista</h2>
                    <p className="text-xs text-muted-foreground">A IA vai personalizar as perguntas para o seu perfil</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Vaga / Cargo desejado <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={setup.role}
                      onChange={(e) => setSetup((s) => ({ ...s, role: e.target.value }))}
                      placeholder="Ex: Desenvolvedor Backend Java, Frontend React, DevOps..."
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nível de senioridade</label>
                    <select value={setup.level} onChange={(e) => setSetup((s) => ({ ...s, level: e.target.value }))}
                      className={selectClass}>
                      {LEVELS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tipo de entrevista</label>
                    <select value={setup.interviewType} onChange={(e) => setSetup((s) => ({ ...s, interviewType: e.target.value }))}
                      className={selectClass}>
                      {INTERVIEW_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Tecnologias principais <span className="text-muted-foreground/60">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={setup.stack}
                      onChange={(e) => setSetup((s) => ({ ...s, stack: e.target.value }))}
                      placeholder="Ex: Java, Spring Boot, AWS, Kubernetes..."
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-background/50 px-4 py-3">
                  <button onClick={() => setAudioEnabled((v) => !v)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all ${audioEnabled ? "border-violet-500/40 bg-violet-500/10 text-violet-400" : "border-border/50 text-muted-foreground"}`}>
                    {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium">{audioEnabled ? "Áudio ativado" : "Áudio desativado"}</p>
                    <p className="text-xs text-muted-foreground">O entrevistador vai ler as perguntas em inglês</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-xs text-muted-foreground bg-background/50 rounded-xl p-3 border border-border/30">
                  <p>📝 8 perguntas por sessão</p>
                  <p>⚡ 2 créditos por resposta (16 créditos no total)</p>
                  <p>🎯 Feedback detalhado em português</p>
                </div>
              </div>

              <Button onClick={handleStart} variant="gradient" size="lg" className="w-full"
                disabled={loading || !setup.role.trim() || credits < 2}>
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparando entrevista...</>
                  : <><ChevronRight className="mr-2 h-4 w-4" />Iniciar entrevista</>}
              </Button>
              {credits < 2 && (
                <p className="text-center text-xs text-red-400">
                  Créditos insuficientes. <Link href="/usage" className="underline">Recarregar</Link>
                </p>
              )}
            </div>
          )}

          {/* ── INTERVIEW PHASE ── */}
          {phase === "interview" && (
            <>
              {setup.role && (
                <div className="flex items-center gap-2 rounded-xl bg-secondary/40 px-4 py-2 text-xs text-muted-foreground">
                  <Mic2 className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  <span><strong className="text-foreground">{setup.role}</strong> · {setup.level} · {setup.interviewType}</span>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className="space-y-3">
                  {msg.role === "assistant" && (
                    <div className="space-y-3">
                      {idx > 0 && msg.aiData?.feedback && (
                        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2 ml-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feedback</p>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < Math.round((msg.aiData!.score ?? 0) / 2) ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
                              ))}
                              <span className="ml-1 text-xs font-bold text-yellow-400">{msg.aiData?.score}/10</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{msg.aiData.feedback}</p>
                          {msg.aiData.suggestion && (
                            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium text-green-400">✓ Como poderia responder</p>
                                <button onClick={() => navigator.clipboard.writeText(msg.aiData!.suggestion)}
                                  className="text-muted-foreground hover:text-foreground transition-colors">
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-sm leading-relaxed">{msg.aiData.suggestion}</p>
                            </div>
                          )}
                          {msg.aiData.tip && <p className="text-xs text-violet-400">💡 {msg.aiData.tip}</p>}
                        </div>
                      )}
                      {!finished && msg.aiData?.question && (
                        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-violet-400">🎤 Entrevistador</p>
                            <button onClick={() => speakText(msg.aiData!.question)}
                              title="Ouvir novamente"
                              className="text-muted-foreground hover:text-violet-400 transition-colors">
                              <Volume2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-sm font-medium leading-relaxed">{msg.aiData.question}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {msg.role === "user" && (
                    <div className="flex justify-end">
                      <div className="rounded-xl bg-secondary px-4 py-2.5 text-sm max-w-[80%]">{msg.content}</div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  <span className="text-sm">Analisando sua resposta...</span>
                </div>
              )}

              {finished && summary && (
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6 space-y-3">
                  <h3 className="font-semibold text-violet-400">🏆 Avaliação final</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
                  <Button variant="outline" className="w-full" onClick={handleReset}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Nova entrevista
                  </Button>
                </div>
              )}
            </>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input footer — only during interview */}
      {phase === "interview" && !finished && (
        <footer className="border-t border-border/50 bg-card/50 px-6 py-4 shrink-0">
          <div className="mx-auto flex max-w-3xl gap-3">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Digite sua resposta em inglês... (Enter para enviar)"
              rows={2}
              disabled={loading}
              className="flex-1 rounded-xl border border-border/50 bg-background px-4 py-2.5 text-sm outline-none focus:border-violet-500/50 transition-colors resize-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !userInput.trim() || credits < 2}
              className="flex items-center justify-center rounded-xl bg-violet-600 px-4 text-white hover:bg-violet-700 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
