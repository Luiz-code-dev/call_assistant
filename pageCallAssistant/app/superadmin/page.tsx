"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Users, ShieldAlert, ShieldCheck, Edit2, Check, X,
  RefreshCw, UserPlus, Loader2, LogOut, ChevronUp, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  seatLimit: number;
  memberCount: number;
  isActive: boolean;
  suspendedAt: string | null;
  createdAt: string;
  industry: string | null;
  cnpj: string | null;
  cnpjStatus: string | null;
  owner: { id: string; name: string; email: string; b2bSeatLimit: number } | null;
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

export default function SuperAdminPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSeats, setEditSeats] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [grantingAdmin, setGrantingAdmin] = useState(false);
  const [rootEmail, setRootEmail] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "members" | "seats" | "created">("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function load() {
    setLoading(true);
    const res = await authFetch("/api/superadmin/orgs");
    if (res.status === 403) { router.replace("/home"); return; }
    const data = await res.json();
    if (Array.isArray(data)) setOrgs(data);
    const meRes = await authFetch("/api/superadmin/me");
    if (meRes.ok) { const me = await meRes.json(); setRootEmail(me.rootEmail ?? ""); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSaveSeats(org: Org) {
    const seats = parseInt(editSeats);
    if (!seats || seats < 1) { toast.error("Número inválido."); return; }
    setSaving(true);
    const res = await authFetch("/api/superadmin/orgs", {
      method: "PATCH",
      body: JSON.stringify({ orgId: org.id, seatLimit: seats }),
    });
    if (res.ok) {
      toast.success(`Limite atualizado para ${seats} assentos.`);
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, seatLimit: seats } : o));
      setEditingId(null);
    } else {
      toast.error("Erro ao salvar.");
    }
    setSaving(false);
  }

  async function handleToggleActive(org: Org) {
    const next = !org.isActive;
    const confirm = window.confirm(next
      ? `Reativar organização "${org.name}"?`
      : `Suspender organização "${org.name}"? Os membros não conseguirão entrar.`
    );
    if (!confirm) return;
    const res = await authFetch("/api/superadmin/orgs", {
      method: "PATCH",
      body: JSON.stringify({ orgId: org.id, isActive: next }),
    });
    if (res.ok) {
      toast.success(next ? "Organização reativada." : "Organização suspensa.");
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, isActive: next } : o));
    } else {
      toast.error("Erro ao atualizar.");
    }
  }

  async function handleGrantAdmin() {
    if (!newAdminEmail.trim()) return;
    setGrantingAdmin(true);
    const res = await authFetch("/api/superadmin/users", {
      method: "POST",
      body: JSON.stringify({ email: newAdminEmail.trim(), grant: true }),
    });
    if (res.ok) {
      toast.success(`${newAdminEmail} agora é super-admin.`);
      setNewAdminEmail("");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro.");
    }
    setGrantingAdmin(false);
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  const sorted = [...orgs].sort((a, b) => {
    let va: string | number = a.createdAt;
    let vb: string | number = b.createdAt;
    if (sortBy === "name") { va = a.name; vb = b.name; }
    if (sortBy === "members") { va = a.memberCount; vb = b.memberCount; }
    if (sortBy === "seats") { va = a.seatLimit; vb = b.seatLimit; }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ col }: { col: typeof sortBy }) => sortBy !== col ? null : (
    sortDir === "asc" ? <ChevronUp className="inline h-3 w-3 ml-0.5" /> : <ChevronDown className="inline h-3 w-3 ml-0.5" />
  );

  const overLimitOrgs = orgs.filter(o => o.memberCount > o.seatLimit);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Super Admin</h1>
              <p className="text-xs text-zinc-400">SpeakFlow — Painel de Controle</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </button>
            <button onClick={() => router.push("/home")} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total de orgs", value: orgs.length, icon: Building2, color: "text-violet-400" },
            { label: "Total de membros", value: orgs.reduce((s, o) => s + o.memberCount, 0), icon: Users, color: "text-sky-400" },
            { label: "Orgs ativas", value: orgs.filter(o => o.isActive).length, icon: ShieldCheck, color: "text-emerald-400" },
            { label: "Acima do limite", value: overLimitOrgs.length, icon: ShieldAlert, color: "text-red-400" },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <kpi.icon className={`h-5 w-5 mb-2 ${kpi.color}`} />
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Over-limit alert */}
        {overLimitOrgs.length > 0 && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-red-400" />
              <p className="text-sm font-semibold text-red-300">Organizações acima do limite contratado</p>
            </div>
            {overLimitOrgs.map(o => (
              <p key={o.id} className="text-xs text-red-400">
                • <strong>{o.name}</strong> — {o.memberCount} membros / limite {o.seatLimit}
                {o.owner && <span className="text-red-300/60"> ({o.owner.email})</span>}
              </p>
            ))}
          </div>
        )}

        {/* Grant admin */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
          <p className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-violet-400" /> Gerenciar Super-Admins
          </p>

          {/* Root admin — protected */}
          {rootEmail && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-300">{rootEmail}</p>
                <p className="text-xs text-amber-500/70">Root admin — protegido pelo servidor. Não pode ser revogado via painel.</p>
              </div>
              <span className="rounded-full border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 tracking-wider">ROOT</span>
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              placeholder="email do co-admin"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder:text-zinc-600"
            />
            <button
              onClick={handleGrantAdmin}
              disabled={!newAdminEmail.trim() || grantingAdmin}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-4 py-2 text-sm font-medium transition-colors"
            >
              {grantingAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Conceder acesso
            </button>
          </div>
        </div>

        {/* Orgs table */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <p className="text-sm font-semibold">Organizações ({orgs.length})</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800 text-xs text-zinc-500">
                  <tr>
                    <th className="text-left px-5 py-3 cursor-pointer hover:text-zinc-300" onClick={() => toggleSort("name")}>Organização <SortIcon col="name" /></th>
                    <th className="text-left px-4 py-3">Dono</th>
                    <th className="text-center px-4 py-3 cursor-pointer hover:text-zinc-300" onClick={() => toggleSort("members")}>Membros <SortIcon col="members" /></th>
                    <th className="text-center px-4 py-3 cursor-pointer hover:text-zinc-300" onClick={() => toggleSort("seats")}>Limite <SortIcon col="seats" /></th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-center px-4 py-3 cursor-pointer hover:text-zinc-300" onClick={() => toggleSort("created")}>Criado <SortIcon col="created" /></th>
                    <th className="text-center px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {sorted.map(org => {
                    const overLimit = org.memberCount > org.seatLimit;
                    const usage = Math.min(100, Math.round((org.memberCount / org.seatLimit) * 100));
                    return (
                      <tr key={org.id} className={`hover:bg-zinc-800/40 transition-colors ${!org.isActive ? "opacity-50" : ""}`}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-white">{org.name}</p>
                          <p className="text-xs text-zinc-500">/{org.slug} · {org.industry ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          {org.owner ? (
                            <>
                              <p className="text-zinc-300">{org.owner.name}</p>
                              <p className="text-xs text-zinc-500">{org.owner.email}</p>
                            </>
                          ) : <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-semibold ${overLimit ? "text-red-400" : "text-white"}`}>
                              {org.memberCount}
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${overLimit ? "bg-red-500" : usage >= 80 ? "bg-amber-400" : "bg-emerald-500"}`}
                                style={{ width: `${usage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingId === org.id ? (
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                min={1}
                                value={editSeats}
                                onChange={e => setEditSeats(e.target.value)}
                                className="w-16 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
                                autoFocus
                                onKeyDown={e => { if (e.key === "Enter") handleSaveSeats(org); if (e.key === "Escape") setEditingId(null); }}
                              />
                              <button onClick={() => handleSaveSeats(org)} disabled={saving} className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40">
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </button>
                              <button onClick={() => setEditingId(null)} className="rounded p-1 text-zinc-500 hover:text-white">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingId(org.id); setEditSeats(String(org.seatLimit)); }}
                              className={`flex items-center gap-1 mx-auto rounded px-2 py-0.5 text-xs font-semibold hover:bg-zinc-700 transition-colors ${overLimit ? "text-red-400" : "text-zinc-300"}`}
                            >
                              {org.seatLimit} <Edit2 className="h-3 w-3 text-zinc-500" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${org.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                            {org.isActive ? "Ativa" : "Suspensa"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-zinc-500">
                          {new Date(org.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleActive(org)}
                            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${org.isActive
                              ? "border border-red-500/40 text-red-400 hover:bg-red-500/10"
                              : "border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"}`}
                          >
                            {org.isActive ? "Suspender" : "Reativar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sorted.length === 0 && (
                <p className="text-center py-12 text-zinc-600 text-sm">Nenhuma organização cadastrada.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
