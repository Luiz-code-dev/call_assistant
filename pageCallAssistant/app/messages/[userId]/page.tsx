"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Lock, Globe, Sparkles, BookOpen,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface UserProfile {
  id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
}

interface GrammarResult {
  hasErrors: boolean;
  corrected: string;
  errors: { original: string; fix: string; tip: string }[];
}

interface CefrResult {
  level: string;
  label: string;
  tip: string;
}

function authHeaders(): Record<string, string> {
  const t = typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

function Avatar({ name, avatarUrl, size = "md" }: { name: string; avatarUrl?: string | null; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-violet-600 to-indigo-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const cls = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${cls} rounded-full object-cover ring-2 ring-border shrink-0`} />;
  return <div className={`${cls} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold shrink-0`}>{initials}</div>;
}

const CEFR_COLORS: Record<string, string> = {
  A1: "bg-zinc-500", A2: "bg-blue-500", B1: "bg-emerald-500",
  B2: "bg-violet-500", C1: "bg-amber-500", C2: "bg-rose-500",
};

function MessageBubble({ m, isMe, friendProfile }: { m: Message; isMe: boolean; friendProfile: UserProfile | null }) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [loadingTranslate, setLoadingTranslate] = useState(false);
  const [nativeVersion, setNativeVersion] = useState<string | null>(null);
  const [showNative, setShowNative] = useState(false);
  const [loadingNative, setLoadingNative] = useState(false);
  const [cefr, setCefr] = useState<CefrResult | null>(null);
  const [showCefr, setShowCefr] = useState(false);
  const [loadingCefr, setLoadingCefr] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function translate() {
    if (translation) { setShowTranslation((v) => !v); return; }
    setLoadingTranslate(true);
    const res = await fetch("/api/messages/assist", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ text: m.content, action: "translate" }),
    });
    if (res.ok) { const d = await res.json(); setTranslation(d.result); setShowTranslation(true); }
    setLoadingTranslate(false);
  }

  async function native() {
    if (nativeVersion) { setShowNative((v) => !v); return; }
    setLoadingNative(true);
    const res = await fetch("/api/messages/assist", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ text: m.content, action: "native" }),
    });
    if (res.ok) { const d = await res.json(); setNativeVersion(d.result); setShowNative(true); }
    setLoadingNative(false);
  }

  async function checkCefr() {
    if (cefr) { setShowCefr((v) => !v); return; }
    setLoadingCefr(true);
    const res = await fetch("/api/messages/assist", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ text: m.content, action: "cefr" }),
    });
    if (res.ok) { const d = await res.json(); setCefr(d); setShowCefr(true); }
    setLoadingCefr(false);
  }

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2 group`}>
      {/* Avatar for received messages */}
      {!isMe && (
        <div className="shrink-0 self-end">
          {friendProfile ? (
            <Avatar name={friendProfile.name} avatarUrl={friendProfile.avatarUrl} size="sm" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-muted" />
          )}
        </div>
      )}
      <div className="max-w-[75%] space-y-1">
        {/* Sender name for received messages */}
        {!isMe && friendProfile && (
          <p className="text-[11px] text-muted-foreground px-1 font-medium">{friendProfile.name.split(" ")[0]}</p>
        )}
        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed
          ${isMe ? "bg-violet-600 text-white rounded-br-sm" : "bg-card border border-border/50 text-foreground rounded-bl-sm"}`}>
          <p>{m.content}</p>
          <div className="flex items-center justify-between mt-1.5 gap-2">
            <span className={`text-[10px] ${isMe ? "text-violet-200/70" : "text-muted-foreground"}`}>
              {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {cefr && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${CEFR_COLORS[cefr.level] ?? "bg-zinc-500"}`}>
                {cefr.level}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons — visible on hover or expanded */}
        <div className={`flex items-center gap-1 flex-wrap transition-opacity ${expanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <button
            onClick={translate}
            disabled={loadingTranslate}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-colors
              ${showTranslation ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"}`}
          >
            <Globe className="h-3 w-3" />
            {loadingTranslate ? "..." : showTranslation ? "Ocultar" : "Traduzir"}
          </button>
          <button
            onClick={native}
            disabled={loadingNative}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-colors
              ${showNative ? "bg-violet-500/20 border-violet-500/40 text-violet-400" : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"}`}
          >
            <Mic className="h-3 w-3" />
            {loadingNative ? "..." : "Nativo"}
          </button>
          <button
            onClick={checkCefr}
            disabled={loadingCefr}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-colors
              ${showCefr ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"}`}
          >
            <BookOpen className="h-3 w-3" />
            {loadingCefr ? "..." : "CEFR"}
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[10px] px-1.5 py-1 rounded-full border border-border/30 text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Translation panel */}
        {showTranslation && translation && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-300 leading-relaxed">
            <span className="text-[9px] font-bold text-blue-400/60 uppercase tracking-wide block mb-1">🌍 Tradução</span>
            {translation}
          </div>
        )}

        {/* Native version panel */}
        {showNative && nativeVersion && (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-xs text-violet-300 leading-relaxed">
            <span className="text-[9px] font-bold text-violet-400/60 uppercase tracking-wide block mb-1">🎤 Como um nativo diria</span>
            {nativeVersion}
          </div>
        )}

        {/* CEFR panel */}
        {showCefr && cefr && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${CEFR_COLORS[cefr.level] ?? "bg-zinc-500"}`}>
                {cefr.level}
              </span>
              <span className="text-amber-300">{cefr.label}</span>
            </div>
            <p className="text-muted-foreground">{cefr.tip}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GrammarPanel({ result, onAccept, onDismiss }: {
  result: GrammarResult;
  onAccept: (text: string) => void;
  onDismiss: () => void;
}) {
  if (!result.hasErrors) return (
    <div className="flex items-center gap-2 text-xs text-emerald-400 px-1">
      <CheckCircle className="h-3.5 w-3.5" /> Sem erros de gramática! ✨
      <button onClick={onDismiss} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
    </div>
  );
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-amber-400 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" /> {result.errors.length} correção{result.errors.length > 1 ? "ões" : ""}
        </span>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>
      {result.errors.map((e, i) => (
        <div key={i} className="rounded-lg bg-card border border-border/30 px-2.5 py-1.5">
          <p><span className="line-through text-rose-400">{e.original}</span> → <span className="text-emerald-400">{e.fix}</span></p>
          <p className="text-muted-foreground mt-0.5">{e.tip}</p>
        </div>
      ))}
      <Button
        size="sm"
        onClick={() => onAccept(result.corrected)}
        className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-0"
      >
        Usar versão corrigida
      </Button>
    </div>
  );
}

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [friend, setFriend] = useState<UserProfile | null>(null);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grammarResult, setGrammarResult] = useState<GrammarResult | null>(null);
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMe(d); })
      .catch(() => {});
    fetch(`/api/users/${userId}`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setFriend(d); })
      .catch(() => {});
  }, [userId]);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/messages/${userId}`, { headers: authHeaders() });
    if (res.status === 403) { setError("Vocês não são amigos. Adicione primeiro em /friends."); return; }
    if (res.ok) setMessages(await res.json());
  }, [userId]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function checkGrammar() {
    const text = input.trim();
    if (!text) return;
    setCheckingGrammar(true);
    const res = await fetch("/api/messages/assist", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ text, action: "grammar" }),
    });
    if (res.ok) setGrammarResult(await res.json());
    setCheckingGrammar(false);
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    setGrammarResult(null);
    const res = await fetch(`/api/messages/${userId}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content: text }),
    });
    if (res.ok) { const msg = await res.json(); setMessages((prev) => [...prev, msg]); }
    else setInput(text);
    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 p-8">
        <p className="text-muted-foreground">{error}</p>
        <Link href="/friends" className="text-violet-400 hover:text-violet-300 text-sm">← Ir para Amigos</Link>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col bg-background" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 border-b border-border/50 bg-card/80 backdrop-blur sticky top-0 z-10" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}>
        <Link href="/friends" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {friend && <Avatar name={friend.name} avatarUrl={friend.avatarUrl} size="sm" />}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{friend?.name ?? "Chat"}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3 w-3" /><span>AES-256-GCM</span>
            <span className="opacity-40">·</span>
            <Globe className="h-3 w-3 text-blue-400" /><span className="text-blue-400">Tradução</span>
            <span className="opacity-40">·</span>
            <Sparkles className="h-3 w-3 text-violet-400" /><span className="text-violet-400">Grammar AI</span>
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-none py-4">
        <div className="max-w-2xl mx-auto px-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
              <div className="flex gap-2 text-2xl">🔐💬🌍</div>
              <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
              <p className="text-xs max-w-xs">Escreva em inglês! Você pode traduzir, checar gramática e ver o nível CEFR de qualquer mensagem 🎯</p>
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} m={m} isMe={m.senderId === me?.id} friendProfile={friend} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Grammar result */}
      {grammarResult && (
        <div className="px-4 pb-2 max-w-2xl mx-auto w-full">
          <GrammarPanel
            result={grammarResult}
            onAccept={(text) => { setInput(text); setGrammarResult(null); }}
            onDismiss={() => setGrammarResult(null)}
          />
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pt-3 border-t border-border/50 bg-card/80 backdrop-blur" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={checkGrammar}
              disabled={!input.trim() || checkingGrammar}
              title="Verificar gramática com IA"
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors disabled:opacity-40"
            >
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              {checkingGrammar ? "Checando..." : "Grammar"}
            </button>
            <button
              onClick={async () => {
                const text = input.trim();
                if (!text) return;
                const res = await fetch("/api/messages/assist", {
                  method: "POST", headers: authHeaders(),
                  body: JSON.stringify({ text, action: "native" }),
                });
                if (res.ok) { const d = await res.json(); setInput(d.result); }
              }}
              disabled={!input.trim()}
              title="Reescrever como nativo"
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              Nativo
            </button>
            <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" /> criptografado
            </span>
          </div>

          {/* Input + send */}
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setGrammarResult(null); }}
              onKeyDown={handleKey}
              placeholder="Escreva em inglês... (Enter para enviar)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 max-h-32"
            />
            <Button
              onClick={() => send()}
              disabled={!input.trim() || sending}
              className="h-10 w-10 p-0 shrink-0 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
