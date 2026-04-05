"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mic2, Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "pending">("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("pending");
      return;
    }
    setStatus("loading");
    fetch(`/api/auth/verify-email?token=${token}`)
      .then(async (res) => {
        if (res.redirected) {
          window.location.href = res.url;
          return;
        }
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(data.message || "Token inválido ou expirado.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Erro ao verificar o e-mail. Tente novamente.");
      });
  }, [token]);

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
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-violet-400" />
            <h1 className="text-xl font-bold">Verificando e-mail…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Aguarde um momento.</p>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
              <Mail className="h-8 w-8 text-violet-400" />
            </div>
            <h1 className="text-xl font-bold">Confirme seu e-mail</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviamos um link de confirmação para o seu e-mail. Clique no link para ativar sua conta e receber os 50 créditos grátis.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Não recebeu? Verifique a pasta de spam ou{" "}
              <Link href="/register" className="text-violet-400 hover:text-violet-300 underline">
                tente novamente
              </Link>
              .
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
            <h1 className="text-xl font-bold">E-mail confirmado!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sua conta está ativa. Redirecionando…</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h1 className="text-xl font-bold">Link inválido</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Button variant="gradient" className="mt-6 w-full" asChild>
              <Link href="/register">Criar nova conta</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
