import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { SupportChat } from "@/components/SupportChat";
import { getSession } from "@/lib/auth";
import {
  BookOpen, Mic2, Globe, Brain, Wand2, MessageSquarePlus,
  CheckCircle2, ArrowRight, Download, Zap, Star, Volume2,
  Settings, Play, Send, RotateCcw, ChevronRight, Instagram, Users, Trophy, Medal, Radio,
} from "lucide-react";

export default async function GuiaPage() {
  const session = await getSession();
  const isLoggedIn = !!session;
  const sessionUser = session
    ? { id: session.sub, name: session.name, email: session.email, plan: session.plan }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar initialUser={sessionUser} />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 text-center">
        <div className="mx-auto max-w-3xl">
          <Badge variant="purple" className="mb-4">
            <BookOpen className="mr-1 h-3 w-3" />
            Guia Completo
          </Badge>
          <h1 className="text-4xl font-bold mb-4 md:text-5xl">
            Tudo que você precisa saber para{" "}
            <span className="gradient-text">dominar o SpeakFlow</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Do primeiro acesso às ferramentas de IA — um guia prático e direto ao ponto.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
            {["Primeiros passos", "App desktop", "Ferramentas de IA", "Créditos e planos", "Network & Circles", "SpeakFlow Live"].map((t) => (
              <span key={t} className="rounded-full border border-border/50 px-3 py-1">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Table of contents */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-400" />
              Índice
            </h2>
            <ol className="space-y-2 text-sm">
              {[
                { n: "1", label: "Criar conta e primeiros créditos", href: "#conta" },
                { n: "2", label: "Como funciona o app desktop (durante calls)", href: "#app" },
                { n: "3", label: "Ferramenta: Melhorar Resposta", href: "#melhorar" },
                { n: "4", label: "Ferramenta: Gerar Resposta", href: "#gerar" },
                { n: "5", label: "Ferramenta: Treino de Entrevista", href: "#entrevista" },
                { n: "6", label: "Créditos: como funcionam e como recarregar", href: "#creditos" },
                { n: "7", label: "Planos e diferenças", href: "#planos" },
                { n: "8", label: "SpeakFlow Network — Circles e Desafios", href: "#network" },
                { n: "9", label: "SpeakFlow Live — Copiloto em tempo real (PWA)", href: "#live" },
              ].map((item) => (
                <li key={item.n}>
                  <a href={item.href} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-400">{item.n}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 space-y-16 pb-24">

        {/* Section 1 — Conta */}
        <section id="conta" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-400">1</div>
            <h2 className="text-2xl font-bold">Criar conta e primeiros créditos</h2>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Criar uma conta no SpeakFlow é gratuito e leva menos de 1 minuto. Ao se cadastrar, você recebe <strong>50 créditos de boas-vindas</strong> — sem precisar de cartão de crédito.
            </p>
            <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
              <h3 className="font-semibold text-sm">Passo a passo:</h3>
              <ol className="space-y-2">
                {[
                  "Acesse speakf.com.br e clique em \"Teste grátis\"",
                  "Preencha seu nome, e-mail e crie uma senha",
                  "Confirme seu e-mail (verifique a caixa de spam)",
                  "Faça login e acesse o Dashboard",
                  "Seus 50 créditos já estão disponíveis",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> O plano gratuito inclui transcrição, tradução e Copilot. Para as Ferramentas de IA, é necessário o plano Básico ou Premium.
            </div>
          </div>
        </section>

        {/* Section 2 — App */}
        <section id="app" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-400">2</div>
            <h2 className="text-2xl font-bold">App desktop — durante calls</h2>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              O app desktop roda em segundo plano no Windows e fica disponível na bandeja do sistema. Ele captura o áudio da reunião e processa com OpenAI em tempo real.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Download, title: "Instalar", desc: "No Dashboard, clique em \"Baixar app\" e execute o instalador .exe" },
                { icon: Play, title: "Iniciar", desc: "Abra o SpeakFlow antes da sua reunião e clique em \"Iniciar sessão\"" },
                { icon: Mic2, title: "Transcrição", desc: "O app detecta e transcreve automaticamente o que é dito em inglês" },
                { icon: Globe, title: "Tradução", desc: "A tradução aparece em menos de 2 segundos, em português" },
                { icon: Brain, title: "Copilot", desc: "Clique em \"Sugerir resposta\" para ver 3 opções prontas em inglês" },
                { icon: Settings, title: "Configurar", desc: "Acesse Configurações para ajustar o idioma e atalhos de teclado" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                    <item.icon className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Consumo de créditos no app:</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Transcrição:</strong> 1 crédito por ~30 segundos de áudio</p>
                <p>• <strong>Tradução:</strong> 1 crédito por tradução</p>
                <p>• <strong>Copilot (sugestão):</strong> 2 créditos por chamada</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 — Melhorar */}
        <section id="melhorar" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-400">3</div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Wand2 className="h-6 w-6 text-violet-400" />
              Melhorar Resposta
            </h2>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Tem uma frase em inglês mas não sabe se está correta ou soa profissional? Cole o texto e a IA melhora, explica o que mudou e dá dicas personalizadas.
            </p>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-3">
              <h3 className="font-semibold text-sm">Como usar:</h3>
              <ol className="space-y-2">
                {[
                  "No Dashboard, clique em \"Melhorar Resposta\" ou acesse /tools/improve",
                  "Cole seu texto em inglês no campo (até 2.000 caracteres)",
                  "Clique em \"Melhorar texto\" — 2 créditos serão debitados",
                  "Veja: versão melhorada, nota de 1-10, explicação e dicas",
                  "Clique em \"Copiar\" para usar a versão melhorada",
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="font-bold text-violet-400 shrink-0">{i + 1}.</span> {s}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">EXEMPLO</p>
              <div className="space-y-2 text-sm">
                <div className="rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2 text-muted-foreground">
                  ❌ &ldquo;I worked in the project and did many things that helped team a lot.&rdquo;
                </div>
                <div className="rounded-lg bg-green-500/5 border border-green-500/20 px-3 py-2">
                  ✅ &ldquo;I played a key role in the project, delivering several impactful contributions that significantly benefited the team.&rdquo;
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-violet-400" />
              <span>Custo: 2 créditos por uso · Limite: 5x/dia (Básico) ou ilimitado (Premium)</span>
            </div>
          </div>
        </section>

        {/* Section 4 — Gerar */}
        <section id="gerar" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-400">4</div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquarePlus className="h-6 w-6 text-violet-400" />
              Gerar Resposta
            </h2>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Não sabe o que falar numa situação específica em inglês? Descreva o contexto em português e receba 3 versões de resposta prontas, com tradução e dica de uso.
            </p>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-3">
              <h3 className="font-semibold text-sm">Como usar:</h3>
              <ol className="space-y-2">
                {[
                  "Acesse /tools/generate pelo Dashboard ou menu Ferramentas",
                  "Escreva em português o contexto ou situação (até 1.000 caracteres)",
                  "Clique em \"Gerar respostas\" — 2 créditos serão debitados",
                  "Veja 3 versões: ⚡ Curta, 💼 Profissional, 📋 Detalhada",
                  "Leia a tradução e a dica de uso, depois copie a versão preferida",
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="font-bold text-cyan-400 shrink-0">{i + 1}.</span> {s}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">EXEMPLOS DE CONTEXTO</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>→ &ldquo;Meu manager perguntou sobre minha experiência com microsserviços&rdquo;</p>
                <p>→ &ldquo;Preciso me apresentar em inglês numa call com cliente americano&rdquo;</p>
                <p>→ &ldquo;Fui questionado sobre um atraso na entrega de uma feature&rdquo;</p>
                <p>→ &ldquo;Quero pedir um aumento de salário em inglês&rdquo;</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-violet-400" />
              <span>Custo: 2 créditos por uso · Limite: 5x/dia (Básico) ou ilimitado (Premium)</span>
            </div>
          </div>
        </section>

        {/* Section 5 — Entrevista */}
        <section id="entrevista" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-400">5</div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Mic2 className="h-6 w-6 text-violet-400" />
              Treino de Entrevista
            </h2>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Simule uma entrevista técnica completa em inglês com um entrevistador de IA. Configure sua vaga, nível e tecnologias — as perguntas serão personalizadas para o seu perfil.
            </p>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
              <h3 className="font-semibold text-sm">Como usar:</h3>
              <ol className="space-y-2">
                {[
                  "Acesse /tools/interview pelo Dashboard",
                  "Configure: Vaga (ex: Backend Java), Nível e Tipo de entrevista",
                  "Opcionalmente informe as tecnologias principais (ex: Spring Boot, AWS)",
                  "Ative ou desative o áudio — as perguntas podem ser lidas em inglês",
                  "Clique em \"Iniciar entrevista\" (sem consumo de créditos nesta etapa)",
                  "Responda cada pergunta em inglês no campo de texto",
                  "A IA avalia, dá nota de 1-10, mostra como poderia responder e dá uma dica",
                  "Ao final das 8 perguntas, receba uma avaliação completa da sessão",
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="font-bold text-emerald-400 shrink-0">{i + 1}.</span> {s}
                  </li>
                ))}
              </ol>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Volume2, title: "Áudio", desc: "As perguntas são lidas em inglês pelo navegador (Web Speech API)" },
                { icon: Star, title: "Nota por resposta", desc: "Cada resposta recebe uma nota de 1 a 10 com feedback em PT" },
                { icon: RotateCcw, title: "Nova sessão", desc: "Reinicie a qualquer momento para praticar um cenário diferente" },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-border/50 bg-card p-4 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                      <item.icon className="h-4 w-4 text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-violet-400" />
              <span>Custo: 2 créditos por resposta (até 16 créditos por sessão completa) · 3 sessões/dia (Básico) ou ilimitado (Premium)</span>
            </div>
          </div>
        </section>

        {/* Section 6 — Créditos */}
        <section id="creditos" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-400">6</div>
            <h2 className="text-2xl font-bold">Créditos — como funcionam</h2>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Créditos são a moeda do SpeakFlow. Cada ação que usa IA consome créditos. Os créditos do plano renovam mensalmente; créditos avulsos nunca expiram.
            </p>
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="border-b border-border/50 px-4 py-3 bg-secondary/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tabela de consumo</p>
              </div>
              <div className="divide-y divide-border/30">
                {[
                  ["Transcrição de áudio", "~1 crédito / 30 seg"],
                  ["Tradução", "1 crédito"],
                  ["Copilot (sugestão de resposta)", "2 créditos"],
                  ["Melhorar Resposta", "2 créditos"],
                  ["Gerar Resposta", "2 créditos"],
                  ["Treino de Entrevista (por resposta)", "2 créditos"],
                  ["SpeakFlow Live (sugestão ao vivo)", "2 créditos"],
                ].map(([acao, custo]) => (
                  <div key={acao} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-muted-foreground">{acao}</span>
                    <span className="font-medium text-violet-400">{custo}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Recargas avulsas (não expiram)</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• R$ 24,90 → 50 créditos</p>
                <p>• R$ 49,90 → 150 créditos</p>
                <p>• R$ 119,90 → 400 créditos</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/usage">Ver meu saldo e histórico <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </section>

        {/* Section 7 — Planos */}
        <section id="planos" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-400">7</div>
            <h2 className="text-2xl font-bold">Planos e diferenças</h2>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  name: "Gratuito", price: "Grátis", highlight: false,
                  features: ["50 créditos de boas-vindas", "Transcrição em tempo real", "Tradução instantânea", "Copilot básico"],
                  noAccess: ["Ferramentas de IA", "Limite diário"],
                },
                {
                  name: "Básico", price: "R$ 74,90/mês", highlight: true,
                  features: ["500 créditos/mês", "Tudo do Gratuito", "Melhorar Resposta (5x/dia)", "Gerar Resposta (5x/dia)", "Treino de Entrevista (3x/dia)", "📡 SpeakFlow Live — 10 sugestões/dia"],
                  noAccess: [],
                },
                {
                  name: "Premium", price: "R$ 149,90/mês", highlight: false,
                  features: ["1.000 créditos/mês", "Tudo do Básico", "Ferramentas de IA ilimitadas", "📡 SpeakFlow Live — ilimitado", "IA avançada", "Suporte VIP 24h"],
                  noAccess: [],
                },
              ].map((plan) => (
                <div key={plan.name} className={`rounded-xl border p-5 ${plan.highlight ? "border-violet-500/40 bg-violet-500/5" : "border-border/50 bg-card"}`}>
                  {plan.highlight && <Badge variant="purple" className="mb-3 text-xs">Mais popular</Badge>}
                  <h3 className="font-bold">{plan.name}</h3>
                  <p className="my-1 text-xl font-bold">{plan.price}</p>
                  <div className="mt-3 space-y-1.5">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        {f}
                      </div>
                    ))}
                    {plan.noAccess.map((f) => (
                      <div key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground/40 line-through">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="gradient" size="sm" asChild>
              <Link href="/pricing">Ver todos os planos e fazer upgrade <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Pronto para começar?</h3>
          <p className="text-muted-foreground text-sm mb-6">
            50 créditos grátis ao criar sua conta. Sem cartão de crédito.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="gradient" asChild>
              <Link href={isLoggedIn ? "/dashboard" : "/register"}>
                {isLoggedIn ? "Ir para o Dashboard" : "Criar conta grátis"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {isLoggedIn && (
              <Button variant="outline" asChild>
                <Link href="/tools">Acessar Ferramentas de IA</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Section 8 — Network */}
        <section id="network" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
              <Users className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-violet-400 uppercase tracking-wide">Seção 8</p>
              <h2 className="text-2xl font-bold">SpeakFlow Network — Circles e Desafios</h2>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
            <p className="text-sm leading-relaxed">
              O <strong>SpeakFlow Network</strong> é a comunidade de prática do SpeakFlow. Reúna-se em <strong>Circles</strong> com outros profissionais, participe de desafios reais de comunicação em inglês e receba feedback automático da IA.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-violet-400" />O que são Circles?</h3>
              <p className="text-sm text-muted-foreground mb-3">Circles são grupos de prática com foco e nível definidos (ex: "Reuniões de negócios — Intermediário"). Cada Circle tem:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Desafios periódicos de comunicação (escritos ou falados)", "Feed de respostas dos membros", "Ranking ao vivo com score da IA", "Selos de experiência por evolução"].map(item => (
                  <li key={item} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-violet-400" />Como participar de um desafio?</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-none">
                {[
                  "Acesse /network → Circles → entre em um Circle público ou aceite um convite",
                  "Veja o desafio ativo do Circle (ex: 'Descreva uma situação de liderança em inglês')",
                  "Envie sua resposta em inglês (texto ou áudio)",
                  "A IA avalia fluência, conteúdo e clareza (0–100 cada)",
                  "Receba feedback + versão melhorada + dica prática",
                  "Veja sua posição no ranking do Circle",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-400">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-400" />Selos de experiência</h3>
              <p className="text-sm text-muted-foreground mb-3">Você ganha selos conforme evolui no Network. Os selos aparecem no seu perfil e demonstram seu nível para outros membros:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { emoji: "🎯", label: "Primeira Entrega", desc: "Enviou sua 1ª resposta" },
                  { emoji: "🔥", label: "Consistente", desc: "5+ submissões" },
                  { emoji: "⭐", label: "Top Performer", desc: "Score médio > 80" },
                  { emoji: "🏆", label: "Streak 7 dias", desc: "7 dias seguidos praticando" },
                ].map(b => (
                  <div key={b.label} className="rounded-xl border border-border/50 bg-card p-3">
                    <p className="text-lg mb-1">{b.emoji}</p>
                    <p className="font-medium text-xs">{b.label}</p>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-4">
              <h3 className="font-semibold mb-3 text-sm">Limites por plano</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2"><span className="text-muted-foreground w-24 shrink-0">Gratuito</span><span>Participar de até 2 Circles · Não pode criar · Sem certificado</span></div>
                <div className="flex items-start gap-2"><span className="text-violet-400 w-24 shrink-0">Básico</span><span>Criar 1 Circle · Participar de quantos quiser · Sem certificado</span></div>
                <div className="flex items-start gap-2"><span className="text-amber-400 w-24 shrink-0">Premium</span><span>Criar Circles ilimitados · Participar ilimitado · <strong>Avaliação CEFR + Certificado de Proficiência</strong></span></div>
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs text-amber-400 font-medium mb-1">🏆 Certificado de Proficiência SpeakFlow</p>
                  <p className="text-xs text-muted-foreground">Exclusivo Premium. A IA analisa suas respostas e determina seu nível CEFR (A1–C2). Se atingir B1 ou superior, você pode gerar e imprimir um certificado oficial SpeakFlow — válido para LinkedIn e portfólio.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/network" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                <Users className="h-4 w-4" /> Acessar o Network
              </Link>
              <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border border-border/50 px-5 py-2.5 text-sm font-medium hover:border-violet-500/40 transition-colors">
                Ver planos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Section 9 — Live */}
        <section id="live" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
              <Radio className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-red-400 uppercase tracking-wide">Seção 9 · Novo</p>
              <h2 className="text-2xl font-bold">SpeakFlow Live — Copiloto em Tempo Real</h2>
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 mb-6">
            <p className="text-sm leading-relaxed">
              O <strong>SpeakFlow Live</strong> é um PWA instalável no celular ou computador que captura o áudio do seu microfone durante conversas, transcreve em tempo real, traduz e sugere 3 respostas prontas com IA — tudo sem sair da tela.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Como funciona?</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Mic2, title: "Captura pelo microfone", desc: "Usa o mic do celular ou computador — não precisa do app desktop" },
                  { icon: Globe, title: "Transcrição instantânea", desc: "Reconhecimento de voz nativo do browser (Chrome/Android) ou Whisper como fallback" },
                  { icon: Brain, title: "IA com memória de sessão", desc: "O AgentScope lembra o contexto acumulado durante toda a sessão" },
                  { icon: MessageSquarePlus, title: "3 sugestões de resposta", desc: "Curta, Profissional e Detalhada — em inglês + tradução em português" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                      <item.icon className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Como usar?</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Acesse /live pelo Dashboard ou instale o PWA na tela inicial do celular",
                  "Selecione a área da conversa (Reuniões, Entrevistas, Medicina, etc.) e seu nível",
                  "Escolha o idioma que será captado (inglês, espanhol, francês...)",
                  "Clique em 'Iniciar Sessão Live'",
                  "Pressione o microfone durante a conversa — fale ou coloque o celular próximo ao áudio",
                  "Veja a transcrição, tradução e as 3 sugestões aparecerem automaticamente",
                  "Clique na sugestão para expandir e copiar o texto para usar na conversa",
                  "Ao terminar, clique em 'Encerrar' — a memória da sessão é limpa",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-xs font-bold text-red-400">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-300 mb-1">💡 Diferença do app desktop</p>
              <p className="text-sm text-muted-foreground">
                O app desktop captura o áudio do sistema (o que toca pelo computador). O SpeakFlow Live captura pelo microfone — ideal para quem usa celular, tablet ou está em ambiente sem o app desktop instalado.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-4">
              <h3 className="font-semibold text-sm mb-2">Compatibilidade</h3>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p>✅ <strong>Chrome / Edge (Android, Windows, Mac)</strong> — reconhecimento de voz instantâneo</p>
                <p>✅ <strong>Safari (iOS 17+)</strong> — modo gravação com Whisper como transcritor</p>
                <p>✅ <strong>Instalável como app</strong> — via "Adicionar à tela inicial" no celular</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-red-400" />
              <span>Custo: 2 créditos por sugestão gerada · Básico: 10x/dia · Premium: ilimitado</span>
            </div>

            <Link href="/live" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
              <Radio className="h-4 w-4" /> Abrir SpeakFlow Live
            </Link>
          </div>
        </section>

      </div>

      <SupportChat />

      <footer className="border-t border-border/50 px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © 2025 SpeakFlow · <Link href="/" className="hover:text-foreground">Início</Link> · <Link href="/pricing" className="hover:text-foreground">Preços</Link>
          </p>
          <a
            href="https://www.instagram.com/speakflowofficial?igsh=ZmljYW5keDR4dWt1&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-pink-400 transition-colors"
          >
            <Instagram className="h-3.5 w-3.5" />
            @speakflowofficial
          </a>
        </div>
      </footer>
    </div>
  );
}
