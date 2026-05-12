"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Building2, Mic2, Target, BarChart3, Award, Users, CheckCircle2,
  ArrowRight, Globe, Shield, TrendingUp, Brain, DollarSign, Clock,
  Loader2, X, Check,
} from "lucide-react";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const PAIN_POINTS = [
  { icon: Globe,      text: "Equipes perdem negócios por insegurança em calls internacionais" },
  { icon: Clock,      text: "Horas de treinamento genérico sem aplicação prática real" },
  { icon: DollarSign, text: "Plataformas de inglês com ROI impossível de medir" },
  { icon: Brain,      text: "Colaboradores treinados que ainda travam em reuniões reais" },
];

const FEATURES = [
  { icon: Mic2,      title: "SpeakFlow Live Corporativo",  desc: "IA em tempo real dentro de calls e reuniões. Sugestões contextuais, tradução e coaching simultâneo.",         badge: "Principal diferencial" },
  { icon: Target,    title: "Desafios por Função",         desc: "Simule exatamente o que seu time enfrenta: vendas, onboarding, suporte técnico, apresentações.",               badge: null },
  { icon: BarChart3, title: "Analytics de Equipe",         desc: "Score de comunicação por colaborador, engajamento semanal, ranking interno e riscos de abandono.",             badge: null },
  { icon: Award,     title: "Certificação Corporativa",    desc: "Certificado PDF com nível A1–C1, score, fluência e consistência, gerado por IA com base em desempenho real.",  badge: null },
  { icon: Users,     title: "Gestão de Times",             desc: "Crie equipes por departamento, convide membros e acompanhe cada time separadamente.",                          badge: null },
  { icon: Shield,    title: "Controle e Permissões",       desc: "Roles de Owner, Admin e Membro. Workspace dedicado por empresa. Dados isolados e seguros.",                    badge: null },
];

const STEPS = [
  { n: "01", title: "Crie o workspace",         desc: "Configure a organização, convide colaboradores por e-mail e organize em times." },
  { n: "02", title: "Defina desafios reais",    desc: "Admins criam cenários por função: reunião com cliente, apresentação executiva, atendimento." },
  { n: "03", title: "Equipe pratica com IA",    desc: "Colaboradores respondem desafios e usam o Live durante calls reais. IA avalia e dá feedback." },
  { n: "04", title: "Acompanhe a evolução",     desc: "Dashboard mostra score individual, engajamento e quem precisa de atenção." },
];

const TEAM_SIZES = [
  { size: "5–10",  price: "R$ 100", monthly: "R$ 500–1.000/mês",   highlight: false },
  { size: "11–25", price: "R$ 85",  monthly: "R$ 935–2.125/mês",   highlight: true  },
  { size: "26–50", price: "R$ 70",  monthly: "R$ 1.820–3.500/mês", highlight: false },
  { size: "50+",   price: "Custom", monthly: "Fale com comercial",  highlight: false },
];

const COMPARISON = [
  ["Prática em situações reais de trabalho",   false, true],
  ["IA ativa durante calls internacionais",    false, true],
  ["Feedback instantâneo por IA",              false, true],
  ["Analytics por colaborador e por time",     false, true],
  ["Certificação baseada em desempenho real",  false, true],
  ["Integrado ao contexto corporativo",        false, true],
  ["Conteúdo pré-gravado",                     true,  false],
];

const ROLES  = ["CEO / Diretoria", "RH / People & Culture", "T&D / Treinamento", "Gerente de equipe", "Outro"];
const SIZES  = ["1–5", "6–15", "16–30", "31–100", "100+"];

// ─── ROI Calculator ───────────────────────────────────────
function pricePerUser(n: number): number {
  if (n <= 10) return 100;
  if (n <= 25) return 85;
  if (n <= 50) return 70;
  return 60;
}

function ROICalc() {
  const [users, setUsers] = useState(20);
  const ppu         = pricePerUser(users);
  const monthly     = users * ppu;
  const vsPremium   = users * 149.9;
  const saving      = Math.max(0, Math.round(vsPremium - monthly));

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-indigo-900/20 p-6 md:p-8">
      <h3 className="text-lg font-bold text-white mb-1">Calculadora de ROI</h3>
      <p className="text-sm text-zinc-400 mb-6">Quantos colaboradores vão usar o SpeakFlow?</p>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-400">Colaboradores</span>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 font-medium">
              {users <= 10 ? "5–10" : users <= 25 ? "11–25" : users <= 50 ? "26–50" : "50+"} pessoas · R$ {ppu}/user
            </span>
            <span className="text-2xl font-bold text-white">{users}</span>
          </div>
        </div>
        <input type="range" min={5} max={200} step={5} value={users}
          onChange={e => setUsers(Number(e.target.value))}
          className="w-full accent-violet-500" />
        <div className="flex justify-between text-xs text-zinc-600 mt-1"><span>5</span><span>200</span></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900/60 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Investimento/mês</p>
          <p className="text-xl font-black text-white">R$ {monthly.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-zinc-600 mt-0.5">R$ {ppu}/usuário/mês</p>
        </div>
        <div className="bg-zinc-900/60 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Equiv. Premium ind.</p>
          <p className="text-xl font-black text-violet-400">{Math.round(monthly / 149.9)}x</p>
          <p className="text-xs text-zinc-600 mt-0.5">assinaturas</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Economia vs Premium</p>
          <p className="text-xl font-black text-emerald-400">R$ {saving.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-zinc-600 mt-0.5">por mês</p>
        </div>
      </div>
      <p className="text-xs text-zinc-600 text-center mt-4">* Valores ilustrativos. Consulte condições para grandes volumes.</p>
    </div>
  );
}

// ─── Demo Form ────────────────────────────────────────────
function DemoForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "", teamSize: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/contact/b2b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao enviar."); return; }
      setSent(true);
    } catch { setError("Erro de rede. Tente novamente."); }
    finally  { setLoading(false); }
  }

  if (sent) return (
    <div className="text-center py-10">
      <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Mensagem enviada!</h3>
      <p className="text-zinc-400 text-sm max-w-sm mx-auto">Nossa equipe comercial entrará em contato em até 24 horas úteis para agendar a demonstração.</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Nome *</label>
          <input required value={form.name} onChange={set("name")} placeholder="Seu nome"
            className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">E-mail corporativo *</label>
          <input required type="email" value={form.email} onChange={set("email")} placeholder="voce@empresa.com"
            className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
        </div>
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1.5">Empresa *</label>
        <input required value={form.company} onChange={set("company")} placeholder="Nome da empresa"
          className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Seu cargo</label>
          <select value={form.role} onChange={set("role")}
            className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors">
            <option value="">Selecione</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Tamanho do time</label>
          <select value={form.teamSize} onChange={set("teamSize")}
            className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors">
            <option value="">Selecione</option>
            {SIZES.map(s => <option key={s} value={s}>{s} pessoas</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1.5">Contexto (opcional)</label>
        <textarea value={form.message} onChange={set("message")} rows={3}
          placeholder="Conte brevemente o desafio da sua equipe com comunicação em inglês..."
          className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors" />
      </div>
      {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">{error}</div>}
      <button type="submit" disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/40">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</> : <>Solicitar demonstração gratuita <ArrowRight className="h-4 w-4" /></>}
      </button>
      <p className="text-xs text-zinc-600 text-center">Resposta em até 24h · Sem compromisso · Demo gratuita</p>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────
export default function ForTeamsPage() {
  const formRef = useRef<HTMLDivElement>(null);
  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 overflow-x-hidden">

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">S</span>
            </div>
            <span className="font-bold text-white text-sm">SpeakFlow</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium border border-violet-500/20 hidden sm:inline">
              for Teams
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-zinc-400 hover:text-white text-sm transition-colors hidden sm:block">Entrar</Link>
            <button onClick={scrollToForm}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-semibold text-sm transition-colors">
              Falar com comercial
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-6">
              <Building2 className="h-3.5 w-3.5" />
              Infraestrutura de comunicação corporativa com IA
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
              Sua equipe trava em{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                reuniões internacionais?
              </span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              O SpeakFlow for Teams dá à sua equipe a{" "}
              <strong className="text-white">infraestrutura de comunicação em inglês com IA</strong>{" "}
              que faltava — com analytics reais, desafios por função e coaching em tempo real.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={scrollToForm}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-violet-900/40 flex items-center justify-center gap-2">
                Solicitar demonstração gratuita
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link href="/register"
                className="w-full sm:w-auto px-8 py-4 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-xl font-semibold text-base transition-all text-center">
                Criar conta grátis
              </Link>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
              {[
                { icon: Users,    text: "Licença por usuário" },
                { icon: BarChart3, text: "Analytics em tempo real" },
                { icon: Shield,   text: "Dados corporativos isolados" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-zinc-500">
                  <Icon className="h-4 w-4 text-violet-500" />
                  {text}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* DOR */}
      <section className="py-16 px-4 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3">
              O problema que nenhuma plataforma de inglês resolve
            </h2>
            <p className="text-zinc-400 text-center mb-10 max-w-xl mx-auto">
              Colaboradores fazem curso de inglês por meses e continuam travando quando precisam usar em situações reais de trabalho.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PAIN_POINTS.map(({ icon: Icon, text }, i) => (
              <Reveal key={text} delay={i * 80}>
                <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-red-400" />
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUÇÃO */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Não é mais um curso de inglês</h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                O SpeakFlow for Teams é infraestrutura de comunicação com IA —
                integrada ao dia a dia real de trabalho da sua equipe.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, badge }, i) => (
              <Reveal key={title} delay={i * 60}>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-all p-5 h-full flex flex-col">
                  {badge && (
                    <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 font-medium mb-3 self-start">
                      {badge}
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed flex-1">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-16 px-4 bg-zinc-900/30">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">Como funciona na prática</h2>
          </Reveal>
          <div className="space-y-6">
            {STEPS.map(({ n, title, desc }, i) => (
              <Reveal key={n} delay={i * 80}>
                <div className="flex gap-5 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black text-violet-400">{n}</span>
                  </div>
                  <div className="pt-1">
                    <h3 className="font-semibold text-white mb-1">{title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Preço por usuário. Simples.</h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                Quanto maior a equipe, menor o custo por pessoa.
                Uma licença corporativa de 20 usuários equivale a{" "}
                <span className="text-white font-semibold">26 assinaturas Premium individuais</span>.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {TEAM_SIZES.map(({ size, price, monthly, highlight }, i) => (
              <Reveal key={size} delay={i * 60}>
                <div className={`rounded-2xl border p-5 text-center ${highlight ? "border-violet-500/40 bg-gradient-to-br from-violet-900/30 to-indigo-900/20" : "border-zinc-800 bg-zinc-900/50"}`}>
                  <p className="text-xs text-zinc-500 mb-2">{size} pessoas</p>
                  <p className="text-2xl font-black text-white mb-0.5">{price}</p>
                  {price !== "Custom" && <p className="text-xs text-zinc-600">/usuário/mês</p>}
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <p className="text-xs text-zinc-400">{monthly}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <ROICalc />
          </Reveal>
        </div>
      </section>

      {/* VS CONCORRÊNCIA */}
      <section className="py-16 px-4 bg-zinc-900/30">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold text-white text-center mb-10">Por que não um LMS tradicional?</h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="text-left text-zinc-500 font-medium py-3 px-5">Funcionalidade</th>
                    <th className="text-center text-zinc-500 font-medium py-3 px-3 w-28">LMS Trad.</th>
                    <th className="text-center text-violet-400 font-semibold py-3 px-3 w-36">SpeakFlow Teams</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map(([label, lms, sf], i) => (
                    <tr key={String(label)} className={`border-b border-zinc-800/50 ${i % 2 === 0 ? "bg-zinc-900/20" : ""}`}>
                      <td className="py-3 px-5 text-zinc-300 text-sm">{label as string}</td>
                      <td className="text-center py-3 px-3">
                        {lms ? <Check className="h-4 w-4 text-zinc-400 mx-auto" /> : <X className="h-4 w-4 text-zinc-700 mx-auto" />}
                      </td>
                      <td className="text-center py-3 px-3">
                        {sf ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-zinc-700 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PARA QUEM */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold text-white text-center mb-10">Ideal para quem compra</h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { role: "RH / People", desc: "Benefício de alto impacto com ROI mensurável e relatório de engajamento por colaborador." },
              { role: "T&D",         desc: "Substitua treinamentos genéricos por prática contínua contextualizada ao trabalho real da equipe." },
              { role: "Gestores",    desc: "Identifique quem está travando em calls internacionais e acompanhe a evolução semana a semana." },
            ].map(({ role, desc }, i) => (
              <Reveal key={role} delay={i * 80}>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <p className="text-sm font-bold text-violet-400 mb-2">{role}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FORM */}
      <section ref={formRef} className="py-20 px-4 bg-zinc-900/30" id="demo">
        <div className="max-w-xl mx-auto">
          <Reveal>
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Solicite uma demonstração</h2>
              <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                Nossa equipe entra em contato em até 24h para mostrar como funciona na prática.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 md:p-8">
              <DemoForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">S</span>
            </div>
            <span className="text-sm text-zinc-400">SpeakFlow for Teams · speakf.com.br</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-zinc-600">
            <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-zinc-400 transition-colors">Planos individuais</Link>
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">Termos</Link>
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
