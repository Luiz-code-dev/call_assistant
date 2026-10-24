"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MessageSquare } from "lucide-react";

interface Membership {
  id: string;
  role: string;
  network: { id: string; name: string };
  school: { id: string; name: string } | null;
}

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: "Administração da plataforma",
  NETWORK_ADMIN: "Gestor da rede",
  COORDINATOR:   "Coordenador(a)",
  SCHOOL_ADMIN:  "Diretor(a)",
  TEACHER:       "Professor(a)",
};

export default function EscolaEscolherPerfilPage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/escola/auth/memberships")
      .then((r) => r.json())
      .then((d) => {
        if (d.memberships) setMemberships(d.memberships);
        else router.push("/escola/entrar");
      })
      .catch(() => router.push("/escola/entrar"))
      .finally(() => setLoading(false));
  }, [router]);

  async function escolher(membershipId: string) {
    setChoosing(membershipId);
    setError("");
    try {
      const res = await fetch("/api/escola/auth/escolher-perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao selecionar perfil");
      router.push(data.redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setChoosing(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8F7FC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
        <div style={{ width: 36, height: 36, background: "#6D28D9", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MessageSquare size={18} color="#FFFFFF" strokeWidth={2} />
        </div>
        <span style={{ fontWeight: 800, fontSize: 19, color: "#1F1A2E" }}>
          SpeakFlow <span style={{ color: "#6D28D9" }}>Escolas</span>
        </span>
      </div>

      <div style={{ width: "100%", maxWidth: 480 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1F1A2E", marginBottom: 6, textAlign: "center" }}>
          Onde você vai trabalhar agora?
        </h1>
        <p style={{ fontSize: 14, color: "#5B5470", textAlign: "center", marginBottom: 32 }}>
          Você tem mais de um vínculo ativo. Escolha um para continuar.
        </p>

        {error && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#B91C1C", textAlign: "center" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ height: 80, background: "#EDE9FE", borderRadius: 16, opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {memberships.map((m) => (
              <button
                key={m.id}
                onClick={() => escolher(m.id)}
                disabled={!!choosing}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  background: "#FFFFFF", border: "1.5px solid #E9E5F5",
                  borderRadius: 16, padding: "18px 20px",
                  cursor: choosing ? "not-allowed" : "pointer",
                  opacity: choosing && choosing !== m.id ? 0.5 : 1,
                  transition: "border-color 0.15s",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <div style={{ width: 44, height: 44, background: "#EDE9FE", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Building2 size={22} color="#6D28D9" strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#1F1A2E", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ROLE_LABEL[m.role] ?? m.role}
                    {m.school ? ` · ${m.school.name}` : ""}
                  </p>
                  <p style={{ fontSize: 13, color: "#5B5470", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.network.name}
                  </p>
                </div>
                {choosing === m.id && (
                  <span style={{ fontSize: 13, color: "#6D28D9", fontWeight: 600, flexShrink: 0 }}>Entrando…</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
