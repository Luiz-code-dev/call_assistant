"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Mic, MicOff, Play, RefreshCw, Send, CheckCircle2, Clock, AlertCircle, ChevronRight } from "lucide-react";

interface QuizQuestion { id: string; order: number; question: string; options: string[] }
interface Atividade {
  id: string; title: string; type: "WRITTEN" | "SPOKEN" | "QUIZ";
  prompt: string; maxScore: number; maxAttempts: number; maxAudioSec: number | null;
  dueAt: string | null; questions: QuizQuestion[];
  submission: { id: string; status: string; text?: string } | null;
  attemptsUsed: number; canRetry: boolean; isDone: boolean; isExpired: boolean;
  subject: { name: string; color: string | null } | null;
}

// ─── Escrita ─────────────────────────────────────────────────────────────────

function WrittenActivity({ activity, onSubmit }: { activity: Atividade; onSubmit: (data: { text: string }) => Promise<void> }) {
  const DRAFT_KEY = `edu_draft_${activity.id}`;
  const [text, setText] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(DRAFT_KEY) ?? activity.submission?.text ?? "";
    return activity.submission?.text ?? "";
  });
  const [submitting, setSubmitting] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    autoSaveRef.current = setInterval(async () => {
      if (text.trim().length < 3) return;
      localStorage.setItem(DRAFT_KEY, text);
      await fetch(`/api/escola/aluno/atividades/${activity.id}/rascunho`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
      }).catch(() => {});
    }, 10_000);
    return () => clearInterval(autoSaveRef.current);
  }, [text, activity.id, DRAFT_KEY]);

  const handleSubmit = async () => {
    if (text.trim().length < 10) return;
    setSubmitting(true);
    localStorage.removeItem(DRAFT_KEY);
    await onSubmit({ text });
    setSubmitting(false);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
        <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{activity.prompt}</p>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva sua resposta aqui…"
          rows={10}
          className="w-full p-4 text-base text-zinc-900 bg-transparent resize-none outline-none placeholder:text-zinc-400"
          style={{ fontSize: "16px", lineHeight: "1.6" }}
        />
        <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: "var(--esc-border,#e5e7eb)" }}>
          <span className="text-xs text-zinc-400">{wordCount} palavra{wordCount !== 1 ? "s" : ""}</span>
          <span className="text-xs text-zinc-400">Salvo automaticamente</span>
        </div>
      </div>
      <button onClick={handleSubmit} disabled={submitting || text.trim().length < 10}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
        style={{ background: "var(--esc-primary,#7c3aed)" }}>
        {submitting ? <><RefreshCw className="size-4 animate-spin" />Enviando…</> : <><Send className="size-4" />Enviar resposta</>}
      </button>
    </div>
  );
}

// ─── Fala ─────────────────────────────────────────────────────────────────────

function SpokenActivity({ activity, onSubmit }: { activity: Atividade; onSubmit: (data: { audioBlob: Blob; transcript: string }) => Promise<void> }) {
  const maxSec = activity.maxAudioSec ?? 90;
  const [state, setState] = useState<"idle" | "recording" | "recorded" | "transcribing" | "done" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const startRecording = async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState("recorded");
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(200);
      mediaRef.current = mr;
      setState("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= maxSec) { mr.stop(); clearInterval(timerRef.current); return maxSec; }
          return e + 1;
        });
      }, 1000);
    } catch {
      setErrorMsg("Permissão de microfone negada. Toque no ícone de cadeado na barra do navegador e permita o microfone.");
      setState("error");
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRef.current?.stop();
  };

  const retake = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setTranscript(null);
    setState("idle");
    setElapsed(0);
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    setState("transcribing");
    try {
      const fd = new FormData();
      fd.append("audio", audioBlob, "audio.webm");
      const res = await fetch("/api/escola/aluno/transcrever", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const { transcript: t } = await res.json();
      setTranscript(t);
      await onSubmit({ audioBlob, transcript: t });
      setState("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao transcrever. Tente novamente.");
      setState("recorded");
    }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
        <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{activity.prompt}</p>
        <p className="text-xs text-zinc-400 mt-2">Tempo máximo: {fmtTime(maxSec)}</p>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex gap-3">
          <AlertCircle className="size-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">{errorMsg}</p>
        </div>
      )}

      <div className="rounded-xl border p-8 flex flex-col items-center gap-6" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
        {state === "idle" && (
          <button onClick={startRecording}
            className="size-24 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
            style={{ background: "var(--esc-primary,#7c3aed)" }}>
            <Mic className="size-10" />
          </button>
        )}
        {state === "recording" && (
          <>
            <div className="relative">
              <button onClick={stopRecording}
                className="size-24 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse"
                style={{ background: "#ef4444" }}>
                <MicOff className="size-10" />
              </button>
            </div>
            <div className="text-center">
              <p className="text-3xl font-mono font-bold text-zinc-800">{fmtTime(elapsed)}</p>
              <div className="mt-2 w-48 h-1.5 rounded-full bg-zinc-200">
                <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${(elapsed / maxSec) * 100}%` }} />
              </div>
              <p className="text-xs text-zinc-400 mt-1">Toque para parar</p>
            </div>
          </>
        )}
        {(state === "recorded" || state === "transcribing") && audioUrl && (
          <div className="w-full space-y-4">
            <audio controls src={audioUrl} className="w-full rounded-lg" />
            <div className="flex gap-3">
              <button onClick={retake} disabled={state === "transcribing"}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-zinc-700 disabled:opacity-50"
                style={{ borderColor: "var(--esc-border,#e5e7eb)" }}>
                <RefreshCw className="size-4" />Gravar de novo
              </button>
              <button onClick={handleSend} disabled={state === "transcribing"}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--esc-primary,#7c3aed)" }}>
                {state === "transcribing" ? <><RefreshCw className="size-4 animate-spin" />Enviando…</> : <><Send className="size-4" />Enviar</>}
              </button>
            </div>
          </div>
        )}
        {state === "done" && (
          <div className="text-center space-y-2">
            <CheckCircle2 className="size-12 text-green-500 mx-auto" />
            <p className="font-semibold text-zinc-800">Enviado!</p>
            {transcript && <p className="text-sm text-zinc-500 max-w-xs">&ldquo;{transcript}&rdquo;</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

function QuizActivity({ activity, onSubmit }: { activity: Atividade; onSubmit: (data: { quizAnswers: { questionId: string; selectedIndex: number }[] }) => Promise<void> }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const questions = activity.questions;
  const q = questions[current];
  const totalAnswered = answers.size;
  const allAnswered = totalAnswered === questions.length;

  const select = (qId: string, idx: number) => setAnswers((prev) => new Map(prev).set(qId, idx));

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit({ quizAnswers: Array.from(answers.entries()).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex })) });
    setSubmitting(false);
  };

  if (!q) return <p className="text-center text-zinc-500">Sem questões.</p>;

  if (reviewing) return (
    <div className="space-y-4">
      <h3 className="font-semibold text-zinc-800">Revise suas respostas</h3>
      {questions.map((qq, i) => {
        const selected = answers.get(qq.id);
        return (
          <div key={qq.id} className="rounded-xl border p-4" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
            <p className="text-sm font-medium text-zinc-700 mb-2">{i + 1}. {qq.question}</p>
            <p className="text-sm text-violet-600 font-medium">
              {selected !== undefined ? (qq.options as string[])[selected] : <span className="text-rose-500">Não respondida</span>}
            </p>
          </div>
        );
      })}
      <div className="flex gap-3">
        <button onClick={() => setReviewing(false)}
          className="flex-1 py-3 rounded-xl border font-medium text-zinc-700"
          style={{ borderColor: "var(--esc-border,#e5e7eb)" }}>
          Voltar
        </button>
        <button onClick={handleSubmit} disabled={submitting || !allAnswered}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--esc-primary,#7c3aed)" }}>
          {submitting ? <RefreshCw className="size-4 animate-spin" /> : <><Send className="size-4" />Enviar quiz</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>Questão {current + 1} de {questions.length}</span>
        <span>{totalAnswered} respondida{totalAnswered !== 1 ? "s" : ""}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-zinc-200">
        <div className="h-full rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%`, background: "var(--esc-primary,#7c3aed)" }} />
      </div>

      {/* Questão */}
      <div className="rounded-xl border p-4" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
        <p className="font-medium text-zinc-900 leading-relaxed">{q.question}</p>
      </div>

      {/* Alternativas */}
      <div className="space-y-2">
        {(q.options as string[]).map((opt, i) => {
          const selected = answers.get(q.id) === i;
          return (
            <button key={i} onClick={() => select(q.id, i)}
              className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all ${selected ? "border-violet-500 bg-violet-50 text-violet-900" : "border-zinc-200 bg-white text-zinc-800 hover:border-violet-300"}`}>
              <span className={`inline-flex size-6 rounded-full items-center justify-center text-xs font-bold mr-3 ${selected ? "bg-violet-500 text-white" : "bg-zinc-100 text-zinc-600"}`}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        {current > 0 && (
          <button onClick={() => setCurrent((c) => c - 1)}
            className="px-4 py-3 rounded-xl border font-medium text-zinc-700"
            style={{ borderColor: "var(--esc-border,#e5e7eb)" }}>
            Anterior
          </button>
        )}
        {current < questions.length - 1 ? (
          <button onClick={() => setCurrent((c) => c + 1)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white"
            style={{ background: "var(--esc-primary,#7c3aed)" }}>
            Próxima <ChevronRight className="size-4" />
          </button>
        ) : (
          <button onClick={() => setReviewing(true)} disabled={!allAnswered}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--esc-primary,#7c3aed)" }}>
            Revisar e enviar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Aguardando retorno ───────────────────────────────────────────────────────

function WaitingFeedback({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<"waiting" | "ready" | "manual">("waiting");

  useEffect(() => {
    const poll = setInterval(async () => {
      const res = await fetch(`/api/escola/aluno/atividades/${activityId}/retorno`);
      if (res.ok) {
        const d = await res.json();
        if (d.status === "EVALUATED" || d.status === "REVIEWED") {
          clearInterval(poll);
          setStatus("ready");
          setTimeout(() => router.push(`/escola/aluno/atividades/${activityId}/retorno`), 1000);
        }
      }
      setSeconds((s) => {
        if (s >= 60) { clearInterval(poll); setStatus("manual"); }
        return s + 3;
      });
    }, 3000);
    return () => clearInterval(poll);
  }, [activityId, router]);

  return (
    <div className="rounded-xl border p-10 text-center space-y-4" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
      {status === "waiting" && (
        <>
          <div className="size-16 rounded-full mx-auto flex items-center justify-center" style={{ background: "var(--esc-primary,#7c3aed)" + "18" }}>
            <RefreshCw className="size-8 text-violet-500 animate-spin" />
          </div>
          <p className="font-semibold text-zinc-800 text-lg">Analisando sua resposta…</p>
          <p className="text-sm text-zinc-500">Aguarde alguns segundos</p>
          <div className="w-48 mx-auto h-1 bg-zinc-200 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 animate-pulse rounded-full" style={{ width: `${Math.min(seconds * 1.5, 90)}%` }} />
          </div>
        </>
      )}
      {status === "ready" && (
        <>
          <CheckCircle2 className="size-16 text-green-500 mx-auto" />
          <p className="font-semibold text-green-700 text-lg">Retorno pronto!</p>
        </>
      )}
      {status === "manual" && (
        <>
          <Clock className="size-12 text-amber-500 mx-auto" />
          <p className="font-semibold text-zinc-800">Sua entrega foi salva com sucesso.</p>
          <p className="text-sm text-zinc-500">Seu professor vai corrigir em breve.</p>
          <button onClick={() => router.push("/escola/aluno")}
            className="px-6 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--esc-primary,#7c3aed)" }}>
            Voltar ao início
          </button>
        </>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FazerAtividadePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<Atividade | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/escola/aluno/atividades?filter=todo`)
      .then((r) => r.json())
      .then((d) => {
        const act = (d.atividades as Atividade[]).find((a) => a.id === id);
        if (!act) {
          fetch(`/api/escola/aluno/atividades?filter=feito`)
            .then((r2) => r2.json())
            .then((d2) => {
              const done = (d2.atividades as Atividade[]).find((a) => a.id === id);
              if (done?.isDone) router.replace(`/escola/aluno/atividades/${id}/retorno`);
              else setLoading(false);
            });
        } else {
          setActivity(act);
          setLoading(false);
        }
      });
  }, [id, router]);

  const handleSubmit = useCallback(async (data: { text?: string; audioBlob?: Blob; transcript?: string; quizAnswers?: { questionId: string; selectedIndex: number }[] }) => {
    const body: Record<string, unknown> = {};
    if (data.text) body.text = data.text;
    if (data.transcript) body.transcript = data.transcript;
    if (data.quizAnswers) body.quizAnswers = data.quizAnswers;

    const res = await fetch(`/api/escola/aluno/atividades/${id}/enviar`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) setSubmitted(true);
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--esc-bg,#f8f9fc)" }}>
      <RefreshCw className="size-6 text-violet-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--esc-bg,#f8f9fc)" }}>
      <header className="sticky top-0 z-10 border-b" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
            <ArrowLeft className="size-5 text-zinc-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500">{activity?.subject?.name}</p>
            <h1 className="font-semibold text-zinc-900 truncate">{activity?.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {submitted ? (
          <WaitingFeedback activityId={id} />
        ) : activity?.type === "WRITTEN" ? (
          <WrittenActivity activity={activity} onSubmit={async (d) => handleSubmit(d)} />
        ) : activity?.type === "SPOKEN" ? (
          <SpokenActivity activity={activity} onSubmit={async (d) => handleSubmit(d)} />
        ) : activity?.type === "QUIZ" ? (
          <QuizActivity activity={activity} onSubmit={async (d) => handleSubmit(d)} />
        ) : (
          <p className="text-center text-zinc-400 py-16">Atividade não encontrada.</p>
        )}
      </main>
    </div>
  );
}
