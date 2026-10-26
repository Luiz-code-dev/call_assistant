import { redirect } from "next/navigation";
import { isNotasEnabled } from "@/lib/escola/feature-flag";

export default function NotasPage() {
  if (!isNotasEnabled()) redirect("/escola/painel");
  // TODO: restore full grade UI here when FEATURE_ESCOLAS_NOTAS=true
  return null;
}

/*
"use client";

import { useEffect, useState } from "react";

interface Assessment {
  id: string;
  title: string;
  type: string;
  maxScore: number;
  weight: number;
  status: string;
  appliedAt: string | null;
}

interface GradeEntry {
  id: string;
  studentId: string;
  value: number | null;
  absent: boolean;
  version: number;
  enteredAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  EXAM: "Prova",
  ASSIGNMENT: "Trabalho",
  PROJECT: "Projeto",
  AI_ACTIVITY: "Atividade IA",
  RECOVERY: "Recuperação",
  OTHER: "Outro",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  OPEN: "bg-blue-500/20 text-blue-400",
  GRADING: "bg-yellow-500/20 text-yellow-400",
  PUBLISHED: "bg-green-500/20 text-green-400",
};

export default function NotasPage() {
  const [assessmentId, setAssessmentId] = useState("");
  const [entries, setEntries] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");

  async function fetchEntries() {
    if (!assessmentId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/escola/grades?assessmentId=${assessmentId}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro");
      setEntries(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishMsg("");
    try {
      const res = await fetch("/api/escola/grades/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");
      setPublishMsg("Notas publicadas com sucesso.");
    } catch (e: unknown) {
      setPublishMsg(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-4">
        <a href="/escola/painel" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
          ← Painel
        </a>
        <h1 className="text-xl font-bold text-foreground">Notas</h1>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="ID da Avaliação"
            value={assessmentId}
            onChange={(e) => setAssessmentId(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={fetchEntries}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {loading ? "Carregando..." : "Buscar"}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || !assessmentId}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {publishing ? "Publicando..." : "Publicar"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {publishMsg && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-400">
            {publishMsg}
          </div>
        )}

        {entries.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card border-b border-border">
                <tr>
                  {["Aluno", "Nota", "Ausente", "Versão", "Lançado em"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-card/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.studentId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-foreground">{e.value ?? "—"}</td>
                    <td className="px-4 py-3">{e.absent ? "Sim" : "Não"}</td>
                    <td className="px-4 py-3 text-muted-foreground">v{e.version}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(e.enteredAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && entries.length === 0 && assessmentId && (
          <p className="text-center text-muted-foreground py-8">Nenhuma nota lançada para esta avaliação.</p>
        )}
      </div>
    </main>
  );
}
*/
