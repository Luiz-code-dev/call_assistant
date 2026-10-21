"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, ChevronRight, Mic, PenLine, HelpCircle } from "lucide-react";

interface Atividade {
  id: string; title: string; type: "WRITTEN" | "SPOKEN" | "QUIZ";
  subject: { name: string; color: string | null } | null;
  dueAt: string | null; isDone: boolean;
  submission: { status: string; aiScore: number | null; teacherScore: number | null; submittedAt: string | null } | null;
}

const TYPE_ICON = { WRITTEN: PenLine, SPOKEN: Mic, QUIZ: HelpCircle };

export default function HistoricoPage() {
  const router = useRouter();
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/escola/aluno/atividades?filter=feito")
      .then((r) => { if (r.status === 401) router.replace("/escola/aluno/entrar"); return r.json(); })
      .then((d) => setAtividades(d.atividades ?? []))
      .finally(() => setLoading(false));
  }, [router]);

  const grouped: Record<string, Atividade[]> = {};
  for (const a of atividades) {
    const key = a.subject?.name ?? "Outros";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--esc-bg,#f8f9fc)" }}>
      <header className="sticky top-0 z-10 border-b" style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
            <ArrowLeft className="size-5 text-zinc-600" />
          </button>
          <h1 className="font-semibold text-zinc-900">Atividades feitas</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--esc-border,#e5e7eb)" }} />)}</div>
        ) : atividades.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="size-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">Nenhuma atividade concluída ainda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([subject, items]) => (
              <section key={subject}>
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">{subject}</h2>
                <div className="space-y-2">
                  {items.map((a) => {
                    const Icon = TYPE_ICON[a.type];
                    const nota = a.submission?.teacherScore ?? a.submission?.aiScore;
                    const isPending = a.submission?.status === "SUBMITTED";
                    return (
                      <Link key={a.id} href={`/escola/aluno/atividades/${a.id}/retorno`}
                        className="flex items-center gap-3 rounded-xl border px-4 py-3 hover:shadow-sm transition-all"
                        style={{ background: "var(--esc-surface,#fff)", borderColor: "var(--esc-border,#e5e7eb)" }}>
                        <Icon className="size-4 text-zinc-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 truncate">{a.title}</p>
                          {a.submission?.submittedAt && (
                            <p className="text-xs text-zinc-400">{new Date(a.submission.submittedAt).toLocaleDateString("pt-BR")}</p>
                          )}
                        </div>
                        {isPending ? (
                          <span className="text-xs text-amber-500 flex items-center gap-1 shrink-0"><Clock className="size-3" />Analisando</span>
                        ) : nota != null ? (
                          <span className={`text-sm font-bold shrink-0 ${Number(nota) >= 7 ? "text-green-600" : Number(nota) >= 5 ? "text-amber-600" : "text-rose-600"}`}>
                            {Number(nota).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400 shrink-0">Aguardando professor</span>
                        )}
                        <ChevronRight className="size-4 text-zinc-300 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
