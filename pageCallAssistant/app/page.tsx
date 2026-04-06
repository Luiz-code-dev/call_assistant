import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import {
  Mic2, Zap, Globe, Brain, Shield, Download,
  CheckCircle2, ArrowRight, Star, ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: Mic2,
    title: "Transcrição em tempo real",
    description: "Captura e transcreve tudo que é dito durante a reunião usando o modelo Whisper da OpenAI.",
  },
  {
    icon: Globe,
    title: "Tradução instantânea",
    description: "Traduz automaticamente de qualquer idioma para o português, sem atraso perceptível.",
  },
  {
    icon: Brain,
    title: "Copilot inteligente",
    description: "Gera 3 sugestões de resposta contextualizadas: curta, profissional e detalhada.",
  },
  {
    icon: Zap,
    title: "Latência ultra-baixa",
    description: "Resultados em menos de 2 segundos. Projetado para conversas rápidas e dinâmicas.",
  },
  {
    icon: Shield,
    title: "100% local + nuvem",
    description: "O app roda no seu computador. O áudio é processado com segurança via API OpenAI.",
  },
  {
    icon: Download,
    title: "App nativo Windows",
    description: "Instalador simples. Funciona em segundo plano, sem impactar a performance do sistema.",
  },
];

const testimonials = [
  {
    name: "Rafael M.",
    role: "Engenheiro de Software",
    text: "Uso em todas as entrevistas técnicas em inglês. As sugestões do copilot são precisas e me ajudam a estruturar melhor as respostas.",
    stars: 5,
  },
  {
    name: "Camila S.",
    role: "Gerente de Produto",
    text: "Mudou completamente minhas reuniões com stakeholders internacionais. A tradução em tempo real é impressionante.",
    stars: 5,
  },
  {
    name: "Lucas P.",
    role: "Desenvolvedor Freelancer",
    text: "Ferramenta essencial para calls com clientes americanos. Consigo focar na conversa sem me preocupar com o idioma.",
    stars: 5,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="hero-gradient relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]" />

        <Badge variant="purple" className="mb-6 animate-fade-in">
          <Zap className="mr-1 h-3 w-3" />
          Powered by OpenAI Whisper + GPT-4
        </Badge>

        <h1 className="animate-fade-in mb-6 max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
          Seu copiloto inteligente{" "}
          <span className="gradient-text">em tempo real</span>
        </h1>

        <p className="animate-fade-in mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
          Transcrição, tradução e sugestões de resposta durante suas entrevistas e reuniões. 
          Tudo acontece enquanto você fala — sem pausas, sem distrações.
        </p>

        <div className="animate-fade-in flex flex-col items-center gap-4 sm:flex-row">
          <Button variant="gradient" size="xl" asChild>
            <Link href="/register">
              Começar grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button variant="outline" size="xl" asChild>
            <Link href="#download">
              <Download className="mr-2 h-5 w-5" />
              Baixar app
            </Link>
          </Button>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Sem cartão de crédito • 50 créditos grátis para testar
        </p>

        {/* App preview mockup */}
        <div className="mt-16 w-full max-w-4xl animate-fade-in">
          <div className="rounded-xl border border-border/50 bg-card/50 p-1 shadow-2xl shadow-violet-500/10 backdrop-blur">
            <div className="flex items-center gap-2 rounded-t-lg border-b border-border/50 bg-card px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 text-center text-xs text-muted-foreground">SpeakFlow</div>
            </div>
            <div className="grid h-64 grid-cols-2 gap-3 p-4">
              <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Mic2 className="h-3 w-3 text-violet-400" />
                  <span className="text-xs font-medium text-muted-foreground">CONVERSA</span>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-foreground">
                    Can you tell me about your experience with React?
                  </div>
                  <div className="ml-4 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                    PT: Pode me falar sobre sua experiência com React?
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                    Aguardando fala...
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Brain className="h-3 w-3 text-violet-400" />
                  <span className="text-xs font-medium text-muted-foreground">COPILOT</span>
                </div>
                <div className="space-y-1.5">
                  <div className="rounded bg-violet-500/10 px-2 py-1.5 text-xs">
                    <span className="font-medium text-violet-400">Curta:</span>
                    <p className="mt-0.5 text-muted-foreground">Tenho 5 anos com React e hooks...</p>
                  </div>
                  <div className="rounded bg-secondary px-2 py-1.5 text-xs">
                    <span className="font-medium text-muted-foreground">Profissional:</span>
                    <p className="mt-0.5 text-muted-foreground">Trabalho com React desde 2019...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge variant="purple" className="mb-4">Recursos</Badge>
            <h2 className="mb-4 text-4xl font-bold">Tudo que você precisa, em tempo real</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Desenvolvido para profissionais que precisam de performance máxima durante entrevistas e reuniões importantes.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="card-gradient group rounded-xl border border-border/50 p-6 transition-all hover:border-violet-500/30 hover:glow-purple"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                  <feature.icon className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="mb-2 font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-border/50 bg-card/30 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge variant="purple" className="mb-4">Depoimentos</Badge>
            <h2 className="mb-4 text-4xl font-bold">Quem já usa, não para</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border border-border/50 bg-card p-6">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-violet-400 text-violet-400" />
                  ))}
                </div>
                <p className="mb-4 text-sm text-muted-foreground">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="purple" className="mb-4">Preços</Badge>
          <h2 className="mb-4 text-4xl font-bold">Comece grátis, cresça conforme usa</h2>
          <p className="mb-8 text-muted-foreground">
            50 créditos grátis ao criar sua conta. Sem cartão de crédito necessário.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: "Free", price: "Grátis", credits: "50 créditos", highlight: false },
              { name: "Basic", price: "$15/mês", credits: "500 créditos/mês", highlight: true },
              { name: "Premium", price: "$30/mês", credits: "1.000 créditos/mês", highlight: false },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 ${
                  plan.highlight
                    ? "border-violet-500/50 bg-violet-500/5"
                    : "border-border/50 bg-card"
                }`}
              >
                {plan.highlight && (
                  <Badge variant="purple" className="mb-3">Popular</Badge>
                )}
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="my-2 text-2xl font-bold">{plan.price}</p>
                <p className="text-sm text-muted-foreground">{plan.credits}</p>
              </div>
            ))}
          </div>
          <Button variant="gradient" size="lg" className="mt-8" asChild>
            <Link href="/pricing">
              Ver todos os planos
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="border-t border-border/50 bg-card/30 px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="purple" className="mb-4">Download</Badge>
          <h2 className="mb-4 text-4xl font-bold">Pronto para usar em minutos</h2>
          <p className="mb-8 text-muted-foreground">
            Instale o app, faça login com sua conta e comece na próxima reunião.
          </p>
          <div className="mb-8 flex flex-col items-start gap-3 rounded-xl border border-border/50 bg-card p-6 text-left">
            {[
              "Crie sua conta e ganhe créditos grátis",
              "Baixe o instalador para Windows",
              "Instale e faça login com sua conta",
              "Abra o app antes da sua próxima reunião",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400" />
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="gradient" size="lg" asChild>
              <Link href="/register">
                Criar conta grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="https://github.com/Luiz-code-dev/call_assistant/releases/download/v0.1.0/SpeakFlow-Setup-0.1.0.exe">
                <Download className="mr-2 h-4 w-4" />
                Baixar SpeakFlow-Setup-0.1.0.exe
              </a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Windows 10/11 64-bit • Versão 0.1.0 • 80 MB
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <span className="text-xs font-bold text-white">S</span>
            </div>
            <span className="text-sm font-medium">SpeakFlow</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 SpeakFlow. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
            <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground">Preços</Link>
            <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">Login</Link>
            <Link href="/register" className="text-xs text-muted-foreground hover:text-foreground">Cadastro</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
