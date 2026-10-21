"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY ?? "";
const PUSH_DISMISS_KEY = "sf_push_dismissed_at";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

async function subscribePush(reg: ServiceWorkerRegistration) {
  if (!VAPID_KEY) return;
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_KEY,
    });
    const sfToken = sessionStorage.getItem("sf_token");
    await fetch("/api/network/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(sfToken ? { Authorization: `Bearer ${sfToken}` } : {}) },
      body: JSON.stringify(sub.toJSON()),
    });
  } catch (e) { console.warn("[Push] subscribe failed", e); }
}

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
          if (reg.waiting) promptUpdate(reg);
          // New SW found while page is open
          reg.addEventListener("updatefound", () => {
            const newSW = reg.installing;
            if (!newSW) return;
            newSW.addEventListener("statechange", () => {
              if (newSW.state === "installed" && navigator.serviceWorker.controller) promptUpdate(reg);
            });
          });

          // ── Push notifications ──────────────────────────────
          if (!("Notification" in window) || !("PushManager" in window)) return;

          if (Notification.permission === "granted") {
            // Re-subscribe silently if subscription was lost (common on iOS after app update)
            reg.pushManager.getSubscription().then((sub) => {
              if (!sub) subscribePush(reg);
            });
            return;
          }

          if (Notification.permission === "denied") return;

          // permission === 'default': prompt after 4s if not recently dismissed
          const dismissed = localStorage.getItem(PUSH_DISMISS_KEY);
          if (dismissed && Date.now() - Number(dismissed) < SEVEN_DAYS) return;

          setTimeout(() => {
            toast("🔔 Ativar notificações?", {
              description: "Receba avisos de mensagens, amizades e novos Circles.",
              duration: 12000,
              action: {
                label: "Ativar",
                onClick: async () => {
                  const perm = await Notification.requestPermission();
                  if (perm === "granted") subscribePush(reg);
                },
              },
              cancel: {
                label: "Agora não",
                onClick: () => localStorage.setItem(PUSH_DISMISS_KEY, String(Date.now())),
              },
            });
          }, 4000);
        })
        .catch((err) => console.warn("[SW] registration failed", err));
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  return null;
}
