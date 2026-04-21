"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;

    setIsIOS(ios);
    setIsStandalone(standalone);

    const wasDismissed = sessionStorage.getItem("pwa-banner-dismissed") === "true";
    setDismissed(wasDismissed);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    sessionStorage.setItem("pwa-banner-dismissed", "true");
    setDismissed(true);
  };

  if (isStandalone || dismissed || installed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="sticky top-0 z-50 w-full border-b border-violet-500/30 bg-gradient-to-r from-violet-950/95 via-indigo-950/95 to-violet-950/95 backdrop-blur px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600">
          {isIOS ? <Smartphone className="h-5 w-5 text-white" /> : <Monitor className="h-5 w-5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Instale o SpeakFlow Network</p>
          <p className="text-xs text-violet-300/80 truncate">
            {isIOS
              ? "Acesse seus Circles direto da tela inicial do iPhone"
              : "Adicione à área de trabalho para acesso rápido aos seus Circles"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isIOS ? (
            <Button size="sm" variant="outline" className="border-violet-500/50 text-violet-300 hover:bg-violet-500/20 text-xs" asChild>
              <Link href="/network/install">Ver como</Link>
            </Button>
          ) : (
            <Button size="sm" onClick={handleInstall}
              className="bg-violet-600 hover:bg-violet-500 border-0 text-xs">
              <Download className="h-3.5 w-3.5 mr-1.5" />Instalar
            </Button>
          )}
          <button onClick={dismiss} className="text-violet-400/60 hover:text-violet-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
