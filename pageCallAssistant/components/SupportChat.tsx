"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Send,
  Loader2,
  Check,
} from "lucide-react";

const WHATSAPP = "+5571984514211"; // TODO: atualizar com o número real

interface FaqCta {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
}

interface FAQ {
  id: string;
  q: string;
  a: string;
  ctaLoggedIn?: FaqCta;
  ctaLoggedOut?: FaqCta;
}

const FAQS: FAQ[] = [
  {
    id: "install",
    q: "Como instalar o SpeakFlow?",
    a: 'Acesse o Dashboard, clique em "Baixar App" e execute o instalador. O app roda em segundo plano no Windows e fica disponível na bandeja do sistema.',
  },
  {
    id: "credits",
    q: "Como funcionam os créditos?",
    a: "Créditos são consumidos por transcrição, tradução, Copilot e SpeakFlow Live. Gratuito: 50 créditos. Básico: 500/mês. Premium: 1.000/mês. Recargas avulsas: 50 por R$ 24,90 · 150 por R$ 49,90 · 400 por R$ 119,90.",
  },
  {
    id: "login",
    q: "Problema no login",
    a: 'Tente: (1) Limpar o cache do navegador. (2) Usar "Esqueci minha senha". (3) Confirmar o e-mail de verificação. Se persistir, entre em contato com o suporte.',
  },
  {
    id: "app",
    q: "O app não está abrindo",
    a: "Tente: (1) Reiniciar o computador. (2) Desinstalar e reinstalar o app. (3) Verificar se o antivírus não está bloqueando o SpeakFlow.exe.",
  },
  {
    id: "pricing",
    q: "Quais são os planos?",
    a: "• Gratuito: Grátis — 50 créditos\n• Básico: R$ 74,90/mês — 500 créditos\n• Premium: R$ 149,90/mês — 1.000 créditos\n\nRecargas avulsas:\n• R$ 24,90 — 50 créditos\n• R$ 49,90 — 150 créditos\n• R$ 119,90 — 400 créditos",
  },
  {
    id: "cancel",
    q: "Como cancelar minha assinatura?",
    a: "Acesse Dashboard → Configurações → Assinatura → Cancelar. Seu plano permanece ativo até o fim do período atual. Créditos avulsos não expiram.",
  },
  {
    id: "copilot",
    q: "O que é o Copilot?",
    a: "O Copilot analisa a conversa em tempo real e sugere 3 respostas contextualizadas (curta, profissional e detalhada) para você escolher a mais adequada.",
  },
  {
    id: "tools",
    q: "O que são as Ferramentas de IA?",
    a: "São 3 ferramentas para praticar inglês fora das calls:\n\n✍️ Melhorar Resposta — cole um texto em inglês e receba uma versão mais profissional, com nota e dicas.\n\n💬 Gerar Resposta — descreva a situação em português e receba 3 respostas prontas em inglês.\n\n🎤 Treino de Entrevista — simule uma entrevista técnica com IA personalizada para sua vaga e stack.\n\nDisponível nos planos Básico e Premium. Cada uso consome 2 créditos.",
  },
  {
    id: "interview",
    q: "Como funciona o Treino de Entrevista?",
    a: "1. Acesse Dashboard → Treino de Entrevista\n2. Configure a vaga, nível (Júnior/Pleno/Sênior) e tipo (técnica/comportamental)\n3. Informe as tecnologias (ex: Java, React, AWS)\n4. Ative o áudio se quiser ouvir as perguntas em inglês\n5. Responda as 8 perguntas em inglês\n6. Receba nota, feedback e sugestão de melhoria por resposta\n\nCusto: 2 créditos/resposta · Básico: 3 sessões/dia · Premium: ilimitado",
  },
  {
    id: "tools-plan",
    q: "O plano Gratuito tem acesso às Ferramentas de IA?",
    a: "Não. As Ferramentas de IA (Melhorar Resposta, Gerar Resposta e Treino de Entrevista) são exclusivas dos planos Básico (R$ 74,90/mês) e Premium (R$ 149,90/mês).\n\nO plano Básico tem limites diários por ferramenta. O Premium é ilimitado.\n\nAcesse /pricing para ver os planos e fazer upgrade.",
  },
  {
    id: "live",
    q: "O que é o SpeakFlow Live?",
    a: "O SpeakFlow Live é um copiloto em tempo real que roda no seu celular ou navegador (PWA instalável).\n\nComo funciona:\n• Você abre o Live durante uma conversa\n• Aperta o microfone para capturar o áudio\n• A IA transcreve, traduz e gera 3 sugestões de resposta instantaneamente:\n  ⚡ Curta · 💼 Profissional · 📋 Detalhada\n• Cada sugestão vem com tradução em português\n\nDiferente do app desktop (que captura o áudio do sistema), o Live usa o microfone do dispositivo — ideal para uso no celular.\n\nAcesse /live pelo Dashboard ou instale o PWA pelo \"Adicionar à tela inicial\".",
    ctaLoggedIn: { label: "Abrir SpeakFlow Live →", href: "/live", variant: "primary" },
    ctaLoggedOut: { label: "Criar conta grátis →", href: "/register", variant: "primary" },
  },
  {
    id: "live-plan",
    q: "SpeakFlow Live funciona no plano Gratuito?",
    a: "Não. O SpeakFlow Live requer o plano Básico (R$ 74,90/mês) ou Premium (R$ 149,90/mês).\n\nLimites:\n• Básico — 10 sugestões ao vivo por dia (2 créditos cada)\n• Premium — ilimitado\n\nO plano Gratuito não tem acesso ao Live. Faça upgrade em /pricing.",
    ctaLoggedIn: { label: "Ver planos e fazer upgrade →", href: "/pricing", variant: "primary" },
    ctaLoggedOut: { label: "Ver planos →", href: "/pricing", variant: "primary" },
  },
  {
    id: "network",
    q: "O que é o SpeakFlow Network?",
    a: "O Network é a comunidade de prática do SpeakFlow. Você entra em Circles (grupos temáticos), participa de desafios de comunicação em inglês e recebe avaliação automática por IA.\n\nCada submissão é avaliada em:\n• Fluência · Conteúdo · Clareza (0–100)\n• Feedback personalizado + versão melhorada\n• Ranking ao vivo no Circle\n\nVoce também ganha selos de experiência conforme evolui.\n\nAcesse /network para começar.",
  },
  {
    id: "network-plan",
    q: "Quem pode criar ou entrar em Circles?",
    a: "• Gratuito — pode participar de até 2 Circles. Não pode criar.\n• Básico (R$ 74,90/mês) — pode criar 1 Circle + entrar em quantos quiser.\n• Premium (R$ 149,90/mês) — Circles ilimitados para criar e participar.\n\nPara convidar alguém: busque pelo @username ou e-mail do usuário no painel Gerenciar do Circle. A pessoa receberá um e-mail com o convite.",
  },
  {
    id: "chat",
    q: "Como funciona o Chat com amigos?",
    a: "O SpeakFlow tem um chat privado e criptografado (AES-256-GCM) entre amigos.\n\nRecursos do chat:\n💬 Mensagens de texto em tempo real\n🌐 Tradução automática com IA (clique na bolha para ver a tradução)\n✍️ Grammar AI — analisa gramática e nível CEFR da mensagem\n🔒 Criptografia ponta a ponta\n\nComo usar:\n1. Vá em Amigos & Chat no Dashboard\n2. Encontre um amigo na lista\n3. Clique em \"Chat\" ao lado do nome\n4. Escreva em inglês para praticar — a IA te ajuda!\n\nO chat fica disponível no menu lateral do Feed também.",
    ctaLoggedIn: { label: "Abrir Amigos & Chat →", href: "/friends", variant: "primary" },
    ctaLoggedOut: { label: "Criar conta grátis →", href: "/register", variant: "primary" },
  },
  {
    id: "feed",
    q: "O que é o Feed de Amigos?",
    a: "O Feed é a rede social interna do SpeakFlow onde você conecta com outros estudantes de inglês.\n\nNo Feed você pode:\n📸 Publicar posts com texto e imagem\n❤️ Curtir e comentar nas publicações dos amigos\n👥 Ver os perfis dos seus amigos\n📊 Acompanhar a evolução da comunidade\n\nComo acessar:\n• Dashboard → Feed de Amigos\n• Ou diretamente em /feed\n\nO Feed é uma ótima forma de se manter motivado vendo a prática de outros usuários!",
    ctaLoggedIn: { label: "Abrir Feed →", href: "/feed", variant: "primary" },
    ctaLoggedOut: { label: "Criar conta grátis →", href: "/register", variant: "primary" },
  },
  {
    id: "profile",
    q: "O que aparece no meu perfil?",
    a: "Seu perfil no SpeakFlow mostra sua evolução completa:\n\n👤 Foto, nome e bio\n🏅 Conquistas desbloqueadas (badges)\n🎯 Nível de proficiência CEFR (após avaliação)\n🏆 Desafios concluídos com scores\n📝 Posts publicados no Feed\n👥 Lista de amigos (visível para seus amigos)\n\nComo editar:\n• Dashboard → avatar no canto superior direito → Meu Perfil\n• Ou acesse /settings para editar bio, foto e dados\n\nSeu perfil fica visível para seus amigos no SpeakFlow.",
    ctaLoggedIn: { label: "Ver meu perfil →", href: "/settings", variant: "primary" },
    ctaLoggedOut: { label: "Criar conta grátis →", href: "/register", variant: "primary" },
  },
  {
    id: "friends",
    q: "Como adicionar amigos no SpeakFlow?",
    a: "Para adicionar amigos:\n1. Acesse Dashboard → Amigos & Chat (ou /friends)\n2. Na seção \"Adicionar amigo\", digite o nome, @username ou e-mail\n3. Sugestões aparecem enquanto você digita\n4. Clique em \"Adicionar\" para enviar a solicitação\n5. Aguarde a pessoa aceitar\n\nApós aceitar, você pode:\n💬 Iniciar um chat criptografado\n👤 Ver o perfil completo (conquistas, desafios, nível)\n📰 Ver os posts no Feed",
    ctaLoggedIn: { label: "Gerenciar amigos →", href: "/friends", variant: "primary" },
    ctaLoggedOut: { label: "Criar conta grátis →", href: "/register", variant: "primary" },
  },
  {
    id: "desktop-download",
    q: "Como baixar o app desktop?",
    a: "O app desktop SpeakFlow é para Windows 10/11 e roda em segundo plano durante suas calls.\n\nPara baixar:\n1. No Dashboard, clique no avatar (canto superior direito)\n2. Selecione \"Baixar App Desktop\"\n3. Execute o instalador SpeakFlow-Setup-0.1.1.exe\n4. Faça login com sua conta SpeakFlow\n5. Abra o app antes da sua próxima reunião em inglês\n\nOu baixe diretamente em:\nhttps://github.com/Luiz-code-dev/call_assistant/releases\n\nRequisitos: Windows 10/11 64-bit · ~80 MB",
    ctaLoggedIn: { label: "Baixar app desktop →", href: "https://github.com/Luiz-code-dev/call_assistant/releases/download/v0.1.1/SpeakFlow-Setup-0.1.1.exe", variant: "primary" },
    ctaLoggedOut: { label: "Baixar app desktop →", href: "https://github.com/Luiz-code-dev/call_assistant/releases/download/v0.1.1/SpeakFlow-Setup-0.1.1.exe", variant: "primary" },
  },
  {
    id: "certificate",
    q: "Como funciona o Certificado de Proficiência?",
    a: "🏆 O Certificado de Proficiência SpeakFlow é exclusivo do plano Premium.\n\nComo funciona:\n1. Complete pelo menos 3 desafios avaliados pela IA no Network\n2. Acesse Meu Progresso → clique em 'Solicitar Avaliação'\n3. A IA analisa suas respostas e determina seu nível CEFR (A1, A2, B1, B2, C1 ou C2)\n4. Se atingir B1 ou superior, o botão 'Ver Certificado' é liberado\n5. Gere e imprima seu certificado oficial SpeakFlow\n\nO certificado inclui: nome completo, nível CEFR, scores de fluência/conteúdo/clareza, data de emissão e código de verificação.\n\nÉ ideal para adicionar ao LinkedIn e portfólio profissional.",
    ctaLoggedIn: { label: "🏆 Fazer Upgrade Premium", href: "/pricing", variant: "primary" },
    ctaLoggedOut: { label: "🏆 Criar conta e ver planos", href: "/register", variant: "primary" },
  },
];

type Screen = "home" | "answer" | "contact" | "form" | "sent";

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [activeFaq, setActiveFaq] = useState<FAQ | null>(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!open) return;
    const sfToken =
      typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
    if (!sfToken) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${sfToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setIsLoggedIn(true);
          setForm((f) => ({
            ...f,
            name: f.name || data.name || "",
            email: f.email || data.email || "",
          }));
        }
      })
      .catch(() => {});
  }, [open]);

  function selectFaq(faq: FAQ) {
    setActiveFaq(faq);
    setForm((f) => ({ ...f, message: faq.q }));
    setScreen("answer");
  }

  function reset() {
    setScreen("home");
    setActiveFaq(null);
    setFormError("");
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 300);
  }

  function back() {
    if (screen === "answer") return reset();
    if (screen === "contact") return setScreen("answer");
    if (screen === "form") return activeFaq ? setScreen("contact") : reset();
    if (screen === "sent") return reset();
  }

  async function submit() {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setFormError("Preencha todos os campos.");
      return;
    }
    setSending(true);
    setFormError("");
    try {
      const sfToken =
        typeof window !== "undefined"
          ? sessionStorage.getItem("sf_token")
          : null;
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sfToken ? { Authorization: `Bearer ${sfToken}` } : {}),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          question: form.message.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setScreen("sent");
    } catch {
      setFormError("Erro ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  const whatsappUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    "Olá! Preciso de ajuda com o SpeakFlow."
  )}`;

  const showBack = screen !== "home";

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 shrink-0">
            {showBack && (
              <button
                onClick={back}
                className="mr-1 text-white/70 hover:text-white transition-colors"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white text-base font-bold shrink-0">
              ✦
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-none">
                Spark
              </p>
              <p className="text-xs text-white/60 mt-0.5">
                Suporte 24h · SpeakFlow
              </p>
            </div>
            <button
              onClick={close}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 max-h-[440px] space-y-3">
            {screen === "home" && (
              <>
                <div className="rounded-2xl rounded-tl-sm bg-violet-500/10 border border-violet-500/20 p-3 text-sm leading-relaxed">
                  👋 Olá! Sou o <strong>Spark</strong>, assistente de suporte
                  do SpeakFlow. Como posso ajudar?
                </div>
                <p className="text-xs font-medium text-muted-foreground px-1">
                  Perguntas frequentes
                </p>
                <div className="space-y-1.5">
                  {FAQS.map((faq) => (
                    <button
                      key={faq.id}
                      onClick={() => selectFaq(faq)}
                      className="w-full flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm text-left hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
                    >
                      <span>{faq.q}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setActiveFaq(null);
                    setScreen("form");
                  }}
                  className="w-full text-xs text-violet-400 hover:text-violet-300 py-2 text-center transition-colors"
                >
                  Outra dúvida? Envie uma mensagem →
                </button>
              </>
            )}

            {screen === "answer" && activeFaq && (
              <>
                <div className="rounded-xl bg-secondary/60 border border-border/30 p-3 text-sm whitespace-pre-line leading-relaxed">
                  {activeFaq.a}
                </div>
                {(activeFaq.ctaLoggedIn || activeFaq.ctaLoggedOut) && (() => {
                  const cta = isLoggedIn ? activeFaq.ctaLoggedIn : activeFaq.ctaLoggedOut;
                  if (!cta) return null;
                  return (
                    <a
                      href={cta.href}
                      className={`block w-full text-center rounded-xl py-2.5 text-sm font-semibold transition-all ${
                        cta.variant === "primary"
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90"
                          : "border border-border/50 hover:bg-secondary/50"
                      }`}
                    >
                      {cta.label}
                    </a>
                  );
                })()}
                <p className="text-xs text-muted-foreground">
                  Isso respondeu sua dúvida?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={reset}
                    className="rounded-xl border border-border/50 py-2 text-sm hover:bg-secondary/50 transition-all"
                  >
                    Ver mais FAQs
                  </button>
                  <button
                    onClick={() => setScreen("contact")}
                    className="rounded-xl bg-violet-600 py-2 text-sm text-white hover:bg-violet-700 transition-all"
                  >
                    Preciso de ajuda
                  </button>
                </div>
              </>
            )}

            {screen === "contact" && (
              <>
                <div className="rounded-2xl rounded-tl-sm bg-violet-500/10 border border-violet-500/20 p-3 text-sm leading-relaxed">
                  Sem problema! Escolha como prefere ser atendido 👇
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-3 hover:bg-green-500/20 transition-all"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20 text-lg shrink-0">
                    💬
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">
                      Resposta rápida
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </a>
                <button
                  onClick={() => setScreen("form")}
                  className="flex w-full items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 hover:bg-violet-500/20 transition-all text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/20 text-lg shrink-0">
                    ✉️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Enviar mensagem</p>
                    <p className="text-xs text-muted-foreground">
                      Respondemos em até 24h
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              </>
            )}

            {screen === "form" && (
              <>
                <div className="rounded-2xl rounded-tl-sm bg-violet-500/10 border border-violet-500/20 p-3 text-sm leading-relaxed">
                  Preencha abaixo e entraremos em contato em até 24h 📬
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-violet-500/50 transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Seu e-mail"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-violet-500/50 transition-colors"
                  />
                  <textarea
                    placeholder="Descreva sua dúvida..."
                    value={form.message}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, message: e.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-violet-500/50 transition-colors resize-none"
                  />
                  {formError && (
                    <p className="text-xs text-red-400">{formError}</p>
                  )}
                  <button
                    onClick={submit}
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-all"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {sending ? "Enviando..." : "Enviar mensagem"}
                  </button>
                </div>
              </>
            )}

            {screen === "sent" && (
              <div className="flex flex-col items-center text-center py-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                  <Check className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold">Mensagem enviada!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Entraremos em contato em até 24h no e-mail informado.
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Voltar ao início
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fechar suporte" : "Abrir suporte Spark"}
        className="fixed bottom-6 right-4 sm:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 hover:scale-110 active:scale-95 transition-transform"
      >
        {open ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>
    </>
  );
}
