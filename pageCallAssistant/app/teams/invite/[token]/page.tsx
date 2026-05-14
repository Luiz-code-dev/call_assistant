"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, CheckCircle2, XCircle, Loader2, ChevronDown } from "lucide-react";
import Link from "next/link";

const DEPARTMENTS = [
  "Comercial / Vendas", "Customer Success", "Suporte ao Cliente",
  "Marketing", "Produto", "Tecnologia / TI", "RH / Pessoas",
  "Financeiro", "Operações", "Jurídico", "Diretoria / C-Level", "Outro",
];

interface InviteInfo {
  invite: {
    id: string; email: string; role: string; expiresAt: string;
    org: { id: string; name: string; slug: string; logoUrl: string | null; industry: string | null };
  };
}

function authFetch(url: string, opts: RequestInit = {}) {
  const token = typeof window !== "undefined"
    ? (sessionStorage.getItem("sf_token") || localStorage.getItem("sf_token"))
    : null;
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

function hasSession() {
  if (typeof window === "undefined") return false;
  return !!(sessionStorage.getItem("sf_token") || localStorage.getItem("sf_token"));
}

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState<"accepted" | "rejected" | null>(null);
  const [department, setDepartment] = useState("");
  const [showDeptStep, setShowDeptStep] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(hasSession());
    fetch(`/api/org/invites/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setInfo(data);
      })
      .catch(() => setError("Erro ao carregar convite."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!department) { setShowDeptStep(true); return; }
    setActing(true);
    const res = await authFetch(`/api/org/invites/${token}`, {
      method: "POST",
      body: JSON.stringify({ action: "accept", department }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.setItem("sf_pending_invite_token", token as string);
        router.push(`/register?invite=${token}&email=${encodeURIComponent(info!.invite.email)}`);
        return;
      }
      setError(data.error ?? "Erro ao processar convite.");
      setActing(false);
      return;
    }
    setDone("accepted");
    if (data.slug) setTimeout(() => router.push(`/teams/${data.slug}/dashboard`), 1500);
    setActing(false);
  }

  async function handleReject() {
    setActing(true);
    const res = await authFetch(`/api/org/invites/${token}`, {
      method: "POST",
      body: JSON.stringify({ action: "reject" }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        router.push(`/login?redirect=/teams/invite/${token}`);
        return;
      }
      setError(data.error ?? "Erro.");
      setActing(false);
      return;
    }
    setDone("rejected");
    setActing(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 max-w-sm w-full text-center">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-lg font-bold text-white mb-2">Convite inválido</h1>
        <p className="text-zinc-400 text-sm mb-6">{error}</p>
        <Link href="/teams" className="text-violet-400 hover:text-violet-300 text-sm font-medium">Ver minhas organizações</Link>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 max-w-sm w-full text-center">
        {done === "accepted" ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-white mb-2">Bem-vindo à equipe!</h1>
            <p className="text-zinc-400 text-sm">Redirecionando para o dashboard...</p>
          </>
        ) : (
          <>
            <XCircle className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-white mb-2">Convite recusado</h1>
            <Link href="/home" className="text-violet-400 hover:text-violet-300 text-sm font-medium">Voltar para o início</Link>
          </>
        )}
      </div>
    </div>
  );

  const invite = info!.invite;

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            {invite.org.logoUrl
              ? <img src={invite.org.logoUrl} alt={invite.org.name} className="w-full h-full rounded-2xl object-cover" />
              : <Building2 className="h-8 w-8 text-violet-400" />
            }
          </div>
          <p className="text-zinc-400 text-sm mb-1">Você foi convidado para</p>
          <h1 className="text-xl font-bold text-white">{invite.org.name}</h1>
          <p className="text-zinc-500 text-sm mt-1">como <span className="text-zinc-300">{invite.role === "admin" ? "Administrador" : "Membro"}</span></p>
        </div>

        <div className="bg-zinc-800/60 rounded-xl p-4 mb-5 text-sm text-zinc-400">
          <p>Convite para: <span className="text-zinc-200">{invite.email}</span></p>
          <p className="mt-1">Expira em: <span className="text-zinc-200">{new Date(invite.expiresAt).toLocaleDateString("pt-BR")}</span></p>
        </div>

        {/* Seleção de setor */}
        {(showDeptStep || department) && (
          <div className="mb-5">
            <label className="block text-xs font-medium text-zinc-400 mb-2">Seu setor na empresa *</label>
            <div className="relative">
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full appearance-none bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="">Selecione seu setor...</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Não tem conta */}
        {!loggedIn && (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 mb-5">
            <p className="text-xs font-semibold text-violet-300 mb-1">Primeiro acesso?</p>
            <p className="text-xs text-zinc-400 mb-3">Crie sua conta com o e-mail <strong className="text-zinc-300">{invite.email}</strong> e o convite será aceito automaticamente.</p>
            <div className="flex gap-2">
              <Link
                href={`/register?invite=${token}&email=${encodeURIComponent(invite.email)}`}
                onClick={() => localStorage.setItem("sf_pending_invite_token", token as string)}
                className="flex-1 text-center py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Criar conta
              </Link>
              <Link
                href={`/login?redirect=/teams/invite/${token}`}
                className="flex-1 text-center py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={acting}
            className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-lg font-medium text-sm transition-colors"
          >
            Recusar
          </button>
          <button
            onClick={handleAccept}
            disabled={acting}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {!department && !showDeptStep ? "Aceitar convite" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
