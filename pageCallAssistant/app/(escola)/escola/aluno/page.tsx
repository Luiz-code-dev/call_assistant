"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Mic, PenLine, HelpCircle, Clock, CheckCircle2, ChevronRight, BookOpen, TrendingUp, ClipboardList, LogOut } from "lucide-react";

interface Subject { id: string; name: string; color: string | null }
interface Submission { id: string; status: string; aiScore: number | null; teacherScore: number | null; evaluatedAt: string | null }
interface Atividade {
  id: string; title: string; type: "WRITTEN" | "SPOKEN" | "QUIZ";
  subject: Subject | null; dueAt: string | null; isDone: boolean;
  isExpired: boolean; canRetry: boolean; maxAttempts: number; attemptsUsed: number;
  submission: Submission | null;
}

const TYPE_ICON = { WRITTEN: PenLine, SPOKEN: Mic, QUIZ: HelpCircle };
const TYPE_LABEL = { WRITTEN: "Escrita", SPOKEN: "Fala", QUIZ: "Quiz" };
const TYPE_COLOR = { WRITTEN: "bg-blue-500/10 text-[#1D4ED8]", SPOKEN: "bg-violet-500/10 text-violet-400", QUIZ: "bg-amber-500/10 text-[#92400E]" };

function StatusBadge({ sub }: { sub: Submission | null }) {
  if (!sub) return null;
  if (sub.status === "IN_PROGRESS") return <span className="text-xs text-zinc-400">Rascunho</span>;
  if (sub.status === "SUBMITTED") return <span className="text-xs text-[#92400E] flex items-center gap-1"><Clock className="size-3" />Analisando…</span>;
  const nota = sub.teacherScore ?? sub.aiScore;
  return <span className="text-xs text-[#166534] flex items-center gap-1"><CheckCircle2 className="size-3" />{nota != null ? `Nota: ${Number(nota).toFixed(1)}` : "Corrigido"}</span>;
}

export default function AlunoHomePage() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [classInfo, setClassInfo] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/escola/aluno/atividades?filter=todo");
      if (res.status === 401) { window.location.href = "/escola/aluno/entrar"; return; }
      const data = await res.json();
      setAtividades(data.atividades ?? []);

      const panelRes = await fetch("/api/escola/aluno/perfil");
      if (panelRes.ok) {
        const p = await panelRes.json();
        setStudentName(p.fullName ?? "");
        setClassInfo(p.className ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Polling para atualizar status de "Analisando"
  useEffect(() => {
    const hasProcessing = atividades.some((a) => a.submission?.status === "SUBMITTED");
    if (!hasProcessing) return;
    const timer = setTimeout(load, 5000);
    return () => clearTimeout(timer);
  }, [atividades, load]);

  const paraFazer = atividades.filter((a) => !a.isDone && !a.isExpired);
  const ultimoRetorno = atividades.find((a) => a.isDone && a.submission?.evaluatedAt);

  return (
    <div className="min-h-screen" style={{ background: "var(--esc-bg, #f8f9fc)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b" style={{ background: "var(--esc-surface, #fff)", borderColor: "var(--esc-border, #e5e7eb)" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">{classInfo}</p>
            <h1 className="text-base font-semibold text-zinc-900">{studentName || "Portal do Aluno"}</h1>
          </div>
          <form action="/api/escola/auth/aluno/logout" method="POST">
            <button type="submit" className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors" title="Sair">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Atalhos */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { href: "/escola/aluno/notas", icon: ClipboardList, label: "Minhas notas" },
            { href: "/escola/aluno/atividades/historico", icon: BookOpen, label: "Feitas" },
            { href: "/escola/aluno/evolucao", icon: TrendingUp, label: "Evolução" },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-2 rounded-xl p-4 border text-center transition-all hover:shadow-sm"
              style={{ background: "var(--esc-surface, #fff)", borderColor: "var(--esc-border, #e5e7eb)" }}>
              <Icon className="size-5 text-violet-500" />
              <span className="text-xs font-medium text-zinc-700">{label}</span>
            </Link>
          ))}
        </section>

        {/* Último retorno */}
        {ultimoRetorno && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Último retorno</h2>
            <Link href={`/escola/aluno/atividades/${ultimoRetorno.id}/retorno`}
              className="flex items-center gap-4 rounded-xl border p-4 hover:shadow-sm transition-all"
              style={{ background: "var(--esc-surface, #fff)", borderColor: "var(--esc-border, #e5e7eb)" }}>
              <div className={`rounded-lg p-2 ${TYPE_COLOR[ultimoRetorno.type]}`}>
                {(() => { const Icon = TYPE_ICON[ultimoRetorno.type]; return <Icon className="size-5" />; })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-900 truncate">{ultimoRetorno.title}</p>
                <p className="text-xs text-zinc-500">{ultimoRetorno.subject?.name}</p>
              </div>
              <StatusBadge sub={ultimoRetorno.submission} />
              <ChevronRight className="size-4 text-zinc-400 shrink-0" />
            </Link>
          </section>
        )}

        {/* Para fazer */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Para fazer</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "var(--esc-border, #e5e7eb)" }} />
              ))}
            </div>
          ) : paraFazer.length === 0 ? (
            <div className="rounded-xl border p-8 text-center"
              style={{ background: "var(--esc-surface, #fff)", borderColor: "var(--esc-border, #e5e7eb)" }}>
              <CheckCircle2 className="size-10 text-[#166534] mx-auto mb-3" />
              <p className="font-semibold text-zinc-800">Nenhuma atividade para hoje.</p>
              <p className="text-sm text-zinc-500 mt-1">Bom trabalho!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paraFazer.map((a) => {
                const Icon = TYPE_ICON[a.type];
                const due = a.dueAt ? new Date(a.dueAt) : null;
                const isUrgent = due && due.getTime() - Date.now() < 24 * 60 * 60 * 1000;
                const subjectColor = a.subject?.color ?? "#8b5cf6";

                return (
                  <Link key={a.id} href={`/escola/aluno/atividades/${a.id}`}
                    className="flex items-center gap-4 rounded-xl border p-4 hover:shadow-md transition-all group"
                    style={{ background: "var(--esc-surface, #fff)", borderColor: "var(--esc-border, #e5e7eb)" }}>
                    <div className="rounded-lg p-2.5 shrink-0" style={{ background: subjectColor + "18", color: subjectColor }}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLOR[a.type]}`}>
                          {TYPE_LABEL[a.type]}
                        </span>
                        {a.subject && <span className="text-[10px] text-zinc-400 truncate">{a.subject.name}</span>}
                      </div>
                      <p className="font-semibold text-zinc-900 truncate mt-0.5">{a.title}</p>
                      {due && (
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${isUrgent ? "text-rose-500" : "text-zinc-400"}`}>
                          <Clock className="size-3" />
                          {isUrgent ? "Prazo hoje" : `Até ${due.toLocaleDateString("pt-BR")}`}
                        </p>
                      )}
                      {a.submission?.status === "IN_PROGRESS" && (
                        <p className="text-xs text-zinc-400 mt-0.5">Rascunho salvo</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge sub={a.submission} />
                      <ChevronRight className="size-4 text-zinc-400 group-hover:text-violet-500 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
