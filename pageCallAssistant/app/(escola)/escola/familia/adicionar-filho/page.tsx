"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, QrCode } from "lucide-react";
import FamilyShell from "@/components/escola/familia/FamilyShell";
import LeitorQR, { codigoDoQR, mascaraCodigo } from "@/components/escola/LeitorQR";
import { mascaraData, dataIso } from "@/lib/escola/data-br";

const RELATIONS = [
  { v: "MAE", l: "Mãe" }, { v: "PAI", l: "Pai" }, { v: "AVO_AVO", l: "Avó / Avô" },
  { v: "TIO_TIA", l: "Tio / Tia" }, { v: "TUTOR_LEGAL", l: "Tutor(a) legal" }, { v: "OUTRO", l: "Outro responsável" },
];
// Altura e largura fixas: a data e a lista nativas do iPhone e do Android saíam da tela
const input = "block w-full min-w-0 max-w-full h-[52px] box-border appearance-none bg-white text-[#1F1A2E] rounded-2xl px-4 border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none text-[16px] leading-normal";
const label = "text-[14px] font-semibold text-[#1F1A2E] block mb-1";

export default function AdicionarFilho() {
  const router = useRouter();
  const [familyCode, setFamilyCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [relation, setRelation] = useState("MAE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lerQR, setLerQR] = useState(false);
  const codigoLimpo = familyCode.replace(/[^A-Z0-9]/g, "");

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (codigoLimpo.length !== 8) { setError("O código da ficha tem 8 letras e números, como ABCD-2345."); return; }
    const nascimento = dataIso(birthDate);
    if (!nascimento) { setError("Confira a data de nascimento, no formato dia/mês/ano."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/escola/familia/adicionar-filho", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyCode: codigoLimpo, birthDate: nascimento, relation }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Não foi possível adicionar."); setLoading(false); return; }
      router.push(`/escola/familia/${d.studentId}`);
    } catch { setError("Erro de conexão. Confira a internet e tente de novo."); setLoading(false); }
  }

  if (lerQR) {
    return (
      <LeitorQR titulo="Ler a ficha" dica="Aponte a câmera para o QR da ficha de acesso do seu filho" textoDigitar="Digitar o código"
        onCancelar={() => setLerQR(false)} onDigitar={() => setLerQR(false)}
        onLido={(texto) => {
          setLerQR(false);
          if (/\/escola\/aluno\//i.test(texto)) { setError("Esse QR é do cartão do aluno. Use o QR da ficha da família."); return; }
          const c = codigoDoQR(texto);
          if (c.length !== 8) { setError("Esse QR não é de uma ficha de acesso. Use o QR da ficha que a escola entregou."); return; }
          setError(""); setFamilyCode(mascaraCodigo(c));
        }} />
    );
  }

  return (
    <FamilyShell voltar={{ href: "/escola/familia", texto: "Painel" }} titulo="Adicionar outro filho" subtitulo="Use a ficha de acesso que a escola entregou.">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
          <form onSubmit={enviar} className="space-y-4">
            <button type="button" onClick={() => { setError(""); setLerQR(true); }}
              className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold rounded-2xl min-h-[52px] flex items-center justify-center gap-2"><QrCode className="size-5" />Ler o QR da ficha</button>
            <div className="flex items-center gap-3 text-[12px] text-[#8B84A0]"><span className="h-px flex-1 bg-[#E9E5F5]" />ou digite<span className="h-px flex-1 bg-[#E9E5F5]" /></div>
            <div>
              <label className={label}>Código da ficha</label>
              <input className={`${input} font-mono tracking-widest uppercase text-center text-lg`} value={familyCode}
                onChange={(e) => setFamilyCode(mascaraCodigo(e.target.value))} required placeholder="ABCD-2345"
                autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={9} />
              {codigoLimpo.length > 0 && codigoLimpo.length < 8 && <p className="text-[#5B5470] text-xs mt-1">Faltam {8 - codigoLimpo.length} {8 - codigoLimpo.length === 1 ? "caractere" : "caracteres"}.</p>}
            </div>
            <div>
              <label className={label}>Data de nascimento do seu filho</label>
              <input className={input} type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" maxLength={10}
                value={birthDate} onChange={(e) => setBirthDate(mascaraData(e.target.value))} required />
              <p className="text-[#5B5470] text-xs mt-1">Confirma que você é responsável por este aluno.</p>
            </div>
            <div>
              <label className={label}>Você é</label>
              <div className="relative">
                <select className={`${input} pr-11`} value={relation} onChange={(e) => setRelation(e.target.value)}>{RELATIONS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 size-5 text-[#6D28D9]" />
              </div>
            </div>
            {error && <p className="text-[#B91C1C] text-sm text-center bg-[#FEE2E2] rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full border-[1.5px] border-[#6D28D9] text-[#6D28D9] hover:bg-[#F6F4FE] disabled:opacity-50 font-bold rounded-2xl min-h-[52px]">{loading ? "Adicionando..." : "Adicionar filho"}</button>
          </form>
        </div>
      </div>
    </FamilyShell>
  );
}
