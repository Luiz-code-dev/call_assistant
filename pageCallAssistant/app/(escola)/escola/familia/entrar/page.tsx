"use client";
import { useState } from "react";
import { HeartHandshake } from "lucide-react";

const RELATIONS = [
  { value: "MAE", label: "Mãe" },
  { value: "PAI", label: "Pai" },
  { value: "AVO_AVO", label: "Avó / Avô" },
  { value: "TIO_TIA", label: "Tio / Tia" },
  { value: "TUTOR_LEGAL", label: "Tutor(a) legal" },
  { value: "OUTRO", label: "Outro responsável" },
];

const inputCls = "w-full bg-white text-[#1F1A2E] rounded-xl px-4 py-3 border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none text-sm";

export default function FamiliaEntrarPage() {
  const [familyCode, setFamilyCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [relation, setRelation] = useState("MAE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/escola/familia/ativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCode,
          birthDate,
          guardianName,
          guardianEmail: guardianEmail || undefined,
          guardianPhone: guardianPhone || undefined,
          relation,
          termsVersion: "v1.0",
        }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Erro ao entrar"); setLoading(false); return; }
      window.location.href = "/escola/familia";
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3">
            <HeartHandshake size={28} className="text-[#6D28D9]" />
          </div>
          <h1 className="text-[#1F1A2E] text-2xl font-bold">Portal da Família</h1>
          <p className="text-[#5B5470] text-sm mt-1">Primeiro acesso com o código do cartão</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[#1F1A2E] text-sm font-medium block mb-1">Código de família</label>
            <input
              value={familyCode}
              onChange={e => setFamilyCode(e.target.value)}
              required
              placeholder="Do cartão do aluno"
              className={`${inputCls} font-mono tracking-widest uppercase`}
            />
          </div>

          <div>
            <label className="text-[#1F1A2E] text-sm font-medium block mb-1">Data de nascimento do aluno</label>
            <input
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              required
              type="date"
              className={inputCls}
            />
            <p className="text-[#5B5470] text-xs mt-1">As duas informações juntas confirmam que você tem o cartão do seu filho.</p>
          </div>

          <div>
            <label className="text-[#1F1A2E] text-sm font-medium block mb-1">Seu nome completo</label>
            <input value={guardianName} onChange={e => setGuardianName(e.target.value)} required placeholder="Nome do responsável" className={inputCls} />
          </div>

          <div>
            <label className="text-[#1F1A2E] text-sm font-medium block mb-1">Grau de parentesco</label>
            <select value={relation} onChange={e => setRelation(e.target.value)} className={inputCls}>
              {RELATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#1F1A2E] text-sm font-medium block mb-1">Celular</label>
              <input value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} placeholder="(opcional)" className={inputCls} />
            </div>
            <div>
              <label className="text-[#1F1A2E] text-sm font-medium block mb-1">E-mail</label>
              <input value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} type="email" placeholder="(opcional)" className={inputCls} />
            </div>
          </div>

          {error && <p className="text-[#B91C1C] text-sm text-center">{error}</p>}

          <p className="text-[#5B5470] text-xs text-center">
            Ao continuar, você concorda com os{" "}
            <a href="/privacidade" className="underline text-[#5B5470]" target="_blank">termos de privacidade</a>.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 min-h-[48px] transition-colors"
          >
            {loading ? "Entrando..." : "Acessar portal"}
          </button>
        </form>
      </div>
    </div>
  );
}
