"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const RELATIONS = [
  { value: "MAE", label: "Mãe" },
  { value: "PAI", label: "Pai" },
  { value: "AVO_AVO", label: "Avó / Avô" },
  { value: "TIO_TIA", label: "Tio / Tia" },
  { value: "TUTOR_LEGAL", label: "Tutor(a) legal" },
  { value: "OUTRO", label: "Outro responsável" },
];

export default function FamiliaEntrarPage() {
  const router = useRouter();
  const [networkId, setNetworkId] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [guardianName, setGuardianName] = useState("");
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
          networkId,
          studentEnrollmentCode: enrollmentCode,
          familyCode,
          guardianName,
          guardianEmail: guardianEmail || undefined,
          relation,
          termsVersion: "v1.0",
          consentIp: undefined,
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
          <div className="text-4xl mb-2">👨‍👩‍👧</div>
          <h1 className="text-[#1F1A2E] text-2xl font-bold">Portal da Família</h1>
          <p className="text-[#5B5470] text-sm mt-1">Acompanhe a evolução do seu filho</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[#3F3A4F] text-sm block mb-1">ID da rede escolar</label>
            <input
              value={networkId}
              onChange={e => setNetworkId(e.target.value)}
              required
              placeholder="Fornecido pela escola"
              className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-xl px-4 py-3 border border-[#DDD6EE] focus:border-purple-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-[#3F3A4F] text-sm block mb-1">Matrícula do aluno</label>
            <input
              value={enrollmentCode}
              onChange={e => setEnrollmentCode(e.target.value)}
              required
              placeholder="Ex: 2025001"
              className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-xl px-4 py-3 border border-[#DDD6EE] focus:border-purple-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-[#3F3A4F] text-sm block mb-1">Código familiar</label>
            <input
              value={familyCode}
              onChange={e => setFamilyCode(e.target.value)}
              required
              placeholder="Recebido pela escola"
              className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-xl px-4 py-3 border border-[#DDD6EE] focus:border-purple-500 outline-none text-sm font-mono tracking-wider"
            />
          </div>

          <div>
            <label className="text-[#3F3A4F] text-sm block mb-1">Seu nome completo</label>
            <input
              value={guardianName}
              onChange={e => setGuardianName(e.target.value)}
              required
              placeholder="Nome do responsável"
              className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-xl px-4 py-3 border border-[#DDD6EE] focus:border-purple-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-[#3F3A4F] text-sm block mb-1">Grau de parentesco</label>
            <select
              value={relation}
              onChange={e => setRelation(e.target.value)}
              className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-xl px-4 py-3 border border-[#DDD6EE] focus:border-purple-500 outline-none text-sm"
            >
              {RELATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[#3F3A4F] text-sm block mb-1">E-mail (opcional)</label>
            <input
              value={guardianEmail}
              onChange={e => setGuardianEmail(e.target.value)}
              type="email"
              placeholder="Para receber resumos semanais"
              className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-xl px-4 py-3 border border-[#DDD6EE] focus:border-purple-500 outline-none text-sm"
            />
          </div>

          {error && <p className="text-[#B91C1C] text-sm text-center">{error}</p>}

          <p className="text-[#5B5470] text-xs text-center">
            Ao continuar, você concorda com os{" "}
            <a href="/privacidade" className="underline text-[#5B5470]" target="_blank">termos de privacidade</a>.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 min-h-[48px] transition-colors"
          >
            {loading ? "Entrando..." : "Acessar portal"}
          </button>
        </form>
      </div>
    </div>
  );
}
