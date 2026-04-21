"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Link2, Copy, Trash2, UserPlus, CheckCircle2,
  XCircle, Loader2, RefreshCw, Shield, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PendingMember {
  id: string; role: string; status: string; joinedAt: string;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-violet-600 to-indigo-600","from-emerald-500 to-teal-600","from-rose-500 to-pink-600","from-amber-500 to-orange-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatarUrl) return <img src={avatarUrl} alt={name} className="h-9 w-9 rounded-full object-cover ring-2 ring-border shrink-0" />;
  return <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>{initials}</div>;
}

export default function ManagePage() {
  const { circleId } = useParams<{ circleId: string }>();
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [inviteUrl, setInviteUrl] = useState("");
  const [query, setQuery] = useState("");
  const [loadingPending, setLoadingPending] = useState(true);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    const r = await fetch(`/api/network/circles/${circleId}/members?status=pending`);
    if (r.ok) setPending(await r.json());
    setLoadingPending(false);
  }, [circleId]);

  useEffect(() => { loadPending(); }, [loadPending]);

  const approve = async (memberId: string) => {
    setProcessingId(memberId);
    const r = await fetch(`/api/network/circles/${circleId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    if (r.ok) { toast.success("Membro aprovado!"); await loadPending(); }
    else toast.error("Erro ao aprovar.");
    setProcessingId(null);
  };

  const reject = async (memberId: string) => {
    setProcessingId(memberId);
    const r = await fetch(`/api/network/circles/${circleId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    if (r.ok) { toast.success("Solicitação rejeitada."); await loadPending(); }
    else toast.error("Erro ao rejeitar.");
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

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copiado!");
  };

  const addByQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setAddingEmail(true);
    const r = await fetch(`/api/network/circles/${circleId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.trim() }),
    });
    const d = await r.json();
    if (r.ok) { toast.success(`${d.user?.name ?? query} adicionado ao Circle!`); setQuery(""); }
    else toast.error(d.error ?? "Erro ao adicionar.");
    setAddingEmail(false);
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

      {/* Pending */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              Solicitações pendentes
              {pending.length > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">{pending.length}</span>
              )}
            </CardTitle>
            <button onClick={loadPending} className="text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingPending ? "animate-spin" : ""}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPending ? (
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
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => approve(m.id)} disabled={processingId === m.id}
                      className="h-7 px-2 bg-emerald-600 hover:bg-emerald-500 border-0 text-xs">
                      {processingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" />Aprovar</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(m.id)} disabled={processingId === m.id}
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
                <Button size="sm" onClick={copyLink} variant="outline" className="shrink-0">
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

      {/* Add by email */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-indigo-400" />
            Adicionar membro por e-mail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Busque por <strong>@username</strong> ou <strong>e-mail</strong>. O usuário precisa ter conta no SpeakFlow.
          </p>
          <form onSubmit={addByQuery} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="query" className="sr-only">Username ou e-mail</Label>
              <Input
                id="query" type="text" value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="@luizmelo ou email@exemplo.com"
              />
            </div>
            <Button type="submit" size="sm" disabled={addingEmail || !query.trim()} className="shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0">
              {addingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1.5" />Adicionar</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button variant="outline" asChild><Link href={`/network/${circleId}`}><ArrowLeft className="h-4 w-4 mr-1.5" />Voltar ao Circle</Link></Button>
      </div>
    </div>
  );
}
