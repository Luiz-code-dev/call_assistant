"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Target, Plus, Mic2, MessageSquare, Users2, Play, X, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  scenario: string | null;
  targetRole: string | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  team: { id: string; name: string } | null;
  _count: { submissions: number };
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

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  "audio":          { label: "Áudio",          icon: Mic2,          color: "text-violet-400 bg-violet-400/10" },
  "quick-response": { label: "Resposta rápida", icon: MessageSquare, color: "text-indigo-400 bg-indigo-400/10" },
  "roleplay":       { label: "Roleplay",        icon: Users2,        color: "text-emerald-400 bg-emerald-400/10" },
  "scenario":       { label: "Cenário",         icon: Play,          color: "text-amber-400 bg-amber-400/10" },
};

const CATEGORY_LABELS: Record<string, string> = {
  meetings: "Reuniões", sales: "Vendas", support: "Suporte",
  onboarding: "Onboarding", presentations: "Apresentações",
  "customer-success": "Customer Success", interviews: "Entrevistas", general: "Geral",
};

export default function ChallengesPage() {
  const { slug } = useParams();
  const [orgId, setOrgId] = useState("");
  const [myRole, setMyRole] = useState("member");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", type: "quick-response", category: "meetings",
    scenario: "", targetRole: "", startsAt: "", endsAt: "",
  });
  const [creating, setCreating] = useState(false);

  async function load() {
    const orgsRes = await authFetch("/api/org");
    const orgs = await orgsRes.json();
    const org = Array.isArray(orgs) ? orgs.find((o: any) => o.slug === slug) : null;
    if (!org) return;
    setOrgId(org.id);
    setMyRole(org.role);
    const res = await authFetch(`/api/org/${org.id}/challenges`);
    setChallenges(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [slug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await authFetch(`/api/org/${orgId}/challenges`, {
      method: "POST",
      body: JSON.stringify({
        ...form,
        scenario: form.scenario || null,
        targetRole: form.targetRole || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Erro ao criar desafio."); setCreating(false); return; }
    toast.success("Desafio criado!");
    setShowCreate(false);
    setForm({ title: "", description: "", type: "quick-response", category: "meetings", scenario: "", targetRole: "", startsAt: "", endsAt: "" });
    setCreating(false);
    load();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChallenge) return;
    setSubmitting(true);
    const res = await authFetch(`/api/org/${orgId}/challenges/${activeChallenge.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ content: response }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Erro ao enviar."); setSubmitting(false); return; }
    toast.success(`Resposta avaliada! Score: ${data.totalScore}/100`);
    setActiveChallenge(null);
    setResponse("");
    setSubmitting(false);
    load();
  }

  const isActive = (c: Challenge) => {
    const now = new Date();
    return now >= new Date(c.startsAt) && now <= new Date(c.endsAt);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
    </div>
  );

  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Desafios Corporativos</h1>
          <p className="text-sm text-zinc-400">Pratique cenários reais com avaliação por IA</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo desafio
          </button>
        )}
      </div>

      {challenges.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Target className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Nenhum desafio criado ainda.</p>
          {canManage && (
            <button onClick={() => setShowCreate(true)} className="mt-4 text-violet-400 hover:text-violet-300 text-sm font-medium">
              Criar primeiro desafio →
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {challenges.map(challenge => {
            const cfg = TYPE_CONFIG[challenge.type] ?? TYPE_CONFIG["scenario"];
            const TypeIcon = cfg.icon;
            const active = isActive(challenge);
            return (
              <div key={challenge.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg font-medium ${cfg.color}`}>
                        <TypeIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400">
                        {CATEGORY_LABELS[challenge.category] ?? challenge.category}
                      </span>
                      {active
                        ? <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Ativo</span>
                        : <span className="text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-500 flex items-center gap-1"><Clock className="h-3 w-3" />Encerrado</span>
                      }
                    </div>
                    <h3 className="font-semibold text-white mb-1">{challenge.title}</h3>
                    <p className="text-sm text-zinc-400 line-clamp-2">{challenge.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-violet-400">{challenge._count.submissions}</p>
                    <p className="text-xs text-zinc-600">submissões</p>
                  </div>
                </div>
                {active && (
                  <button
                    onClick={() => setActiveChallenge(challenge)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg text-sm font-medium transition-colors border border-violet-500/20"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Responder desafio
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeChallenge && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-white">{activeChallenge.title}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{CATEGORY_LABELS[activeChallenge.category]} · {TYPE_CONFIG[activeChallenge.type]?.label}</p>
              </div>
              <button onClick={() => setActiveChallenge(null)} className="text-zinc-500 hover:text-white flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-4 mb-4">
              <p className="text-sm text-zinc-300">{activeChallenge.description}</p>
              {activeChallenge.scenario && (
                <div className="mt-3 pt-3 border-t border-zinc-700">
                  <p className="text-xs text-zinc-500 font-medium mb-1">Cenário:</p>
                  <p className="text-sm text-zinc-400">{activeChallenge.scenario}</p>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <label className="block text-sm text-zinc-400 mb-1.5">Sua resposta em inglês</label>
              <textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                required
                minLength={10}
                rows={5}
                placeholder="Escreva sua resposta em inglês..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 text-sm resize-none focus:outline-none focus:border-violet-500"
              />
              <p className="text-xs text-zinc-600 mt-1 mb-4">A IA irá avaliar clareza, confiança, fluência e contexto</p>
              <button
                type="submit"
                disabled={submitting || !response.trim()}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Avaliando...</> : "Enviar e avaliar com IA"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white">Criar desafio</h2>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Título *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Customer Success — Resolução de Conflitos"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Descrição *</label>
                <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Descreva o que o colaborador deve praticar..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Tipo *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500">
                    <option value="quick-response">Resposta rápida</option>
                    <option value="roleplay">Roleplay</option>
                    <option value="scenario">Cenário</option>
                    <option value="audio">Áudio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Categoria *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500">
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Cenário (opcional)</label>
                <textarea value={form.scenario} onChange={e => setForm(f => ({ ...f, scenario: e.target.value }))}
                  rows={2} placeholder="Descreva o contexto específico do cenário..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Início *</label>
                  <input type="datetime-local" required value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Fim *</label>
                  <input type="datetime-local" required value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500" />
                </div>
              </div>
              <button type="submit" disabled={creating}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2">
                {creating ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</> : "Criar desafio"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
