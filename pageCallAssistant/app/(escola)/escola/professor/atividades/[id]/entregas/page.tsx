"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, User, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Submission {
  id: string; attempt: number; status: string;
  aiScore: number | null; teacherScore: number | null; teacherNote: string | null;
  aiFeedback: { acertos?: string[]; melhorar?: string[] } | null;
  transcript: string | null; text: string | null; submittedAt: string | null;
}
interface Entrega { studentId: string; studentName: string; submission: Submission | null }
interface Activity { id: string; title: string; type: string; maxScore: number }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: "Rascunho", color: "text-zinc-400" },
  SUBMITTED: { label: "Entregue", color: "text-amber-500" },
  EVALUATED: { label: "Avaliado pela IA", color: "text-blue-500" },
  REVIEWED: { label: "Revisado", color: "text-green-600" },
};

function EntregaRow({ entrega, activityId, maxScore, onReview }: {
  entrega: Entrega; activityId: string; maxScore: number;
  onReview: (subId: string, score: number | null, note: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(entrega.submission?.teacherScore != null ? String(entrega.submission.teacherScore) : String(entrega.submission?.aiScore ?? ""));
  const [note, setNote] = useState(entrega.submission?.teacherNote ?? "");
  const [saving, setSaving] = useState(false);
  const sub = entrega.submission;

  const handleSave = async () => {
    if (!sub) return;
    setSaving(true);
    await onReview(sub.id, score !== "" ? Number(score) : null, note);
    setSaving(false);
  };

  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--esc-border,#e5e7eb)" }}>
      <button className="w-full flex items-center gap-3 p-4 hover:bg-zinc-50 transition-colors text-left" onClick={() => setOpen((o) => !o)}>
        <div className="size-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
          <User className="size-4 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-800">{entrega.studentName}</p>
          {sub ? (
            <span className={`text-xs font-medium ${STATUS_LABEL[sub.status]?.color ?? "text-zinc-400"}`}>
              {STATUS_LABEL[sub.status]?.label ?? sub.status}
            </span>
          ) : (
            <span className="text-xs text-zinc-300">Não entregue</span>
          )}
        </div>
        {sub?.aiScore != null && (
          <span className="text-sm font-bold text-blue-500">{Number(sub.aiScore).toFixed(1)}</span>
        )}
        {sub?.teacherScore != null && (
          <span className="text-sm font-bold text-green-600">{Number(sub.teacherScore).toFixed(1)}</span>
        )}
        {open ? <ChevronUp className="size-4 text-zinc-400 shrink-0" /> : <ChevronDown className="size-4 text-zinc-400 shrink-0" />}
      </button>

      {open && sub && (
        <div className="border-t px-4 pb-4 space-y-3" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
          {sub.text && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-1">Resposta do aluno</p>
              <p className="text-sm text-zinc-700 bg-zinc-50 rounded-lg p-3 whitespace-pre-wrap">{sub.text}</p>
            </div>
          )}
          {sub.transcript && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-1">Transcrição da fala</p>
              <p className="text-sm text-zinc-700 bg-zinc-50 rounded-lg p-3 italic">&ldquo;{sub.transcript}&rdquo;</p>
            </div>
          )}
          {sub.aiFeedback && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-1">Avaliação da IA</p>
              <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-blue-800 font-medium">Nota sugerida: {Number(sub.aiScore ?? 0).toFixed(1)} / {maxScore}</p>
                {sub.aiFeedback.acertos?.map((a, i) => <p key={i} className="text-xs text-blue-700"> {a}</p>)}
                {sub.aiFeedback.melhorar?.map((m, i) => <p key={i} className="text-xs text-blue-600">→ {m}</p>)}
              </div>
            </div>
          )}
          {(sub.status === "EVALUATED" || sub.status === "REVIEWED") && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-500">Confirmar / ajustar nota</p>
              <div className="flex gap-2">
                <input type="number" min="0" max={maxScore} step="0.1" value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="Nota"
                  className="w-24 text-sm border rounded-lg px-3 py-2 text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
                <input value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Comentário (opcional)"
                  className="flex-1 text-sm border rounded-lg px-3 py-2 text-zinc-900" style={{ borderColor: "var(--esc-border,#e5e7eb)" }} />
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full py-2 rounded-lg text-sm font-semibold text-[#1F1A2E] disabled:opacity-50"
                style={{ background: "var(--esc-primary,#7c3aed)" }}>
                {saving ? <RefreshCw className="size-3.5 animate-spin mx-auto" /> : "Confirmar nota"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EntregasPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingAll, setConfirmingAll] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/escola/professor/atividades/${id}/entregas`);
    if (res.ok) {
      const d = await res.json();
      setEntregas(d.entregas ?? []);
      setActivity(d.activity);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleReview = async (subId: string, score: number | null, note: string) => {
    await fetch(`/api/escola/professor/atividades/${id}/entregas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: subId, teacherScore: score, teacherNote: note }),
    });
    await load();
  };

  const handleConfirmAll = async () => {
    setConfirmingAll(true);
    await fetch(`/api/escola/professor/atividades/${id}/entregas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmAll: true }),
    });
    await load();
    setConfirmingAll(false);
  };

  const entregues = entregas.filter((e) => e.submission && ["SUBMITTED", "EVALUATED", "REVIEWED"].includes(e.submission.status));
  const avaliados = entregas.filter((e) => e.submission?.status === "EVALUATED");

  return (
    <div className="min-h-screen" style={{ background: "var(--esc-bg,#f8f9fc)" }}>
      <header className="sticky top-0 z-10 border-b" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-zinc-100"><ArrowLeft className="size-5 text-zinc-600" /></button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500">Entregas</p>
            <h1 className="font-semibold text-zinc-900 truncate">{activity?.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total alunos", value: entregas.length, icon: User, color: "text-zinc-600" },
            { label: "Entregues", value: entregues.length, icon: CheckCircle2, color: "text-blue-500" },
            { label: "Pendentes revisão", value: avaliados.length, icon: Clock, color: "text-amber-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border p-3 text-center" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
              <Icon className={`size-5 mx-auto mb-1 ${color}`} />
              <p className="text-xl font-bold text-zinc-900">{value}</p>
              <p className="text-[10px] text-zinc-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Confirmar todas */}
        {avaliados.length > 1 && (
          <button onClick={handleConfirmAll} disabled={confirmingAll}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-green-200 bg-green-50 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors">
            {confirmingAll ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Confirmar {avaliados.length} notas sugeridas pela IA de uma vez
          </button>
        )}

        {/* Lista */}
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--esc-border,#e5e7eb)" }} />)}</div>
        ) : entregas.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="size-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-zinc-500 text-sm">Nenhum aluno na turma.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entregas.map((e) => (
              <EntregaRow key={e.studentId} entrega={e} activityId={id} maxScore={Number(activity?.maxScore ?? 10)} onReview={handleReview} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
