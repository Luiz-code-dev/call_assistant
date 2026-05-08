"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mic2, Zap, Users, Trophy, TrendingUp, Clock,
  ChevronRight, Bell, Wrench, Lock, Lightbulb,
  Home, Settings, CreditCard, X, LogOut, MessageSquare,
  Flame, Heart, Newspaper, Download, UserCircle, Smartphone, Share, Monitor,
  Volume2, VolumeX,
} from "lucide-react";

interface UserData { id: string; name: string; avatarUrl: string | null; plan: string; }
interface CircleData {
  id: string; name: string; focus: string;
  _count: { members: number };
  challenges: { id: string; title: string; endsAt: string }[];
}
interface Achievement { id: string; emoji: string; name: string; unlocked: boolean; }
interface Notification { id: string; type: string; title: string; body: string; href?: string; }

const motivationalPhrases = [
  "Cada conversa é um passo a mais em direção à fluência.",
  "O segredo é praticar um pouco todos os dias.",
  "Errar faz parte do aprendizado. Continue praticando!",
  "Sua dedicação está fazendo a diferença.",
  "Fluência é construída uma palavra de cada vez.",
];

const quickActions = [
  { label: "SpeakFlow Live", description: "Pratique speaking com IA em tempo real", href: "/live", gradient: "from-violet-600 to-indigo-600", Icon: Mic2 },
  { label: "Desafios", description: "Responda os quizzes do seu Circle", href: "/network", gradient: "from-amber-500 to-orange-500", Icon: Zap },
  { label: "Feed de Amigos", description: "Posts, fotos e curtidas dos amigos", href: "/feed", gradient: "from-sky-500 to-blue-600", Icon: Newspaper },
  { label: "Amigos & Chat", description: "Chat criptografado com IA integrada", href: "/friends", gradient: "from-rose-500 to-pink-600", Icon: Heart },
  { label: "Ferramentas", description: "Melhore textos e simule entrevistas", href: "/tools", gradient: "from-emerald-500 to-teal-500", Icon: Wrench },
  { label: "Meu Progresso", description: "Veja sua evolução e conquistas", href: "/progress", gradient: "from-pink-500 to-rose-500", Icon: TrendingUp },
];

const BADGE_DEFS: Achievement[] = [
  { id: "live-first",      emoji: "🎤", name: "1ª sessão Live",       unlocked: false },
  { id: "live-10",         emoji: "🔥", name: "10 sessões Live",     unlocked: false },
  { id: "live-50",         emoji: "💬", name: "50 sessões Live",     unlocked: false },
  { id: "challenge-first", emoji: "🎯", name: "Primeiro desafio",    unlocked: false },
  { id: "high-scorer",     emoji: "⭐",        name: "Score 90+ num desafio", unlocked: false },
  { id: "tool-user",       emoji: "🔧", name: "Ferramentas usadas",  unlocked: false },
];

const allTips = [
  { tip: "Use 'actually' para corrigir uma informação com naturalidade, sem soar rude.", example: "Actually, the deadline is Friday, not Thursday." },
  { tip: "Prefira 'I'd like to' no lugar de 'I want to' para soar mais profissional em reuniões.", example: "I'd like to schedule a follow-up call this week." },
  { tip: "'Could you elaborate on that?' é a forma mais educada de pedir detalhes adicionais.", example: "Could you elaborate on the timeline for Q3?" },
  { tip: "Use 'I appreciate' para agradecer de forma mais sofisticada do que apenas 'thank you'.", example: "I appreciate your feedback on the proposal." },
  { tip: "'Let me clarify' demonstra assertividade sem soar agressivo ou defensivo.", example: "Let me clarify what I meant by that last point." },
  { tip: "Prefira 'reach out' a 'contact' em contextos de networking e e-mails formais.", example: "Feel free to reach out anytime if you have questions." },
  { tip: "'Moving forward' é a forma profissional de introduzir um próximo passo ou decisão.", example: "Moving forward, let's focus on the delivery date." },
  { tip: "Use 'touch base' para sugerir uma conversa rápida de alinhamento com seu time.", example: "Let's touch base tomorrow to sync on the status." },
  { tip: "'As per our conversation' é perfeito para referenciar algo discutido anteriormente.", example: "As per our conversation, I'm sending the updated specs." },
  { tip: "Use 'take ownership' para mostrar que você está assumindo responsabilidade por algo.", example: "I'll take ownership of this issue and report back by EOD." },
  { tip: "'Circle back' significa retomar uma conversa mais tarde - essencial em reuniões.", example: "Let's circle back on this after the standup." },
  { tip: "Use 'on the same page' para confirmar alinhamento com stakeholders.", example: "Are we all on the same page about the new requirements?" },
  { tip: "'That makes sense' é a resposta perfeita para mostrar que você acompanhou o raciocínio.", example: "That makes sense - we should prioritize the backend first." },
  { tip: "Use 'just to confirm' para evitar mal-entendidos antes de agir em algo importante.", example: "Just to confirm, the meeting is at 2pm EST, correct?" },
  { tip: "'Happy to help' soa muito mais natural e profissional do que 'No problem' ou 'Sure'.", example: "Happy to help with the onboarding documentation." },
  { tip: "Use 'going forward' como alternativa a 'from now on' - mais comum em contextos corporativos.", example: "Going forward, please send all requests to the new form." },
  { tip: "'That said' é usado para introduzir uma ressalva sem invalidar o que foi dito antes.", example: "The results are great. That said, we still need to address latency." },
  { tip: "Use 'walk me through' para pedir uma explicação passo a passo de algo técnico.", example: "Could you walk me through the deployment process?" },
  { tip: "'Deliverable' é a palavra certa para o que você entrega ao cliente ou ao time.", example: "The main deliverable for this sprint is the API documentation." },
  { tip: "Use 'bandwidth' metaforicamente para falar sobre capacidade disponível de uma pessoa.", example: "Do you have the bandwidth to take on this task this week?" },
];

const DESKTOP_APP_URL = "https://github.com/Luiz-code-dev/call_assistant/releases/download/v0.1.1/SpeakFlow-Setup-0.1.1.exe";

const PLAN_LABELS: Record<string, string> = { free: "Gratuito", basic: "Básico", premium: "Premium" };
const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-700/50 text-zinc-300",
  basic: "bg-violet-500/15 text-violet-300",
  premium: "bg-indigo-500/15 text-indigo-300",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function getDailyTip() {
  const today = new Date().toDateString();
  try {
    const stored = JSON.parse(localStorage.getItem("sf_daily_tip") ?? "{}");
    if (stored.date === today && typeof stored.index === "number") return allTips[stored.index % allTips.length];
    const nextIndex = ((stored.index ?? -1) + 1) % allTips.length;
    localStorage.setItem("sf_daily_tip", JSON.stringify({ date: today, index: nextIndex }));
    return allTips[nextIndex];
  } catch { return allTips[0]; }
}

function buildNotifications(circles: CircleData[]): Notification[] {
  return circles
    .filter((c) => c.challenges.length > 0)
    .map((c) => {
      const ch = c.challenges[0];
      const hoursLeft = Math.max(0, Math.round((new Date(ch.endsAt).getTime() - Date.now()) / 3600000));
      return {
        id: `challenge-${c.id}`,
        type: "challenge",
        title: "Desafio ativo",
        body: `"${ch.title}" no Circle ${c.name} — ${hoursLeft}h restantes`,
        href: `/network/${c.id}`,
      };
    });
}

function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, cb: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

function NotificationPanel({ notifications, onClose }: { notifications: Notification[]; onClose: () => void }) {
  return (
    <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="font-semibold text-white">Notificações</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X className="size-4" />
        </button>
      </div>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <Bell className="size-8 text-zinc-700 mb-3" />
          <p className="text-sm font-medium text-zinc-400">Nenhuma notificação</p>
          <p className="text-xs text-zinc-600 mt-1">Quando houver desafios novos no seu Circle, elas aparecerão aqui.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800 max-h-72 overflow-y-auto">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link href={n.href ?? "#"} className="flex gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                  <Zap className="size-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-300">{n.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{n.body}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: UserData }) {
  const [open, setOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    if (window.__pwaInstallPrompt) setCanInstall(true);
    const handler = () => setCanInstall(true);
    window.addEventListener("pwaInstallReady", handler);
    return () => window.removeEventListener("pwaInstallReady", handler);
  }, []);

  async function installApp() {
    const prompt = window.__pwaInstallPrompt;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
      window.__pwaInstallPrompt = undefined;
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 group">
        <span className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_COLORS[user.plan] ?? PLAN_COLORS.free}`}>
          {PLAN_LABELS[user.plan] ?? user.plan}
        </span>
        <Avatar className="size-8 ring-2 ring-zinc-700 group-hover:ring-violet-500 transition-all">
          <AvatarImage src={user.avatarUrl ?? ""} alt={user.name} />
          <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <span className={`mt-0.5 inline-flex text-xs ${PLAN_COLORS[user.plan] ?? "text-zinc-500"}`}>
              {PLAN_LABELS[user.plan] ?? user.plan}
            </span>
          </div>
          <div className="py-1">
            <Link href={`/profile/${user.id}`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              <UserCircle className="size-4" /> Meu Perfil
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              <Settings className="size-4" /> Configurações
            </Link>
            <Link href="/usage" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              <CreditCard className="size-4" /> Uso e Créditos
            </Link>
            <Link href="/progress" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              <TrendingUp className="size-4" /> Meu Progresso
            </Link>
            <Link href="/support" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              <MessageSquare className="size-4" /> Suporte
            </Link>
          </div>
          <div className="border-t border-zinc-800 py-1">
            <a
              href={DESKTOP_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 transition-colors"
            >
              <Download className="size-4" /> Baixar App Desktop
            </a>
            {canInstall && (
              <button
                onClick={installApp}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <Smartphone className="size-4" /> Instalar como PWA
              </button>
            )}
            <button
              onClick={() => { sessionStorage.removeItem("sf_token"); localStorage.removeItem("sf_token"); window.location.href = "/api/auth/logout"; }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <LogOut className="size-4" /> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-[#09090b]/80 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/home" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <span className="text-lg font-medium text-zinc-400 tracking-tight">SpeakFlow</span>
        </Link>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </header>
  );
}

function AppHeader({ user, circles }: { user: UserData; circles: CircleData[] }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { setReadIds(new Set(JSON.parse(localStorage.getItem("sf_notif_read") ?? "[]"))); } catch {}
  }, []);
  const notifications = buildNotifications(circles);
  const hasUnread = notifications.some((n) => !readIds.has(n.id));
  const notifRef = useRef<HTMLDivElement>(null);

  const openNotif = () => {
    setNotifOpen((v) => {
      if (!v) {
        const allIds = notifications.map((n) => n.id);
        const next = new Set(Array.from(readIds).concat(allIds));
        setReadIds(next);
        try { localStorage.setItem("sf_notif_read", JSON.stringify(Array.from(next))); } catch {}
      }
      return !v;
    });
  };

  useClickOutside(notifRef, () => setNotifOpen(false));
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-[#09090b]/80 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/home" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-500/25">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <span className="text-lg font-medium text-zinc-400 tracking-tight">SpeakFlow</span>
        </Link>
        <div className="flex items-center gap-3">
          <div ref={notifRef} className="relative">
            <Button variant="ghost" size="icon" onClick={openNotif} className="relative text-zinc-400 hover:text-white hover:bg-zinc-800/50">
              <Bell className="size-5" />
              {hasUnread && (
                <span className="absolute right-1.5 top-1.5 flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-violet-500" />
                </span>
              )}
            </Button>
            {notifOpen && <NotificationPanel notifications={notifications} onClose={() => setNotifOpen(false)} />}
          </div>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}

function HeroGreeting({ userName }: { userName: string }) {
  const [phrase] = useState(() => motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)]);
  return (
    <section className="relative overflow-hidden px-4 py-8">
      <div className="absolute -left-20 -top-20 size-64 animate-pulse rounded-full bg-gradient-to-br from-violet-600/20 to-indigo-600/20 blur-3xl" />
      <div className="absolute -right-20 top-0 size-48 animate-pulse rounded-full bg-gradient-to-br from-indigo-600/15 to-violet-600/15 blur-3xl" />
      <div className="relative">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Olá, {userName.split(" ")[0]} 👋</h1>
        <p className="mt-2 text-zinc-400">{phrase}</p>
      </div>
    </section>
  );
}

function QuickActionsSection() {
  const [unreadMessages, setUnreadMessages] = useState(0);
  useEffect(() => {
    const sfToken = sessionStorage.getItem("sf_token");
    fetch("/api/messages/unread-per-sender", { headers: sfToken ? { Authorization: `Bearer ${sfToken}` } : {} })
      .then((r) => r.ok ? r.json() : {})
      .then((m: Record<string, number>) => setUnreadMessages(Object.values(m).reduce((a, b) => a + b, 0)))
      .catch(() => {});
  }, []);

  return (
    <section className="px-4 pb-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const badge = action.href === "/friends" ? unreadMessages : 0;
          return (
            <Link key={action.label} href={action.href} className="group relative flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-800/50 hover:shadow-lg">
              {badge > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white z-10">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${action.gradient} text-white shadow-lg`}>
                <action.Icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white">{action.label}</h3>
                <p className="text-xs text-zinc-400 truncate">{action.description}</p>
              </div>
              <ChevronRight className="size-4 text-zinc-600 transition-colors group-hover:text-zinc-400 shrink-0" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CircleSection({ circles, loading }: { circles: CircleData[]; loading: boolean }) {
  if (loading) return (
    <section className="px-4 pb-6">
      <div className="flex items-center gap-2 mb-4"><Users className="size-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Comunidade</h2></div>
      <Skeleton className="h-28 w-full rounded-xl" />
    </section>
  );
  if (!circles.length) return (
    <section className="px-4 pb-6">
      <div className="flex items-center gap-2 mb-4"><Users className="size-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Comunidade</h2></div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-zinc-800"><Users className="size-6 text-zinc-500" /></div>
        <p className="text-zinc-400 mb-4 text-sm">Você ainda não faz parte de um Circle</p>
        <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"><Link href="/network/circles">Encontrar um Circle</Link></Button>
      </div>
    </section>
  );
  const circle = circles[0];
  return (
    <section className="px-4 pb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Users className="size-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Comunidade</h2></div>
        {circles.length > 1 && <Link href="/network" className="text-sm text-violet-400 hover:text-violet-300">Ver todos ({circles.length})</Link>}
      </div>
      <Link href={`/network/${circle.id}`} className="group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-800/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white truncate">{circle.name}</h3>
              <Badge variant="secondary" className="bg-violet-500/10 text-violet-400 border-violet-500/20 shrink-0">{circle.focus}</Badge>
            </div>
            {circle.challenges.length > 0 ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span>
                <span className="text-sm text-emerald-400">Desafio ativo — {circle.challenges[0].title}</span>
              </div>
            ) : <p className="mt-2 text-sm text-zinc-500">Nenhum desafio ativo no momento</p>}
            <p className="mt-3 text-sm text-zinc-400 flex items-center gap-1"><Users className="size-4" />{circle._count.members} membros</p>
          </div>
          <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">Ver Circle</Button>
        </div>
      </Link>
    </section>
  );
}

function RecentActivitySection() {
  return (
    <section className="px-4 pb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Clock className="size-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Atividade Recente</h2></div>
        <Link href="/progress" className="text-sm text-violet-400 hover:text-violet-300">Ver tudo</Link>
      </div>
      <div className="space-y-3">
        {[
          { label: "Última sessão Live", sub: "Abra o Live para começar a praticar", href: "/live" },
          { label: "Progresso", sub: "Veja suas estatísticas detalhadas", href: "/progress" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="group flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-800/50">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 mb-1">{item.label}</p>
              <p className="text-white font-medium truncate">{item.sub}</p>
            </div>
            <ChevronRight className="size-4 text-zinc-600 group-hover:text-zinc-400 shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function AchievementsSection({ earnedSlugs }: { earnedSlugs: string[] }) {
  const badges = BADGE_DEFS.map((b) => ({ ...b, unlocked: earnedSlugs.includes(b.id) }));
  const hasAny = badges.some((b) => b.unlocked);
  return (
    <section className="px-4 pb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Trophy className="size-5 text-amber-400" /><h2 className="text-lg font-semibold text-white">Suas medalhas</h2></div>
        {!hasAny && <span className="text-xs text-zinc-500">Complete atividades para desbloquear</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {badges.map((a) => (
          <div key={a.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${a.unlocked ? "border-zinc-700 bg-zinc-800/50" : "border-zinc-800 bg-zinc-900/30 opacity-40"}`}>
            {a.unlocked ? <span className="text-base shrink-0">{a.emoji}</span> : <Lock className="size-3.5 text-zinc-600 shrink-0" />}
            <span className={`text-xs font-medium leading-tight ${a.unlocked ? "text-white" : "text-zinc-600"}`}>{a.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SpinCard() {
  const [spin, setSpin] = useState<{ canSpin: boolean; currentStreak: number; isPremiumSpin: boolean } | null>(null);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    fetch("/api/spin")
      .then((r) => r.json())
      .then(setSpin)
      .catch(() => {})
      .finally(() => setTried(true));
  }, []);

  if (!tried) return null;
  const canSpin = spin?.canSpin ?? true;
  const currentStreak = spin?.currentStreak ?? 0;
  const daysToNext = currentStreak > 0 ? 10 - (currentStreak % 10) : 10;
  const isPremium = spin?.isPremiumSpin ?? false;

  return (
    <section className="px-4 pb-6">
      <Link href="/spin" className="group block">
        <div className={`relative overflow-hidden rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg
          ${ isPremium
            ? "border-amber-500/40 bg-gradient-to-r from-amber-950/60 to-orange-950/60 hover:border-amber-500/60 hover:shadow-amber-500/20"
            : "border-violet-500/30 bg-gradient-to-r from-violet-950/60 to-indigo-950/60 hover:border-violet-500/50 hover:shadow-violet-500/20"
          }`}>
          {/* Bg glow */}
          <div className={`absolute inset-0 opacity-10 ${ isPremium ? "bg-amber-400" : "bg-violet-400" }`} />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex size-12 items-center justify-center rounded-xl text-2xl shadow-lg
                ${ isPremium ? "bg-amber-500/20" : "bg-violet-500/20" }`}>
                {isPremium ? "🔥" : "🎰"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white">
                    {isPremium ? "Giro Premium disponível!" : "Giro da Sorte"}
                  </p>
                  {canSpin && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                      ${ isPremium ? "bg-amber-500 text-white" : "bg-violet-500 text-white" }`}>
                      HOJE
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">
                  {isPremium
                    ? "Prêmios em dobro! Gire agora 🎉"
                    : canSpin
                      ? "Gire e ganhe até 100 créditos grátis!"
                      : `${currentStreak} dias seguidos · ${daysToNext}d para Giro Premium`
                  }
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1">
                <Flame className={`size-3.5 ${ currentStreak >= 3 ? "text-orange-400" : "text-zinc-600" }`} />
                <span className={`text-sm font-black ${ currentStreak >= 3 ? "text-orange-400" : "text-zinc-500" }`}>
                  {currentStreak}
                </span>
              </div>
              <ChevronRight className="size-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

function InstallAppBanner() {
  const [pwaMode, setPwaMode] = useState<"none" | "prompt" | "ios">("none");
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem("sf_install_dismissed") === "1") { setDismissed(true); return; } } catch {}
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
    setIsStandalone(standalone);
    if (standalone) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios/i.test(navigator.userAgent);
    if (isIOS) { setPwaMode("ios"); return; }
    if (window.__pwaInstallPrompt) { setPwaMode("prompt"); return; }
    const handler = () => setPwaMode("prompt");
    window.addEventListener("pwaInstallReady", handler);
    return () => window.removeEventListener("pwaInstallReady", handler);
  }, []);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem("sf_install_dismissed", "1"); } catch {}
  }

  async function installPwa() {
    const prompt = window.__pwaInstallPrompt;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") window.__pwaInstallPrompt = undefined;
  }

  if (dismissed || isStandalone) return null;

  return (
    <section className="px-4 pb-4">
      <div className="relative flex items-start gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25">
          <Monitor className="size-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">App Desktop SpeakFlow</p>
          <p className="text-xs text-zinc-400 mt-0.5 mb-3">Copiloto em tempo real para calls em inglês — Windows 10/11 · Versão 0.1.1</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={DESKTOP_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              <Download className="size-3.5" /> Baixar .exe
            </a>
            {pwaMode === "prompt" && (
              <button
                onClick={installPwa}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors"
              >
                <Smartphone className="size-3.5" /> Instalar como app
              </button>
            )}
            {pwaMode === "ios" && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-400">
                <Share className="size-3.5" /> Compartilhar → Adicionar à Tela de Início
              </span>
            )}
          </div>
        </div>
        <button onClick={dismiss} className="shrink-0 text-zinc-500 hover:text-white transition-colors mt-0.5">
          <X className="size-4" />
        </button>
      </div>
    </section>
  );
}

function DailyTipCard() {
  const [tip, setTip] = useState<{ tip: string; example: string } | null>(null);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => { setTip(getDailyTip()); }, []);

  function bestVoice(lang: string) {
    const voices = window.speechSynthesis.getVoices();
    const prefix = lang.split("-")[0];
    return (
      voices.find((v) => v.lang === lang && (v.name.includes("Google") || v.name.includes("Microsoft"))) ||
      voices.find((v) => v.lang === lang) ||
      voices.find((v) => v.lang.startsWith(prefix) && (v.name.includes("Google") || v.name.includes("Microsoft"))) ||
      voices.find((v) => v.lang.startsWith(prefix)) ||
      null
    );
  }

  function doSpeak() {
    if (!tip) return;
    window.speechSynthesis.cancel();

    const uttPt = new SpeechSynthesisUtterance(tip.tip);
    uttPt.lang = "pt-BR";
    uttPt.rate = 1.05;
    uttPt.pitch = 1;
    const ptVoice = bestVoice("pt-BR");
    if (ptVoice) uttPt.voice = ptVoice;

    const uttEn = new SpeechSynthesisUtterance(tip.example);
    uttEn.lang = "en-US";
    uttEn.rate = 0.9;
    uttEn.pitch = 1;
    const enVoice = bestVoice("en-US");
    if (enVoice) uttEn.voice = enVoice;
    uttEn.onend = () => setSpeaking(false);
    uttEn.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(uttPt);
    window.speechSynthesis.speak(uttEn);
    setSpeaking(true);
  }

  function speak() {
    if (!tip || !("speechSynthesis" in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; doSpeak(); };
    } else {
      doSpeak();
    }
  }

  if (!tip) return null;
  return (
    <section className="px-4 pb-24 sm:pb-8">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10"><Lightbulb className="size-4 text-amber-400" /></div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-amber-400">Dica do Dia</h3>
              <button
                onClick={speak}
                title={speaking ? "Parar" : "Ouvir em inglês"}
                className={`flex items-center justify-center size-7 rounded-lg transition-colors ${
                  speaking ? "bg-amber-500/20 text-amber-400" : "bg-amber-500/10 text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/20"
                }`}
              >
                {speaking ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
              </button>
            </div>
            <p className="text-sm text-zinc-300">{tip.tip}</p>
            <p className="mt-2 text-sm text-zinc-400 italic">Ex: &ldquo;{tip.example}&rdquo;</p>
          </div>
        </div>
      </div>
    </section>
  );
}


export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [circles, setCircles] = useState<CircleData[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCircles, setLoadingCircles] = useState(true);
  const [earnedSlugs, setEarnedSlugs] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => { if (r.status === 401) { router.replace("/login"); return; } setUser(await r.json()); })
      .catch(() => router.replace("/login"))
      .finally(() => setLoadingUser(false));
  }, [router]);

  useEffect(() => {
    fetch("/api/network/circles?filter=mine")
      .then(async (r) => { if (r.ok) setCircles(await r.json()); })
      .finally(() => setLoadingCircles(false));
  }, []);

  useEffect(() => {
    fetch("/api/auth/stats")
      .then(async (r) => { if (r.ok) { const d = await r.json(); setEarnedSlugs(d.earnedSlugs ?? []); } })
      .catch(() => {});
  }, []);

  if (loadingUser) return (
    <div className="min-h-screen bg-[#09090b]">
      <HeaderSkeleton />
      <main className="mx-auto max-w-5xl px-4 pt-8 space-y-6">
        <Skeleton className="h-16 w-64" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        <Skeleton className="h-28 rounded-xl" />
      </main>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#09090b]">
      <AppHeader user={user} circles={circles} />
      <main className="mx-auto max-w-5xl">
        <HeroGreeting userName={user.name} />
        <QuickActionsSection />
        <InstallAppBanner />
        <SpinCard />
        <CircleSection circles={circles} loading={loadingCircles} />
        <RecentActivitySection />
        <AchievementsSection earnedSlugs={earnedSlugs} />
        <DailyTipCard />
      </main>
    </div>
  );
}
