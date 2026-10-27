"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { HeartHandshake, CheckCircle2 } from "lucide-react";

export default function ConviteFamiliaPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<{ guardianName: string | null; filhos: string[]; accepted: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/escola/familia/convite/${token}`);
      if (!r.ok) { setError("Convite inválido ou expirado."); return; }
      setInfo(await r.json());
    } catch { setError("Erro de conexão."); } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function aceitar() {
    setSaving(true); setError("");
    const r = await fetch(`/api/escola/familia/convite/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ termsVersion: "v1.0" }),
    });
    if (!r.ok) { setError("Não foi possível aceitar o convite."); setSaving(false); return; }
    window.location.href = "/escola/familia";
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3">
          <HeartHandshake size={28} className="text-[#6D28D9]" />
        </div>
        <h1 className="text-[#1F1A2E] text-2xl font-bold mb-1">Portal da Família</h1>

        {loading ? (
          <p className="text-[#5B5470] text-sm mt-4">Carregando…</p>
        ) : error ? (
          <p className="text-[#B91C1C] text-sm mt-4">{error}</p>
        ) : info ? (
          <div className="mt-4">
            <p className="text-[#5B5470] text-sm mb-4">
              {info.guardianName ? <><b className="text-[#1F1A2E]">{info.guardianName}</b>, você </> : "Você "}
              foi cadastrado(a) como responsável{info.filhos.length ? <> de <b className="text-[#1F1A2E]">{info.filhos.join(", ")}</b></> : ""}.
            </p>
            <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5 text-left space-y-2 mb-5">
              {info.filhos.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-[14px] text-[#1F1A2E]"><CheckCircle2 size={16} className="text-[#166534]" /> {f}</div>
              ))}
              {info.filhos.length === 0 && <p className="text-[#5B5470] text-sm">Nenhum aluno vinculado a este convite.</p>}
            </div>
            <p className="text-[#5B5470] text-xs mb-4">
              Ao continuar, você concorda com os{" "}
              <a href="/privacidade" className="underline" target="_blank">termos de privacidade</a>.
            </p>
            <button onClick={aceitar} disabled={saving} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 min-h-[48px] transition-colors">
              {saving ? "Entrando…" : "Acessar e acompanhar"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
