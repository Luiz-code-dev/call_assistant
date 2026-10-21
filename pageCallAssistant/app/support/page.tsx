"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Send, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SupportPage() {
  const [form, setForm] = useState({ name: "", email: "", question: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.question.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setSending(true);
    try {
      const r = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        setSent(true);
      } else {
        toast.error("Erro ao enviar. Tente novamente.");
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/home"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Suporte</h1>
            <p className="text-xs text-muted-foreground">Fale com nossa equipe</p>
          </div>
        </div>

        {sent ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              <div>
                <p className="text-lg font-bold">Mensagem enviada!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Recebemos sua dúvida e responderemos em breve no e-mail informado.
                </p>
              </div>
              <Button asChild className="mt-2 bg-violet-600 hover:bg-violet-500">
                <Link href="/home">Voltar para o início</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-violet-400" />
                Enviar mensagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Seu nome"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">E-mail *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="seu@email.com"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Mensagem *</label>
                  <textarea
                    value={form.question}
                    onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
                    placeholder="Descreva sua dúvida ou problema..."
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-violet-600 hover:bg-violet-500"
                >
                  {sending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando…</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" />Enviar mensagem</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-muted-foreground">
          Você também pode nos contatar pelo e-mail{" "}
          <a href="mailto:suporte@speakf.com.br" className="text-violet-400 hover:underline">
            suporte@speakf.com.br
          </a>
        </div>
      </div>
    </div>
  );
}
