"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

const SUBJECT_BADGES = [
  { label: "Língua Portuguesa", color: "#BE185D", bg: "#FCE7F3" },
  { label: "Matemática",        color: "#1D4ED8", bg: "#DBEAFE" },
  { label: "Ciências",          color: "#0F766E", bg: "#CCFBF1" },
];

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  height: 48,
  border: "1.5px solid #DDD6EE",
  borderRadius: 10,
  padding: "0 14px",
  fontSize: 16,
  color: "#1F1A2E",
  background: "#FFFFFF",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

function EscolaEntrarInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const aviso = sp.get("expirou") ? "Sua sessão expirou. Entre de novo." : sp.get("saiu") ? "Você saiu." : "";

  async function handleStaffLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/escola/auth/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao entrar");
      window.location.href = data.redirect ?? "/escola/escolher-perfil";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8F7FC", display: "flex" }}>
      {/* Left panel */}
      <div
        style={{
          width: "45%",
          background: "#EDE9FE",
          padding: "48px 44px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
        className="esc-left-panel"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "#6D28D9", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MessageSquare size={18} color="#FFFFFF" strokeWidth={2} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 19, color: "#1F1A2E", letterSpacing: "-0.3px" }}>
            SpeakFlow <span style={{ color: "#6D28D9" }}>Escolas</span>
          </span>
        </div>

        <div>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "#3B0764", lineHeight: 1.2, marginBottom: 16, marginTop: 0 }}>
            Cada aluno com retorno imediato. Cada nota com garantia.
          </h1>
          <p style={{ fontSize: 15, color: "#5B5470", marginBottom: 28, marginTop: 0, lineHeight: 1.6 }}>
            Aprendizagem com inteligência artificial para toda a rede municipal, em qualquer componente curricular.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {SUBJECT_BADGES.map((b) => (
              <span
                key={b.label}
                style={{ background: b.bg, color: b.color, fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 99 }}
              >
                {b.label}
              </span>
            ))}
            <span style={{ fontSize: 13, color: "#6D28D9", fontWeight: 600 }}>
              + todos os componentes da BNCC
            </span>
          </div>
        </div>

        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 0, marginBottom: 0 }}>
          Um produto SpeakFlow · desenvolvido pela Codevelop Solutions
        </p>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", minWidth: 0 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Tabs */}
          <div style={{ display: "flex", background: "#F3F0FF", borderRadius: 10, padding: 4, marginBottom: 32 }}>
            <button
              style={{
                flex: 1, padding: "9px 0", borderRadius: 8, border: "none",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                background: "#FFFFFF", color: "#1F1A2E",
                boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
                fontFamily: "inherit",
              }}
              aria-current="page"
            >
              Equipe escolar
            </button>
            <button
              onClick={() => router.push("/escola/aluno/entrar")}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 8, border: "none",
                fontWeight: 600, fontSize: 14, cursor: "pointer",
                background: "transparent", color: "#5B5470",
                fontFamily: "inherit",
              }}
            >
              Sou aluno
            </button>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1F1A2E", marginBottom: 4, marginTop: 0 }}>Entrar</h2>
          <p style={{ fontSize: 14, color: "#5B5470", marginBottom: 24, marginTop: 0 }}>
            Use o e-mail cadastrado pela Secretaria de Educação.
          </p>

          {aviso && (
            <div style={{ background: "#EDE9FE", border: "1px solid #DDD6EE", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#4C1D95", textAlign: "center" }}>
              {aviso}
            </div>
          )}

          {error && (
            <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#B91C1C" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleStaffLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="esc-email" style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1F1A2E", marginBottom: 6 }}>
                E-mail
              </label>
              <input
                id="esc-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@educacao.municipio.ba.gov.br"
                style={INPUT_STYLE}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label htmlFor="esc-password" style={{ fontSize: 14, fontWeight: 600, color: "#1F1A2E" }}>
                  Senha
                </label>
                <Link
                  href="/escola/entrar/esqueci-senha"
                  style={{ fontSize: 13, color: "#6D28D9", fontWeight: 500, textDecoration: "none" }}
                >
                  Esqueci minha senha
                </Link>
              </div>
              <input
                id="esc-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={INPUT_STYLE}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 48,
                background: loading ? "#A78BFA" : "#6D28D9",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 8,
                fontFamily: "inherit",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div style={{ marginTop: 20, background: "#FFFFFF", border: "1px solid #E9E5F5", borderRadius: 10, padding: "14px 16px", fontSize: 14, color: "#5B5470", lineHeight: 1.6 }}>
            <strong style={{ color: "#1F1A2E" }}>Primeiro acesso?</strong> Abra o convite que chegou no seu e-mail e crie sua senha. Não recebeu? Fale com a Secretaria.
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .esc-left-panel {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function EscolaEntrarPage() {
  return (
    <Suspense fallback={null}>
      <EscolaEntrarInner />
    </Suspense>
  );
}
