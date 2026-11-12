"use client";
/**
 * Configuração rápida da implantação: a rede não monta a matriz à mão.
 * 1) Preparar: ano letivo (se faltar), matérias da BNCC que o reforço já usa e as aulas de cada turma.
 * 2) Atribuir: escolhe o professor e ele entra em todas as aulas sem professor da escola dele.
 */
import { useEffect, useState } from "react";
import { Wand2, Check, CalendarDays, BookOpen, Users, UserCheck } from "lucide-react";

interface Professor { id: string; nome: string; email: string; schoolId: string | null; escola: string }
interface Situacao {
  anoLetivo: { year: number; bimestres: number } | null;
  materiasBncc: number; materiasCadastradas: number;
  turmas: number; turmasSemAulas: number; aulas: number; aulasSemProfessor: number;
  professores: Professor[];
}

export default function ConfiguracaoRapida({ aoMudar }: { aoMudar?: () => void }) {
  const [s, setS] = useState<Situacao | null>(null);
  const [prof, setProf] = useState("");
  const [ocupado, setOcupado] = useState<"" | "preparar" | "atribuir">("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  function aplicar(d: Situacao) {
    setS(d);
    setProf((p) => p || d.professores[0]?.id || "");
  }
  useEffect(() => {
    fetch("/api/escola/implantacao/preparar", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d && aplicar(d)).catch(() => {});
  }, []);

  async function enviar(acao: "preparar" | "atribuir") {
    setErro(""); setMsg(""); setOcupado(acao);
    const r = await fetch("/api/escola/implantacao/preparar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(acao === "atribuir" ? { acao, teacherId: prof } : { acao }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setOcupado("");
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível concluir."); return; }
    aplicar(d);
    if (acao === "preparar") {
      const partes = [d.criouAno && "o ano letivo", d.materiasCriadas && `${d.materiasCriadas} matérias`, d.aulasCriadas && `${d.aulasCriadas} aulas nas turmas`].filter(Boolean);
      setMsg(partes.length ? `Pronto: criamos ${partes.join(", ")}.` : "Tudo já estava configurado.");
    } else {
      setMsg(d.atribuidas ? `${d.atribuidas} aulas atribuídas ao professor.` : "Não havia aulas sem professor para ele.");
    }
    aoMudar?.();
  }

  if (!s) return null;
  const preparado = !!s.anoLetivo && s.materiasCadastradas >= s.materiasBncc && s.turmas > 0 && s.turmasSemAulas === 0;
  const item = (ok: boolean, Icone: typeof Check, texto: string) => (
    <li className="flex items-start gap-2.5 text-[14px] leading-snug">
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ok ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]"}`}>
        {ok ? <Check size={15} strokeWidth={3} /> : <Icone size={15} />}
      </span>
      <span className="pt-1 text-[#1F1A2E]">{texto}</span>
    </li>
  );

  return (
    <section id="rapida" className="bg-white border border-[#C4B5FD] rounded-2xl p-5 mb-6 scroll-mt-4">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0"><Wand2 size={20} /></span>
        <div className="min-w-0">
          <h2 className="font-bold text-[#1F1A2E] text-[16px]">Configuração rápida</h2>
          <p className="text-[13px] text-[#5B5470] leading-snug">Não precisa montar a matriz à mão. Usamos as matérias da BNCC que o reforço já usa e criamos as aulas de cada turma.</p>
        </div>
      </div>

      <ul className="space-y-2.5 mb-4">
        {item(!!s.anoLetivo, CalendarDays, s.anoLetivo ? `Ano letivo ${s.anoLetivo.year} com ${s.anoLetivo.bimestres} ${s.anoLetivo.bimestres === 1 ? "período" : "períodos"}` : "Ano letivo: será criado com 4 bimestres")}
        {item(s.materiasCadastradas >= s.materiasBncc, BookOpen, `${s.materiasCadastradas} de ${s.materiasBncc} matérias da BNCC cadastradas`)}
        {item(s.turmas > 0 && s.turmasSemAulas === 0, Users, s.turmas === 0 ? "Nenhuma turma no ano letivo ainda" : s.turmasSemAulas ? `${s.turmasSemAulas} de ${s.turmas} turmas ainda sem matérias` : `${s.turmas} turmas com ${s.aulas} aulas`)}
        {item(s.aulas > 0 && s.aulasSemProfessor === 0, UserCheck, s.aulas === 0 ? "Professores: primeiro crie as aulas" : s.aulasSemProfessor ? `${s.aulasSemProfessor} aulas sem professor` : "Todas as aulas têm professor")}
      </ul>

      {!preparado && (
        <button onClick={() => enviar("preparar")} disabled={!!ocupado}
          className="w-full min-h-[48px] rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-60 mb-3">
          <Wand2 size={17} />{ocupado === "preparar" ? "Preparando..." : "Preparar automaticamente"}
        </button>
      )}

      {s.aulas > 0 && s.aulasSemProfessor > 0 && (
        s.professores.length ? (
          <div className="rounded-xl bg-[#F8F7FC] p-3 space-y-2">
            <label className="block text-[13px] font-bold text-[#5B5470]">Professor
              <select value={prof} onChange={(e) => setProf(e.target.value)}
                className="mt-1 block w-full h-12 rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 text-[15px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none">
                {s.professores.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.escola ? ` · ${p.escola}` : ""}</option>)}
              </select>
            </label>
            <button onClick={() => enviar("atribuir")} disabled={!prof || !!ocupado}
              className="w-full min-h-[48px] rounded-xl bg-white border-[1.5px] border-[#6D28D9] text-[#6D28D9] font-bold text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-60">
              <UserCheck size={17} />{ocupado === "atribuir" ? "Atribuindo..." : "Atribuir às aulas sem professor"}
            </button>
            <p className="text-[12px] text-[#8B84A0]">Ele entra nas turmas da escola dele. Para dividir as matérias entre vários professores, use Atribuições na direção.</p>
          </div>
        ) : (
          <p className="text-[13px] text-[#92400E] bg-[#FEF3C7] rounded-xl px-3 py-2">Nenhum professor cadastrado ainda. Convide os professores em Servidores e convites.</p>
        )
      )}

      {msg && <p className="mt-3 text-[13px] text-[#166534] bg-[#F0FDF4] rounded-xl px-3 py-2">{msg}</p>}
      {erro && <p className="mt-3 text-[13px] text-[#B91C1C]">{erro}</p>}
    </section>
  );
}
