"use client";

import { useEffect } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function promptUpdate(reg: ServiceWorkerRegistration) {
  toast.info("Nova versão disponível!", {
    description: "O SpeakFlow foi atualizado.",
    duration: Infinity,
    action: {
      label: "Atualizar agora",
      onClick: () => {
        reg.waiting?.postMessage({ type: "SKIP_WAITING" });
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        }, { once: true });
      },
    },
  });
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Capture PWA install prompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event("pwaInstallReady"));
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Register SW + detect updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Already waiting (page opened after new SW installed)
          if (reg.waiting) {
            promptUpdate(reg);
          }
          // New SW found while page is open
          reg.addEventListener("updatefound", () => {
            const newSW = reg.installing;
            if (!newSW) return;
            newSW.addEventListener("statechange", () => {
              if (newSW.state === "installed" && navigator.serviceWorker.controller) {
                promptUpdate(reg);
              }
            });
          });
        })
        .catch((err) => console.warn("[SW] registration failed", err));
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  return null;
}
