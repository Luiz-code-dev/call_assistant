"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DesktopAuthPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "opening" | "error">("loading");
  const [deepLink, setDeepLink] = useState("");

  useEffect(() => {
    async function generateToken() {
      try {
        const sfToken = typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
        const res = await fetch("/api/auth/desktop-token", {
          method: "POST",
          headers: { ...(sfToken ? { Authorization: `Bearer ${sfToken}` } : {}) },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        const link = `callassistant://auth?token=${encodeURIComponent(data.token)}`;
        setDeepLink(link);
        setStatus("ready");
        openApp(link);
      } catch {
        setStatus("error");
      }
    }
    generateToken();
  }, []);

  function openApp(link?: string) {
    const url = link || deepLink;
    if (!url) return;
    setStatus("opening");
    window.location.href = url;
    setTimeout(() => setStatus("ready"), 2000);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.1),transparent)]" />

      <Link href="/dashboard" className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-6 hover:opacity-80 transition-opacity" title="Ir para o Dashboard">
        <span className="text-2xl font-bold text-white">S</span>
      </Link>

      {status === "loading" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-violet-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Preparando acesso</h1>
          <p className="text-muted-foreground">Gerando token seguro para o app...</p>
        </>
      )}

      {(status === "ready" || status === "opening") && (
        <>
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Login realizado!</h1>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {status === "opening"
              ? "Abrindo o SpeakFlow..."
              : "Clique no botão abaixo para abrir o app desktop."}
          </p>
          <Button
            variant="gradient"
            size="lg"
            onClick={() => openApp()}
            disabled={status === "opening"}
          >
            {status === "opening" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            {status === "opening" ? "Abrindo..." : "Abrir SpeakFlow"}
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            O app não abriu?{" "}
            <a href={deepLink} className="text-violet-400 hover:underline">
              Clique aqui
            </a>
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold mb-2 text-red-400">Erro ao gerar token</h1>
          <p className="text-muted-foreground mb-6">
            Faça login novamente para tentar.
          </p>
          <Button variant="outline" onClick={() => (window.location.href = "/login?callback=desktop")}>
            Voltar ao login
          </Button>
        </>
      )}
    </div>
  );
}
