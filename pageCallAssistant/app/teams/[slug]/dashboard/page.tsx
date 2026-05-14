"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users, Mic2, Target, Award, TrendingUp, Activity,
  Loader2, RefreshCw, BarChart3, Flame, Trophy,
  ArrowRight, Building2, UserPlus, ChevronUp, Radio, Globe,
} from "lucide-react";

interface OrgInfo { id: string; name: string; slug: string; role: string; industry: string | null; logoUrl: string | null; plan: string; }

interface Analytics {
  totalMembers: number;
  activeThisWeek: number;
  totalLiveSessions: number;
  liveSessionsThisWeek: number;
  totalChallenges: number;
  totalSubmissions: number;
  submissionsThisWeek: number;
  totalCertifications: number;
  avgCommunicationScore: number;
  topMembers: {
    id: string; userId: string; name: string;
    avatarUrl: string | null; role: string; commScore: number;
    team: string | null; department: string | null; jobTitle: string | null;
  }[];
  categoryBreakdown: { category: string; _count: { id: number } }[];
  departmentBreakdown: { department: string; count: number; avgScore: number }[];
}

function authFetch(url: string) {
  const token = typeof window !== "undefined"
    ? (sessionStorage.getItem("sf_token") || localStorage.getItem("sf_token"))
    : null;
  return fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
}

function Avatar({ name, avatarUrl, size = "md" }: { name: string; avatarUrl: string | null; size?: "sm" | "md" | "lg" }) {
  const [broken, setBroken] = useState(false);
  const dim = size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-sm";
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-violet-600/40 to-indigo-600/40 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-zinc-800`}>
      {avatarUrl && !broken
        ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" onError={() => setBroken(true)} />
        : <span className="font-bold text-violet-300 leading-none">{name[0]?.toUpperCase()}</span>
      }
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, sub, color, trend, onClick }: {
  label: string; value: string | number; icon: any; sub?: string; color: string; trend?: string; onClick?: () => void;
}) {
  const palette: Record<string, { card: string; icon: string; val: string }> = {
    violet: { card: "border-violet-500/20 bg-violet-500/5", icon: "bg-violet-500/15 text-violet-400", val: "text-violet-300" },
    indigo: { card: "border-indigo-500/20 bg-indigo-500/5", icon: "bg-indigo-500/15 text-indigo-400", val: "text-indigo-300" },
    emerald: { card: "border-emerald-500/20 bg-emerald-500/5", icon: "bg-emerald-500/15 text-emerald-400", val: "text-emerald-300" },
    amber: { card: "border-amber-500/20 bg-amber-500/5", icon: "bg-amber-500/15 text-amber-400", val: "text-amber-300" },
    sky: { card: "border-sky-500/20 bg-sky-500/5", icon: "bg-sky-500/15 text-sky-400", val: "text-sky-300" },
    rose: { card: "border-rose-500/20 bg-rose-500/5", icon: "bg-rose-500/15 text-rose-400", val: "text-rose-300" },
  };
  const p = palette[color] ?? palette.violet;
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-5 ${p.card} ${onClick ? "cursor-pointer hover:brightness-110 transition-all" : ""}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${p.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-400">
            <ChevronUp className="h-3 w-3" />{trend}
          </span>
        )}
      </div>
      <p className={`text-3xl font-black mb-1 ${p.val}`}>{value}</p>
      <p className="text-xs font-medium text-white leading-tight">{label}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  meetings: "Reuniões", sales: "Vendas", support: "Suporte",
  onboarding: "Onboarding", presentations: "Apresentações",
  "customer-success": "Customer Success", interviews: "Entrevistas", general: "Geral",
  calls: "Calls",
};

const MEDAL = ["🥇", "🥈", "🥉"];

export default function OrgDashboardPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const orgsRes = await authFetch("/api/org");
      const orgs = await orgsRes.json();
      const found = Array.isArray(orgs) ? orgs.find((o: any) => o.slug === slug) : null;
      if (!found) return;
      setOrg(found);
      const analyticsRes = await authFetch(`/api/org/${found.id}/analytics`);
      setAnalytics(await analyticsRes.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [slug]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
    </div>
  );

  if (!analytics || !org) return (
    <div className="p-8 text-center text-zinc-500">Erro ao carregar dados.</div>
  );

  const engRate = analytics.totalMembers > 0
    ? Math.round(((analytics.activeThisWeek ?? 0) / analytics.totalMembers) * 100)
    : 0;

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40 flex-shrink-0 overflow-hidden">
            {org.logoUrl
              ? <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              : <Building2 className="h-6 w-6 text-white" />
            }
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-white">{org.name}</h1>
              <span className="text-[10px] font-bold bg-violet-500/20 text-violet-300 rounded-full px-2 py-0.5 uppercase tracking-wide">FOR TEAMS</span>
            </div>
            <p className="text-xs text-zinc-500 capitalize mt-0.5">{today} · {org.industry ?? "Empresa"}</p>
          </div>
        </div>
        <button
          onClick={() => load(false)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* ── KPIs principais ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Membros ativos" value={analytics.totalMembers} icon={Users} sub="na organização" color="violet" onClick={() => router.push(`/teams/${slug}/members`)} />
        <KpiCard label="Engajamento semanal" value={`${engRate}%`} icon={Activity} sub={`${analytics.activeThisWeek} ativos`} color="emerald" trend={analytics.activeThisWeek > 0 ? `+${analytics.activeThisWeek}` : undefined} onClick={() => router.push(`/teams/${slug}/analytics`)} />
        <KpiCard label="Sessões Live" value={analytics.totalLiveSessions} icon={Mic2} sub={`+${analytics.liveSessionsThisWeek} esta semana`} color="indigo" trend={analytics.liveSessionsThisWeek > 0 ? `+${analytics.liveSessionsThisWeek}` : undefined} onClick={() => router.push(`/teams/${slug}/analytics`)} />
        <KpiCard label="Score médio" value={analytics.avgCommunicationScore} icon={BarChart3} sub="comunicação corporativa" color="sky" onClick={() => router.push(`/teams/${slug}/analytics`)} />
      </div>

      {/* ── KPIs secundários ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Desafios criados" value={analytics.totalChallenges} icon={Target} color="amber" onClick={() => router.push(`/teams/${slug}/challenges`)} />
        <KpiCard label="Submissões" value={analytics.totalSubmissions} icon={TrendingUp} sub={`+${analytics.submissionsThisWeek} esta semana`} color="violet" trend={analytics.submissionsThisWeek > 0 ? `+${analytics.submissionsThisWeek}` : undefined} onClick={() => router.push(`/teams/${slug}/analytics`)} />
        <KpiCard label="Certificações" value={analytics.totalCertifications} icon={Award} sub="emitidas" color="amber" onClick={() => router.push(`/teams/${slug}/certifications`)} />
        <KpiCard label="Membros sem setor" value={analytics.departmentBreakdown.find(d => d.department === "Sem setor")?.count ?? 0} icon={Flame} sub="definir setor em Membros" color="rose" onClick={() => router.push(`/teams/${slug}/members`)} />
      </div>

      {/* ── Ranking + Setores ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Ranking */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Ranking de Comunicação</h2>
            </div>
            <button onClick={() => router.push(`/teams/${slug}/members`)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-violet-400 transition-colors">
              Ver todos <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="p-4 space-y-1">
            {analytics.topMembers.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">Nenhum membro ainda.</p>
                <button onClick={() => router.push(`/teams/${slug}/members`)} className="mt-2 text-xs text-violet-400 hover:text-violet-300">Convidar colaboradores →</button>
              </div>
            ) : (
              analytics.topMembers.slice(0, 8).map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-zinc-800/50 transition-colors">
                  <div className="w-6 text-center flex-shrink-0">
                    {i < 3
                      ? <span className="text-base leading-none">{MEDAL[i]}</span>
                      : <span className="text-xs font-bold text-zinc-600">{i + 1}</span>
                    }
                  </div>
                  <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate leading-tight">{m.name}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {m.department || m.jobTitle || m.team || <span className="text-zinc-700 italic">Sem setor</span>}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-sm font-black text-violet-400">{m.commScore}</span>
                    <span className="text-xs text-zinc-600 ml-0.5">pts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Performance por Setor */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Performance por Setor</h2>
            </div>
            <span className="text-xs text-zinc-600">{analytics.departmentBreakdown.length} setores</span>
          </div>
          <div className="p-5">
            {analytics.departmentBreakdown.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-500 text-sm">Nenhum setor cadastrado.</p>
                <p className="text-zinc-600 text-xs mt-1">Defina o setor de cada colaborador em <strong className="text-zinc-500">Membros</strong>.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.departmentBreakdown.filter(d => d.department !== "Sem setor").map((d) => {
                  const maxScore = Math.max(...analytics.departmentBreakdown.filter(x => x.department !== "Sem setor").map(x => x.avgScore), 1);
                  const pct = Math.round((d.avgScore / maxScore) * 100);
                  return (
                    <div key={d.department}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-zinc-200 truncate">{d.department}</span>
                          <span className="text-[10px] bg-zinc-800 text-zinc-500 rounded-full px-1.5 py-0.5 shrink-0">{d.count}p</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 shrink-0 ml-3">{d.avgScore} pts</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800">
                        <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Live CTA ── */}
      <div className="rounded-2xl overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-zinc-900/80">
        <div className="px-5 py-4 border-b border-emerald-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white">Live Copilot — Reuniões com Clientes Estrangeiros</h2>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold tracking-wider">TEMPO REAL</span>
        </div>
        <div className="p-5">
          <p className="text-sm text-zinc-400 mb-5">
            O colaborador usa o <strong className="text-white">SpeakFlow Live</strong> como um copiloto aberto ao lado da reunião — funciona no celular ou computador, <strong className="text-emerald-400">sem instalar nada</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {[
              { step: "1", icon: Globe, label: "Antes da reunião", desc: "Abre o Live, seleciona o idioma (inglês, espanhol...) e o contexto (vendas, suporte, CS...)" },
              { step: "2", icon: Mic2, label: "Durante a call", desc: "Liga o microfone no Live. A IA escuta, transcreve e sugere frases em tempo real enquanto ele fala." },
              { step: "3", icon: Radio, label: "Sugestões ao vivo", desc: "Recebe sugestões de vocabulário, como responder objeções e pronúncia — tudo sem pausar a conversa." },
            ].map(({ step, icon: Icon, label, desc }) => (
              <div key={step} className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{step}</span>
                  <Icon className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-white">{label}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push("/live")}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            <Radio className="h-4 w-4" />
            Abrir Live Copilot agora
          </button>
        </div>
      </div>

      {/* ── Live por Categoria ── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Mic2 className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white">Uso do Live por Categoria</h2>
          <span className="text-xs text-zinc-600 ml-auto">{analytics.totalLiveSessions} sessões totais</span>
        </div>
        {analytics.categoryBreakdown.length === 0 ? (
          <div className="p-8 text-center">
            <Mic2 className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-500 text-sm">Nenhuma sessão Live registrada.</p>
            <p className="text-zinc-600 text-xs mt-1">Os colaboradores precisam usar o SpeakFlow Live com a org vinculada.</p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analytics.categoryBreakdown.map((cat: any) => {
              const total = analytics.categoryBreakdown.reduce((s: number, c: any) => s + (c._count?.id ?? 0), 0);
              const pct = total > 0 ? Math.round(((cat._count?.id ?? 0) / total) * 100) : 0;
              return (
                <div key={cat.category} className="bg-zinc-800/40 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-200">{CATEGORY_LABELS[cat.category] ?? cat.category}</span>
                    <span className="text-xs font-bold text-indigo-400">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-700">
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">{cat._count?.id ?? 0} sessões</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
