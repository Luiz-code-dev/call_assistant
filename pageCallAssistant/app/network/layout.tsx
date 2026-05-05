"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Mic2, Users, Trophy, TrendingUp, Bell, BellOff, Heart, Newspaper } from "lucide-react";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

function usePendingFriends() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () => fetch("/api/friends/pending").then((r) => r.json()).then((d) => setCount(d.count ?? 0)).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);
  return count;
}

function PushPermissionBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'default') {
      const dismissed = sessionStorage.getItem('push_dismissed');
      if (!dismissed) setShow(true);
    }
  }, []);

  const enable = async () => {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        if (!vapidKey) { setShow(false); return; }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
        const sfToken = sessionStorage.getItem('sf_token');
        await fetch('/api/network/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(sfToken ? { Authorization: `Bearer ${sfToken}` } : {}) },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch (e) { console.warn('Push subscribe failed', e); }
    }
    setShow(false);
  };

  const dismiss = () => { sessionStorage.setItem('push_dismissed', '1'); setShow(false); };

  if (!show) return null;
  return (
    <div className="bg-violet-500/10 border-b border-violet-500/20 px-4 py-2.5 flex items-center gap-3">
      <Bell className="h-4 w-4 text-violet-400 shrink-0" />
      <p className="text-xs text-muted-foreground flex-1">Ative notificações para ser avisado sobre novos desafios nos seus Circles.</p>
      <button onClick={enable} className="text-xs font-medium text-violet-400 hover:text-violet-300 shrink-0">Ativar</button>
      <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground shrink-0">Agora não</button>
    </div>
  );
}

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  const pendingFriends = usePendingFriends();
  return (
    <div className="min-h-screen bg-background">
      <PWAInstallBanner />
      <PushPermissionBanner />
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/80 backdrop-blur px-4" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <Mic2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm">SpeakFlow</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/network" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link href="/network/circles" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Circles</span>
            </Link>
            <Link href="/network/progress" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Progresso</span>
            </Link>
            <Link href="/feed" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline">Feed</span>
            </Link>
            <Link href="/friends" className="relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Amigos</span>
              {pendingFriends > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {pendingFriends > 9 ? "9+" : pendingFriends}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
