"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic2, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erro ao enviar e-mail");
      }
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar e-mail");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.1),transparent)]" />

      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
          <Mic2 className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-semibold">Call Assistant</span>
      </Link>

      <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur">
        {!sent ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Esqueceu a senha?</CardTitle>
              <CardDescription>
                Digite seu e-mail e enviaremos um link de redefinição
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? "Enviando..." : "Enviar link de redefinição"}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <CardHeader className="text-center py-8">
            <MailCheck className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
            <CardTitle className="text-2xl">E-mail enviado!</CardTitle>
            <CardDescription className="mt-2">
              Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para redefinir sua senha.
            </CardDescription>
          </CardHeader>
        )}
        <CardFooter className="justify-center">
          <Link href="/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
