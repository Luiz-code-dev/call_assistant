"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic2, Zap, Users, Star, CheckCircle2, Globe, ArrowRight, Brain, Shield, Monitor,
  MessageSquare, Target, Sparkles, Download, Smartphone, Award, Send, PenTool,
  ChevronRight, Instagram,
} from "lucide-react";
import { SupportChat } from "@/components/SupportChat";
import { CookieManagerButton } from "@/components/CookieConsent";

// ==================== SCROLL ANIMATION ====================

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, isVisible };
}

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div ref={ref} className={`transition-all duration-700 ${className}`}
      style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(30px)", transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ==================== LOGO ====================

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-500/25">
        <span className="text-lg font-bold text-white">S</span>
      </div>
      <span className="text-xl font-medium text-zinc-400 tracking-tight">SpeakFlow</span>
    </Link>
  );
}

// ==================== HEADER ====================

function Header({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/50" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo />
          <nav className="hidden md:flex items-center gap-8">
            {[["Por que SpeakFlow?","#porque"],["Recursos","#recursos"],["Network","#network"],["Preços","#precos"],["Download","#download"]].map(([label, href]) => (
              <a key={label} href={href} className="text-sm text-zinc-400 hover:text-white transition-colors">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/home">
                <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/25">
                  Ir para o App
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login"><Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">Entrar</Button></Link>
                <Link href="/register"><Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/25">Criar Conta</Button></Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ==================== HERO ====================

function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [currentFala, setCurrentFala] = useState(0);
  const falas = [
    { en: "What's your biggest achievement in your last role?", pt: "Qual foi sua maior conquista no seu último cargo?" },
    { en: "How do you handle pressure and tight deadlines?", pt: "Como você lida com pressão e prazos apertados?" },
  ];
  useEffect(() => {
    const interval = setInterval(() => setCurrentFala((p) => (p + 1) % falas.length), 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-12">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <AnimatedSection>
              <Badge variant="outline" className="mb-6 px-4 py-1.5 border-violet-500/30 bg-violet-500/10 text-violet-300">
                <Sparkles className="h-3.5 w-3.5 mr-2" />Powered by OpenAI Whisper + GPT-4
              </Badge>
            </AnimatedSection>
            <AnimatedSection delay={100}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                <span className="text-white">Seu </span>
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">copiloto inteligente</span>
                <br /><span className="text-white">em tempo real</span>
              </h1>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <p className="mt-6 text-lg text-zinc-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Transcrição, tradução e sugestões de resposta durante suas entrevistas e reuniões. Tudo acontece enquanto você fala — sem pausas, sem distrações.
              </p>
            </AnimatedSection>
            <AnimatedSection delay={300}>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link href={isLoggedIn ? "/home" : "/register"}>
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-xl shadow-violet-500/30 px-8 h-12 text-base">
                    {isLoggedIn ? "Ir para o App" : "Começar grátis"}<ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#download">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-white h-12 px-8 text-base">
                    <Download className="mr-2 h-4 w-4" />Baixar app
                  </Button>
                </a>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={400}>
              <p className="mt-6 text-sm text-zinc-500">Sem cartão de crédito &bull; 50 créditos grátis para testar</p>
            </AnimatedSection>
          </div>

          <AnimatedSection delay={300} className="hidden lg:block">
            <div className="relative">
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl shadow-black/50 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
                  <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-yellow-500" /><div className="w-3 h-3 rounded-full bg-green-500" /></div>
                  <div className="flex-1 text-center text-xs text-zinc-500">SpeakFlow — Entrevista Técnica</div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-zinc-800">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-4"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Conversa ao vivo</span></div>
                    <div className="space-y-4">
                      {falas.map((fala, index) => (
                        <div key={index} className={`transition-all duration-500 ${index <= currentFala ? "opacity-100" : "opacity-30"}`}>
                          <p className="text-sm text-white">{fala.en}</p>
                          <p className="text-xs text-zinc-500 mt-1">PT: {fala.pt}</p>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-2">
                        <div className="flex gap-1">
                          {[0, 0.1, 0.2].map((d, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${d}s` }} />)}
                        </div>
                        <span className="text-xs text-zinc-500">Can you describe your experience with agile...</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-950/50">
                    <div className="flex items-center gap-2 mb-4"><Brain className="w-4 h-4 text-violet-400" /><span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Copilot</span></div>
                    <div className="space-y-3">
                      {[
                        { color: "text-amber-400", icon: <Zap className="w-3 h-3" />, label: "Short", text: "I handled pressure well using Kanban, prioritizing critical tasks and delivering consistently on time." },
                        { color: "text-violet-400", icon: <Award className="w-3 h-3" />, label: "Professional", text: "Under pressure, I prioritize clear communication and use agile methods to reorganize scope without compromising quality." },
                        { color: "text-blue-400", icon: <MessageSquare className="w-3 h-3" />, label: "Detailed", text: "I work with 2-week sprints and daily stand-ups. When blockers arise, I escalate quickly and propose alternative solutions." },
                      ].map((s) => (
                        <div key={s.label} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 cursor-pointer hover:border-violet-500/30 transition-colors">
                          <div className="flex items-center gap-2 mb-1"><span className={s.color}>{s.icon}</span><span className={`text-xs font-medium ${s.color}`}>{s.label}</span></div>
                          <p className="text-xs text-zinc-300">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-2xl blur-2xl -z-10" />
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

// ==================== WHY ====================

function WhySection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section id="porque" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              O inglês nunca mais<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">vai te travar</span>
            </h2>
            <p className="mt-6 text-lg text-zinc-400 max-w-3xl mx-auto">SpeakFlow foi criado para um momento específico: quando você sabe o que responder, mas o idioma bloqueia tudo na hora mais importante.</p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {[
            { color: "border-red-500/50 bg-red-500/5", title: "Entrevistas técnicas em inglês", desc: "O recrutador faz a pergunta. Você entende, sabe a resposta — mas a formulação em inglês trava. O silêncio dura 4 segundos e a vaga vai embora." },
            { color: "border-orange-500/50 bg-orange-500/5", title: "Reuniões com times globais", desc: "Sotaques variados, jargões técnicos, ritmo acelerado. Você capta 60% do que é dito — e os 40% perdidos tomam decisões sem a sua contribuição." },
            { color: "border-yellow-500/50 bg-yellow-500/5", title: "Calls de alto impacto", desc: "Apresentação para cliente americano, negociação com parceiro europeu. Um momento de hesitação ou mal-entendido pode custar o contrato." },
          ].map((p, i) => (
            <AnimatedSection key={p.title} delay={i * 100}>
              <Card className={`${p.color} border h-full transition-all duration-300 hover:-translate-y-1`}>
                <CardContent className="p-6"><h3 className="text-lg font-semibold text-white mb-3">{p.title}</h3><p className="text-zinc-400 text-sm leading-relaxed">{p.desc}</p></CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {[["73%","das vagas sênior em TI exigem inglês"],["+61%","de salário com inglês fluente"],["3 seg","para formular uma resposta sob pressão"],["<2 seg","de latência do SpeakFlow"]].map(([v,l]) => (
              <div key={v} className="text-center p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">{v}</div>
                <div className="mt-2 text-sm text-zinc-500">{l}</div>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <h3 className="text-2xl font-bold text-white text-center mb-12">Como funciona</h3>
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            {[["1","Eles falam","O entrevistador fala em inglês, normalmente, sem pausas"],["2","Você entende","SpeakFlow transcreve e traduz para PT em menos de 2 segundos"],["3","Copilot sugere","3 respostas prontas em inglês: curta, profissional e detalhada"],["4","Você responde","Fala com confiança, sem hesitar, sem travar — na hora certa"]].map(([n,t,d], i) => (
              <div key={n} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg mb-4">{n}</div>
                  <h4 className="text-white font-semibold mb-2">{t}</h4>
                  <p className="text-sm text-zinc-500">{d}</p>
                </div>
                {i < 3 && <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-px bg-gradient-to-r from-violet-600/50 to-indigo-600/50" />}
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-violet-600/10 to-indigo-600/10 border border-violet-500/20">
            <p className="text-lg text-zinc-300 max-w-2xl mx-auto">
              Você já perdeu uma oportunidade por causa do inglês? Com o SpeakFlow, isso fica no passado.{" "}
              <span className="text-violet-400 font-medium">50 créditos grátis para testar agora</span> — sem cartão de crédito, sem compromisso.
            </p>
            <Link href={isLoggedIn ? "/home" : "/register"}>
              <Button className="mt-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/25">
                {isLoggedIn ? "Ir para o App" : "Começar grátis"}<ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ==================== FEATURES ====================

function FeaturesSection() {
  const features = [
    { icon: <Smartphone className="h-6 w-6" />, title: "SpeakFlow Live (PWA)", desc: "Seu copiloto na palma da mão. Instale como app no celular, capture e traduza em tempo real, receba 3 sugestões de IA com contexto personalizado.", gradient: "from-violet-500 to-indigo-600" },
    { icon: <Mic2 className="h-6 w-6" />, title: "Transcrição em tempo real", desc: "Captura e transcreve tudo que é dito usando o modelo Whisper da OpenAI.", gradient: "from-purple-500 to-violet-600" },
    { icon: <Globe className="h-6 w-6" />, title: "Tradução instantânea", desc: "Traduz automaticamente de qualquer idioma para o português, sem atraso perceptível.", gradient: "from-indigo-500 to-blue-600" },
    { icon: <Brain className="h-6 w-6" />, title: "Copilot inteligente", desc: "Gera 3 sugestões de resposta contextualizadas: curta, profissional e detalhada.", gradient: "from-purple-500 to-pink-600" },
    { icon: <Zap className="h-6 w-6" />, title: "Latência ultra-baixa", desc: "Resultados em menos de 2 segundos. Projetado para conversas rápidas e dinâmicas.", gradient: "from-amber-500 to-orange-600" },
    { icon: <Shield className="h-6 w-6" />, title: "100% local + nuvem", desc: "O app roda no seu computador. O áudio é processado com segurança via API OpenAI.", gradient: "from-emerald-500 to-teal-600" },
    { icon: <Monitor className="h-6 w-6" />, title: "App nativo Windows", desc: "Instalador simples. Funciona em segundo plano, sem impactar a performance do sistema.", gradient: "from-cyan-500 to-blue-600" },
    { icon: <Users className="h-6 w-6" />, title: "SpeakFlow Network", desc: "Entre em Circles de prática, participe de desafios em inglês e receba avaliação com IA.", gradient: "from-rose-500 to-red-600" },
  ];
  return (
    <section id="recursos" className="relative py-24 sm:py-32 bg-zinc-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-1.5 border-zinc-700 bg-zinc-800/50 text-zinc-300">Recursos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Tudo que você precisa,<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">em tempo real</span>
            </h2>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <AnimatedSection key={f.title} delay={i * 50}>
              <Card className="group bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:-translate-y-1 h-full">
                <CardContent className="p-6">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${f.gradient} mb-4`}>{f.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== AI TOOLS ====================

function AIToolsSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const tools = [
    { icon: <PenTool className="h-6 w-6" />, badge: "Básico+", title: "Melhorar Resposta", desc: "Cole qualquer texto em inglês e receba uma versão mais profissional e natural, com explicação e dicas.", example: '"I worked hard in the project..." → versão profissional pronta', gradient: "from-violet-500 to-purple-600" },
    { icon: <MessageSquare className="h-6 w-6" />, badge: "Básico+", title: "Gerar Resposta", desc: "Descreva a situação em português e receba 3 versões prontas em inglês: curta, profissional e detalhada.", example: '"Meu manager perguntou sobre microservices" → resposta pronta', gradient: "from-indigo-500 to-blue-600" },
    { icon: <Mic2 className="h-6 w-6" />, badge: "Básico+", title: "Treino de Entrevista", desc: "Simule entrevistas técnicas em inglês com IA. Configure a vaga, o nível e a stack. Feedback em português.", example: "Java Sênior · Técnica → 8 perguntas personalizadas + áudio", gradient: "from-emerald-500 to-teal-600" },
  ];
  return (
    <section className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-1.5 border-violet-500/30 bg-violet-500/10 text-violet-300"><Sparkles className="h-3.5 w-3.5 mr-2" />Novidade</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Pratique inglês todos os dias<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">sem sair da plataforma</span>
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">Além de te ajudar durante as calls, o SpeakFlow agora treina o seu inglês com IA. Disponível nos planos Básico e Premium.</p>
          </div>
        </AnimatedSection>
        <div className="grid md:grid-cols-3 gap-6">
          {tools.map((t, i) => (
            <AnimatedSection key={t.title} delay={i * 100}>
              <Card className="group bg-zinc-900/50 border-zinc-800 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1 h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${t.gradient}`}>{t.icon}</div>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">{t.badge}</Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{t.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-4">{t.desc}</p>
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"><p className="text-xs text-zinc-500 italic">{t.example}</p></div>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>
        <AnimatedSection delay={300}>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={isLoggedIn ? "/tools" : "/register"}>
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0">
                {isLoggedIn ? "Acessar Ferramentas" : "Experimentar grátis"}<ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/guia">
              <Button variant="outline" className="border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-white">Ver guia completo</Button>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ==================== NETWORK ====================

function NetworkSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section id="network" className="relative py-24 sm:py-32 bg-zinc-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <AnimatedSection>
            <Badge variant="outline" className="mb-4 px-4 py-1.5 border-violet-500/30 bg-violet-500/10 text-violet-300"><Users className="h-3.5 w-3.5 mr-2" />Novidade — SpeakFlow Network</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Pratique em comunidade.<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Evolua com IA.</span>
            </h2>
            <p className="mt-4 text-zinc-400 max-w-xl">Entre em Circles com outros profissionais, participe de desafios reais de comunicação em inglês e receba avaliação automática com scores de fluência, conteúdo e clareza.</p>
            <ul className="mt-8 space-y-3">
              {[
                [<Target className="h-4 w-4" key="t"/>, "Desafios periódicos de comunicação em inglês"],
                [<Brain className="h-4 w-4" key="b"/>, "Avaliação por IA — fluência, conteúdo e clareza (0–100)"],
                [<Award className="h-4 w-4" key="a"/>, "Ranking ao vivo com os membros do Circle"],
                [<Star className="h-4 w-4" key="s"/>, "Selos de experiência que demonstram seu nível"],
                [<Send className="h-4 w-4" key="e"/>, "Convites por e-mail — adicione pessoas pelo @username"],
              ].map(([icon, text]) => (
                <li key={String(text)} className="flex items-center gap-3 text-zinc-300">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">{icon}</div>
                  <span className="text-sm">{text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              {[["Gratuito","2 Circles","text-zinc-400"],["Básico","Criar 1 Circle","text-violet-400"],["Premium","Ilimitado","text-amber-400"]].map(([plan,desc,cls]) => (
                <div key={plan} className="px-4 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <span className={`text-xs ${cls}`}>{plan}</span>
                  <p className="text-sm text-white font-medium">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href={isLoggedIn ? "/network" : "/register"}>
                <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0">
                  {isLoggedIn ? "Acessar o Network" : "Criar conta grátis"}<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6 border-b border-zinc-800">
                  <h3 className="text-lg font-semibold text-white">Business English Circle</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">Reuniões de negócios</Badge>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">Intermediário</Badge>
                  </div>
                </div>
                <div className="p-6 bg-emerald-500/5 border-b border-zinc-800">
                  <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Desafio ativo</span></div>
                  <p className="text-sm text-zinc-300">Descreva um conflito que você resolveu na sua equipe</p>
                </div>
                <div className="p-6">
                  <p className="text-xs text-zinc-500 mb-3">Sua avaliação</p>
                  <div className="flex gap-3">
                    {[["87","Fluência","text-violet-400"],["91","Conteúdo","text-emerald-400"],["84","Clareza","text-amber-400"]].map(([val,label,cls]) => (
                      <div key={label} className="flex-1 p-3 rounded-lg bg-zinc-800/50 text-center">
                        <div className={`text-xl font-bold ${cls}`}>{val}</div>
                        <div className="text-xs text-zinc-500">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

// ==================== TESTIMONIALS ====================

function TestimonialsSection() {
  const testimonials = [
    { name: "Rafael M.", role: "Engenheiro de Software", avatar: "RM", content: "Uso em todas as entrevistas técnicas em inglês. As sugestões do copilot são precisas e me ajudam a estruturar melhor as respostas." },
    { name: "Camila S.", role: "Gerente de Produto", avatar: "CS", content: "Mudou completamente minhas reuniões com stakeholders internacionais. A tradução em tempo real é impressionante." },
    { name: "Lucas P.", role: "Desenvolvedor Freelancer", avatar: "LP", content: "Ferramenta essencial para calls com clientes americanos. Consigo focar na conversa sem me preocupar com o idioma." },
  ];
  return (
    <section className="relative py-24 sm:py-32 bg-zinc-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Quem já usa, <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">não para</span></h2>
          </div>
        </AnimatedSection>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <AnimatedSection key={t.name} delay={i * 100}>
              <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-300 h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">{[...Array(5)].map((_,i) => <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />)}</div>
                  <p className="text-zinc-300 text-sm leading-relaxed mb-6">&ldquo;{t.content}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">{t.avatar}</div>
                    <div><div className="text-white font-medium text-sm">{t.name}</div><div className="text-zinc-500 text-xs">{t.role}</div></div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== PRICING ====================

function PricingSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const plans = [
    { name: "Gratuito", price: "Grátis", period: "", credits: "50 créditos", features: ["50 créditos ao criar conta","Transcrição em tempo real","Tradução automática","Copilot de sugestões","📡 SpeakFlow Live (via créditos)","🎰 Giro da Sorte — 1×/dia"], cta: "Começar grátis", highlighted: false },
    { name: "Básico", price: "R$ 74,90", period: "/mês", credits: "500 créditos/mês", features: ["Tudo do Gratuito","📡 SpeakFlow Live — uso por créditos","✍️ Ferramentas de prática IA","🏅 SpeakFlow Network — criar Circles","🎤 Treino de entrevista","🎰 Giro 10 dias → Premium","Suporte por e-mail"], cta: "Assinar Básico", highlighted: true, badge: "POPULAR" },
    { name: "Premium", price: "R$ 149,90", period: "/mês", credits: "1.000 créditos/mês", features: ["Tudo do Básico","📡 SpeakFlow Live — ilimitado","🏅 Circles ilimitados no Network","✍️ Ferramentas IA ilimitadas","🎰 Giro Premium — prêmios dobrados","🏆 Avaliação CEFR + Certificado","Suporte prioritário"], cta: "Assinar Premium", highlighted: false },
  ];
  return (
    <section id="precos" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Comece grátis,<br /><span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">cresça conforme usa</span></h2>
            <p className="mt-4 text-zinc-400">50 créditos grátis ao criar sua conta. Sem cartão de crédito necessário.</p>
          </div>
        </AnimatedSection>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, i) => (
            <AnimatedSection key={plan.name} delay={i * 100}>
              <Card className={`relative bg-zinc-900/50 border-zinc-800 transition-all duration-300 hover:-translate-y-1 h-full ${plan.highlighted ? "border-violet-500/50 shadow-xl shadow-violet-500/10" : ""}`}>
                {"badge" in plan && plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 border-0 text-white px-3">{plan.badge}</Badge>
                  </div>
                )}
                <CardContent className="p-6 pt-8">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <div className="mt-4"><span className="text-4xl font-bold text-white">{plan.price}</span><span className="text-zinc-500 text-sm">{plan.period}</span></div>
                    <p className="mt-2 text-sm text-violet-400">{plan.credits}</p>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-zinc-300"><CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Link href={isLoggedIn ? "/pricing" : "/register"}>
                    <Button className={`w-full ${plan.highlighted ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0" : "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"}`}>{plan.cta}</Button>
                  </Link>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>
        <AnimatedSection delay={300}>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="text-sm text-violet-400 hover:text-violet-300 transition-colors inline-flex items-center gap-1">Ver todos os planos<ChevronRight className="h-4 w-4" /></Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ==================== DOWNLOAD ====================

function DownloadSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section id="download" className="relative py-24 sm:py-32 bg-zinc-950/50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-indigo-600/10" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Pronto para usar em <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">minutos</span></h2>
          </div>
        </AnimatedSection>
        <AnimatedSection delay={100}>
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {["Crie sua conta e ganhe créditos grátis","Baixe o instalador para Windows","Instale e faça login com sua conta","Abra o app antes da sua próxima reunião"].map((s) => (
              <div key={s} className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /><span className="text-zinc-300 text-sm">{s}</span>
              </div>
            ))}
          </div>
        </AnimatedSection>
        <AnimatedSection delay={200}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={isLoggedIn ? "/home" : "/register"}>
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-xl shadow-violet-500/30 px-8">
                {isLoggedIn ? "Ir para o App" : "Criar conta grátis"}<ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="https://github.com/Luiz-code-dev/call_assistant/releases/download/v0.1.1/SpeakFlow-Setup-0.1.1.exe" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-white px-8">
                <Download className="mr-2 h-4 w-4" />Baixar SpeakFlow-Setup-0.1.1.exe
              </Button>
            </a>
          </div>
          <p className="mt-6 text-center text-sm text-zinc-500">Windows 10/11 64-bit &bull; Versão 0.1.1 &bull; 80 MB</p>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ==================== FOOTER ====================

function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-4 text-sm text-zinc-500 max-w-xs">Seu copiloto inteligente para entrevistas e reuniões em inglês.</p>
            <a href="https://www.instagram.com/speakflowofficial?igsh=ZmljYW5keDR4dWt1&utm_source=qr" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
              <Instagram className="h-5 w-5" /><span className="text-sm">@speakflowofficial</span>
            </a>
          </div>
          {[
            ["Produto", [["Preços","/pricing"],["Guia","/guia"],["Download","#download"]]],
            ["Legal", [["Privacidade","/privacy"],["Termos","/terms"]]],
            ["Conta", [["Login","/login"],["Cadastro","/register"]]],
          ].map(([title, links]) => (
            <div key={String(title)}>
              <h4 className="text-sm font-semibold text-white mb-4">{String(title)}</h4>
              <ul className="space-y-2">
                {(links as [string,string][]).map(([label,href]) => (
                  <li key={label}><Link href={href} className="text-sm text-zinc-500 hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">&copy; 2025 SpeakFlow. Todos os direitos reservados.</p>
          <CookieManagerButton />
        </div>
      </div>
    </footer>
  );
}

// ==================== MAIN ====================

export function LandingClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <main className="min-h-screen bg-[#09090b]">
      <SupportChat />
      <Header isLoggedIn={isLoggedIn} />
      <HeroSection isLoggedIn={isLoggedIn} />
      <WhySection isLoggedIn={isLoggedIn} />
      <FeaturesSection />
      <AIToolsSection isLoggedIn={isLoggedIn} />
      <NetworkSection isLoggedIn={isLoggedIn} />
      <TestimonialsSection />
      <PricingSection isLoggedIn={isLoggedIn} />
      <DownloadSection isLoggedIn={isLoggedIn} />
      <Footer />
    </main>
  );
}
