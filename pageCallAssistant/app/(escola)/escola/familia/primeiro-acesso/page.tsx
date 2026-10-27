"use client";
import { useState } from "react";
import { HeartHandshake } from "lucide-react";

const RELATIONS = [
  { value: "MAE", label: "Mãe" }, { value: "PAI", label: "Pai" }, { value: "AVO_AVO", label: "Avó / Avô" },
  { value: "TIO_TIA", label: "Tio / Tia" }, { value: "TUTOR_LEGAL", label: "Tutor(a) legal" }, { value: "OUTRO", label: "Outro responsável" },
];
const inputCls = "w-full bg-white text-[#1F1A2E] rounded-xl px-4 py-3 border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none text-sm";

export default function FamiliaPrimeiroAcesso() {
  const [f, setF] = useState({ familyCode: "", birthDate: "", guardianName: "", guardianPhone: "", guardianEmail: "", senha: "", relation: "MAE" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    if (!f.guardianEmail && !f.guardianPhone) { setError("Informe um e-mail ou celular para poder entrar depois."); setLoading(false); return; }
    try {
      const r = await fetch("/api/escola/familia/ativar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyCode: f.familyCode, birthDate: f.birthDate, guardianName: f.guardianName, guardianEmail: f.guardianEmail || undefined, guardianPhone: f.guardianPhone || undefined, senha: f.senha, relation: f.relation, termsVersion: "v1.0" }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Erro ao entrar"); setLoading(false); return; }
      window.location.href = "/escola/familia";
    } catch { setError("Erro de conexão. Tente novamente."); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><HeartHandshake size={28} className="text-[#6D28D9]" /></div>
          <h1 className="text-[#1F1A2E] text-2xl font-bold">Área da Família</h1>
          <p className="text-[#5B5470] text-sm mt-1">Primeiro acesso com o código do cartão</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-[#1F1A2E] text-sm font-medium block mb-1">Código de família</label><input value={f.familyCode} onChange={set("familyCode")} required placeholder="Do cartão do aluno" className={`${inputCls} font-mono tracking-widest uppercase`} /></div>
          <div><label className="text-[#1F1A2E] text-sm font-medium block mb-1">Data de nascimento do aluno</label><input value={f.birthDate} onChange={set("birthDate")} required type="date" className={inputCls} /><p className="text-[#5B5470] text-xs mt-1">As duas informações juntas confirmam que você tem o cartão do seu filho.</p></div>
          <div><label className="text-[#1F1A2E] text-sm font-medium block mb-1">Seu nome completo</label><input value={f.guardianName} onChange={set("guardianName")} required placeholder="Nome do responsável" className={inputCls} /></div>
          <div><label className="text-[#1F1A2E] text-sm font-medium block mb-1">Grau de parentesco</label><select value={f.relation} onChange={set("relation")} className={inputCls}>{RELATIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[#1F1A2E] text-sm font-medium block mb-1">Celular</label><input value={f.guardianPhone} onChange={set("guardianPhone")} placeholder="(e-mail ou celular)" className={inputCls} /></div>
            <div><label className="text-[#1F1A2E] text-sm font-medium block mb-1">E-mail</label><input value={f.guardianEmail} onChange={set("guardianEmail")} type="email" placeholder="(e-mail ou celular)" className={inputCls} /></div>
          </div>
          <div><label className="text-[#1F1A2E] text-sm font-medium block mb-1">Crie uma senha</label><input value={f.senha} onChange={set("senha")} required type="password" minLength={6} placeholder="Mínimo 6 caracteres" className={inputCls} /><p className="text-[#5B5470] text-xs mt-1">Use essa senha com seu e-mail/celular para entrar nas próximas vezes.</p></div>
          {error && <p className="text-[#B91C1C] text-sm text-center">{error}</p>}
          <p className="text-[#5B5470] text-xs text-center">Ao continuar, você concorda com os <a href="/escola/privacidade" className="underline" target="_blank">termos de privacidade</a>.</p>
          <button type="submit" disabled={loading} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 min-h-[48px]">{loading ? "Entrando..." : "Criar acesso e entrar"}</button>
          <p className="text-center text-[13px] text-[#5B5470]">Já tem acesso? <a href="/escola/familia/entrar" className="text-[#6D28D9] font-medium">Entrar com e-mail e senha</a></p>
        </form>
      </div>
    </div>
  );
}
