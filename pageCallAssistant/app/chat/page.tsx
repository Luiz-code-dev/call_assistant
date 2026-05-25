"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, ArrowLeft, RotateCcw, X, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────
interface Suggestion { pt: string; en: string }
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  suggestions?: Suggestion[];
}

const TOPICS = [
  { label: "💼 Reunião internacional", value: "meeting" },
  { label: "🎯 Entrevista de emprego",  value: "interview" },
  { label: "📧 E-mail profissional",    value: "email" },
  { label: "🗣️ Apresentação / pitch",  value: "presentation" },
  { label: "☕ Conversa livre",          value: "free" },
];

const LANGUAGES = [
  { flag: "🇧🇷", label: "Português (com sugestões em inglês)", value: "pt-BR" },
  { flag: "🇺🇸", label: "Inglês (modo imersivo)",             value: "en" },
  { flag: "🌍", label: "Outro idioma",                        value: "other" },
];

function genId() { return Math.random().toString(36).slice(2); }
function genSessionId() { return crypto.randomUUID ? crypto.randomUUID() : genId(); }

const WELCOME = (isFirst: boolean) =>
  isFirst
    ? "Seja bem-vindo! Aqui é só você e eu — pode errar à vontade 😄\nQuanto mais você praticar, mais confiança vai ganhar. Vamos lá?"
    : "De volta! Que bom te ver por aqui 👋\nPronto para mais um bate-papo?";

const BUDDY_ASK_LANG =
  "Em qual idioma você quer conversar comigo hoje?";

const BUDDY_ASK_TOPIC = (lang: string) =>
  lang === "pt-BR"
    ? "Boa escolha! Vou conversar com você em português e te mostrar as palavras em inglês ao longo do caminho 🎯\nSobre o que você quer praticar hoje?"
    : lang === "en"
    ? "Great choice! Let's go full English mode 🇺🇸\nWhat would you like to practice today?"
    : "Ótimo! Vamos praticar nesse idioma juntos 🌍\nSobre o que você quer conversar?";

// ────────────────────────────────────────
// Components
// ────────────────────────────────────────

function BuddyAvatar({ typing = false }: { typing?: boolean }) {
  return (
    <div className="relative flex-shrink-0">
      <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-lg shadow-lg shadow-violet-500/30">
        🤖
      </div>
      {typing && (
        <span className="absolute -bottom-0.5 -right-0.5 flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-violet-500" />
        </span>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <BuddyAvatar typing />
      <div className="rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-3">
        <div className="flex gap-1">
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="size-2 rounded-full bg-zinc-400"
              style={{ animation: `bounce 1s infinite ${d}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, onChipClick }: { msg: ChatMessage; onChipClick: (word: string) => void }) {
  const isUser = msg.role === "user";
  if (msg.role === "system") {
    return (
      <div className="flex justify-center">
        <p className="rounded-full bg-zinc-800/60 px-4 py-1.5 text-xs text-zinc-500">{msg.content}</p>
      </div>
    );
  }
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && <BuddyAvatar />}
      <div className={`max-w-[78%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "rounded-br-sm bg-violet-600 text-white"
              : "rounded-bl-sm bg-zinc-800 text-zinc-100"
          }`}
        >
          {msg.content}
        </div>
        {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {msg.suggestions.map((s) => (
              <button
                key={s.pt}
                onClick={() => onChipClick(s.en)}
                className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-300 transition hover:bg-violet-500/20"
              >
                {s.pt} → <span className="font-semibold">{s.en}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickReplies({ options, onSelect }: { options: { label: string; value: string }[]; onSelect: (v: string, l: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 py-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value, o.label)}
          className="rounded-full border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-sm text-zinc-200 transition hover:border-violet-500 hover:bg-violet-500/10 hover:text-white"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SessionSummaryModal({
  msgCount, wordsLearned, topic, onClose, onNew,
}: { msgCount: number; wordsLearned: number; topic?: string; onClose: () => void; onNew: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-center shadow-2xl">
        <p className="mb-4 text-2xl">🎉</p>
        <h2 className="mb-1 text-lg font-bold text-white">Que boa sessão!</h2>
        <p className="mb-5 text-sm text-zinc-400">Você praticou muito bem hoje 💪</p>
        <div className="mb-6 space-y-2 rounded-xl bg-zinc-800/60 p-4 text-left">
          <p className="text-sm text-zinc-300">✅ <span className="font-medium">{msgCount}</span> mensagens trocadas</p>
          <p className="text-sm text-zinc-300">💡 <span className="font-medium">{wordsLearned}</span> palavras sugeridas em inglês</p>
          {topic && <p className="text-sm text-zinc-300">⭐ Tema praticado: <span className="font-medium">{topic}</span></p>}
          <p className="text-sm text-zinc-300">🔥 Continue praticando para manter sua streak!</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:text-white" onClick={onClose}>Fechar</Button>
          <Button className="flex-1 bg-violet-600 hover:bg-violet-500 text-white" onClick={onNew}>Nova sessão</Button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────
export default function BuddyChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [phase, setPhase] = useState<"welcome" | "lang" | "topic" | "chat" | "limit" | "ended">("welcome");
  const [sessionId] = useState(() => genSessionId());
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [msgCount, setMsgCount] = useState(0);
  const [wordsTotal, setWordsTotal] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [isFirst, setIsFirst] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check if first-time user
  useEffect(() => {
    fetch("/api/chat/buddy/sessions")
      .then((r) => r.json())
      .then((d) => {
        setIsFirst(!d.sessions || d.sessions.length === 0);
      })
      .catch(() => {});
  }, []);

  // Init welcome messages
  useEffect(() => {
    const welcomeText = WELCOME(isFirst);
    setMessages([
      { id: genId(), role: "assistant", content: `Oi! Eu sou o Buddy, seu parceiro de prática aqui no SpeakFlow 👋\n\nAqui você pode praticar sem medo de errar — prometo não te julgar! 😄\n\n${welcomeText}` },
      { id: genId(), role: "assistant", content: BUDDY_ASK_LANG },
    ]);
    setPhase("lang");
  }, [isFirst]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const addMsg = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { id: genId(), ...msg }]);
  }, []);

  async function handleLanguageSelect(value: string, label: string) {
    const lang = value === "other" ? "multilingual" : value;
    setLanguage(lang);
    addMsg({ role: "user", content: label });
    setPhase("topic");
    setTimeout(() => {
      addMsg({ role: "assistant", content: BUDDY_ASK_TOPIC(lang) });
    }, 300);
  }

  function handleTopicSelect(value: string, label: string) {
    setTopic(value);
    addMsg({ role: "user", content: label });
    setPhase("chat");
    const topicLabel = TOPICS.find((t) => t.value === value)?.label.replace(/^[^ ]+ /, "") ?? value;
    setTimeout(() => {
      addMsg({ role: "assistant", content: `Ótimo! ${topicLabel} é um tema super relevante.\nMe conta mais — você tem alguma situação específica chegando ou quer explorar o tema de forma geral?` });
    }, 300);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userText = text.trim();
    setInput("");
    addMsg({ role: "user", content: userText });

    const newHistory = [...history, { role: "user" as const, content: userText }];
    setHistory(newHistory);
    setLoading(true);

    try {
      const res = await fetch("/api/chat/buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          sessionId,
          language: language ?? "pt-BR",
          topic: topic ?? undefined,
          history: newHistory.slice(-20),
        }),
      });

      if (res.status === 429) {
        setPhase("limit");
        addMsg({
          role: "assistant",
          content: "Eita! Você chegou no limite de mensagens de hoje 😅\nMas volta amanhã que eu estarei aqui esperando!\nQuer continuar agora? Dá uma olhada nos nossos planos ✨",
        });
        return;
      }

      if (res.status === 402) {
        addMsg({ role: "assistant", content: "Parece que seus créditos acabaram 😅 Que tal recarregar para continuar praticando?" });
        return;
      }

      const data = await res.json();
      if (data.reply) {
        addMsg({ role: "assistant", content: data.reply, suggestions: data.suggestions ?? [] });
        setHistory((h) => [...h, { role: "assistant", content: data.reply }]);
        setMsgCount(data.sessionMessageCount ?? 0);
        setWordsTotal((w) => w + (data.suggestions?.length ?? 0));
        if (data.creditsRemaining !== null) setCredits(data.creditsRemaining);
      }
    } catch {
      addMsg({ role: "assistant", content: "Ops, parece que tive um problema de conexão. Tenta enviar novamente 😅" });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleFreeTextForPhase(text: string) {
    if (phase === "lang") {
      const lower = text.toLowerCase();
      if (lower.includes("portugu") || lower.includes("pt")) {
        handleLanguageSelect("pt-BR", "🇧🇷 Português");
      } else if (lower.includes("ingl") || lower.includes("english")) {
        handleLanguageSelect("en", "🇺🇸 Inglês");
      } else {
        handleLanguageSelect("other", `🌍 ${text}`);
      }
      return;
    }
    if (phase === "topic") {
      setTopic(text);
      addMsg({ role: "user", content: text });
      setPhase("chat");
      setTimeout(() => {
        addMsg({ role: "assistant", content: `Ótimo tema! Vamos lá 😄\nMe conta mais sobre essa situação.` });
      }, 300);
      return;
    }
    sendMessage(text);
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim()) return;
    handleFreeTextForPhase(input);
  }

  function handleChipClick(word: string) {
    sendMessage(`Me dê um exemplo de como usar "${word}" em inglês profissional`);
  }

  function handleEndSession() {
    setShowSummary(true);
    setPhase("ended");
  }

  function handleNewSession() {
    window.location.reload();
  }

  const dailyLimitByPlan: Record<string, string> = { free: "10", basic: "50", premium: "ilimitado" };

  return (
    <div className="flex h-screen flex-col bg-[#09090b]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-zinc-800/50 bg-[#09090b]/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/home" className="text-zinc-400 hover:text-white transition">
              <ArrowLeft className="size-5" />
            </Link>
            <BuddyAvatar />
            <div>
              <p className="text-sm font-semibold text-white">SpeakFlow Buddy</p>
              <p className="text-xs text-zinc-500">Seu parceiro de prática</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {phase === "chat" && (
              <button
                onClick={handleEndSession}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition"
              >
                Encerrar sessão
              </button>
            )}
            <button
              onClick={handleNewSession}
              className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:text-white transition"
              title="Nova sessão"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onChipClick={handleChipClick} />
          ))}

          {/* Quick replies */}
          {phase === "lang" && !loading && (
            <QuickReplies options={LANGUAGES} onSelect={handleLanguageSelect} />
          )}
          {phase === "topic" && !loading && (
            <QuickReplies options={TOPICS} onSelect={handleTopicSelect} />
          )}
          {phase === "limit" && (
            <div className="flex justify-center">
              <Link
                href="/pricing"
                className="rounded-full bg-violet-600 px-6 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition"
              >
                Ver planos ✨
              </Link>
            </div>
          )}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-zinc-800/50 bg-[#09090b]/90 px-4 pb-6 pt-3">
        <div className="mx-auto max-w-2xl">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              placeholder={phase === "chat" ? "Digite sua mensagem..." : "Ou escreva livremente..."}
              disabled={loading || phase === "ended" || phase === "limit"}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-40"
              style={{ maxHeight: 120 }}
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading || phase === "ended" || phase === "limit"}
              className="size-11 flex-shrink-0 rounded-xl bg-violet-600 p-0 hover:bg-violet-500 disabled:opacity-40"
            >
              <Send className="size-4" />
            </Button>
          </form>
          {credits !== null && (
            <p className="mt-2 text-center text-xs text-zinc-500">
              <Flame className="mr-1 inline size-3 text-orange-400" />
              {credits} créditos restantes
            </p>
          )}
        </div>
      </div>

      {/* Summary modal */}
      {showSummary && (
        <SessionSummaryModal
          msgCount={msgCount}
          wordsLearned={wordsTotal}
          topic={TOPICS.find((t) => t.value === (topic ?? ""))?.label}
          onClose={() => { setShowSummary(false); router.push("/home"); }}
          onNew={handleNewSession}
        />
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
