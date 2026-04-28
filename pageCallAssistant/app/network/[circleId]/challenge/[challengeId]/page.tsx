"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Star, Zap, ChevronDown, ChevronUp, Mic, Square, Volume2, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Evaluation { fluencyScore: number; contentScore: number; clarityScore: number; totalScore: number; feedback: string; improvedResponse: string; tip: string }
interface MySubmission { id: string; content: string; isPublic: boolean; isSelected: boolean; createdAt: string; evaluation?: Evaluation | null }
interface FeedItem { id: string; content: string; evaluation?: { totalScore: number } | null; user: { id: string; name: string; avatarUrl?: string | null } }
interface Challenge { id: string; title: string; prompt: string; type: string; startsAt: string; endsAt: string; isActive: boolean; _count: { submissions: number } }
interface QuizQ { id: string; question: string; options: string[] }
interface QuizResult { score: number; correct: number; total: number; results: { questionId: string; correct: boolean; correctText: string; selectedText: string }[] }
type QuizPhase = "idle" | "loading" | "answering" | "submitting" | "done"

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-violet-600 to-indigo-600","from-emerald-500 to-teal-600","from-rose-500 to-pink-600","from-amber-500 to-orange-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatarUrl) return <img src={avatarUrl} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-border" />;
  return <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>{initials}</div>;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium">{score}/10</span></div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all" style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  );
}

export default function ChallengePage() {
  const { circleId, challengeId } = useParams<{ circleId: string; challengeId: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [mySubmissions, setMySubmissions] = useState<MySubmission[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribed, setTranscribed] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recSeconds, setRecSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Quiz state
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("idle");
  const [quizQuestions, setQuizQuestions] = useState<QuizQ[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<{ questionId: string; selectedText: string }[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const qTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch { toast.error("Permita acesso ao microfone."); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const transcribeAudio = async (blob: Blob) => {
    if (recSeconds < 3) {
      toast.error("Gravação muito curta. Fale por pelo menos 3 segundos em inglês.");
      return;
    }
    setTranscribing(true);
    const fd = new FormData();
    fd.append("audio", blob, "recording.webm");
    fd.append("challengeId", challengeId);
    fd.append("circleId", circleId);
    const r = await fetch("/api/network/submissions/audio", { method: "POST", body: fd });
    if (r.ok) {
      const d = await r.json();
      setTranscribed(d.transcription ?? "");
      toast.success("Áudio transcrito e enviado!");
      await load();
      setAudioBlob(null);
    } else { const d = await r.json(); toast.error(d.error ?? "Erro ao transcrever áudio."); }
    setTranscribing(false);
  };

  const load = useCallback(async () => {
    const [chRes, feedRes, mineRes] = await Promise.all([
      fetch(`/api/network/challenges?circleId=${circleId}`),
      fetch(`/api/network/submissions?challengeId=${challengeId}`),
      fetch(`/api/network/submissions?challengeId=${challengeId}&mine=true`),
    ]);
    if (chRes.ok) {
      const list: Challenge[] = await chRes.json();
      setChallenge(list.find((c) => c.id === challengeId) ?? null);
    }
    if (mineRes.ok) setMySubmissions(await mineRes.json());
    if (feedRes.ok) setFeed(await feedRes.json());
    setLoading(false);
  }, [circleId, challengeId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    const r = await fetch("/api/network/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, circleId, content: content.trim() }),
    });
    if (r.ok) { toast.success("Resposta enviada!"); await load(); setContent(""); }
    else { const d = await r.json(); toast.error(d.error ?? "Erro ao enviar."); }
    setSubmitting(false);
  };

  const evaluate = async (submissionId: string) => {
    setEvaluating(submissionId);
    const r = await fetch(`/api/network/submissions/${submissionId}/evaluate`, { method: "POST" });
    if (r.ok) { toast.success("Avaliação concluída!"); await load(); }
    else { const d = await r.json(); toast.error(d.error ?? "Erro na avaliação."); }
    setEvaluating(null);
  };

  const selectAttempt = async (submissionId: string) => {
    setSelecting(submissionId);
    const r = await fetch(`/api/network/submissions/${submissionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "select" }),
    });
    if (r.ok) { await load(); }
    else toast.error("Erro ao selecionar tentativa.");
    setSelecting(null);
  };

  const deleteAttempt = async (submissionId: string) => {
    if (!confirm("Apagar esta tentativa? Esta ação não pode ser desfeita.")) return;
    setDeleting(submissionId);
    const r = await fetch(`/api/network/submissions/${submissionId}`, { method: "DELETE" });
    if (r.ok) { toast.success("Tentativa apagada."); await load(); }
    else toast.error("Erro ao apagar tentativa.");
    setDeleting(null);
  };

  const isExpired = challenge ? new Date() > new Date(challenge.endsAt) : false;
  const isStarted = challenge ? new Date() >= new Date(challenge.startsAt) : false;

  // ── Quiz logic ──
  const startQuiz = async () => {
    setQuizPhase("loading");
    try {
      const r = await fetch(`/api/network/challenges/${challengeId}/quiz`);
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error ?? "Erro ao carregar quiz.");
        setQuizPhase("idle");
        return;
      }
      if (!data.questions?.length) {
        toast.error("Este quiz não possui perguntas. Peça ao admin para recriar o desafio.");
        setQuizPhase("idle");
        return;
      }
      setQuizQuestions(data.questions);
      setCurrentQIdx(0);
      setSelectedOpt(null);
      setQuizAnswers([]);
      setTimeLeft(60);
      setQuizPhase("answering");
    } catch {
      toast.error("Erro de rede ao carregar quiz.");
      setQuizPhase("idle");
    }
  };

  // Submits whatever answers have been collected (called on last question OR on timeout)
  const submitQuiz = useCallback((ans: { questionId: string; selectedText: string }[]) => {
    if (qTimerRef.current) clearTimeout(qTimerRef.current);
    setQuizPhase("submitting");
    fetch(`/api/network/challenges/${challengeId}/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: ans, circleId }),
    }).then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setQuizResult(data);
        setQuizPhase("done");
        load();
      } else {
        const d = await r.json();
        toast.error(d.error ?? "Erro ao enviar quiz.");
        setQuizPhase("idle");
      }
    });
  }, [challengeId, circleId, load]);

  const advanceQuiz = useCallback((ans: { questionId: string; selectedText: string }[]) => {
    const next = currentQIdx + 1;
    if (next < quizQuestions.length) {
      setCurrentQIdx(next);
      setSelectedOpt(null);
      setTimeLeft(60);
    } else {
      submitQuiz(ans);
    }
  }, [currentQIdx, quizQuestions.length, submitQuiz]);

  const handleAnswer = useCallback((optText: string) => {
    if (quizPhase !== "answering" || selectedOpt !== null) return;
    if (qTimerRef.current) clearTimeout(qTimerRef.current);
    setSelectedOpt(optText);
    const currentQ = quizQuestions[currentQIdx];
    const newAnswers = [...quizAnswers, { questionId: currentQ.id, selectedText: optText }];
    setQuizAnswers(newAnswers);
    setTimeout(() => advanceQuiz(newAnswers), 900);
  }, [quizPhase, selectedOpt, quizQuestions, currentQIdx, quizAnswers, advanceQuiz]);

  // Timer — when it reaches 0 the quiz ends immediately with current score
  useEffect(() => {
    if (quizPhase !== "answering" || selectedOpt !== null) return;
    if (timeLeft <= 0) {
      toast.error("⏱ Tempo esgotado! O desafio foi encerrado.");
      submitQuiz(quizAnswers);
      return;
    }
    qTimerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => { if (qTimerRef.current) clearTimeout(qTimerRef.current); };
  }, [quizPhase, timeLeft, selectedOpt, quizAnswers, submitQuiz]);

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded bg-card/50 animate-pulse" />
      <div className="h-40 rounded-xl bg-card/50 animate-pulse border border-border/50" />
    </div>
  );
  if (!challenge) return <div className="text-center py-20 text-muted-foreground">Desafio não encontrado.</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link href={`/network/${circleId}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-xl font-bold">{challenge.title}</h1>
          <p className="text-xs text-muted-foreground">
            {isExpired ? "Encerrado" : `Encerra ${new Date(challenge.endsAt).toLocaleDateString("pt-BR")}`} · {challenge._count.submissions} respostas
          </p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Contexto do desafio</CardTitle></CardHeader>
        <CardContent><p className="text-sm leading-relaxed">{challenge.prompt}</p></CardContent>
      </Card>

      {!isStarted && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-5 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300">Desafio ainda não iniciou</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Disponível a partir de {new Date(challenge.startsAt).toLocaleDateString("pt-BR")} às{" "}
                {new Date(challenge.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isStarted && !isExpired && challenge.type === "quiz" && mySubmissions.length === 0 && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-violet-400" />
              Quiz — {quizQuestions.length || "?"} perguntas · 1 min cada · 0,5 pts por acerto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* idle */}
            {quizPhase === "idle" && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">Você terá <strong>1 minuto por pergunta</strong>. As perguntas não podem ser copiadas. Responda com atenção!</p>
                <button onClick={startQuiz} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3 text-sm font-semibold text-white hover:opacity-90 transition">
                  Iniciar Quiz
                </button>
              </div>
            )}
            {/* loading */}
            {quizPhase === "loading" && (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>
            )}
            {/* answering */}
            {quizPhase === "answering" && quizQuestions[currentQIdx] && (() => {
              const q = quizQuestions[currentQIdx];
              const timerPct = (timeLeft / 60) * 100;
              const timerColor = timeLeft > 30 ? "bg-emerald-500" : timeLeft > 10 ? "bg-amber-500" : "bg-red-500";
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Pergunta {currentQIdx + 1} de {quizQuestions.length}</span>
                    <span className={`font-mono font-bold ${timeLeft <= 10 ? "text-red-400" : "text-foreground"}`}>
                      <Clock className="inline h-3 w-3 mr-1" />{timeLeft}s
                    </span>
                  </div>
                  {/* Timer bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${timerColor}`} style={{ width: `${timerPct}%` }} />
                  </div>
                  {/* Question — no-copy */}
                  <p className="text-base font-medium leading-snug select-none" style={{ WebkitUserSelect: "none", userSelect: "none" }}>{q.question}</p>
                  {/* Options */}
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => handleAnswer(opt)}
                        disabled={selectedOpt !== null}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all
                          ${ selectedOpt === opt
                              ? "border-violet-500 bg-violet-500/20 text-violet-200"
                              : selectedOpt !== null
                              ? "border-border/30 bg-muted/30 text-muted-foreground cursor-not-allowed"
                              : "border-border/50 bg-card hover:border-violet-500/50 hover:bg-violet-500/5 cursor-pointer"
                          }`}
                        style={{ WebkitUserSelect: "none", userSelect: "none" }}
                      >
                        <span className="font-semibold mr-2 text-muted-foreground">{["A","B","C","D"][oi]}.</span>{opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* submitting */}
            {quizPhase === "submitting" && (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                <p className="text-sm text-muted-foreground">Calculando resultado...</p>
              </div>
            )}
            {/* done */}
            {quizPhase === "done" && quizResult && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-3xl font-bold gradient-text">{quizResult.score.toFixed(1)} pts</p>
                  <p className="text-sm text-muted-foreground mt-1">{quizResult.correct} de {quizResult.total} acertos · 0,5 pts cada</p>
                </div>
                <div className="space-y-2">
                  {quizResult.results.map((r, i) => (
                    <div key={r.questionId} className={`flex items-start gap-3 rounded-lg p-3 border ${ r.correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5" }`}>
                      {r.correct ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground/80 mb-1 select-none" style={{ WebkitUserSelect: "none", userSelect: "none" }}>{quizQuestions[i]?.question}</p>
                        {!r.correct && r.selectedText && <p className="text-[11px] text-red-400">Sua resposta: {r.selectedText}</p>}
                        {!r.correct && <p className="text-[11px] text-emerald-400">Correta: {r.correctText}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isStarted && !isExpired && challenge.type !== "quiz" && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {mySubmissions.length > 0 ? (
                <><span>Nova tentativa</span><span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">#{mySubmissions.length + 1}</span></>
              ) : "Sua resposta"}
              {challenge.type === "spoken" && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/20 flex items-center gap-1"><Mic className="h-3 w-3" />Voz</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {challenge.type === "spoken" ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-card border border-border/50 p-4 text-center space-y-4">
                  {!recording && !audioBlob && (
                    <>
                      <p className="text-sm text-muted-foreground">Grave sua resposta em inglês. O áudio será transcrito automaticamente com IA.</p>
                      <button onClick={startRecording} className="mx-auto flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition">
                        <Mic className="h-5 w-5" />Iniciar gravação
                      </button>
                    </>
                  )}
                  {recording && (
                    <>
                      <div className="flex items-center justify-center gap-3">
                        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" /></span>
                        <span className="text-red-400 font-mono font-bold">{String(Math.floor(recSeconds/60)).padStart(2,"0")}:{String(recSeconds%60).padStart(2,"0")}</span>
                        <span className="text-sm text-muted-foreground">Gravando...</span>
                      </div>
                      <button onClick={stopRecording} className="mx-auto flex items-center gap-2 rounded-full bg-muted px-6 py-3 text-sm font-semibold hover:bg-muted/70 transition">
                        <Square className="h-5 w-5" />Parar gravação
                      </button>
                    </>
                  )}
                  {audioBlob && !recording && (
                    <>
                      <div className="flex items-center justify-center gap-2 text-emerald-400">
                        <Volume2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Gravação pronta ({recSeconds}s)</span>
                      </div>
                      <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                      <div className="flex gap-3 justify-center">
                        <button onClick={() => { setAudioBlob(null); setRecSeconds(0); }} className="text-sm text-muted-foreground hover:text-foreground">Regravar</button>
                        <button onClick={() => transcribeAudio(audioBlob)} disabled={transcribing} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                          {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {transcribing ? "Transcrevendo..." : "Enviar tentativa"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {transcribed && <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3"><strong>Transcrição:</strong> {transcribed}</p>}
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <textarea
                  value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva sua resposta em inglês..."
                  maxLength={3000} rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder:text-muted-foreground"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{content.length}/3000</span>
                  <Button type="submit" size="sm" disabled={submitting || !content.trim()} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1.5" />Enviar tentativa</>}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {mySubmissions.length > 0 && challenge.type !== "quiz" && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            Minhas tentativas
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{mySubmissions.length}</span>
            {!isExpired && <span className="text-xs text-violet-400">— selecione a melhor para receber a nota</span>}
          </h3>
          {mySubmissions.map((s, idx) => {
            const attemptNum = mySubmissions.length - idx;
            const isEval = evaluating === s.id;
            const isSel = selecting === s.id;
            return (
              <Card key={s.id} className={`border-2 transition-all ${
                s.isSelected ? "border-violet-500/50 bg-violet-500/5" : "border-border/30"
              }`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">Tentativa #{attemptNum}</CardTitle>
                      <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      {s.isSelected && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-medium">✓ Selecionada para nota</span>}
                      {s.evaluation && <div className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-violet-400" /><span className="text-sm font-bold text-violet-400">{s.evaluation.totalScore}/10</span></div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!s.isSelected && (
                        <Button size="sm" variant="outline" onClick={() => selectAttempt(s.id)} disabled={isSel}
                          className="h-7 px-2 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10">
                          {isSel ? <Loader2 className="h-3 w-3 animate-spin" /> : "Usar esta"}
                        </Button>
                      )}
                      {s.isSelected && !s.evaluation && (
                        <Button size="sm" onClick={() => evaluate(s.id)} disabled={isEval} variant="outline"
                          className="h-7 px-2 text-xs">
                          {isEval ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Star className="h-3 w-3 mr-1" />Avaliar com IA</>}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteAttempt(s.id)} disabled={deleting === s.id}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                        {deleting === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className={`text-sm bg-muted/30 rounded-lg p-3 whitespace-pre-wrap ${
                    expandedId === s.id ? "" : "line-clamp-3"
                  }`}>{s.content}</p>
                  {s.content.length > 200 && (
                    <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} className="text-xs text-violet-400 flex items-center gap-1">
                      {expandedId === s.id ? <><ChevronUp className="h-3 w-3" />Recolher</> : <><ChevronDown className="h-3 w-3" />Ver completo</>}
                    </button>
                  )}
                  {s.evaluation && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <ScoreBar label="Fluência" score={s.evaluation.fluencyScore} />
                        <ScoreBar label="Conteúdo" score={s.evaluation.contentScore} />
                        <ScoreBar label="Clareza" score={s.evaluation.clarityScore} />
                      </div>
                      <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Feedback</p>
                        <p className="text-sm">{s.evaluation.feedback}</p>
                      </div>
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                        <p className="text-xs font-medium text-emerald-400">Resposta melhorada</p>
                        <p className="text-sm">{s.evaluation.improvedResponse}</p>
                      </div>
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                        <p className="text-xs font-medium text-amber-400 mb-1">Dica</p>
                        <p className="text-sm">{s.evaluation.tip}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {mySubmissions.length > 0 && challenge.type === "quiz" && (() => {
        const s = mySubmissions[0];
        let quizData: { score?: number; correct?: number; total?: number; results?: { question: string; correct: boolean; correctText: string; selectedText: string }[] } = {};
        try { quizData = JSON.parse(s.content); } catch {}
        return (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="font-semibold text-sm">Quiz concluído</span>
                <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold gradient-text">{quizData.score?.toFixed(1) ?? "0.0"} pts</span>
                <span className="text-sm text-muted-foreground">{quizData.correct ?? 0} de {quizData.total ?? 0} acertos · 0,5 pts cada</span>
              </div>
              {s.evaluation && (
                <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">{s.evaluation.feedback}</p>
              )}
              {quizData.results && quizData.results.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-border/30">
                  <p className="text-xs font-medium text-muted-foreground">Detalhes por pergunta</p>
                  {quizData.results.map((r, i) => (
                    <div key={i} className={`flex items-start gap-3 rounded-lg p-3 border ${r.correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                      {r.correct ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground/80 mb-1">{r.question}</p>
                        {!r.correct && r.selectedText && <p className="text-[11px] text-red-400">Sua resposta: {r.selectedText}</p>}
                        {!r.correct && <p className="text-[11px] text-emerald-400">Correta: {r.correctText}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {feed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Respostas dos membros ({feed.length})</h3>
          {feed.map((s) => {
            const isQuiz = challenge.type === "quiz";
            let quizData: { score?: number; correct?: number; total?: number } = {};
            if (isQuiz) { try { quizData = JSON.parse(s.content); } catch {} }
            return (
              <Card key={s.id} className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar name={s.user.name} avatarUrl={s.user.avatarUrl} />
                      <span className="text-sm font-medium">{s.user.name}</span>
                    </div>
                    {isQuiz ? (
                      <span className="text-sm font-bold text-violet-400">{quizData.score?.toFixed(1) ?? "—"} pts <span className="text-xs font-normal text-muted-foreground">({quizData.correct}/{quizData.total} acertos)</span></span>
                    ) : s.evaluation && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-violet-400" />
                        <span className="text-sm font-bold text-violet-400">{s.evaluation.totalScore}/10</span>
                      </div>
                    )}
                  </div>
                  {!isQuiz && (
                    <button className="w-full text-left" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                      <p className={`text-sm ${expandedId === s.id ? "" : "line-clamp-3"}`}>{s.content}</p>
                      <span className="text-xs text-violet-400 flex items-center gap-1 mt-1">
                        {expandedId === s.id ? <><ChevronUp className="h-3 w-3" />Recolher</> : <><ChevronDown className="h-3 w-3" />Ver completo</>}
                      </span>
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
