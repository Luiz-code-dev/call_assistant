"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { HeartHandshake, CheckCircle2 } from "lucide-react";

const inputCls = "w-full bg-white text-[#1F1A2E] rounded-xl px-4 py-3 border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none text-sm";

interface Info { guardianName: string | null; hasPassword: boolean; filhos: string[]; accepted: boolean }

export default function ConviteFamiliaPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [alterar, setAlterar] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");

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
    setError("");
    const precisaSenha = info ? !info.hasPassword : true;
    const vaiDefinir = precisaSenha || alterar;
    if (vaiDefinir) {
      if (senha.length < 6) { setError("A senha precisa ter pelo menos 6 caracteres."); return; }
      if (senha !== confirma) { setError("As senhas não são iguais."); return; }
    }
    setSaving(true);
    const r = await fetch(`/api/escola/familia/convite/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termsVersion: "v1.0", ...(vaiDefinir ? { senha } : {}) }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error ?? "Não foi possível aceitar o convite."); setSaving(false); return; }
    window.location.href = "/escola/familia";
  }

  const precisaSenha = info ? !info.hasPassword : false;
  const mostrarCampos = precisaSenha || alterar;

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3">
          <HeartHandshake size={28} className="text-[#6D28D9]" />
        </div>
        <h1 className="text-[#1F1A2E] text-2xl font-bold mb-1">Área da família</h1>

        {loading ? (
          <p className="text-[#5B5470] text-sm mt-4">Carregando…</p>
        ) : error && !info ? (
          <p className="text-[#B91C1C] text-sm mt-4">{error}</p>
        ) : info ? (
          <div className="mt-4 text-left">
            <p className="text-[#5B5470] text-sm mb-4 text-center">
              {info.guardianName ? <><b className="text-[#1F1A2E]">{info.guardianName}</b>, você </> : "Você "}
              foi cadastrado(a) como responsável{info.filhos.length ? <> de <b className="text-[#1F1A2E]">{info.filhos.join(", ")}</b></> : ""}.
            </p>
            <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5 space-y-2 mb-5">
              {info.filhos.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-[14px] text-[#1F1A2E]"><CheckCircle2 size={16} className="text-[#166534]" /> {f}</div>
              ))}
              {info.filhos.length === 0 && <p className="text-[#5B5470] text-sm">Nenhum aluno vinculado a este convite.</p>}
            </div>

            {precisaSenha ? (
              <p className="text-[#1F1A2E] text-sm font-medium mb-2">Crie uma senha para acessar nas próximas vezes:</p>
            ) : (
              <label className="flex items-center gap-2 text-[14px] text-[#5B5470] mb-2 cursor-pointer">
                <input type="checkbox" checked={alterar} onChange={(e) => setAlterar(e.target.checked)} className="w-4 h-4 accent-[#6D28D9]" />
                Você já tem senha nesta conta. Quero alterar a senha.
              </label>
            )}

            {mostrarCampos && (
              <div className="space-y-3 mb-4">
                <input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" placeholder="Nova senha (mín. 6)" className={inputCls} />
                <input value={confirma} onChange={(e) => setConfirma(e.target.value)} type="password" placeholder="Confirmar senha" className={inputCls} />
              </div>
            )}

            {error && <p className="text-[#B91C1C] text-sm mb-3">{error}</p>}
            <p className="text-[#5B5470] text-xs mb-4">
              Ao continuar, você concorda com os{" "}
              <a href="/escola/privacidade" className="underline" target="_blank">termos de privacidade</a>.
            </p>
            <button onClick={aceitar} disabled={saving} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 min-h-[48px] transition-colors">
              {saving ? "Entrando…" : precisaSenha ? "Criar senha e acessar" : "Acessar e acompanhar"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
