"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Wand2, ArrowLeft, Copy, Check, Loader2, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImproveResult {
  improved: string;
  score: number;
  explanation: string;
  tips: string[];
  creditsUsed: number;
  dailyUsed?: number;
  dailyLimit?: number;
}

interface Props {
  userPlan: string;
  credits: number;
}

export default function ImproveClient({ userPlan, credits: initialCredits }: Props) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImproveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(initialCredits);
  const [copied, setCopied] = useState(false);

  const isPremium = userPlan === "premium";
  const maxDaily = isPremium ? null : 5;

  async function handleImprove() {
    if (!text.trim()) { toast.error("Digite um texto para melhorar."); return; }
    setLoading(true);
    setResult(null);
    try {
      const sfToken = typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
      const res = await fetch("/api/tools/improve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sfToken ? { Authorization: `Bearer ${sfToken}` } : {}),
        },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao processar.");
        return;
      }
      setResult(data);
      setCredits((c) => c - (data.creditsUsed ?? 2));
      toast.success("Texto melhorado com sucesso!");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result?.improved) return;
    await navigator.clipboard.writeText(result.improved);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copiado!");
  }

  const scoreColor =
    !result ? "" :
    result.score >= 8 ? "text-green-400" :
    result.score >= 5 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tools" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10">
              <Wand2 className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Melhorar Resposta</h1>
              <p className="text-xs text-muted-foreground">
                {isPremium ? "Ilimitado" : `Até ${maxDaily}x por dia`}
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
            <label className="block text-sm font-medium mb-2">Seu texto em inglês</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ex: I worked in the project and did many things that helped the team..."
              rows={5}
              maxLength={2000}
              className="w-full rounded-xl border border-border/50 bg-background px-4 py-3 text-sm outline-none focus:border-violet-500/50 transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">{text.length}/2000</p>
          </div>
          <Button
            onClick={handleImprove}
            disabled={loading || !text.trim() || credits < 2}
            variant="gradient"
            className="w-full"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analisando...</>
            ) : (
              <><Wand2 className="mr-2 h-4 w-4" />Melhorar texto — 2 créditos</>
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
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-green-400">✓ Versão melhorada</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < Math.round(result.score / 2) ? "fill-yellow-400 text-yellow-400" : "text-border"}`}
                      />
                    ))}
                    <span className={`ml-1 text-xs font-bold ${scoreColor}`}>{result.score}/10</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1 text-xs hover:bg-secondary transition-all"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
              <p className="text-sm leading-relaxed">{result.improved}</p>
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
              <h4 className="text-sm font-semibold">📝 O que foi melhorado</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
            </div>

            {result.tips?.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-5 space-y-2">
                <h4 className="text-sm font-semibold">💡 Dicas para melhorar</h4>
                <ul className="space-y-1.5">
                  {result.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 text-violet-400">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setResult(null); setText(""); }}
            >
              Analisar outro texto
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
