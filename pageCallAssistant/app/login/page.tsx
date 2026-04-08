"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic2, Loader2, Eye, EyeOff, Monitor } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const searchParams = useSearchParams();
  const isDesktop = searchParams.get("callback") === "desktop";
  const redirectTo = searchParams.get("redirect") || (isDesktop ? "/auth/desktop" : "/dashboard");

  useEffect(() => {
    const sfToken = sessionStorage.getItem("sf_token");
    if (!sfToken) { setRefreshing(false); return; }
    fetch("/api/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${sfToken}` },
    })
      .then((res) => {
        if (res.ok) {
          window.location.href = redirectTo;
        } else {
          sessionStorage.removeItem("sf_token");
          setRefreshing(false);
        }
      })
      .catch(() => { setRefreshing(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao fazer login");
      if (data.token) sessionStorage.setItem("sf_token", data.token);
      toast.success("Login realizado com sucesso!");
      window.location.href = redirectTo;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  if (refreshing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.1),transparent)]" />

      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
          <span className="text-base font-bold text-white">S</span>
        </div>
        <span className="text-xl font-semibold">SpeakFlow</span>
      </Link>

      {isDesktop && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
          <Monitor className="h-4 w-4 shrink-0 text-violet-400" />
          <p className="text-sm text-violet-300">
            Após o login, você será redirecionado de volta para o <strong>SpeakFlow</strong>.
          </p>
        </div>
      )}

      <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription>
            {isDesktop ? "Conecte sua conta ao app desktop" : "Acesse sua conta para continuar"}
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 items-center">
          <p className="text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link href={isDesktop ? "/register?callback=desktop" : "/register"} className="text-violet-400 hover:text-violet-300">
              Criar conta grátis
            </Link>
          </p>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            ← Voltar ao início
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
