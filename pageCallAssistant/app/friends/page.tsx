"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Users, UserPlus, Check, X, MessageCircle, Search,
  Trash2, Clock, Loader2, Globe, Sparkles, ArrowLeft, Lock,
} from "lucide-react";
import { toast } from "sonner";

interface Friend {
  id: string;
  status: string;
  direction: "sent" | "received";
  friend: { id: string; name: string; username?: string | null; avatarUrl?: string | null };
  createdAt: string;
}

interface SearchUser {
  id: string; name: string;
  username?: string | null; avatarUrl?: string | null;
}

function Avatar({ name, avatarUrl, size = "md" }: { name: string; avatarUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-violet-600 to-indigo-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const cls = { sm: "h-8 w-8 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-12 w-12 text-sm" }[size];
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${cls} rounded-full object-cover ring-2 ring-white/10 shrink-0`} />;
  return <div className={`${cls} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold shrink-0`}>{initials}</div>;
}

function authHeaders(): Record<string, string> {
  const t = typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const suggRef = useRef<HTMLDivElement>(null);

  const loadFriends = useCallback(async () => {
    const res = await fetch("/api/friends", { headers: authHeaders() });
    if (res.ok) setFriends(await res.json());
    setLoading(false);
  }, []);

  const loadUnread = useCallback(async () => {
    const res = await fetch("/api/messages/unread-per-sender", { headers: authHeaders() });
    if (res.ok) setUnreadMap(await res.json());
  }, []);

  useEffect(() => {
    loadFriends();
    loadUnread();
    const id = setInterval(loadUnread, 10_000);
    return () => clearInterval(id);
  }, [loadFriends, loadUnread]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggRef.current && !suggRef.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function onQueryChange(val: string) {
    setQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (val.trim().length < 1) { setResults([]); setShowSugg(false); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/network/users/search?q=${encodeURIComponent(val.trim())}`, { headers: authHeaders() });
      if (res.ok) { setResults(await res.json()); setShowSugg(true); }
      setSearching(false);
    }, 250);
  }

  async function sendRequest(userId: string) {
    setSending(userId);
    const res = await fetch("/api/friends", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      toast.success("Solicitação enviada! 🎉");
      setQuery(""); setResults([]); setShowSugg(false);
      loadFriends();
    } else {
      const d = await res.json();
      toast.error(d.error === "already_exists" ? "Solicitação já existe." : "Erro ao enviar.");
    }
    setSending(null);
  }

  async function respond(id: string, action: "accept" | "reject") {
    const res = await fetch(`/api/friends/${id}`, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify({ action }),
    });
    if (res.ok) { toast.success(action === "accept" ? "Amizade aceita! 🎉" : "Solicitação recusada."); loadFriends(); }
  }

  async function removeFriend(id: string) {
    const res = await fetch(`/api/friends/${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) { toast.success("Amigo removido."); loadFriends(); }
  }

  const accepted = friends.filter((f) => f.status === "accepted");
  const received = friends.filter((f) => f.status === "pending" && f.direction === "received");
  const sent     = friends.filter((f) => f.status === "pending" && f.direction === "sent");

  return (
    <div className="min-h-screen relative overflow-x-hidden"
      style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.15) 0%, transparent 60%), #09090b" }}>

      {/* Blobs */}
      <div className="pointer-events-none fixed -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-rose-600/5 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#09090b]/70 backdrop-blur-xl px-4" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/home" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 shrink-0">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">Amigos</h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" /> Chat criptografado · Tradução · Grammar AI
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { icon: <MessageCircle className="h-3.5 w-3.5" />, label: "Chat AES-256", color: "text-violet-400 border-violet-500/30 bg-violet-500/10" },
            { icon: <Globe className="h-3.5 w-3.5" />, label: "Tradução IA", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
            { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Grammar + CEFR", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
          ].map((p) => (
            <span key={p.label} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${p.color}`}>
              {p.icon}{p.label}
            </span>
          ))}
        </div>

        {/* Add friend search */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-violet-400" />
            <p className="font-semibold text-sm">Adicionar amigo</p>
          </div>
          <p className="text-xs text-muted-foreground">Digite o nome, <strong className="text-foreground/80">@username</strong> ou <strong className="text-foreground/80">e-mail</strong> — sugestões aparecem enquanto você digita.</p>
          <div ref={suggRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onFocus={() => results.length > 0 && setShowSugg(true)}
                placeholder="Nome, @username ou email..."
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 placeholder:text-muted-foreground/60"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {showSugg && results.length > 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#13131a] shadow-2xl overflow-hidden">
                {results.map((u) => (
                  <button
                    key={u.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => sendRequest(u.id)}
                    disabled={sending === u.id}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left disabled:opacity-60"
                  >
                    <Avatar name={u.name} avatarUrl={u.avatarUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                    </div>
                    {sending === u.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400 shrink-0" />
                      : <span className="text-xs text-violet-400 shrink-0 flex items-center gap-1"><UserPlus className="h-3 w-3" />Adicionar</span>
                    }
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending received */}
        {received.length > 0 && (
          <div className="rounded-2xl border border-violet-500/25 bg-violet-500/8 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-4 pb-3">
              <Clock className="h-4 w-4 text-violet-400" />
              <p className="font-semibold text-sm text-violet-300">Solicitações recebidas ({received.length})</p>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {received.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={f.friend.name} avatarUrl={f.friend.avatarUrl} size="sm" />
                    <div>
                      <p className="text-sm font-medium">{f.friend.name}</p>
                      {f.friend.username && <p className="text-xs text-muted-foreground">@{f.friend.username}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => respond(f.id, "accept")}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors">
                      <Check className="h-3.5 w-3.5" />Aceitar
                    </button>
                    <button onClick={() => respond(f.id, "reject")}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold transition-colors">
                      <X className="h-3.5 w-3.5" />Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold text-sm">Meus amigos ({accepted.length})</p>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 p-3 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/10 rounded w-1/3" />
                    <div className="h-2.5 bg-white/10 rounded w-1/4" />
                  </div>
                </div>
              ))
            ) : accepted.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground space-y-2">
                <div className="text-3xl">👋</div>
                <p className="text-sm">Você ainda não tem amigos. Busque pelo nome acima!</p>
              </div>
            ) : (
              accepted.map((f) => {
                const unread = unreadMap[f.friend.id] ?? 0;
                return (
                  <div key={f.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 hover:bg-white/8 hover:border-violet-500/30 p-3 transition-all">
                    <div className="flex items-center gap-3">
                      <Avatar name={f.friend.name} avatarUrl={f.friend.avatarUrl} size="md" />
                      <div>
                        <p className="text-sm font-semibold">{f.friend.name}</p>
                        {f.friend.username && <p className="text-xs text-muted-foreground">@{f.friend.username}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/messages/${f.friend.id}`}
                        className="relative flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-3 py-2 text-xs font-semibold text-white transition-colors">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Chat
                        {unread > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-lg">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        )}
                      </Link>
                      <button onClick={() => removeFriend(f.id)}
                        className="rounded-xl border border-white/8 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 p-2 text-muted-foreground transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sent pending */}
        {sent.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-4 pb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold text-sm text-muted-foreground">Solicitações enviadas</p>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {sent.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={f.friend.name} avatarUrl={f.friend.avatarUrl} size="sm" />
                    <p className="text-sm">{f.friend.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground italic">Aguardando resposta...</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
