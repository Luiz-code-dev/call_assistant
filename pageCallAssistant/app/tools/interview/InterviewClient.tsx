"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Mic2, ArrowLeft, Send, Loader2, Zap, Star, RotateCcw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function InterviewClient({ userPlan, credits: initialCredits }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [credits, setCredits] = useState(initialCredits);
  const [summary, setSummary] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const isPremium = userPlan === "premium";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function callAPI(
    msgHistory: { role: "user" | "assistant"; content: string }[],
    userMessage: string,
    isStart: boolean
  ): Promise<AITurn | null> {
    const sfToken = typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
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
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Erro ao processar.");
      return null;
    }
    return data as AITurn;
  }

  async function handleStart() {
    setLoading(true);
    try {
      const ai = await callAPI([], "", true);
      if (!ai) return;
      const aiMsg: Message = { role: "assistant", content: ai.question, aiData: ai };
      setMessages([aiMsg]);
      setStarted(true);
    } catch { toast.error("Erro de conexão."); }
    finally { setLoading(false); }
  }

  async function handleSend() {
    if (!userInput.trim()) return;
    if (credits < 2) { toast.error("Créditos insuficientes."); return; }

    const userMsg: Message = { role: "user", content: userInput.trim() };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const newHistory = [...history, { role: "user" as const, content: userInput.trim() }];

    setMessages((prev) => [...prev, userMsg]);
    setUserInput("");
    setLoading(true);

    try {
      const ai = await callAPI(history, userInput.trim(), false);
      if (!ai) return;
      setCredits((c) => c - 2);
      const aiMsg: Message = { role: "assistant", content: ai.question, aiData: ai };
      setMessages((prev) => [...prev, aiMsg]);
      if (ai.isFinished) {
        setFinished(true);
        setSummary(ai.summary ?? "");
      }
    } catch { toast.error("Erro de conexão."); }
    finally { setLoading(false); }
  }

  function handleReset() {
    setMessages([]);
    setStarted(false);
    setFinished(false);
    setSummary("");
    setUserInput("");
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b border-border/50 bg-card/50 px-6 py-4 shrink-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tools" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10">
              <Mic2 className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Treino de Entrevista</h1>
              <p className="text-xs text-muted-foreground">
                {isPremium ? "Ilimitado" : "Até 3 sessões por dia"} · 2 créditos/resposta
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <Zap className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-sm font-medium">{credits}</span>
            </div>
            {started && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <RotateCcw className="h-3 w-3" /> Nova sessão
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {!started && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
                <Mic2 className="h-8 w-8 text-violet-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Pronto para treinar?</h2>
                <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                  A IA irá simular um entrevistador técnico em inglês. Você responde, ela avalia, corrige e sugere melhorias em tempo real.
                </p>
              </div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>📝 8 perguntas por sessão</p>
                <p>⚡ 2 créditos por resposta</p>
                <p>🎯 Feedback em português</p>
              </div>
              <Button onClick={handleStart} variant="gradient" size="lg" disabled={credits < 2}>
                <Mic2 className="mr-2 h-4 w-4" />
                Iniciar entrevista
              </Button>
              {credits < 2 && (
                <p className="text-xs text-red-400">
                  Créditos insuficientes.{" "}
                  <Link href="/usage" className="underline">Recarregar</Link>
                </p>
              )}
            </div>
          )}

          {loading && !started && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className="space-y-3">
              {msg.role === "assistant" && (
                <div className="space-y-3">
                  {idx > 0 && msg.aiData?.feedback && (
                    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2 ml-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feedback da IA</p>
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
                            <button onClick={() => navigator.clipboard.writeText(msg.aiData!.suggestion)} className="text-xs text-muted-foreground hover:text-foreground">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-sm leading-relaxed">{msg.aiData.suggestion}</p>
                        </div>
                      )}
                      {msg.aiData.tip && (
                        <p className="text-xs text-violet-400">💡 {msg.aiData.tip}</p>
                      )}
                    </div>
                  )}

                  {!finished && msg.aiData?.question && (
                    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
                      <p className="text-xs font-medium text-violet-400 mb-1">🎤 Entrevistador</p>
                      <p className="text-sm font-medium leading-relaxed">{msg.aiData.question}</p>
                    </div>
                  )}
                </div>
              )}

              {msg.role === "user" && (
                <div className="flex justify-end">
                  <div className="rounded-xl bg-secondary px-4 py-2.5 text-sm max-w-[80%]">
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && started && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              <span className="text-sm">Analisando sua resposta...</span>
            </div>
          )}

          {finished && summary && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6 space-y-3">
              <h3 className="font-semibold text-violet-400">🏆 Avaliação final da sessão</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
              <Button variant="outline" className="w-full" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Começar nova entrevista
              </Button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {started && !finished && (
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
              className="flex h-full items-center justify-center rounded-xl bg-violet-600 px-4 text-white hover:bg-violet-700 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
