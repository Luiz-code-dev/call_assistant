"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, Users, Building2, TrendingUp, Target, DollarSign,
  Plus, Search, Filter, ChevronDown, X, Check, Loader2,
  RefreshCw, Edit2, Trash2, MessageSquare, Clock, ArrowRight,
  Briefcase, Mail, Phone, Tag, Star, Home, LogOut, Activity,
  UserPlus, Zap, Globe, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

function authFetch(url: string, opts: RequestInit = {}) {
  const t = typeof window !== "undefined"
    ? (sessionStorage.getItem("sf_token") || localStorage.getItem("sf_token"))
    : null;
  return fetch(url, { ...opts, headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...((opts.headers as any) ?? {}) } });
}

const STATUSES = [
  { value: "novo",              label: "Novo",             color: "bg-zinc-700 text-zinc-300" },
  { value: "contato_iniciado",  label: "Contato",          color: "bg-sky-900/60 text-sky-300" },
  { value: "qualificado",       label: "Qualificado",      color: "bg-violet-900/60 text-violet-300" },
  { value: "trial",             label: "Trial",            color: "bg-amber-900/60 text-amber-300" },
  { value: "negociacao",        label: "Negociação",       color: "bg-orange-900/60 text-orange-300" },
  { value: "convertido",        label: "Convertido",       color: "bg-emerald-900/60 text-emerald-300" },
  { value: "perdido",           label: "Perdido",          color: "bg-rose-900/60 text-rose-300" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = Object.fromEntries(
  STATUSES.map(s => [s.value, { label: s.label, color: s.color }])
);

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "bg-zinc-700 text-zinc-300" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>{s.label}</span>;
}

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`h-1.5 w-1.5 rounded-full ${i <= Math.ceil(score / 20) ? "bg-violet-400" : "bg-zinc-700"}`} />
      ))}
    </div>
  );
}

interface Lead {
  id: string; name: string; email: string; phone?: string; company?: string;
  role?: string; teamSize?: string; origin: string; status: string; score: number;
  notes?: string; lastContact?: string; assignedTo?: string;
  createdAt: string; updatedAt: string;
  _count?: { activities: number };
  activities?: { id: string; type: string; content: string; createdAt: string; authorId: string }[];
}

interface Stats {
  totalUsers: number; newUsersThisWeek: number; premiumUsers: number;
  freeUsers: number; b2bUsers: number; totalOrgs: number; activeOrgs: number;
  mrrEstimate: number; totalLeads: number; newLeadsThisWeek: number;
  convertedLeads: number; activeTrials: number;
  leadsByStatus: Record<string, number>; planMap: Record<string, number>;
}

interface PlatformUser {
  id: string; name: string; email: string; plan: string; credits: number;
  b2bAccess: boolean; createdAt: string; avatarUrl?: string;
  _count: { orgMemberships: number };
}

const EMPTY_FORM = { name: "", email: "", phone: "", company: "", role: "", teamSize: "", origin: "manual", status: "novo", score: 0, notes: "" };

export default function CRMPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "leads" | "pipeline" | "users">("overview");
  const [stats, setStats]   = useState<Stats | null>(null);
  const [leads, setLeads]   = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [users, setUsers]   = useState<PlatformUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchLead, setSearchLead] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchUser, setSearchUser] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const loadStats = useCallback(async () => {
    const r = await authFetch("/api/crm/stats");
    if (r.ok) setStats(await r.json());
    setLoading(false);
  }, []);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    const qs = new URLSearchParams({ limit: "100", q: searchLead, ...(filterStatus !== "all" ? { status: filterStatus } : {}) });
    const r = await authFetch(`/api/crm/leads?${qs}`);
    if (r.status === 403) { router.push("/home"); return; }
    if (r.ok) { const d = await r.json(); setLeads(d.leads); setTotalLeads(d.total); }
    setLoadingLeads(false);
  }, [searchLead, filterStatus, router]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const qs = new URLSearchParams({ limit: "100", q: searchUser, ...(filterPlan !== "all" ? { plan: filterPlan } : {}) });
    const r = await authFetch(`/api/crm/users?${qs}`);
    if (r.ok) { const d = await r.json(); setUsers(d.users); setTotalUsers(d.total); }
    setLoadingUsers(false);
  }, [searchUser, filterPlan]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === "leads" || tab === "pipeline") loadLeads(); }, [tab, loadLeads]);
  useEffect(() => { if (tab === "users") loadUsers(); }, [tab, loadUsers]);

  async function openLead(lead: Lead) {
    const r = await authFetch(`/api/crm/leads/${lead.id}`);
    if (r.ok) setSelectedLead(await r.json());
  }

  async function saveLead() {
    setSaving(true);
    if (editingLead) {
      const r = await authFetch(`/api/crm/leads/${editingLead.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (r.ok) { toast.success("Lead atualizado"); setShowLeadModal(false); loadLeads(); loadStats(); }
      else toast.error("Erro ao atualizar");
    } else {
      const r = await authFetch("/api/crm/leads", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (r.ok) { toast.success("Lead criado!"); setShowLeadModal(false); loadLeads(); loadStats(); }
      else toast.error("Erro ao criar lead");
    }
    setSaving(false);
  }

  async function updateStatus(leadId: string, status: string) {
    const r = await authFetch(`/api/crm/leads/${leadId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (r.ok) { loadLeads(); loadStats(); if (selectedLead?.id === leadId) openLead({ id: leadId } as Lead); }
  }

  async function deleteLead(leadId: string) {
    if (!confirm("Deletar este lead?")) return;
    const r = await authFetch(`/api/crm/leads/${leadId}`, { method: "DELETE" });
    if (r.ok) { setSelectedLead(null); loadLeads(); loadStats(); toast.success("Lead removido"); }
  }

  async function addNote() {
    if (!noteText.trim() || !selectedLead) return;
    setAddingNote(true);
    const r = await authFetch(`/api/crm/leads/${selectedLead.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addNote: noteText.trim(), lastContact: new Date().toISOString() }),
    });
    if (r.ok) { setNoteText(""); openLead(selectedLead); toast.success("Nota adicionada"); }
    setAddingNote(false);
  }

  async function createLeadFromUser(u: PlatformUser) {
    const r = await authFetch("/api/crm/leads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: u.name, email: u.email, origin: "platform_user", userId: u.id, status: "qualificado", score: u.plan === "premium" ? 80 : u.plan === "basic" ? 50 : 20 }),
    });
    if (r.ok) { toast.success(`Lead criado para ${u.name}`); loadStats(); }
    else toast.error("Erro ao criar lead");
  }

  function openNewLead() { setEditingLead(null); setForm({ ...EMPTY_FORM }); setShowLeadModal(true); }
  function openEditLead(lead: Lead) {
    setEditingLead(lead);
    setForm({ name: lead.name, email: lead.email, phone: lead.phone ?? "", company: lead.company ?? "", role: lead.role ?? "", teamSize: lead.teamSize ?? "", origin: lead.origin, status: lead.status, score: lead.score, notes: lead.notes ?? "" });
    setShowLeadModal(true);
  }

  const convRate = stats && stats.totalLeads > 0 ? Math.round((stats.convertedLeads / stats.totalLeads) * 100) : 0;

  const TABS = [
    { id: "overview",  label: "Dashboard",  icon: BarChart3 },
    { id: "leads",     label: "Leads",      icon: Target },
    { id: "pipeline",  label: "Pipeline",   icon: Zap },
    { id: "users",     label: "Usuários",   icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header — brand + action buttons only (tabs moved below) */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight truncate">SpeakFlow CRM</span>
            <span className="hidden sm:inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-400 border border-violet-500/20 shrink-0">GROWTH</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { loadStats(); if (tab === "leads" || tab === "pipeline") loadLeads(); }}
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => router.push("/home")}
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
              <Home className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tab bar — scrollable on mobile */}
        <div className="overflow-x-auto scrollbar-none border-t border-zinc-800/60">
          <nav className="flex min-w-max px-4 gap-1 py-1.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors
                  ${tab === id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />{label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-3 sm:px-6 py-5 space-y-5">

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {tab === "overview" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
            ) : stats && (
              <>
                <div>
                  <h1 className="text-2xl font-black text-white">Dashboard Comercial</h1>
                  <p className="text-sm text-zinc-400 mt-0.5">Visão geral em tempo real do crescimento do SpeakFlow</p>
                </div>

                {/* KPI Row 1 — Leads */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Leads",     value: stats.totalLeads,       sub: `+${stats.newLeadsThisWeek} esta semana`,  icon: Target,      color: "text-violet-400",  bg: "from-violet-500/10" },
                    { label: "Convertidos",     value: stats.convertedLeads,   sub: `${convRate}% de conversão`,               icon: Check,       color: "text-emerald-400", bg: "from-emerald-500/10" },
                    { label: "Trials Ativos",   value: stats.activeTrials,     sub: "no pipeline",                             icon: Zap,         color: "text-amber-400",   bg: "from-amber-500/10" },
                    { label: "MRR Estimado",    value: `R$ ${stats.mrrEstimate.toLocaleString("pt-BR")}`, sub: "orgs ativas", icon: DollarSign,  color: "text-sky-400",     bg: "from-sky-500/10" },
                  ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                    <div key={label} className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${bg} to-transparent p-5`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <p className={`text-3xl font-black ${color}`}>{value}</p>
                      <p className="text-xs text-zinc-500 mt-1">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* KPI Row 2 — Usuários */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Usuários",   value: stats.totalUsers,     sub: `+${stats.newUsersThisWeek} esta semana`, icon: Users,      color: "text-indigo-400",  bg: "from-indigo-500/10" },
                    { label: "Pagantes",          value: stats.premiumUsers,   sub: "basic + premium",                       icon: Star,       color: "text-amber-400",   bg: "from-amber-500/10" },
                    { label: "Empresas",          value: stats.totalOrgs,      sub: `${stats.activeOrgs} ativas`,            icon: Building2,  color: "text-rose-400",    bg: "from-rose-500/10" },
                    { label: "Acesso B2B",        value: stats.b2bUsers,       sub: "usuários corporativos",                 icon: Briefcase,  color: "text-teal-400",    bg: "from-teal-500/10" },
                  ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                    <div key={label} className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${bg} to-transparent p-5`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <p className={`text-3xl font-black ${color}`}>{value}</p>
                      <p className="text-xs text-zinc-500 mt-1">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Pipeline snapshot */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                  <h2 className="text-sm font-bold text-white mb-4">Pipeline de Leads</h2>
                  <div className="flex gap-2 flex-wrap">
                    {STATUSES.map(s => {
                      const count = stats.leadsByStatus[s.value] ?? 0;
                      return (
                        <button key={s.value} onClick={() => { setTab("leads"); setFilterStatus(s.value); }}
                          className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 hover:border-zinc-600 transition-colors text-left">
                          <div>
                            <p className="text-lg font-black text-white">{count}</p>
                            <p className={`text-[10px] font-semibold ${s.color.split(" ")[1]}`}>{s.label}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Users by plan */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                  <h2 className="text-sm font-bold text-white mb-4">Distribuição de Planos</h2>
                  <div className="space-y-3">
                    {[
                      { plan: "free",    label: "Gratuito", color: "bg-zinc-600" },
                      { plan: "basic",   label: "Básico",   color: "bg-violet-500" },
                      { plan: "premium", label: "Premium",  color: "bg-indigo-500" },
                    ].map(({ plan, label, color }) => {
                      const count = stats.planMap[plan] ?? 0;
                      const pct   = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
                      return (
                        <div key={plan} className="flex items-center gap-3">
                          <span className="w-20 text-xs text-zinc-400 text-right">{label}</span>
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-16 text-xs text-zinc-300 font-medium">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── LEADS ─────────────────────────────────────────────── */}
        {tab === "leads" && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white">Gestão de Leads</h1>
                <p className="text-sm text-zinc-400 mt-0.5">{totalLeads} leads no total</p>
              </div>
              <button onClick={openNewLead}
                className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors">
                <Plus className="h-4 w-4" /> Novo Lead
              </button>
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input value={searchLead} onChange={e => setSearchLead(e.target.value)} onKeyDown={e => e.key === "Enter" && loadLeads()}
                  placeholder="Buscar por nome, email, empresa..."
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none" />
              </div>
              <div className="overflow-x-auto scrollbar-none -mx-3 sm:mx-0">
                <div className="flex gap-1.5 min-w-max px-3 sm:px-0 flex-nowrap">
                  {[{ value: "all", label: "Todos" }, ...STATUSES].map(s => (
                    <button key={s.value} onClick={() => setFilterStatus(s.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors
                        ${filterStatus === s.value ? "bg-violet-600 text-white" : "border border-zinc-700 text-zinc-400 hover:text-white"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            {loadingLeads ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Lead</th>
                      <th className="hidden sm:table-cell px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Empresa</th>
                      <th className="px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="hidden md:table-cell px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Score</th>
                      <th className="hidden md:table-cell px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contato</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length === 0 ? (
                      <tr><td colSpan={6} className="py-16 text-center text-zinc-500">Nenhum lead encontrado.</td></tr>
                    ) : leads.map(lead => (
                      <tr key={lead.id} onClick={() => openLead(lead)}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-white leading-tight">{lead.name}</p>
                          <p className="text-xs text-zinc-500 truncate max-w-[140px]">{lead.email}</p>
                          <p className="sm:hidden text-xs text-zinc-500 mt-0.5">{lead.company ?? ""}</p>
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3">
                          <p className="text-zinc-300">{lead.company ?? "—"}</p>
                          <p className="text-xs text-zinc-500">{lead.role ?? ""}</p>
                        </td>
                        <td className="px-3 py-3"><StatusBadge status={lead.status} /></td>
                        <td className="hidden md:table-cell px-3 py-3"><ScoreDots score={lead.score} /></td>
                        <td className="hidden md:table-cell px-3 py-3 text-xs text-zinc-500">
                          {lead.lastContact ? new Date(lead.lastContact).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEditLead(lead)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => deleteLead(lead.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-700 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── PIPELINE ─────────────────────────────────────────── */}
        {tab === "pipeline" && (
          <>
            <div>
              <h1 className="text-2xl font-black text-white">Pipeline Comercial</h1>
              <p className="text-sm text-zinc-400 mt-0.5">Clique no status do card para mover</p>
            </div>
            {loadingLeads ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>
            ) : (
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {STATUSES.map(col => {
                    const colLeads = leads.filter(l => l.status === col.value);
                    return (
                      <div key={col.value} className="w-64 flex-shrink-0">
                        <div className="flex items-center justify-between mb-3 px-1">
                          <span className={`text-xs font-bold uppercase tracking-wider ${col.color.split(" ")[1]}`}>{col.label}</span>
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">{colLeads.length}</span>
                        </div>
                        <div className="space-y-2 min-h-[120px]">
                          {colLeads.map(lead => (
                            <div key={lead.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 cursor-pointer hover:border-zinc-700 transition-colors" onClick={() => openLead(lead)}>
                              <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
                              {lead.company && <p className="text-xs text-zinc-500 truncate mt-0.5">{lead.company}</p>}
                              <div className="flex items-center justify-between mt-2">
                                <ScoreDots score={lead.score} />
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                  {STATUSES.filter(s => s.value !== col.value).slice(0, 2).map(s => (
                                    <button key={s.value} title={`Mover para ${s.label}`}
                                      onClick={() => updateStatus(lead.id, s.value)}
                                      className="rounded px-1.5 py-0.5 text-[9px] font-bold border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors">
                                      {s.label.slice(0, 3)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── USUÁRIOS ─────────────────────────────────────────── */}
        {tab === "users" && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white">Usuários da Plataforma</h1>
                <p className="text-sm text-zinc-400 mt-0.5">{totalUsers} usuários cadastrados</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input value={searchUser} onChange={e => setSearchUser(e.target.value)} onKeyDown={e => e.key === "Enter" && loadUsers()}
                  placeholder="Buscar por nome ou email..."
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none" />
              </div>
              <div className="flex gap-1.5">
                {[{ v: "all", l: "Todos" }, { v: "free", l: "Gratuito" }, { v: "basic", l: "Básico" }, { v: "premium", l: "Premium" }].map(p => (
                  <button key={p.v} onClick={() => setFilterPlan(p.v)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors
                      ${filterPlan === p.v ? "bg-violet-600 text-white" : "border border-zinc-700 text-zinc-400 hover:text-white"}`}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      {["Usuário", "Plano", "Créditos", "Orgs", "Cadastro", ""].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={6} className="py-16 text-center text-zinc-500">Nenhum usuário encontrado.</td></tr>
                    ) : users.map(u => (
                      <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">{u.name ?? "—"}</p>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            u.plan === "premium" ? "bg-indigo-900/60 text-indigo-300" :
                            u.plan === "basic"   ? "bg-violet-900/60 text-violet-300" :
                            "bg-zinc-800 text-zinc-400"}`}>{u.plan}</span>
                          {u.b2bAccess && <span className="ml-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-teal-900/60 text-teal-300">B2B</span>}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{u.credits}</td>
                        <td className="px-4 py-3 text-zinc-300">{u._count.orgMemberships}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{new Date(u.createdAt).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => createLeadFromUser(u)}
                            className="flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-violet-400 hover:border-violet-500/50 transition-colors">
                            <UserPlus className="h-3 w-3" /> Lead
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── LEAD DETAIL DRAWER ──────────────────────────────────── */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
          <div className="w-full max-w-lg bg-zinc-950 border-l border-zinc-800 overflow-y-auto flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
              <div>
                <h2 className="font-bold text-white">{selectedLead.name}</h2>
                <p className="text-xs text-zinc-500">{selectedLead.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEditLead(selectedLead)} className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:text-white transition-colors"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => deleteLead(selectedLead.id)} className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:text-rose-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                <button onClick={() => setSelectedLead(null)} className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* Status row */}
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button key={s.value} onClick={() => updateStatus(selectedLead.id, s.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors
                      ${selectedLead.status === s.value ? `${s.color} border-transparent` : "border-zinc-700 text-zinc-500 hover:text-white"}`}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { icon: Briefcase, label: "Empresa",  value: selectedLead.company },
                  { icon: Tag,       label: "Cargo",    value: selectedLead.role },
                  { icon: Phone,     label: "Telefone", value: selectedLead.phone },
                  { icon: Users,     label: "Time",     value: selectedLead.teamSize },
                  { icon: Globe,     label: "Origem",   value: selectedLead.origin },
                  { icon: Star,      label: "Score",    value: String(selectedLead.score) },
                ].map(({ icon: Icon, label, value }) => value && (
                  <div key={label} className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2">
                    <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500">{label}</p>
                      <p className="text-xs text-zinc-200 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {selectedLead.notes && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Notas</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              )}

              {/* Add note */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Adicionar nota</p>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
                  placeholder="Descreva o contato, resultado da reunião, próximos passos..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none focus:border-violet-500 focus:outline-none" />
                <button onClick={addNote} disabled={addingNote || !noteText.trim()}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-white transition-colors">
                  {addingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                  Registrar
                </button>
              </div>

              {/* Activity log */}
              {selectedLead.activities && selectedLead.activities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Histórico</p>
                  <div className="space-y-2">
                    {selectedLead.activities.map(act => (
                      <div key={act.id} className="flex gap-3 text-sm">
                        <div className="mt-1 h-2 w-2 rounded-full bg-violet-500 shrink-0" />
                        <div>
                          <p className="text-zinc-300">{act.content}</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">{new Date(act.createdAt).toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LEAD FORM MODAL ─────────────────────────────────────── */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowLeadModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="font-bold text-white">{editingLead ? "Editar Lead" : "Novo Lead"}</h2>
              <button onClick={() => setShowLeadModal(false)} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              {[
                { key: "name",     label: "Nome *",   type: "text" },
                { key: "email",    label: "Email *",  type: "email" },
                { key: "phone",    label: "Telefone", type: "text" },
                { key: "company",  label: "Empresa",  type: "text" },
                { key: "role",     label: "Cargo",    type: "text" },
                { key: "teamSize", label: "Tamanho do time", type: "text" },
              ].map(({ key, label, type }) => (
                <div key={key} className={key === "name" || key === "email" ? "col-span-2" : ""}>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none">
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Score (0–100)</label>
                <input type="number" min={0} max={100} value={form.score} onChange={e => setForm(f => ({ ...f, score: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Notas</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-white resize-none focus:border-violet-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-zinc-800">
              <button onClick={() => setShowLeadModal(false)} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={saveLead} disabled={saving || !form.name || !form.email}
                className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingLead ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
