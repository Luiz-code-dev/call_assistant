"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Users, UserPlus, Check, X, MessageCircle, Search, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Friend {
  id: string;
  status: string;
  direction: "sent" | "received";
  friend: { id: string; name: string; username?: string | null; avatarUrl?: string | null };
  createdAt: string;
}

interface SearchUser {
  id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
}

function Avatar({ name, avatarUrl, size = 9 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-violet-600 to-indigo-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`h-${size} w-${size} rounded-full object-cover ring-2 ring-border`} />;
  return (
    <div className={`h-${size} w-${size} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>
      {initials}
    </div>
  );
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
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    const res = await fetch("/api/friends", { headers: authHeaders() });
    if (res.ok) setFriends(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/network/users/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
      if (res.ok) setResults(await res.json());
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function sendRequest(userId: string) {
    setSending(userId);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      toast.success("Solicitação enviada!");
      setQuery("");
      setResults([]);
      loadFriends();
    } else {
      const d = await res.json();
      toast.error(d.error === "already_exists" ? "Solicitação já existe." : "Erro ao enviar.");
    }
    setSending(null);
  }

  async function respond(id: string, action: "accept" | "reject") {
    const res = await fetch(`/api/friends/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast.success(action === "accept" ? "Amizade aceita! 🎉" : "Solicitação recusada.");
      loadFriends();
    }
  }

  async function removeFriend(id: string) {
    const res = await fetch(`/api/friends/${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) { toast.success("Amigo removido."); loadFriends(); }
  }

  const accepted = friends.filter((f) => f.status === "accepted");
  const received = friends.filter((f) => f.status === "pending" && f.direction === "received");
  const sent = friends.filter((f) => f.status === "pending" && f.direction === "sent");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/80 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <Users className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm">Amigos</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">

        {/* Search */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-violet-400" /> Adicionar amigo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, @username ou e-mail..."
                className="w-full rounded-lg border border-border bg-input pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
            {searching && <p className="text-xs text-muted-foreground">Buscando...</p>}
            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} avatarUrl={u.avatarUrl} size={8} />
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => sendRequest(u.id)}
                      disabled={sending === u.id}
                      className="bg-violet-600 hover:bg-violet-500 text-white border-0"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      {sending === u.id ? "Enviando..." : "Adicionar"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending received */}
        {received.length > 0 && (
          <Card className="border-violet-500/30 bg-violet-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-violet-400" />
                Solicitações recebidas ({received.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {received.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={f.friend.name} avatarUrl={f.friend.avatarUrl} size={8} />
                    <div>
                      <p className="text-sm font-medium">{f.friend.name}</p>
                      {f.friend.username && <p className="text-xs text-muted-foreground">@{f.friend.username}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respond(f.id, "accept")} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">
                      <Check className="h-3.5 w-3.5 mr-1" />Aceitar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => respond(f.id, "reject")}>
                      <X className="h-3.5 w-3.5 mr-1" />Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Friends list */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Meus amigos ({accepted.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />)}</div>
            ) : accepted.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Você ainda não tem amigos. Busque pelo nome acima!</p>
            ) : (
              <div className="space-y-2">
                {accepted.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3 hover:border-violet-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar name={f.friend.name} avatarUrl={f.friend.avatarUrl} size={9} />
                      <div>
                        <p className="text-sm font-medium">{f.friend.name}</p>
                        {f.friend.username && <p className="text-xs text-muted-foreground">@{f.friend.username}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/messages/${f.friend.id}`}>
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />Chat
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => removeFriend(f.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sent pending */}
        {sent.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" /> Solicitações enviadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sent.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={f.friend.name} avatarUrl={f.friend.avatarUrl} size={8} />
                    <p className="text-sm">{f.friend.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Aguardando...</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
