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

const WHATSAPP = "5511999999999"; // TODO: atualizar com o número real

const FAQS = [
  {
    id: "install",
    q: "Como instalar o SpeakFlow?",
    a: 'Acesse o Dashboard, clique em "Baixar App" e execute o instalador. O app roda em segundo plano no Windows e fica disponível na bandeja do sistema.',
  },
  {
    id: "credits",
    q: "Como funcionam os créditos?",
    a: "Créditos são consumidos por transcrição, tradução e Copilot. Gratuito: 50 créditos. Básico: 500/mês. Premium: 1.000/mês. Recarga avulsa: 50 créditos por R$ 24,90.",
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
    a: "• Gratuito: Grátis — 50 créditos\n• Básico: R$ 74,90/mês — 500 créditos\n• Premium: R$ 149,90/mês — 1.000 créditos\n• Recarga avulsa: R$ 24,90 — 50 créditos",
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
];

type Screen = "home" | "answer" | "contact" | "form" | "sent";

interface FAQ {
  id: string;
  q: string;
  a: string;
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [activeFaq, setActiveFaq] = useState<FAQ | null>(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    const sfToken =
      typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
    if (!sfToken) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${sfToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
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
