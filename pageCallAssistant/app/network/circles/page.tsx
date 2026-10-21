"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Users, Lock, Globe, Plus, X, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

const FOCUS_GROUPS: Record<string, string[]> = {
  "💼 Carreira & Negócios": [
    "Reuniões de Negócios", "Liderança & Gestão", "Vendas & Negociação",
    "Empreendedorismo", "Finanças & Investimentos", "Marketing & Comunicação",
    "RH & Recrutamento", "Apresentações Públicas",
  ],
  "💻 Tecnologia": [
    "Entrevistas Técnicas", "Frontend & Design", "Backend & Arquitetura",
    "Data Science & IA", "DevOps & Cloud", "Produto & UX", "Soft Skills Tech",
  ],
  "✈️ Cotidiano & Viagem": [
    "Viagem & Turismo", "Vida no Exterior", "Compras & Serviços",
    "Saúde & Bem-estar", "Casa & Família", "Gastronomia & Restaurantes",
    "Conversa do Dia a Dia",
  ],
  "🎓 Educação & Cultura": [
    "Ciências & Pesquisa", "Educação & Ensino", "Cultura & Arte",
    "Esportes & Fitness", "Tecnologia no Geral",
  ],
  "🏥 Profissões Específicas": [
    "Medicina & Saúde", "Engenharia", "Direito & Advocacia",
    "Arquitetura & Design", "Comunicação & Mídia", "Psicologia & Coaching",
  ],
};
const FOCUS_OPTIONS = Object.values(FOCUS_GROUPS).flat();
const LEVEL_OPTIONS = ["Iniciante (A1-A2)", "Intermediário (B1-B2)", "Avançado (C1-C2)", "Todos os níveis"];

const CURATED_CIRCLES = [
  { emoji: "💼", name: "Business English — Tech", focus: "Reuniões de Negócios", level: "Intermediário (B1-B2)", desc: "Calls, alinhamentos e apresentações com stakeholders internacionais.", tag: "Profissional" },
  { emoji: "🎯", name: "Tech Interviews BR", focus: "Entrevistas Técnicas", level: "Intermediário (B1-B2)", desc: "Prática de entrevistas técnicas em inglês para vagas internacionais.", tag: "Carreira" },
  { emoji: "📊", name: "Product & UX Global", focus: "Produto & UX", level: "Todos os níveis", desc: "Discussões de produto, demos e feedbacks com times globais.", tag: "Produto" },
  { emoji: "🤝", name: "Customer Success EN", focus: "Vendas & Negociação", level: "Todos os níveis", desc: "Atendimento, onboarding e renovação com clientes internacionais.", tag: "CS" },
  { emoji: "✈️", name: "Life Abroad", focus: "Vida no Exterior", level: "Iniciante (A1-A2)", desc: "Situações do cotidiano: aeroporto, moradia, serviços e viagens.", tag: "Cotidiano" },
  { emoji: "🧠", name: "Data & AI Professionals", focus: "Data Science & IA", level: "Avançado (C1-C2)", desc: "Inglês técnico para ML, dados, modelos e apresentações científicas.", tag: "Tech" },
];

interface Circle {
  id: string; name: string; description?: string; focus: string; level: string;
  visibility: string; maxMembers: number; isMember: boolean;
  _count: { members: number };
  challenges: { id: string; title: string; endsAt: string }[];
}

function CirclesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [focusFilter, setFocusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(searchParams.get("create") === "true");
  const [form, setForm] = useState({ name: "", description: "", focus: "", level: "Todos os níveis", visibility: "public", maxMembers: "20" });
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ filter: "discover" });
    if (focusFilter) params.set("focus", focusFilter);
    fetch(`/api/network/circles?${params}`)
      .then((r) => r.json())
      .then((data) => setCircles(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [focusFilter]);

  const filtered = circles.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.focus.toLowerCase().includes(search.toLowerCase())
  );

  const join = async (circleId: string) => {
    setJoining(circleId);
    try {
      const r = await fetch(`/api/network/circles/${circleId}/join`, { method: "POST" });
      if (r.ok) { toast.success("Você entrou no Circle!"); router.push(`/network/${circleId}`); }
      else { const d = await r.json(); toast.error(d.error ?? "Erro ao entrar."); }
    } finally { setJoining(null); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.focus.trim()) return toast.error("Nome e foco são obrigatórios.");
    setCreating(true);
    try {
      const r = await fetch("/api/network/circles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, maxMembers: Number(form.maxMembers) }) });
      if (r.ok) { const c = await r.json(); toast.success("Circle criado!"); router.push(`/network/${c.id}`); }
      else { const d = await r.json(); toast.error(d.error ?? "Erro ao criar."); }
    } finally { setCreating(false); }
  };

  function prefillAndCreate(c: typeof CURATED_CIRCLES[0]) {
    setForm({ name: c.name, description: c.desc, focus: c.focus, level: c.level, visibility: "public", maxMembers: "30" });
    setShowCreate(true);
    setTimeout(() => document.getElementById("create-form-card")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Descobrir Circles</h1><p className="text-sm text-muted-foreground">Encontre grupos de prática profissional</p></div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0">
          <Plus className="h-4 w-4 mr-1.5" />Criar Circle
        </Button>
      </div>

      {/* Circles Profissionais Sugeridos */}
      {!showCreate && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-300">Circles profissionais sugeridos</p>
            <span className="text-xs text-zinc-500">Clique para criar</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {CURATED_CIRCLES.map((c) => (
              <button
                key={c.name}
                onClick={() => prefillAndCreate(c)}
                className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-violet-500/40 hover:bg-violet-500/5 p-3 text-left transition-all group"
              >
                <span className="text-xl shrink-0 mt-0.5">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">{c.name}</p>
                    <span className="text-[10px] bg-violet-500/10 text-violet-400 rounded-full px-1.5 py-0.5 shrink-0">{c.tag}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">{c.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <Card id="create-form-card" className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between"><CardTitle className="text-base">Criar novo Circle</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button></div>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Senior Devs BR" maxLength={80} /></div>
              <div className="space-y-2"><Label>Foco *</Label>
                <select value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Selecione uma área...</option>
                  {Object.entries(FOCUS_GROUPS).map(([group, opts]) => (
                    <optgroup key={group} label={group}>
                      {opts.map((f) => <option key={f} value={f}>{f}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="space-y-2"><Label>Nível</Label>
                <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>Visibilidade</Label>
                <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="public">Público</option><option value="private">Privado</option><option value="invite">Por convite</option>
                </select>
              </div>
              <div className="space-y-2"><Label>Limite de membros</Label><Input type="number" min={5} max={100} value={form.maxMembers} onChange={(e) => setForm({ ...form, maxMembers: e.target.value })} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o propósito do Circle..." maxLength={300} /></div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
                <Button type="submit" disabled={creating}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Circle"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar Circles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={focusFilter} onChange={(e) => setFocusFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground min-w-48">
          <option value="">Todas as áreas</option>
          {Object.entries(FOCUS_GROUPS).map(([group, opts]) => (
            <optgroup key={group} label={group}>
              {opts.map((f) => <option key={f} value={f}>{f}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map((i) => <div key={i} className="h-40 rounded-xl bg-card/50 animate-pulse border border-border/50" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="border-border/50 hover:border-violet-500/30 transition-all flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{c.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{c.focus} · {c.level}</CardDescription>
                  </div>
                  <span className="shrink-0">{c.visibility === "public" ? <Globe className="h-3.5 w-3.5 text-muted-foreground" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-3">
                {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c._count.members}/{c.maxMembers}</span>
                    {c.challenges.length > 0 && <span className="flex items-center gap-1 text-emerald-400"><Zap className="h-3 w-3" />Desafio ativo</span>}
                  </div>
                  {c.isMember ? (
                    <Button size="sm" variant="outline" className="w-full" asChild><Link href={`/network/${c.id}`}>Ver Circle</Link></Button>
                  ) : (
                    <Button size="sm" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0"
                      onClick={() => join(c.id)} disabled={joining === c.id}>
                      {joining === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">Nenhum Circle encontrado.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CirclesPage() {
  return <Suspense><CirclesContent /></Suspense>;
}
