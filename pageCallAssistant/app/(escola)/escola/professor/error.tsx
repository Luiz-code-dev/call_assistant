"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function EscolaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[escola/error]", error); }, [error]);
  return (
    <div style={{ background: "#F8F7FC", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: "#fff", border: "1px solid #E9E5F5", borderRadius: 16, padding: 40, maxWidth: 480, width: "100%", textAlign: "center" }}>
        <h1 style={{ color: "#1F1A2E", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Nao foi possivel abrir esta tela.</h1>
        <p style={{ color: "#5B5470", fontSize: 14, marginBottom: 24 }}>Tente novamente. Se o problema persistir, fale com o suporte.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={reset} style={{ background: "#6D28D9", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Tentar de novo</button>
          <Link href="/escola/professor" style={{ background: "#EDE9FE", color: "#6D28D9", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>Voltar ao inicio</Link>
        </div>
        {error.digest && <p style={{ color: "#5B5470", fontSize: 11, marginTop: 20 }}>Codigo: {error.digest}</p>}
      </div>
    </div>
  );
}
