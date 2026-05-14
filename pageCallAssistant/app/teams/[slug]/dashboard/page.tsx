"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Users, Mic2, Target, Award, TrendingUp, Activity,
  Loader2, RefreshCw, BarChart3, Flame, Trophy
} from "lucide-react";

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

function StatCard({
  label, value, icon: Icon, sub, color = "violet",
}: {
  label: string; value: string | number; icon: any; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    violet: "from-violet-600/20 to-violet-600/5 border-violet-500/20 text-violet-400",
    indigo: "from-indigo-600/20 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
    emerald: "from-emerald-600/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-600/20 to-amber-600/5 border-amber-500/20 text-amber-400",
    sky: "from-sky-600/20 to-sky-600/5 border-sky-500/20 text-sky-400",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</span>
        <Icon className={`h-4 w-4 ${colors[color].split(" ").pop()}`} />
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  meetings: "Reuniões", sales: "Vendas", support: "Suporte",
  onboarding: "Onboarding", presentations: "Apresentações",
  "customer-success": "Customer Success", interviews: "Entrevistas", general: "Geral",
  calls: "Calls",
};

export default function OrgDashboardPage() {
  const { slug } = useParams();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const orgsRes = await authFetch("/api/org");
      const orgs = await orgsRes.json();
      const org = Array.isArray(orgs) ? orgs.find((o: any) => o.slug === slug) : null;
      if (!org) return;
      setOrgId(org.id);
      const analyticsRes = await authFetch(`/api/org/${org.id}/analytics`);
      const data = await analyticsRes.json();
      setAnalytics(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8 text-center text-zinc-500">Erro ao carregar analytics.</div>
    );
  }

  const engagementRate = analytics.totalMembers > 0
    ? Math.round((analytics.activeThisWeek / analytics.totalMembers) * 100)
    : 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-sm text-zinc-400">Visão geral da comunicação da sua equipe</p>
        </div>
        <button
          onClick={() => load(false)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Membros" value={analytics.totalMembers} icon={Users} sub="na organização" color="violet" />
        <StatCard label="Ativos esta semana" value={analytics.activeThisWeek} icon={Activity} sub={`${engagementRate}% engajamento`} color="emerald" />
        <StatCard label="Sessões Live" value={analytics.totalLiveSessions} icon={Mic2} sub={`+${analytics.liveSessionsThisWeek} esta semana`} color="indigo" />
        <StatCard label="Score médio" value={`${analytics.avgCommunicationScore}`} icon={BarChart3} sub="comunicação corporativa" color="sky" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Desafios" value={analytics.totalChallenges} icon={Target} sub="criados" color="amber" />
        <StatCard label="Submissões" value={analytics.totalSubmissions} icon={TrendingUp} sub={`+${analytics.submissionsThisWeek} esta semana`} color="violet" />
        <StatCard label="Certificações" value={analytics.totalCertifications} icon={Award} sub="emitidas" color="amber" />
        <StatCard label="Engajamento" value={`${engagementRate}%`} icon={Flame} sub="ativos vs total" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Ranking */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Ranking de Comunicação</h2>
          </div>
          {analytics.topMembers.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">Nenhum dado disponível ainda.</p>
          ) : (
            <div className="space-y-3">
              {analytics.topMembers.slice(0, 7).map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className={`w-6 text-center text-xs font-bold shrink-0 ${
                    i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-zinc-600"
                  }`}>{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {m.avatarUrl
                      ? <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                      : <span className="text-xs font-semibold text-zinc-400">{m.name[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{m.name}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {m.department ?? m.team ?? m.jobTitle ?? "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-violet-400">{m.commScore}</p>
                    <p className="text-xs text-zinc-600">pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Departamentos */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Performance por Setor</h2>
          </div>
          {analytics.departmentBreakdown.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">Nenhum setor cadastrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {analytics.departmentBreakdown.map((d) => {
                const maxScore = Math.max(...analytics.departmentBreakdown.map(x => x.avgScore), 1);
                const pct = Math.round((d.avgScore / maxScore) * 100);
                return (
                  <div key={d.department}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-zinc-300 truncate">{d.department}</span>
                        <span className="text-xs text-zinc-600 shrink-0">{d.count} membro{d.count !== 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400 shrink-0 ml-2">{d.avgScore} pts</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Uso do Live por Categoria */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Mic2 className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Uso do Live por Categoria</h2>
        </div>
        {analytics.categoryBreakdown.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-6">Nenhuma sessão registrada ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analytics.categoryBreakdown.map((cat: any) => {
              const total = analytics.categoryBreakdown.reduce((s: number, c: any) => s + (c._count?.id ?? 0), 0);
              const pct = total > 0 ? Math.round(((cat._count?.id ?? 0) / total) * 100) : 0;
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">{CATEGORY_LABELS[cat.category] ?? cat.category}</span>
                    <span className="text-xs text-zinc-500">{cat._count?.id ?? 0} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
