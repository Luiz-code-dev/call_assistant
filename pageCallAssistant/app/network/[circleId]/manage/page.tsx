"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Link2, Copy, Trash2, UserPlus, CheckCircle2,
  XCircle, Loader2, RefreshCw, Shield, Users, Mail, UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Member {
  id: string; role: string; status: string; joinedAt: string;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
}
interface UserSuggestion {
  id: string; name: string; email: string; avatarUrl?: string | null;
  username?: string | null; memberStatus?: string | null;
}

function Avatar({ name, avatarUrl, size = "md" }: { name: string; avatarUrl?: string | null; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-violet-600 to-indigo-600","from-emerald-500 to-teal-600","from-rose-500 to-pink-600","from-amber-500 to-orange-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const cls = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${cls} rounded-full object-cover ring-2 ring-border shrink-0`} />;
  return <div className={`${cls} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold shrink-0`}>{initials}</div>;
}

export default function ManagePage() {
  const { circleId } = useParams<{ circleId: string }>();
  const [pending, setPending]       = useState<Member[]>([]);
  const [invited, setInvited]       = useState<Member[]>([]);
  const [active, setActive]         = useState<Member[]>([]);
  const [inviteUrl, setInviteUrl]   = useState("");
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSugg, setShowSugg]     = useState(false);
  const [searching, setSearching]   = useState(false);
  const [loadingAll, setLoadingAll] = useState(true);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [addingEmail, setAddingEmail]       = useState(false);
  const [processingId, setProcessingId]     = useState<string | null>(null);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const suggRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async () => {
    setLoadingAll(true);
    const [rPending, rInvited, rActive] = await Promise.all([
      fetch(`/api/network/circles/${circleId}/members?status=pending`),
      fetch(`/api/network/circles/${circleId}/members?status=invited`),
      fetch(`/api/network/circles/${circleId}/members?status=active`),
    ]);
    if (rPending.ok) setPending(await rPending.json());
    if (rInvited.ok) setInvited(await rInvited.json());
    if (rActive.ok)  setActive(await rActive.json());
    setLoadingAll(false);
  }, [circleId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggRef.current && !suggRef.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const onQueryChange = (val: string) => {
    setQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (val.trim().length < 2) { setSuggestions([]); setShowSugg(false); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const r = await fetch(`/api/network/users/search?q=${encodeURIComponent(val)}&circleId=${circleId}`);
      if (r.ok) { setSuggestions(await r.json()); setShowSugg(true); }
      setSearching(false);
    }, 300);
  };

  const memberAction = async (memberId: string, action: string, successMsg: string) => {
    setProcessingId(memberId);
    const r = await fetch(`/api/network/circles/${circleId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (r.ok) { toast.success(successMsg); await loadAll(); }
    else { const d = await r.json(); toast.error(d.error ?? "Erro ao processar."); }
    setProcessingId(null);
  };

  const generateLink = async () => {
    setGeneratingLink(true);
    const r = await fetch(`/api/network/circles/${circleId}/invite`, { method: "POST" });
    if (r.ok) { const d = await r.json(); setInviteUrl(d.url); toast.success("Link gerado!"); }
    else toast.error("Erro ao gerar link.");
    setGeneratingLink(false);
  };

  const revokeLink = async () => {
    if (!confirm("Revogar link? Quem já tem o link não conseguirá mais entrar.")) return;
    const r = await fetch(`/api/network/circles/${circleId}/invite`, { method: "DELETE" });
    if (r.ok) { setInviteUrl(""); toast.success("Link revogado."); }
    else toast.error("Erro ao revogar.");
  };

  const addByQuery = async (q: string) => {
    if (!q.trim()) return;
    setAddingEmail(true);
    setShowSugg(false);
    const r = await fetch(`/api/network/circles/${circleId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q.trim() }),
    });
    const d = await r.json();
    if (r.ok) {
      toast.success(`Convite enviado para ${d.name ?? q}!`);
      setQuery("");
      setSuggestions([]);
      await loadAll();
    } else toast.error(d.error ?? "Erro ao convidar.");
    setAddingEmail(false);
  };

  const statusBadge = (status: string) => {
    if (status === "invited") return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Convite enviado</span>;
    if (status === "active")  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Membro</span>;
    return null;
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link href={`/network/${circleId}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-xl font-bold">Gerenciar Circle</h1>
          <p className="text-sm text-muted-foreground">Membros, convites e solicitações</p>
        </div>
      </div>

      {/* Solicitações pendentes (join request) */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              Solicitações pendentes
              {pending.length > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">{pending.length}</span>}
            </CardTitle>
            <button onClick={loadAll} className="text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingAll ? "animate-spin" : ""}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAll ? (
            <div className="h-12 rounded-lg bg-card/50 animate-pulse" />
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma solicitação pendente.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => memberAction(m.id, "approve", "Membro aprovado!")} disabled={processingId === m.id}
                      className="h-7 px-2 bg-emerald-600 hover:bg-emerald-500 border-0 text-xs">
                      {processingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" />Aprovar</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => memberAction(m.id, "reject", "Solicitação rejeitada.")} disabled={processingId === m.id}
                      className="h-7 px-2 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">
                      <XCircle className="h-3 w-3 mr-1" />Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convites enviados por e-mail */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-400" />
            Convites enviados
            {invited.length > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">{invited.length}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAll ? (
            <div className="h-12 rounded-lg bg-card/50 animate-pulse" />
          ) : invited.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum convite pendente de resposta.</p>
          ) : (
            <div className="space-y-3">
              {invited.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                  <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                    <p className="text-xs text-blue-400 mt-0.5">Aguardando resposta</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => memberAction(m.id, "remove", "Convite cancelado.")} disabled={processingId === m.id}
                    className="h-7 px-2 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs shrink-0">
                    {processingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><XCircle className="h-3 w-3 mr-1" />Cancelar</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Membros ativos */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-400" />
            Membros ativos
            {active.length > 0 && <span className="text-xs text-muted-foreground font-normal">({active.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAll ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-card/50 animate-pulse" />)}</div>
          ) : active.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro ainda.</p>
          ) : (
            <div className="space-y-2">
              {active.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border/40 p-2.5">
                  <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{m.user.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize shrink-0">{m.role}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                  </div>
                  {m.role !== "owner" && (
                    <button onClick={() => {
                      if (!confirm(`Remover ${m.user.name} do Circle?`)) return;
                      memberAction(m.id, "remove", `${m.user.name} removido.`);
                    }} disabled={processingId === m.id}
                      className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                      {processingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Link */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4 text-violet-400" />
            Link de convite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Qualquer pessoa com o link pode entrar no Circle, mesmo se for <strong>invite-only</strong>. Revogue quando quiser.
          </p>
          {inviteUrl ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="text-xs font-mono bg-muted/50" />
                <Button size="sm" onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Link copiado!"); }} variant="outline" className="shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={revokeLink} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs">
                <Trash2 className="h-3.5 w-3.5 mr-1" />Revogar link
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={generateLink} disabled={generatingLink} variant="outline">
              {generatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Link2 className="h-3.5 w-3.5 mr-1.5" />Gerar link de convite</>}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Convidar por e-mail com autocomplete */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-indigo-400" />
            Convidar por e-mail ou nome
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Digite o nome, <strong>@username</strong> ou <strong>e-mail</strong> do usuário. O usuário precisa ter conta no SpeakFlow.
          </p>
          <div ref={suggRef} className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type="text" value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSugg(true)}
                  placeholder="Nome, @username ou email@exemplo.com"
                  autoComplete="off"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <Button size="sm" disabled={addingEmail || !query.trim()} onClick={() => addByQuery(query)}
                className="shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0">
                {addingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1.5" />Convidar</>}
              </Button>
            </div>
            {showSugg && suggestions.length > 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-border/50 bg-card shadow-xl overflow-hidden">
                {suggestions.map((u) => (
                  <button key={u.id} onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (u.memberStatus === "active") { toast.error("Usuário já é membro."); return; }
                      if (u.memberStatus === "invited") { toast.error("Convite já enviado."); return; }
                      addByQuery(u.email);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left">
                    <Avatar name={u.name} avatarUrl={u.avatarUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {u.memberStatus && statusBadge(u.memberStatus)}
                    {!u.memberStatus && <span className="text-xs text-violet-400 shrink-0">Convidar</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button variant="outline" asChild><Link href={`/network/${circleId}`}><ArrowLeft className="h-4 w-4 mr-1.5" />Voltar ao Circle</Link></Button>
      </div>
    </div>
  );
}
