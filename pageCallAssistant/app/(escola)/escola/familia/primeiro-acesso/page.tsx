"use client";
/**
 * Primeiro acesso do responsável, pelo QR da ficha de acesso que a escola entrega.
 * 1. Código (já vem preenchido pelo QR) -> mostra o aluno com nome parcial: "É o seu filho?"
 * 2. Data de nascimento do filho + dados do responsável -> cria o acesso.
 * Não existe busca por nome: o código já diz qual é o aluno.
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HeartHandshake, School, ChevronLeft } from "lucide-react";

const RELATIONS = [
  { value: "MAE", label: "Mãe" }, { value: "PAI", label: "Pai" }, { value: "AVO_AVO", label: "Avó / Avô" },
  { value: "TIO_TIA", label: "Tio / Tia" }, { value: "TUTOR_LEGAL", label: "Tutor(a) legal" }, { value: "OUTRO", label: "Outro responsável" },
];
const inputCls = "w-full bg-white text-[#1F1A2E] rounded-2xl px-4 py-3.5 border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none text-[15px]";
const label = "text-[#1F1A2E] text-sm font-semibold block mb-1";

type Aluno = { aluno: string; turma: string | null; escola: string | null; temDataNascimento: boolean };

function PrimeiroAcesso() {
  const sp = useSearchParams();
  const [etapa, setEtapa] = useState<"codigo" | "confirmar" | "dados">("codigo");
  const [codigo, setCodigo] = useState("");
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [f, setF] = useState({ birthDate: "", guardianName: "", guardianPhone: "", guardianEmail: "", senha: "", relation: "MAE" });
  const [aceitaWhatsapp, setAceitaWhatsapp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jaTemConta, setJaTemConta] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function conferir(c: string) {
    setLoading(true); setError("");
    const r = await fetch("/api/escola/familia/codigo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo: c }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setLoading(false);
    if (!r?.ok) { setError(d.error ?? "Não achamos esse código."); setEtapa("codigo"); return; }
    setAluno(d); setEtapa("confirmar");
  }

  useEffect(() => {
    const c = (sp.get("codigo") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c) { setCodigo(c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c); conferir(c); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(""); setJaTemConta(false);
    if (!f.guardianEmail && !f.guardianPhone) { setError("Informe o WhatsApp ou o e-mail: é com ele que você entra depois."); setLoading(false); return; }
    try {
      const r = await fetch("/api/escola/familia/ativar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyCode: codigo, birthDate: f.birthDate, guardianName: f.guardianName, guardianEmail: f.guardianEmail || undefined, guardianPhone: f.guardianPhone || undefined, senha: f.senha, relation: f.relation, termsVersion: "v1.0", aceitaWhatsapp: !!f.guardianPhone && aceitaWhatsapp }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Não foi possível criar o acesso."); setJaTemConta(!!data.jaTemConta); setLoading(false); return; }
      window.location.href = "/escola/familia";
    } catch { setError("Erro de conexão. Tente novamente."); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#F6F4FE] flex flex-col items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[44vh] rounded-b-[40px] bg-gradient-to-br from-[#5B21B6] via-[#6D28D9] to-[#8B5CF6]" aria-hidden="true" />
      <div className="relative w-full max-w-sm bg-white rounded-[28px] p-6 shadow-[0_12px_40px_rgba(91,33,182,0.18)]">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><HeartHandshake size={28} className="text-[#6D28D9]" /></div>
          <h1 className="text-[#1F1A2E] text-2xl font-bold">Área da Família</h1>
          <p className="text-[#5B5470] text-sm mt-1">Acompanhe o reforço escolar do seu filho</p>
        </div>

        {etapa === "codigo" && (
          <form onSubmit={(e) => { e.preventDefault(); conferir(codigo); }} className="space-y-4">
            <div>
              <label className={label}>Código da ficha de acesso</label>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} required placeholder="ABCD-2345" autoCapitalize="characters"
                className={`${inputCls} font-mono tracking-widest uppercase text-center text-lg`} />
              <p className="text-[#5B5470] text-xs mt-1">Está na ficha que a escola entregou. Se você leu o QR, ele já vem preenchido.</p>
            </div>
            {error && <p className="text-[#B91C1C] text-sm text-center bg-[#FEE2E2] rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading || codigo.trim().length < 6} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-bold rounded-2xl min-h-[52px]">{loading ? "Conferindo..." : "Continuar"}</button>
            <p className="text-center text-[13px] text-[#5B5470]">Já tem acesso? <a href="/escola/familia/entrar" className="text-[#6D28D9] font-semibold">Entrar</a></p>
          </form>
        )}

        {etapa === "confirmar" && aluno && (
          <div className="space-y-4">
            <p className="text-[15px] font-bold text-[#1F1A2E] text-center">Este é o seu filho?</p>
            <div className="rounded-2xl bg-[#F6F4FE] p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#FBBF24] text-white flex items-center justify-center text-lg font-extrabold shrink-0">{aluno.aluno.charAt(0)}</div>
              <div className="min-w-0">
                <p className="text-[18px] font-extrabold text-[#1F1A2E] tracking-wide">{aluno.aluno}</p>
                <p className="text-[13px] text-[#5B5470] flex items-center gap-1"><School className="size-3.5 shrink-0" />{[aluno.turma, aluno.escola].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            <p className="text-[12px] text-[#5B5470] text-center">Por segurança, mostramos só as iniciais. No próximo passo você confirma com a data de nascimento.</p>
            {!aluno.temDataNascimento && <p className="text-[13px] text-[#92400E] bg-[#FEF3C7] rounded-xl px-3 py-2">A escola ainda não informou a data de nascimento deste aluno. Fale com a secretaria para liberar o cadastro.</p>}
            <button onClick={() => { setError(""); setEtapa("dados"); }} disabled={!aluno.temDataNascimento} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-bold rounded-2xl min-h-[52px]">Sim, é o meu filho</button>
            <button onClick={() => { setAluno(null); setCodigo(""); setEtapa("codigo"); setError("Confira o código na ficha. Se a ficha não for do seu filho, peça a certa à escola."); }}
              className="w-full border border-[#DDD6EE] text-[#5B5470] font-semibold rounded-2xl min-h-[48px]">Não é o meu filho</button>
          </div>
        )}

        {etapa === "dados" && aluno && (
          <form onSubmit={criar} className="space-y-4">
            <button type="button" onClick={() => setEtapa("confirmar")} className="inline-flex items-center gap-1 text-[#6D28D9] text-sm font-semibold min-h-[36px]"><ChevronLeft className="size-4" />{aluno.aluno}</button>
            <div><label className={label}>Data de nascimento do seu filho</label><input value={f.birthDate} onChange={set("birthDate")} required type="date" className={inputCls} /><p className="text-[#5B5470] text-xs mt-1">Confirma que você é responsável por este aluno.</p></div>
            <div><label className={label}>Seu nome completo</label><input value={f.guardianName} onChange={set("guardianName")} required placeholder="Nome do responsável" className={inputCls} /></div>
            <div><label className={label}>Você é</label><select value={f.relation} onChange={set("relation")} className={inputCls}>{RELATIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
            <div><label className={label}>Seu WhatsApp</label><input value={f.guardianPhone} onChange={set("guardianPhone")} type="tel" inputMode="tel" placeholder="(71) 98765-4321" className={inputCls} /></div>
            <div><label className={label}>Seu e-mail <span className="font-normal text-[#8B84A0]">(se tiver)</span></label><input value={f.guardianEmail} onChange={set("guardianEmail")} type="email" placeholder="voce@email.com" className={inputCls} /></div>
            <label className="flex items-start gap-3 rounded-2xl bg-[#F6F4FE] p-3 cursor-pointer">
              <input type="checkbox" checked={aceitaWhatsapp} onChange={(e) => setAceitaWhatsapp(e.target.checked)} className="mt-0.5 size-5 accent-[#6D28D9] shrink-0" />
              <span className="text-[13px] text-[#1F1A2E] leading-snug">Quero receber avisos do reforço do meu filho pelo WhatsApp e pelo e-mail: quando ficar sem estudar, quando precisar de ajuda e quando tiver uma conquista.</span>
            </label>
            <div><label className={label}>Crie uma senha</label><input value={f.senha} onChange={set("senha")} required type="password" minLength={6} placeholder="Mínimo 6 caracteres" className={inputCls} /><p className="text-[#5B5470] text-xs mt-1">Nas próximas vezes, entre com o WhatsApp ou o e-mail e esta senha.</p></div>
            {error && (
              <div className="text-[#B91C1C] text-sm text-center bg-[#FEE2E2] rounded-xl px-3 py-2">
                {error}
                {jaTemConta && <a href="/escola/familia/entrar" className="block mt-1 font-bold underline">Entrar com a minha senha</a>}
              </div>
            )}
            <p className="text-[#5B5470] text-xs text-center">Ao continuar, você concorda com os <a href="/escola/privacidade" className="underline" target="_blank">termos de privacidade</a>.</p>
            <button type="submit" disabled={loading} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-bold rounded-2xl min-h-[52px]">{loading ? "Criando..." : "Criar meu acesso"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function FamiliaPrimeiroAcesso() {
  return <Suspense fallback={<div className="min-h-screen bg-[#F6F4FE]" />}><PrimeiroAcesso /></Suspense>;
}
