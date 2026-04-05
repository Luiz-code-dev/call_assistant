"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic2, Loader2, Eye, EyeOff, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres"); return; }
    if (!acceptedTerms || !acceptedPrivacy) { toast.error("Aceite os termos de uso e a política de privacidade"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, acceptedTerms: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao criar conta");
      setPendingVerification(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  if (pendingVerification) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.1),transparent)]" />
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
            <Mic2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold">Call Assistant</span>
        </Link>
        <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card/80 p-8 text-center backdrop-blur">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
            <Mail className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="text-xl font-bold">Confirme seu e-mail</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enviamos um link para <span className="font-medium text-foreground">{email}</span>.
            Clique no link para ativar sua conta e receber seus 50 créditos grátis.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Não recebeu? Verifique a pasta de spam ou{" "}
            <button onClick={() => setPendingVerification(false)} className="text-violet-400 underline hover:text-violet-300">
              tente novamente
            </button>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.1),transparent)]" />

      <Link href="/" className="mb-6 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
          <Mic2 className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-semibold">Call Assistant</span>
      </Link>

      <Badge variant="success" className="mb-6">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        50 créditos grátis ao criar sua conta
      </Badge>

      <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Criar conta</CardTitle>
          <CardDescription>Comece grátis, sem cartão de crédito</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" type="text" placeholder="Seu nome" value={name}
                onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="voce@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={8}
                  autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/30 p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-violet-600" required />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Li e aceito os{" "}
                  <Link href="/terms" target="_blank" className="text-violet-400 underline hover:text-violet-300">
                    Termos de Uso
                  </Link>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={acceptedPrivacy} onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-violet-600" required />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Li e aceito a{" "}
                  <Link href="/privacy" target="_blank" className="text-violet-400 underline hover:text-violet-300">
                    Política de Privacidade
                  </Link>
                </span>
              </label>
            </div>

            <Button type="submit" variant="gradient" className="w-full"
              disabled={loading || !acceptedTerms || !acceptedPrivacy}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Criando conta..." : "Criar conta grátis"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="text-violet-400 hover:text-violet-300">Entrar</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
