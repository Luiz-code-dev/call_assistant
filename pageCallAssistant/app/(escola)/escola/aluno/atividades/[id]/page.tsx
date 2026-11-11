"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Mic, MicOff, Play, RefreshCw, Send, CheckCircle2, Clock, AlertCircle, ChevronRight, Volume2 } from "lucide-react";
import { Capa, materiaDe } from "@/components/escola/reforco-ui";
import AjudanteFlow from "@/components/escola/aluno/AjudanteFlow";
import RevisarComFlow from "@/components/escola/aluno/RevisarComFlow";

interface QuizQuestion { id: string; order: number; question: string; options: string[] }
interface Atividade {
  id: string; title: string; type: "WRITTEN" | "SPOKEN" | "QUIZ";
  prompt: string; maxScore: number; maxAttempts: number; maxAudioSec: number | null;
  dueAt: string | null; questions: QuizQuestion[];
  submission: { id: string; status: string; text?: string } | null;
  attemptsUsed: number; canRetry: boolean; isDone: boolean; isExpired: boolean;
  subject: { name: string; color: string | null } | null;
}

// ─── Botao Ouvir ─────────────────────────────────────────────────────────────

function OuvirButton({ texto }: { texto: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tocando, setTocando] = useState(false);

  async function ouvir() {
    if (tocando) {
      audioRef.current?.pause();
      setTocando(false);
      return;
    }
    setTocando(true);
    try {
      const r = await fetch("/api/escola/aluno/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: texto }),
      });
      if (r.ok && r.status !== 204) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = url;
        audioRef.current.onended = () => setTocando(false);
        audioRef.current.play().catch(() => fallback(texto));
      } else {
        fallback(texto);
      }
    } catch {
      fallback(texto);
    }
  }

  function fallback(t: string) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "pt-BR"; u.rate = 0.9;
      u.onend = () => setTocando(false);
      window.speechSynthesis.speak(u);
    } else {
      setTocando(false);
    }
  }

  return (
    <button
      onClick={ouvir}
      title={tocando ? "Parar" : "Ouvir enunciado"}
      className={`shrink-0 p-2.5 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${tocando ? "bg-[#6D28D9] text-white" : "bg-[#EDE9FE] text-[#6D28D9] hover:bg-[#DDD6EE]"}`}
    >
      {tocando ? <Play className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

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
      <div className="rounded-3xl bg-white shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-4">
        <div className="flex items-start gap-3">
          <p className="text-sm text-[#1F1A2E] leading-relaxed whitespace-pre-wrap flex-1">{activity.prompt}</p>
          <OuvirButton texto={activity.prompt} />
        </div>
      </div>
      <div className="rounded-3xl bg-white shadow-[0_4px_18px_rgba(91,33,182,0.08)] overflow-hidden">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva sua resposta aqui..."
          rows={10}
          className="w-full p-4 text-base text-[#1F1A2E] bg-transparent resize-none outline-none placeholder:text-[#5B5470]"
          style={{ fontSize: "16px", lineHeight: "1.6" }}
        />
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#E9E5F5]">
          <span className="text-xs text-[#5B5470]">{wordCount} palavra{wordCount !== 1 ? "s" : ""}</span>
          <span className="text-xs text-[#5B5470]">Salvo automaticamente</span>
        </div>
      </div>
      {/* Flow dá uma dica de melhoria antes de enviar, sem reescrever */}
      <RevisarComFlow activityId={activity.id} texto={text} />
      <button onClick={handleSubmit} disabled={submitting || text.trim().length < 10}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] transition-colors disabled:opacity-50 min-h-[52px]">
        {submitting ? <><RefreshCw className="size-4 animate-spin" />Enviando...</> : <><Send className="size-4" />Enviar resposta</>}
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
      setErrorMsg("Permissao de microfone negada. Toque no icone de cadeado na barra do navegador e permita o microfone.");
      setState("error");
    }
  };

  const stopRecording = () => { clearInterval(timerRef.current); mediaRef.current?.stop(); };
  const retake = () => { setAudioUrl(null); setAudioBlob(null); setTranscript(null); setState("idle"); setElapsed(0); };

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
      <div className="rounded-3xl bg-white shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-4">
        <div className="flex items-start gap-3">
          <p className="text-sm text-[#1F1A2E] leading-relaxed whitespace-pre-wrap flex-1">{activity.prompt}</p>
          <OuvirButton texto={activity.prompt} />
        </div>
        <p className="text-xs text-[#5B5470] mt-2">Tempo maximo: {fmtTime(maxSec)}</p>
      </div>

      {errorMsg && (
        <div className="rounded-3xl bg-[#FEE2E2] p-4 flex gap-3">
          <AlertCircle className="size-5 text-[#B91C1C] shrink-0 mt-0.5" />
          <p className="text-sm text-[#B91C1C]">{errorMsg}</p>
        </div>
      )}

      <div className="rounded-3xl bg-white shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-8 flex flex-col items-center gap-6">
        {state === "idle" && (
          <button onClick={startRecording}
            className="size-24 rounded-full flex items-center justify-center text-white bg-[#6D28D9] hover:bg-[#5B21B6] shadow-lg transition-transform active:scale-95 min-h-[96px]">
            <Mic className="size-10" />
          </button>
        )}
        {state === "recording" && (
          <>
            <div className="relative">
              <button onClick={stopRecording}
                className="size-24 rounded-full flex items-center justify-center text-white bg-[#B91C1C] shadow-lg animate-pulse min-h-[96px]">
                <MicOff className="size-10" />
              </button>
            </div>
            <div className="text-center">
              <p className="text-3xl font-mono font-bold text-[#1F1A2E]">{fmtTime(elapsed)}</p>
              <div className="mt-2 w-48 h-1.5 rounded-full bg-[#E9E5F5]">
                <div className="h-full rounded-full bg-[#B91C1C] transition-all" style={{ width: `${(elapsed / maxSec) * 100}%` }} />
              </div>
              <p className="text-xs text-[#5B5470] mt-1">Toque para parar</p>
            </div>
          </>
        )}
        {(state === "recorded" || state === "transcribing") && audioUrl && (
          <div className="w-full space-y-4">
            <audio controls src={audioUrl} className="w-full rounded-lg" />
            <div className="flex gap-3">
              <button onClick={retake} disabled={state === "transcribing"}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-[#DDD6EE] bg-white font-medium text-[#1F1A2E] disabled:opacity-50 min-h-[44px]">
                <RefreshCw className="size-4" />Gravar de novo
              </button>
              <button onClick={handleSend} disabled={state === "transcribing"}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 min-h-[44px]">
                {state === "transcribing" ? <><RefreshCw className="size-4 animate-spin" />Enviando...</> : <><Send className="size-4" />Enviar</>}
              </button>
            </div>
          </div>
        )}
        {state === "done" && (
          <div className="text-center space-y-2">
            <CheckCircle2 className="size-12 text-[#166534] mx-auto" />
            <p className="font-semibold text-[#1F1A2E]">Enviado!</p>
            {transcript && <p className="text-sm text-[#5B5470] max-w-xs">&ldquo;{transcript}&rdquo;</p>}
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

  if (!q) return <p className="text-center text-[#5B5470] py-16">Sem questões.</p>;

  if (reviewing) return (
    <div className="space-y-4">
      <h3 className="font-semibold text-[#1F1A2E]">Revise suas respostas</h3>
      {questions.map((qq, i) => {
        const selected = answers.get(qq.id);
        return (
          <div key={qq.id} className="rounded-3xl bg-white shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-4">
            <p className="text-sm font-medium text-[#1F1A2E] mb-2">{i + 1}. {qq.question}</p>
            <p className="text-sm text-[#6D28D9] font-medium">
              {selected !== undefined ? (qq.options as string[])[selected] : <span className="text-[#B91C1C]">Não respondida</span>}
            </p>
          </div>
        );
      })}
      <div className="flex gap-3">
        <button onClick={() => setReviewing(false)}
          className="flex-1 py-3 rounded-2xl border-2 border-[#DDD6EE] bg-white font-medium text-[#1F1A2E] min-h-[44px]">
          Voltar
        </button>
        <button onClick={handleSubmit} disabled={submitting || !allAnswered}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 min-h-[44px]">
          {submitting ? <RefreshCw className="size-4 animate-spin" /> : <><Send className="size-4" />Enviar quiz</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-[#5B5470]">
        <span>Questão {current + 1} de {questions.length}</span>
        <span>{totalAnswered} respondida{totalAnswered !== 1 ? "s" : ""}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[#E9E5F5]">
        <div className="h-full rounded-full bg-[#6D28D9] transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="rounded-3xl bg-white shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-4">
        <div className="flex items-start gap-3">
          <p className="font-medium text-[#1F1A2E] leading-relaxed flex-1">{q.question}</p>
          <OuvirButton texto={`${q.question} ${(q.options as string[]).map((o, i) => `Alternativa ${String.fromCharCode(65 + i)}: ${o}.`).join(" ")}`} />
        </div>
      </div>

      <div className="space-y-2">
        {(q.options as string[]).map((opt, i) => {
          const selected = answers.get(q.id) === i;
          return (
            <button key={i} onClick={() => select(q.id, i)}
              className={`w-full text-left p-4 rounded-2xl border-2 text-[15px] font-semibold transition-all min-h-[52px] ${selected ? "border-[#6D28D9] bg-[#EDE9FE] text-[#1F1A2E]" : "border-[#E9E5F5] bg-white text-[#1F1A2E] hover:border-[#6D28D9]"}`}>
              <span className={`inline-flex size-6 rounded-full items-center justify-center text-xs font-bold mr-3 ${selected ? "bg-[#6D28D9] text-white" : "bg-[#EDE9FE] text-[#6D28D9]"}`}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        {current > 0 && (
          <button onClick={() => setCurrent((c) => c - 1)}
            className="px-4 py-3 rounded-2xl border-2 border-[#DDD6EE] bg-white font-medium text-[#1F1A2E] min-h-[44px]">
            Anterior
          </button>
        )}
        {current < questions.length - 1 ? (
          <button onClick={() => setCurrent((c) => c + 1)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] min-h-[44px]">
            Próxima <ChevronRight className="size-4" />
          </button>
        ) : (
          <button onClick={() => setReviewing(true)} disabled={!allAnswered}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 min-h-[44px]">
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
        if (d.aiStatus === "FAILED") { clearInterval(poll); setStatus("manual"); return; }
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
    <div className="rounded-3xl bg-white shadow-[0_4px_18px_rgba(91,33,182,0.08)] p-10 text-center space-y-4">
      {status === "waiting" && (
        <>
          <div className="size-16 rounded-full mx-auto flex items-center justify-center bg-[#EDE9FE]">
            <RefreshCw className="size-8 text-[#6D28D9] animate-spin" />
          </div>
          <p className="font-semibold text-[#1F1A2E] text-lg">Analisando sua resposta...</p>
          <p className="text-sm text-[#5B5470]">Aguarde alguns segundos</p>
          <div className="w-48 mx-auto h-1 bg-[#E9E5F5] rounded-full overflow-hidden">
            <div className="h-full bg-[#6D28D9] animate-pulse rounded-full" style={{ width: `${Math.min(seconds * 1.5, 90)}%` }} />
          </div>
        </>
      )}
      {status === "ready" && (
        <>
          <CheckCircle2 className="size-16 text-[#166534] mx-auto" />
          <p className="font-semibold text-[#166534] text-lg">Retorno pronto!</p>
        </>
      )}
      {status === "manual" && (
        <>
          <Clock className="size-12 text-[#92400E] mx-auto" />
          <p className="font-semibold text-[#1F1A2E]">Sua entrega foi salva com sucesso.</p>
          <p className="text-sm text-[#5B5470]">Sua entrega está sendo avaliada. O retorno aparecerá em instantes.</p>
          <button onClick={() => router.push("/escola/aluno/trilha")}
            className="px-6 py-3 rounded-2xl text-sm font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] min-h-[44px]">
            Continuar minha trilha
          </button>
        </>
      )}
    </div>
  );
}

// ─── Pagina principal ─────────────────────────────────────────────────────────

export default function FazerAtividadePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<Atividade | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/escola/aluno/atividades?filter=todo")
      .then((r) => r.json())
      .then((d) => {
        const act = (d.atividades as Atividade[]).find((a) => a.id === id);
        if (!act) {
          fetch("/api/escola/aluno/atividades?filter=feito")
            .then((r2) => r2.json())
            .then((d2) => {
              const done = (d2.atividades as Atividade[]).find((a) => a.id === id);
              // "Tentar de novo": abre as questões outra vez se ainda há tentativa
              const tentar = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tentar") === "1";
              if (done && tentar && done.canRetry) { setActivity(done); setLoading(false); }
              else if (done?.isDone) router.replace(`/escola/aluno/atividades/${id}/retorno`);
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
    <div className="min-h-screen flex items-center justify-center bg-[#F6F4FE]">
      <RefreshCw className="size-6 text-[#6D28D9] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F4FE]">
      <Capa compacta titulo={activity?.title ?? "Atividade"} subtitulo={activity?.subject?.name}
        voltar={{ onClick: () => router.back() }} cor={materiaDe(activity?.subject?.name)?.cor} />

      <main className="max-w-2xl mx-auto px-4 pt-5 pb-28">
        {submitted ? (
          <WaitingFeedback activityId={id} />
        ) : activity?.type === "WRITTEN" ? (
          <WrittenActivity activity={activity} onSubmit={async (d) => handleSubmit(d)} />
        ) : activity?.type === "SPOKEN" ? (
          <SpokenActivity activity={activity} onSubmit={async (d) => handleSubmit(d)} />
        ) : activity?.type === "QUIZ" ? (
          <QuizActivity activity={activity} onSubmit={async (d) => handleSubmit(d)} />
        ) : (
          <p className="text-center text-[#5B5470] py-16">Atividade não encontrada.</p>
        )}
      </main>
      {/* Flow no cantinho: ajuda a pensar, nunca dá a resposta */}
      {activity && !submitted && <AjudanteFlow activityId={id} />}
    </div>
  );
}
