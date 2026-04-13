"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MessageSquarePlus, ArrowLeft, Copy, Check, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerateResult {
  short: string;
  professional: string;
  detailed: string;
  translation: string;
  usage_tip: string;
  creditsUsed: number;
}

interface Props {
  userPlan: string;
  credits: number;
}

const RESPONSE_STYLES = [
  { key: "short",        label: "⚡ Curta",         color: "text-cyan-400",   borderColor: "border-cyan-500/30",   bg: "bg-cyan-500/5"  },
  { key: "professional", label: "💼 Profissional",  color: "text-violet-400", borderColor: "border-violet-500/30", bg: "bg-violet-500/5" },
  { key: "detailed",     label: "📋 Detalhada",     color: "text-emerald-400",borderColor: "border-emerald-500/30",bg: "bg-emerald-500/5"},
] as const;

export default function GenerateClient({ userPlan, credits: initialCredits }: Props) {
  const [context, setContext] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(initialCredits);
  const [copied, setCopied] = useState<string | null>(null);

  const isPremium = userPlan === "premium";

  async function handleGenerate() {
    if (!context.trim()) { toast.error("Descreva a situação primeiro."); return; }
    setLoading(true);
    setResult(null);
    try {
      const sfToken = typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sfToken ? { Authorization: `Bearer ${sfToken}` } : {}),
        },
        body: JSON.stringify({ context: context.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao processar.");
        return;
      }
      setResult(data);
      setCredits((c) => c - (data.creditsUsed ?? 2));
      toast.success("Respostas geradas!");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copiado!");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tools" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10">
              <MessageSquarePlus className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Gerar Resposta</h1>
              <p className="text-xs text-muted-foreground">
                {isPremium ? "Ilimitado" : "Até 5x por dia"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
            <Zap className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-sm font-medium">{credits} créditos</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Descreva a situação em português
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder='Ex: "Meu gerente perguntou sobre minha experiência com microsserviços" ou "Preciso responder um e-mail explicando um atraso no projeto"'
              rows={4}
              maxLength={1000}
              className="w-full rounded-xl border border-border/50 bg-background px-4 py-3 text-sm outline-none focus:border-violet-500/50 transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">{context.length}/1000</p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading || !context.trim() || credits < 2}
            variant="gradient"
            className="w-full"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando respostas...</>
            ) : (
              <><MessageSquarePlus className="mr-2 h-4 w-4" />Gerar respostas — 2 créditos</>
            )}
          </Button>
          {credits < 2 && (
            <p className="text-center text-xs text-red-400">
              Créditos insuficientes.{" "}
              <Link href="/usage" className="underline hover:text-red-300">Recarregar</Link>
            </p>
          )}
        </div>

        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold">3 versões prontas para usar</h3>

            {RESPONSE_STYLES.map(({ key, label, color, borderColor, bg }) => {
              const text = result[key as keyof GenerateResult] as string;
              return (
                <div key={key} className={`rounded-xl border ${borderColor} ${bg} p-5 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${color}`}>{label}</span>
                    <button
                      onClick={() => handleCopy(key, text)}
                      className="flex items-center gap-1 rounded-lg border border-border/50 bg-background/50 px-2.5 py-1 text-xs hover:bg-background transition-all"
                    >
                      {copied === key ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                      {copied === key ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed">{text}</p>
                </div>
              );
            })}

            {result.translation && (
              <div className="rounded-xl border border-border/30 bg-secondary/30 p-5">
                <p className="mb-1 text-xs font-medium text-muted-foreground">🌐 Tradução (versão profissional)</p>
                <p className="text-sm leading-relaxed text-muted-foreground italic">{result.translation}</p>
              </div>
            )}

            {result.usage_tip && (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                <p className="text-xs font-medium text-yellow-400 mb-1">💡 Dica de uso</p>
                <p className="text-sm text-muted-foreground">{result.usage_tip}</p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setResult(null); setContext(""); }}
            >
              Gerar outra resposta
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
