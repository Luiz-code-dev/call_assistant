"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "staff" | "aluno";

export default function EscolaEntrarPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [staffForm, setStaffForm] = useState({ email: "", password: "", networkId: "" });
  const [alunoForm, setAlunoForm] = useState({ accessCode: "", enrollmentCode: "", pin: "" });

  async function handleStaffLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/escola/auth/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao entrar");
      router.push("/escola/painel");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleAlunoLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/escola/auth/aluno/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alunoForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao entrar");
      router.push("/escola/aluno/painel");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">SpeakFlow Escolas</h1>
          <p className="text-muted-foreground mt-1">Área educacional</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b border-border">
            {(["staff", "aluno"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "staff" ? "Equipe Escolar" : "Aluno"}
              </button>
            ))}
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {tab === "staff" ? (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    ID da Rede
                  </label>
                  <input
                    type="text"
                    required
                    value={staffForm.networkId}
                    onChange={(e) => setStaffForm({ ...staffForm, networkId: e.target.value })}
                    placeholder="ex: cljx8k2p30000abc123"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
                  <input
                    type="password"
                    required
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAlunoLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Código da Turma
                  </label>
                  <input
                    type="text"
                    required
                    value={alunoForm.accessCode}
                    onChange={(e) => setAlunoForm({ ...alunoForm, accessCode: e.target.value })}
                    placeholder="ex: SF2027-6A"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Matrícula
                  </label>
                  <input
                    type="text"
                    required
                    value={alunoForm.enrollmentCode}
                    onChange={(e) => setAlunoForm({ ...alunoForm, enrollmentCode: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    PIN (6 dígitos)
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    pattern="\d{6}"
                    inputMode="numeric"
                    value={alunoForm.pin}
                    onChange={(e) => setAlunoForm({ ...alunoForm, pin: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {loading ? "Entrando..." : "Entrar como Aluno"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
