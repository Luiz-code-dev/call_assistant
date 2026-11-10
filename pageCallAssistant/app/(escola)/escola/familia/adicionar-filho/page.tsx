"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import FamilyShell from "@/components/escola/familia/FamilyShell";

const RELATIONS = [
  { v: "MAE", l: "Mãe" }, { v: "PAI", l: "Pai" }, { v: "AVO_AVO", l: "Avó/Avô" },
  { v: "TIO_TIA", l: "Tio/Tia" }, { v: "TUTOR_LEGAL", l: "Tutor(a) legal" }, { v: "OUTRO", l: "Outro" },
];
const input = "w-full bg-white text-[#1F1A2E] rounded-xl px-4 h-12 border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] outline-none text-[15px]";

export default function AdicionarFilho() {
  const router = useRouter();
  const [familyCode, setFamilyCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [relation, setRelation] = useState("MAE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const r = await fetch("/api/escola/familia/adicionar-filho", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyCode, birthDate, relation }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Não foi possível adicionar."); setLoading(false); return; }
      router.push(`/escola/familia/${d.studentId}`);
    } catch { setError("Erro de conexão."); setLoading(false); }
  }

  return (
    <FamilyShell voltar={{ href: "/escola/familia", texto: "Painel" }} titulo="Adicionar outro filho">
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
        <p className="text-[#5B5470] text-sm mb-5">Use o código da ficha de acesso do aluno e a data de nascimento dele.</p>
        <form onSubmit={enviar} className="space-y-4">
          <div><label className="text-[14px] font-medium text-[#1F1A2E] block mb-1">Código de família</label><input className={`${input} font-mono tracking-widest uppercase`} value={familyCode} onChange={(e) => setFamilyCode(e.target.value)} required placeholder="Da ficha de acesso" /></div>
          <div><label className="text-[14px] font-medium text-[#1F1A2E] block mb-1">Data de nascimento do aluno</label><input className={input} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required /></div>
          <div><label className="text-[14px] font-medium text-[#1F1A2E] block mb-1">Parentesco</label><select className={input} value={relation} onChange={(e) => setRelation(e.target.value)}>{RELATIONS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
          {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-bold rounded-2xl py-3.5 min-h-[52px]">{loading ? "Adicionando…" : "Adicionar filho"}</button>
        </form>
        </div>
      </div>
    </FamilyShell>
  );
}
