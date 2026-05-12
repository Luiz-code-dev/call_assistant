"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, TrendingUp, Users, Mic2, Target, Loader2, Activity } from "lucide-react";

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
    avatarUrl: string | null; role: string; commScore: number; team: string | null;
  }[];
  categoryBreakdown: { category: string; _count: { id: number } }[];
}

function authFetch(url: string) {
  const token = typeof window !== "undefined"
    ? (sessionStorage.getItem("sf_token") || localStorage.getItem("sf_token"))
    : null;
  return fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
}

const CATEGORY_LABELS: Record<string, string> = {
  meetings: "Reuniões", sales: "Vendas", support: "Suporte",
  onboarding: "Onboarding", presentations: "Apresentações",
  "customer-success": "Customer Success", interviews: "Entrevistas", general: "Geral", calls: "Calls",
};

export default function AnalyticsPage() {
  const { slug } = useParams();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/org")
      .then(r => r.json())
      .then(async (orgs: any[]) => {
        const org = Array.isArray(orgs) ? orgs.find(o => o.slug === slug) : null;
        if (!org) return;
        const res = await authFetch(`/api/org/${org.id}/analytics`);
        setAnalytics(await res.json());
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
    </div>
  );

  if (!analytics) return <div className="p-8 text-center text-zinc-500">Erro ao carregar analytics.</div>;

  const engRate = analytics.totalMembers > 0
    ? Math.round((analytics.activeThisWeek / analytics.totalMembers) * 100)
    : 0;

  const totalCatSessions = analytics.categoryBreakdown.reduce((s: number, c: any) => s + (c._count?.id ?? 0), 0);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-sm text-zinc-400">Evolução e engajamento da sua equipe</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Engajamento</span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-white">{engRate}%</span>
            <span className="text-zinc-500 text-sm mb-1">ativos esta semana</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800">
            <div className="h-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all" style={{ width: `${engRate}%` }} />
          </div>
          <p className="text-xs text-zinc-600 mt-2">{analytics.activeThisWeek} de {analytics.totalMembers} membros</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-semibold text-white">Score médio</span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-white">{analytics.avgCommunicationScore}</span>
            <span className="text-zinc-500 text-sm mb-1">/ 100</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800">
            <div className="h-2 rounded-full bg-gradient-to-r from-sky-600 to-sky-400" style={{ width: `${analytics.avgCommunicationScore}%` }} />
          </div>
          <p className="text-xs text-zinc-600 mt-2">Score de comunicação corporativa</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">Prática semanal</span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-white">{analytics.submissionsThisWeek + analytics.liveSessionsThisWeek}</span>
            <span className="text-zinc-500 text-sm mb-1">atividades</span>
          </div>
          <div className="flex gap-3 text-xs text-zinc-500 mt-3">
            <span className="flex items-center gap-1"><Mic2 className="h-3 w-3" />{analytics.liveSessionsThisWeek} live</span>
            <span className="flex items-center gap-1"><Target className="h-3 w-3" />{analytics.submissionsThisWeek} desafios</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Mic2 className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Sessões Live por Categoria</h2>
          </div>
          {analytics.categoryBreakdown.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">Nenhuma sessão registrada.</p>
          ) : (
            <div className="space-y-4">
              {analytics.categoryBreakdown.map((cat: any) => {
                const count = cat._count?.id ?? 0;
                const pct = totalCatSessions > 0 ? Math.round((count / totalCatSessions) * 100) : 0;
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-zinc-300">{CATEGORY_LABELS[cat.category] ?? cat.category}</span>
                      <span className="text-xs text-zinc-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800">
                      <div className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Evolução Individual</h2>
          </div>
          {analytics.topMembers.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">Nenhum dado disponível.</p>
          ) : (
            <div className="space-y-3">
              {analytics.topMembers.map((m, i) => {
                const maxScore = Math.max(...analytics.topMembers.map(x => x.commScore), 1);
                const pct = Math.round((m.commScore / maxScore) * 100);
                return (
                  <div key={m.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {m.avatarUrl
                          ? <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                          : <span className="text-xs text-zinc-400">{m.name[0]}</span>
                        }
                      </div>
                      <span className="text-sm text-zinc-300 flex-1 truncate">{m.name}</span>
                      <span className="text-xs font-bold text-violet-400">{m.commScore} pts</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 ml-8">
                      <div
                        className={`h-1.5 rounded-full bg-gradient-to-r ${
                          i === 0 ? "from-amber-600 to-amber-400" : "from-violet-600 to-indigo-600"
                        }`}
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total de membros", value: analytics.totalMembers, icon: Users, color: "text-violet-400" },
          { label: "Sessões Live", value: analytics.totalLiveSessions, icon: Mic2, color: "text-indigo-400" },
          { label: "Submissões", value: analytics.totalSubmissions, icon: Target, color: "text-emerald-400" },
          { label: "Certificações", value: analytics.totalCertifications, icon: BarChart3, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <Icon className={`h-5 w-5 ${color} mx-auto mb-2`} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
