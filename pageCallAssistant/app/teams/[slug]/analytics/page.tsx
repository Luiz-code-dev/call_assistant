"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, TrendingUp, Users, Mic2, Target, Loader2, Activity, Award, Download } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell, Sector,
} from "recharts";

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
    team: string | null; department: string | null;
  }[];
  categoryBreakdown: { category: string; _count: { id: number } }[];
  departmentBreakdown: { department: string; count: number; avgScore: number }[];
  dailySeries: { date: string; sessions: number; submissions: number }[];
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
  "customer-success": "CS", interviews: "Entrevistas", general: "Geral", calls: "Calls",
};

const CHART_COLORS = ["#7c3aed", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#a855f7", "#14b8a6"];

const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: 8,
  color: "#e4e4e7",
  fontSize: 12,
};

function Panel({ title, icon: Icon, iconColor, children, hint }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <h2 className="text-sm font-bold text-white">{title}</h2>
        </div>
        {hint && <span className="text-xs text-zinc-600">{hint}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function exportPDF(slug: string | string[], analytics: Analytics, engRate: number) {
  const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const memberRows = [...analytics.topMembers]
    .sort((a, b) => b.commScore - a.commScore)
    .map((m, i) => `<tr><td>${i + 1}</td><td>${m.name}</td><td>${m.department ?? "—"}</td><td>${m.commScore}</td></tr>`)
    .join("");
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Relatório ${slug}</title>
<style>
  body{font-family:Arial,sans-serif;color:#111;padding:32px;max-width:900px;margin:0 auto}
  h1{font-size:22px;margin-bottom:4px} p.sub{color:#555;font-size:13px;margin-bottom:24px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
  .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center}
  .kpi .val{font-size:28px;font-weight:900;color:#7c3aed}
  .kpi .lbl{font-size:12px;color:#555;margin-top:4px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
  th{background:#f3f4f6;text-align:left;padding:8px 10px;font-weight:600}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6}
  h2{font-size:15px;margin:24px 0 10px;border-bottom:2px solid #7c3aed;padding-bottom:6px}
  footer{color:#999;font-size:11px;margin-top:32px;text-align:center}
  @media print{body{padding:0}}
</style></head><body>
<h1>Relatório de Analytics — ${slug}</h1>
<p class="sub">Gerado em ${now} · Últimos 30 dias</p>
<div class="kpis">
  <div class="kpi"><div class="val">${analytics.totalMembers}</div><div class="lbl">Membros</div></div>
  <div class="kpi"><div class="val">${analytics.totalLiveSessions}</div><div class="lbl">Sessões Live</div></div>
  <div class="kpi"><div class="val">${analytics.totalSubmissions}</div><div class="lbl">Submissões</div></div>
  <div class="kpi"><div class="val">${analytics.totalCertifications}</div><div class="lbl">Certificações</div></div>
</div>
<table><tr><td><strong>Engajamento semanal</strong></td><td>${engRate}%</td><td><strong>Sessões esta semana</strong></td><td>${analytics.liveSessionsThisWeek}</td></tr>
<tr><td><strong>Ativos esta semana</strong></td><td>${analytics.activeThisWeek}</td><td><strong>Submissões esta semana</strong></td><td>${analytics.submissionsThisWeek}</td></tr>
<tr><td><strong>Score médio de comunicação</strong></td><td colspan="3">${analytics.avgCommunicationScore}</td></tr></table>
<h2>Top Colaboradores por Score</h2>
<table><thead><tr><th>#</th><th>Nome</th><th>Departamento</th><th>Score</th></tr></thead><tbody>${memberRows}</tbody></table>
<footer>SpeakFlow for Teams · Relatório confidencial gerado automaticamente</footer>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

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
    ? Math.round((analytics.activeThisWeek / analytics.totalMembers) * 100) : 0;

  const catData = analytics.categoryBreakdown.map((c: any) => ({
    name: CATEGORY_LABELS[c.category] ?? c.category,
    value: c._count?.id ?? 0,
  }));

  const deptData = analytics.departmentBreakdown
    .filter(d => d.department !== "Sem setor")
    .map(d => ({ name: d.department, score: d.avgScore, membros: d.count }));

  const memberData = [...analytics.topMembers]
    .sort((a, b) => b.commScore - a.commScore)
    .slice(0, 8)
    .map(m => ({ name: m.name.split(" ")[0], score: m.commScore, dept: m.department ?? "—" }));

  const hasActivity = analytics.dailySeries?.some(d => d.sessions > 0 || d.submissions > 0);

  const shortDate = (iso: string) => {
    const [, mm, dd] = iso.split("-");
    return `${dd}/${mm}`;
  };

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white mb-1">Analytics</h1>
          <p className="text-sm text-zinc-400">Evolução e engajamento da sua equipe — últimos 30 dias</p>
        </div>
        <button
          onClick={() => exportPDF(slug, analytics, engRate)}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-violet-500/50 hover:text-white transition-colors shrink-0"
        >
          <Download className="h-4 w-4" /> Exportar PDF
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Membros", value: analytics.totalMembers, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Sessões Live", value: analytics.totalLiveSessions, icon: Mic2, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "Submissões", value: analytics.totalSubmissions, icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Certificações", value: analytics.totalCertifications, icon: Award, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border border-zinc-800 p-5 ${bg}`}>
            <Icon className={`h-5 w-5 ${color} mb-3`} />
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-xs font-medium text-white mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Line chart — atividade diária */}
      <Panel title="Atividade Diária" icon={TrendingUp} iconColor="text-violet-400" hint="últimos 30 dias">
        {!hasActivity ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
            <TrendingUp className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma atividade registrada ainda.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics.dailySeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fill: "#71717a", fontSize: 11 }}
                interval={4}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={shortDate as any}
                formatter={((v: any, name: string) => [v, name === "sessions" ? "Live" : "Submissões"]) as any}
              />
              <Legend
                formatter={(v) => v === "sessions" ? "Sessões Live" : "Submissões"}
                wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
              />
              <Line type="monotone" dataKey="sessions" stroke="#7c3aed" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="submissions" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Bar + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Sessões por Categoria" icon={Mic2} iconColor="text-indigo-400" hint={`${analytics.totalLiveSessions} total`}>
          {catData.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-10">Nenhuma sessão registrada.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, "sessões"]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#6366f1">
                  {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Distribuição por Setor" icon={Users} iconColor="text-emerald-400" hint={`${analytics.departmentBreakdown.filter(d => d.department !== "Sem setor").length} setores`}>
          {deptData.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-10">Nenhum setor cadastrado.</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie
                    data={deptData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="membros"
                    paddingAngle={3}
                  >
                    {deptData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, "membros"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {deptData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-zinc-400 truncate flex-1">{d.name}</span>
                    <span className="text-xs font-bold text-zinc-300">{d.membros}p</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Ranking horizontal bar */}
      <Panel title="Ranking de Comunicação" icon={BarChart3} iconColor="text-amber-400" hint="score por membro">
        {memberData.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-10">Nenhum membro com dados ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(memberData.length * 40, 120)}>
            <BarChart data={memberData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="name"
                width={70}
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={((v: any, _: string, props: any) => [`${v} pts — ${props.payload.dept}`, "Score"]) as any}
              />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} background={{ fill: "#27272a", radius: 6 }}>
                {memberData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === 0 ? "#f59e0b" : i === 1 ? "#9ca3af" : i === 2 ? "#b45309" : "#7c3aed"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Score por setor — bar */}
      {deptData.length > 0 && (
        <Panel title="Score Médio por Setor" icon={Activity} iconColor="text-sky-400" hint="média de comunicação">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} pts`, "Score médio"]} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {deptData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}
    </div>
  );
}
