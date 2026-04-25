"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Mic, MicOff, Square, Loader2, Zap, Copy,
  CheckCircle2, Globe, ArrowLeft, Radio, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

// ─── Constants (same categories as Circles) ──────────────────────────────────
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

const LEVEL_OPTIONS = [
  "Todos os níveis", "Iniciante (A1-A2)", "Intermediário (B1-B2)", "Avançado (C1-C2)",
];

const LANG_OPTIONS = [
  { code: "en-US", label: "🇺🇸 Inglês (EN)" },
  { code: "es-ES", label: "🇪🇸 Espanhol (ES)" },
  { code: "fr-FR", label: "🇫🇷 Francês (FR)" },
  { code: "de-DE", label: "🇩🇪 Alemão (DE)" },
  { code: "it-IT", label: "🇮🇹 Italiano (IT)" },
  { code: "pt-PT", label: "🇵🇹 Português (PT)" },
  { code: "zh-CN", label: "🇨🇳 Mandarim (ZH)" },
  { code: "ja-JP", label: "🇯🇵 Japonês (JA)" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Turn {
  id: string;
  transcript: string;
  translation: string;
  suggestions: string[];
  suggestion_translations: string[];
  pending?: boolean;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: { length: number; [k: number]: { isFinal: boolean; 0: { transcript: string } } };
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LivePage() {
  // Auth & credits
  const [token, setToken] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  // Setup config
  const [phase, setPhase] = useState<"setup" | "live">("setup");
  const [focus, setFocus] = useState("");
  const [level, setLevel] = useState("Todos os níveis");
  const [sourceLang, setSourceLang] = useState("en-US");
  const [customContext, setCustomContext] = useState("");
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false);

  // Live session
  const sessionId = useRef(Date.now().toString());
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [expandedCards, setExpandedCards] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Refs
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const wasRecordingRef = useRef(false);
  const phaseRef = useRef<"setup" | "live">("setup");
  const hasSpeechAPIRef = useRef(false);
  const turnsEndRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef(focus);
  const levelRef = useRef(level);
  const sourceLangRef = useRef(sourceLang);
  const customContextRef = useRef(customContext);
  const tokenRef = useRef(token);

  // Keep refs in sync (avoid stale closures in callbacks)
  useEffect(() => { focusRef.current = focus; }, [focus]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { sourceLangRef.current = sourceLang; }, [sourceLang]);
  useEffect(() => { customContextRef.current = customContext; }, [customContext]);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Auth headers helper (Bearer when available, falls back to httpOnly cookie) ──
  const authFetch = useCallback(
    (url: string, options: RequestInit = {}): Promise<Response> => {
      const t = tokenRef.current;
      const isFormData = options.body instanceof FormData;
      const baseHeaders: HeadersInit = isFormData ? {} : { "Content-Type": "application/json" };
      if (t) (baseHeaders as Record<string, string>)["Authorization"] = `Bearer ${t}`;
      return fetch(url, {
        credentials: "include",
        ...options,
        headers: { ...baseHeaders, ...(options.headers ?? {}) },
      });
    },
    []
  );

  // ── Init ──
  useEffect(() => {
    const sfToken = sessionStorage.getItem("sf_token") ?? localStorage.getItem("sf_token") ?? "";
    if (sfToken && !sessionStorage.getItem("sf_token")) sessionStorage.setItem("sf_token", sfToken);
    setToken(sfToken);
    tokenRef.current = sfToken;

    setHasSpeechAPI("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

    const savedFocus = localStorage.getItem("sf_live_focus") || "";
    const savedLevel = localStorage.getItem("sf_live_level") || "Todos os níveis";
    const savedLang  = localStorage.getItem("sf_live_lang")  || "en-US";
    if (savedFocus) { setFocus(savedFocus); focusRef.current = savedFocus; }
    if (savedLevel) { setLevel(savedLevel); levelRef.current = savedLevel; }
    if (savedLang)  { setSourceLang(savedLang); sourceLangRef.current = savedLang; }
  }, []);

  // ── Fetch credits ──
  const fetchCredits = useCallback(async () => {
    try {
      const res = await authFetch("/api/wallet/balance");
      if (res.ok) { const d = await res.json(); setCredits(d.balance ?? null); }
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  // ── Auto-scroll ──
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isProcessing, interimText]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
      const t = tokenRef.current;
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (t) (headers as Record<string, string>)["Authorization"] = `Bearer ${t}`;
      fetch("/api/live/session/end", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ session_id: sessionId.current }),
      }).catch(() => {});
    };
  }, []);

  // ── Core: process transcript text (SpeechRecognition path) ──
  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;
    const turnId = Date.now().toString();
    const pendingTurn: Turn = { id: turnId, transcript: transcript.trim(), translation: "", suggestions: [], suggestion_translations: [], pending: true };
    setTurns(prev => [...prev, pendingTurn]);
    setExpandedCards(prev => ({ ...prev, [turnId]: 0 }));
    setIsProcessing(true);
    try {
      const res = await authFetch("/api/live/suggest", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId.current,
          transcript: transcript.trim(),
          focus: focusRef.current,
          level: levelRef.current,
          source_lang: sourceLangRef.current,
          custom_context: customContextRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTurns(prev => prev.filter(t => t.id !== turnId));
        if (res.status === 402 || res.status === 403) { toast.error(data.error || "Créditos insuficientes."); return; }
        toast.error(data.error || "Erro ao processar.");
        return;
      }
      setTurns(prev => prev.map(t => t.id === turnId ? {
        ...t, translation: data.translation, suggestions: data.suggestions,
        suggestion_translations: data.suggestion_translations, pending: false,
      } : t));
      if (data.creditsUsed) setCredits(prev => prev !== null ? Math.max(0, prev - data.creditsUsed) : null);
    } catch {
      setTurns(prev => prev.filter(t => t.id !== turnId));
      toast.error("Erro de conexão. Verifique sua internet.");
    }
    finally { setIsProcessing(false); }
  }, [authFetch]);

  // ── Core: process audio blob (MediaRecorder fallback) ──
  const processAudio = useCallback(async (blob: Blob) => {
    const turnId = Date.now().toString();
    const pendingTurn: Turn = { id: turnId, transcript: "Transcrevendo áudio...", translation: "", suggestions: [], suggestion_translations: [], pending: true };
    setTurns(prev => [...prev, pendingTurn]);
    setExpandedCards(prev => ({ ...prev, [turnId]: 0 }));
    setIsProcessing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "live.webm");
      form.append("session_id", sessionId.current);
      form.append("focus", focusRef.current);
      form.append("level", levelRef.current);
      form.append("source_lang", sourceLangRef.current);
      form.append("custom_context", customContextRef.current);
      const res = await authFetch("/api/live/process", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setTurns(prev => prev.filter(t => t.id !== turnId));
        if (res.status === 422) { toast.warning(data.error); return; }
        if (res.status === 402 || res.status === 403) { toast.error(data.error || "Créditos insuficientes."); return; }
        toast.error(data.error || "Erro ao processar.");
        return;
      }
      setTurns(prev => prev.map(t => t.id === turnId ? {
        ...t, transcript: data.transcript, translation: data.translation,
        suggestions: data.suggestions, suggestion_translations: data.suggestion_translations, pending: false,
      } : t));
      if (data.creditsUsed) setCredits(prev => prev !== null ? Math.max(0, prev - data.creditsUsed) : null);
    } catch {
      setTurns(prev => prev.filter(t => t.id !== turnId));
      toast.error("Erro de conexão. Verifique sua internet.");
    }
    finally { setIsProcessing(false); }
  }, [authFetch]);

  // ── SpeechRecognition (continuous, auto-send on final) ──
  const startSpeechRecognition = useCallback(() => {
    const SR = (
      (window as typeof window & { SpeechRecognition?: new () => ISpeechRecognition; webkitSpeechRecognition?: new () => ISpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { SpeechRecognition?: new () => ISpeechRecognition; webkitSpeechRecognition?: new () => ISpeechRecognition }).webkitSpeechRecognition
    );
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = sourceLangRef.current;
    rec.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += text;
        else interim += text;
      }
      setInterimText(interim);
      if (final.trim()) { setInterimText(""); processTranscript(final); }
    };
    rec.onerror = (e) => {
      const err = (e as Event & { error?: string }).error;
      if (err === "not-allowed") {
        toast.error("Permissão de microfone negada. Permita nas configurações do browser.");
        setIsRecording(false); isRecordingRef.current = false;
        wasRecordingRef.current = false;
      } else if (err && err !== "no-speech" && err !== "aborted" && document.visibilityState === "visible") {
        // iOS/Safari may throw other errors — fall back to MediaRecorder (only if visible)
        recognitionRef.current = null;
        startMediaRecorder();
      }
    };
    rec.onend = () => { if (isRecordingRef.current && document.visibilityState === "visible") rec.start(); };
    rec.start();
    recognitionRef.current = rec;
  }, [processTranscript]);

  // ── MediaRecorder (tap-to-talk, auto-stop 10s) ──
  const startMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg;codecs=opus";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 500) processAudio(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      // Auto-stop after 10s to keep chunks manageable
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          setIsRecording(false); isRecordingRef.current = false;
        }
      }, 10_000);
    } catch {
      toast.error("Não foi possível acessar o microfone.");
      setIsRecording(false); isRecordingRef.current = false;
    }
  }, [processAudio]);

  // ── Resume recording on app returning from background ──
  useEffect(() => {
    hasSpeechAPIRef.current = hasSpeechAPI;
  }, [hasSpeechAPI]);

  useEffect(() => {
    const onHide = () => {
      wasRecordingRef.current = isRecordingRef.current;
    };
    const onShow = () => {
      if (!wasRecordingRef.current || phaseRef.current !== "live") return;
      // Clean up any broken stream state
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      setIsRecording(false);
      isRecordingRef.current = false;
      setInterimText("");
      // Restart after a short delay so the browser settles
      setTimeout(() => {
        if (wasRecordingRef.current && phaseRef.current === "live") {
          setIsRecording(true);
          isRecordingRef.current = true;
          if (hasSpeechAPIRef.current) startSpeechRecognition();
          else startMediaRecorder();
          toast.info("Sessão retomada automaticamente.", { duration: 2000 });
        }
      }, 700);
    };
    const handler = () => {
      if (document.visibilityState === "hidden") onHide();
      else onShow();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [startSpeechRecognition, startMediaRecorder]);

  // ── Start / Stop ──
  const startRecording = useCallback(async () => {
    if (isRecording || isProcessing) return;
    setIsRecording(true); isRecordingRef.current = true;
    if (hasSpeechAPI) startSpeechRecognition();
    else await startMediaRecorder();
  }, [isRecording, isProcessing, hasSpeechAPI, startSpeechRecognition, startMediaRecorder]);

  const stopRecording = useCallback(() => {
    setIsRecording(false); isRecordingRef.current = false;
    setInterimText("");
    recognitionRef.current?.stop(); recognitionRef.current = null;
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  // ── Session start ──
  const handleStart = () => {
    if (!focus) { toast.error("Selecione uma área de conversa."); return; }
    localStorage.setItem("sf_live_focus", focus);
    localStorage.setItem("sf_live_level", level);
    localStorage.setItem("sf_live_lang", sourceLang);
    setPhase("live");
  };

  // ── Session end ──
  const handleEnd = useCallback(async () => {
    stopRecording();
    await authFetch("/api/live/session/end", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId.current }),
    }).catch(() => {});
    setPhase("setup");
    setTurns([]);
    setInterimText("");
    sessionId.current = Date.now().toString();
  }, [stopRecording, authFetch]);

  // ── Copy helper ──
  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const langLabel = LANG_OPTIONS.find(l => l.code === sourceLang)?.label?.split(" ").slice(1).join(" ").trim() || sourceLang;

  // ─────────────────────────── SETUP SCREEN ────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.08),transparent)]" />
        <div className="w-full max-w-sm space-y-5 relative">

          {/* Brand header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
                <span className="text-base font-bold text-white">S</span>
              </div>
              <span className="text-xl font-semibold">SpeakFlow</span>
              <span className="rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400 tracking-widest">
                LIVE
              </span>
            </div>
            <h1 className="text-2xl font-bold">Copiloto em Tempo Real</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Capture o áudio da conversa · Tradução instantânea · Sugestões com IA
            </p>
          </div>

          {/* Config card */}
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Área da conversa *</label>
                <select
                  value={focus}
                  onChange={e => setFocus(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="">Selecione a área...</option>
                  {Object.entries(FOCUS_GROUPS).map(([group, opts]) => (
                    <optgroup key={group} label={group}>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Seu nível de inglês</label>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  Contexto da call
                  <span className="ml-auto text-xs font-normal text-muted-foreground">opcional</span>
                </label>
                <textarea
                  value={customContext}
                  onChange={e => setCustomContext(e.target.value)}
                  placeholder='Ex: "Entrevista técnica para vaga de sênior na XYZ" ou "Reunião de vendas com cliente dos EUA"'
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none placeholder:text-muted-foreground/50"
                />
                {customContext.length > 0 && (
                  <p className="text-[10px] text-muted-foreground text-right">{customContext.length}/500</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Idioma que será captado
                </label>
                <select
                  value={sourceLang}
                  onChange={e => setSourceLang(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>

              {credits !== null && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2">
                  <Zap className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{credits}</span> créditos · 2 por sugestão gerada
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tip */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-amber-300">💡 Para melhores resultados</p>
            <p className="text-xs text-amber-300/70">
              Mantenha o celular próximo ao áudio. Em chamadas via celular, use o viva-voz.
              A IA lembra o contexto da conversa enquanto a sessão estiver ativa.
            </p>
          </div>

          {/* Mode indicator */}
          <div className="flex items-center justify-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${hasSpeechAPI ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className={`text-xs ${hasSpeechAPI ? "text-emerald-400" : "text-amber-400"}`}>
              {hasSpeechAPI ? "Reconhecimento de voz instantâneo" : "Modo gravação (compatibilidade iOS)"}
            </span>
          </div>

          <Button
            onClick={handleStart}
            disabled={!focus}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 shadow-lg shadow-violet-500/20 disabled:opacity-50"
          >
            <Mic className="mr-2 h-5 w-5" />
            Iniciar Sessão Live
          </Button>

          <Link href="/dashboard" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="inline h-3 w-3 mr-1" />
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────── LIVE SCREEN ─────────────────────────────────
  const CARD_LABELS = ["Curta", "Profissional", "Detalhada"];
  const CARD_BORDER = [
    "border-emerald-500/40 bg-emerald-500/5",
    "border-violet-500/40 bg-violet-500/5",
    "border-cyan-500/40 bg-cyan-500/5",
  ];
  const CARD_BADGE = ["text-emerald-400", "text-violet-400", "text-cyan-400"];
  const CARD_PILL = [
    "border-emerald-500/20 hover:bg-emerald-500/5",
    "border-violet-500/20 hover:bg-violet-500/5",
    "border-cyan-500/20 hover:bg-cyan-500/5",
  ];

  return (
    <div className="flex h-dvh flex-col bg-background overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-400 tracking-widest">LIVE</span>
          </div>
          <span className="hidden text-xs text-muted-foreground truncate sm:block">· {focus}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {credits !== null && (
            <div className="flex items-center gap-1 rounded-full border border-border/50 bg-card px-2.5 py-1">
              <Zap className="h-3 w-3 text-violet-400" />
              <span className="text-xs font-semibold tabular-nums">{credits}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEnd}
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
          >
            <Square className="h-3 w-3" />
            <span className="hidden sm:inline">Encerrar</span>
          </Button>
        </div>
      </header>

      {/* ── Turns list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {turns.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
            {isRecording ? (
              <>
                <div className="flex items-end justify-center gap-1 h-12">
                  {[0.3, 0.7, 1, 0.6, 0.9, 0.4, 0.8].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-red-400 animate-bounce"
                      style={{ height: `${h * 40}px`, animationDelay: `${i * 0.08}s`, animationDuration: "0.6s" }}
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-400">Ouvindo a conversa...</p>
                  <p className="text-xs text-muted-foreground">Aguardando fala detectada</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-full bg-violet-500/10 border border-violet-500/20 p-6">
                  <Radio className="h-10 w-10 text-violet-400/60" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Sessão iniciada · {focus}</p>
                  <p className="text-xs text-muted-foreground">
                    Pressione o microfone para capturar o áudio da conversa
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card/50 px-4 py-2">
                  <p className="text-xs text-muted-foreground">
                    🧠 Contexto acumulado via IA · Memória ativa por toda a sessão
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {turns.map((turn) => {
          const expanded = expandedCards[turn.id] ?? 0;
          const others = CARD_LABELS.map((_, i) => i).filter(i => i !== expanded);
          return (
            <div key={turn.id} className="space-y-2">
              {/* Transcript + translation */}
              <div className="rounded-xl border border-border/40 bg-card/60 px-4 py-3 space-y-1.5">
                <p className="text-sm font-medium leading-relaxed">{turn.transcript}</p>
                {turn.translation && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="text-violet-400/60 font-semibold mr-1">PT·</span>
                    {turn.translation}
                  </p>
                )}
              </div>

              {/* Pending skeleton */}
              {turn.pending && (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 flex items-center gap-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400 shrink-0" />
                  <p className="text-xs text-violet-300">Gerando sugestões com IA...</p>
                </div>
              )}

              {/* Suggestions */}
              {!turn.pending && turn.suggestions.length > 0 && (
                <div className="space-y-1.5">
                  {/* Primary / expanded card */}
                  <div className={`rounded-xl border px-4 py-3 ${CARD_BORDER[expanded]}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${CARD_BADGE[expanded]}`}>
                          {CARD_LABELS[expanded]}
                        </span>
                        <p className="text-sm font-semibold leading-relaxed">{turn.suggestions[expanded]}</p>
                        {turn.suggestion_translations[expanded] && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {turn.suggestion_translations[expanded]}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => copyText(turn.suggestions[expanded], `${turn.id}-${expanded}`)}
                        className="shrink-0 rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                      >
                        {copiedId === `${turn.id}-${expanded}`
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Other variant pills */}
                  <div className="flex gap-2">
                    {others.map(idx => (
                      <button
                        key={idx}
                        onClick={() => setExpandedCards(prev => ({ ...prev, [turn.id]: idx }))}
                        className={`flex-1 rounded-lg border px-3 py-2 text-left transition-all ${CARD_PILL[idx]}`}
                      >
                        <span className={`block text-[10px] font-bold uppercase tracking-wider ${CARD_BADGE[idx]}`}>
                          {CARD_LABELS[idx]}
                        </span>
                        <span className="block text-xs text-muted-foreground truncate mt-0.5">
                          {turn.suggestions[idx]?.slice(0, 30)}…
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Interim + processing */}
        {isRecording && interimText && (
          <div className="rounded-xl border border-dashed border-border/40 bg-card/20 px-4 py-3">
            <p className="text-sm text-muted-foreground/60 italic leading-relaxed">{interimText}</p>
          </div>
        )}
        {isProcessing && (
          <div className="flex items-center gap-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-violet-400 shrink-0" />
            <div>
              <p className="text-xs font-medium text-violet-300">Processando com IA...</p>
              <p className="text-[10px] text-violet-300/50">Traduzindo e gerando 3 sugestões</p>
            </div>
          </div>
        )}

        <div ref={turnsEndRef} />
      </div>

      {/* ── Bottom mic dock ── */}
      <div className="shrink-0 border-t border-border/50 bg-card/90 backdrop-blur px-6 py-5">
        <div className="flex flex-col items-center gap-3">
          {isRecording && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-400">
                {hasSpeechAPI ? `Ouvindo em ${langLabel}...` : "Gravando... (max 10s)"}
              </span>
            </div>
          )}
          {!isRecording && !isProcessing && turns.length > 0 && (
            <p className="text-xs text-muted-foreground/50">
              Toque para capturar o próximo trecho
            </p>
          )}

          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500 bg-red-500/10 text-red-400 transition-all active:scale-95 hover:bg-red-500/20"
              style={{ boxShadow: "0 0 0 10px rgba(239,68,68,0.08), 0 0 0 20px rgba(239,68,68,0.04)" }}
            >
              <MicOff className="h-7 w-7" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-violet-500 bg-violet-500/10 text-violet-400 transition-all active:scale-95 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              style={!isProcessing ? { boxShadow: "0 0 0 10px rgba(139,92,246,0.08)" } : undefined}
            >
              {isProcessing
                ? <Loader2 className="h-7 w-7 animate-spin" />
                : <Mic className="h-7 w-7" />
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
