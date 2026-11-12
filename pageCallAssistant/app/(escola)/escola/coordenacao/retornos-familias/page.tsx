"use client";
/**
 * Retorno das famílias: o que os responsáveis disseram sobre cada professor
 * (elogio, sugestão ou preocupação), com turma, matéria e quem escreveu.
 */
import { useEffect, useState } from "react";
import { MessageSquare, Heart, Lightbulb, AlertTriangle, Check } from "lucide-react";

type Tipo = "ELOGIO" | "SUGESTAO" | "PREOCUPACAO";
interface Retorno {
  id: string; tipo: Tipo; tipoRotulo: string; texto: string; createdAt: string; lido: boolean;
  professorId: string; professor: string; materia: string; turma: string; escola: string;
  responsavel: string; parentesco: string; aluno: string;
}
interface Professor { id: string; nome: string; total: number; elogios: number; sugestoes: number; preocupacoes: number; naoLidos: number }

const ESTILO: Record<Tipo, { Icone: typeof Heart; cor: string; fundo: string }> = {
  ELOGIO: { Icone: Heart, cor: "#BE185D", fundo: "#FCE7F3" },
  SUGESTAO: { Icone: Lightbulb, cor: "#B45309", fundo: "#FEF3C7" },
  PREOCUPACAO: { Icone: AlertTriangle, cor: "#B91C1C", fundo: "#FEE2E2" },
};

function data(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function RetornosFamiliasPage() {
  const [retornos, setRetornos] = useState<Retorno[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [professor, setProfessor] = useState("");
  const [tipo, setTipo] = useState<"" | Tipo>("");

  useEffect(() => {
    fetch("/api/escola/coordenacao/retornos-familias", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { setRetornos(d.retornos ?? []); setProfessores(d.professores ?? []); setCarregando(false); })
      .catch(() => { setErro("Não foi possível carregar os retornos."); setCarregando(false); });
  }, []);

  async function marcarLido(id: string) {
    const r = await fetch("/api/escola/coordenacao/retornos-familias", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    }).catch(() => null);
    if (!r?.ok) return;
    const alvo = retornos.find((x) => x.id === id);
    setRetornos((l) => l.map((x) => (x.id === id ? { ...x, lido: true } : x)));
    if (alvo && !alvo.lido) setProfessores((l) => l.map((p) => (p.id === alvo.professorId ? { ...p, naoLidos: Math.max(0, p.naoLidos - 1) } : p)));
  }

  const visiveis = retornos.filter((r) => (!professor || r.professorId === professor) && (!tipo || r.tipo === tipo));

  return (
    <div className="px-5 sm:px-7 py-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <MessageSquare className="text-[#6D28D9]" size={22} />
        <h1 className="text-[#1F1A2E] font-bold text-2xl">Retorno das famílias</h1>
      </div>
      <p className="text-[#5B5470] text-sm mb-6">O que os responsáveis disseram sobre os professores, pelo painel da família.</p>

      {carregando ? <p className="text-[#5B5470] text-center py-8">Carregando...</p> : erro ? <p className="text-[#B91C1C] text-sm">{erro}</p> : !retornos.length ? (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-10 text-center">
          <MessageSquare className="mx-auto text-[#DDD6EE] mb-3" size={40} />
          <p className="text-[#5B5470]">Nenhum retorno das famílias ainda.</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {professores.map((p) => (
              <button key={p.id} onClick={() => setProfessor((a) => (a === p.id ? "" : p.id))}
                className={`text-left bg-white rounded-2xl p-4 border transition-colors ${professor === p.id ? "border-[#6D28D9] ring-2 ring-[#EDE9FE]" : "border-[#E9E5F5] hover:border-[#C4B5FD]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-[#1F1A2E] truncate">{p.nome}</p>
                  {p.naoLidos > 0 && <span className="text-[11px] font-bold bg-[#6D28D9] text-white rounded-full px-2 py-0.5 shrink-0">{p.naoLidos} novo{p.naoLidos > 1 ? "s" : ""}</span>}
                </div>
                <div className="flex gap-3 mt-2 text-[12px] font-semibold">
                  <span style={{ color: ESTILO.ELOGIO.cor }}>{p.elogios} elogio{p.elogios === 1 ? "" : "s"}</span>
                  <span style={{ color: ESTILO.SUGESTAO.cor }}>{p.sugestoes} sugest{p.sugestoes === 1 ? "ão" : "ões"}</span>
                  <span style={{ color: ESTILO.PREOCUPACAO.cor }}>{p.preocupacoes} preocupaç{p.preocupacoes === 1 ? "ão" : "ões"}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {([["", "Todos"], ["ELOGIO", "Elogios"], ["SUGESTAO", "Sugestões"], ["PREOCUPACAO", "Preocupações"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setTipo(v)} className={`px-4 rounded-xl text-sm font-semibold min-h-[40px] border ${tipo === v ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#5B5470] border-[#DDD6EE]"}`}>{l}</button>
            ))}
          </div>

          <ul className="space-y-3">
            {visiveis.map((r) => {
              const e = ESTILO[r.tipo] ?? ESTILO.SUGESTAO;
              return (
                <li key={r.id} className={`bg-white rounded-2xl p-4 border ${r.lido ? "border-[#E9E5F5]" : "border-[#C4B5FD]"}`}>
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: e.fundo, color: e.cor }}><e.Icone size={18} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#5B5470]">
                        <span className="font-bold" style={{ color: e.cor }}>{r.tipoRotulo}</span> sobre <span className="font-bold text-[#1F1A2E]">{r.professor}</span>
                        {r.materia && <> · {r.materia}</>}{r.turma && <> · {r.turma}</>}
                      </p>
                      <p className="text-[15px] text-[#1F1A2E] mt-1 leading-snug">{r.texto}</p>
                      <p className="text-[12px] text-[#8B84A0] mt-2">
                        {r.responsavel} ({r.parentesco}{r.aluno ? ` de ${r.aluno}` : ""}){r.escola ? ` · ${r.escola}` : ""} · {data(r.createdAt)}
                      </p>
                    </div>
                    {r.lido ? (
                      <span className="text-[12px] font-semibold text-[#166534] inline-flex items-center gap-1 shrink-0"><Check size={14} />Lido</span>
                    ) : (
                      <button onClick={() => marcarLido(r.id)} className="text-[12px] font-bold text-[#6D28D9] min-h-[36px] px-2 shrink-0">Marcar como lido</button>
                    )}
                  </div>
                </li>
              );
            })}
            {!visiveis.length && <li className="text-center text-[#5B5470] text-sm py-6">Nenhum retorno com esse filtro.</li>}
          </ul>
        </>
      )}
    </div>
  );
}
