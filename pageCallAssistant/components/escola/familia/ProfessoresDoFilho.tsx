"use client";
/**
 * Painel da família, parte dos professores (pacote de extensão de aula):
 * - reforço indicado pelo professor, com o botão de pôr na agenda do filho;
 * - retorno da família sobre o professor, que vai para a coordenação.
 * Some por inteiro quando a turma não tem professores nem indicações.
 */
import { useEffect, useState } from "react";
import { GraduationCap, CalendarPlus, Check, Heart, Lightbulb, AlertTriangle, Send, MessageSquare } from "lucide-react";
import { materiaDe } from "@/components/escola/reforco-ui";

interface Indicacao { id: string; professor: string; materia: string; subjectCode: string | null; texto: string; createdAt: string; nova: boolean; naAgenda: boolean }
interface Professor { classSubjectId: string; professor: string; materia: string }
interface Retorno { id: string; sobre: string; kind: Tipo; texto: string; createdAt: string; lido: boolean }
type Tipo = "ELOGIO" | "SUGESTAO" | "PREOCUPACAO";

const CARTAO = "bg-white rounded-3xl p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)]";
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HORAS = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, "0"));
const MINUTOS = ["00", "15", "30", "45"];
const TIPOS: Record<Tipo, { label: string; Icone: typeof Heart; cor: string; fundo: string }> = {
  ELOGIO: { label: "Elogio", Icone: Heart, cor: "#BE185D", fundo: "#FCE7F3" },
  SUGESTAO: { label: "Sugestão", Icone: Lightbulb, cor: "#B45309", fundo: "#FEF3C7" },
  PREOCUPACAO: { label: "Preocupação", Icone: AlertTriangle, cor: "#B91C1C", fundo: "#FEE2E2" },
};
const MAX_RETORNO = 600;

function quando(iso: string) {
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return dias <= 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;
}

/** Avisa a agenda da página que entrou horário novo */
export const EVENTO_AGENDA = "escola:agenda-atualizada";

function NaAgenda({ studentId, ind, nome, aoSalvar }: { studentId: string; ind: Indicacao; nome: string; aoSalvar: () => void }) {
  const [dias, setDias] = useState<number[]>([0, 2, 4]);
  const [hora, setHora] = useState("18:00");
  const [minutos, setMinutos] = useState(20);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const campo = "block w-full min-w-0 h-11 appearance-none rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-2 text-[15px] text-center text-[#1F1A2E] focus:border-[#6D28D9] outline-none";

  async function salvar() {
    setErro(""); setSalvando(true);
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/professores`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "agenda", indicacaoId: ind.id, weekdays: dias, time: hora, minutes: minutos }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setSalvando(false);
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível salvar."); return; }
    try { window.dispatchEvent(new Event(EVENTO_AGENDA)); } catch { /* sem window */ }
    aoSalvar();
  }

  return (
    <div className="mt-3 rounded-2xl bg-[#F8F7FC] p-3 space-y-3">
      <p className="text-[13px] font-bold text-[#1F1A2E]">Quando {nome} vai reforçar {ind.materia}?</p>
      <div className="grid grid-cols-7 gap-1">
        {DIAS.map((d, i) => {
          const on = dias.includes(i);
          return <button key={d} onClick={() => setDias((l) => on ? l.filter((x) => x !== i) : [...l, i])}
            className={`rounded-xl h-10 text-[12px] font-bold min-w-0 ${on ? "bg-[#6D28D9] text-white" : "bg-white text-[#5B5470]"}`}>{d}</button>;
        })}
      </div>
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <span className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <select aria-label="Hora" value={hora.slice(0, 2)} onChange={(e) => setHora(`${e.target.value}:${hora.slice(3, 5)}`)} className={campo}>
            {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <span className="text-[18px] font-extrabold text-[#1F1A2E]">:</span>
          <select aria-label="Minutos" value={hora.slice(3, 5)} onChange={(e) => setHora(`${hora.slice(0, 2)}:${e.target.value}`)} className={campo}>
            {MINUTOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </span>
        <select aria-label="Duração" value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} className={campo}>
          {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
      </div>
      {erro && <p className="text-[12px] text-[#B91C1C]">{erro}</p>}
      <button onClick={salvar} disabled={!dias.length || salvando} className="w-full rounded-2xl bg-[#6D28D9] text-white font-bold h-12 disabled:opacity-50">
        {salvando ? "Salvando..." : "Salvar na agenda"}
      </button>
    </div>
  );
}

export default function ProfessoresDoFilho({ studentId, nome }: { studentId: string; nome: string }) {
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [retornos, setRetornos] = useState<Retorno[]>([]);
  const [pronto, setPronto] = useState(false);
  const [abertaAgenda, setAbertaAgenda] = useState<string | null>(null);
  const [prof, setProf] = useState("");
  const [tipo, setTipo] = useState<Tipo>("ELOGIO");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  function carregar() {
    fetch(`/api/escola/familia/filhos/${studentId}/professores`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setIndicacoes(d?.indicacoes ?? []); setProfessores(d?.professores ?? []); setRetornos(d?.retornos ?? []);
        setProf((p) => p || d?.professores?.[0]?.classSubjectId || "");
        setPronto(true);
      })
      .catch(() => setPronto(true));
  }
  useEffect(carregar, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function enviarRetorno() {
    setErro(""); setEnviado(false); setEnviando(true);
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/professores`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "retorno", classSubjectId: prof, kind: tipo, text: texto }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnviando(false);
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível enviar."); return; }
    setTexto(""); setEnviado(true); carregar();
  }

  if (!pronto || (!indicacoes.length && !professores.length)) return null;

  return (
    <>
      {indicacoes.length > 0 && (
        <section id="professor" className={CARTAO + " scroll-mt-4"}>
          <h2 className="text-[16px] font-extrabold text-[#1F1A2E] flex items-center gap-2 mb-1"><GraduationCap className="size-5 text-[#6D28D9]" />Recados dos professores</h2>
          <p className="text-[13px] text-[#5B5470] mb-3">Os professores indicam o que {nome} precisa reforçar em casa.</p>
          <ul className="space-y-3">
            {indicacoes.map((i) => {
              const m = materiaDe(i.subjectCode ?? i.materia);
              const cor = m?.cor ?? "#6D28D9";
              return (
                <li key={i.id} className="rounded-2xl border border-[#EDE9F7] p-4" style={{ borderLeft: `5px solid ${cor}` }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-extrabold uppercase tracking-wide" style={{ color: cor }}>{i.materia}</span>
                    {i.nova && <span className="text-[10px] font-bold bg-[#6D28D9] text-white rounded-full px-2 py-0.5">Novo</span>}
                  </div>
                  <p className="text-[15px] text-[#1F1A2E] mt-1 leading-snug">{i.texto}</p>
                  <p className="text-[12px] text-[#8B84A0] mt-1">{i.professor} · {quando(i.createdAt)}</p>
                  {i.naAgenda ? (
                    <p className="mt-3 text-[13px] font-bold text-[#166534] inline-flex items-center gap-1.5"><Check className="size-4" strokeWidth={3} />Está na agenda de {nome}</p>
                  ) : abertaAgenda === i.id ? (
                    <NaAgenda studentId={studentId} ind={i} nome={nome} aoSalvar={() => { setAbertaAgenda(null); setIndicacoes((l) => l.map((x) => (x.id === i.id ? { ...x, naAgenda: true } : x))); }} />
                  ) : (
                    <button onClick={() => setAbertaAgenda(i.id)} className="mt-3 w-full h-12 rounded-2xl bg-[#EDE9FE] text-[#5B21B6] font-bold inline-flex items-center justify-center gap-2">
                      <CalendarPlus className="size-5" />Incluir na agenda de {nome}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {professores.length > 0 && (
        <section className={CARTAO}>
          <h2 className="text-[16px] font-extrabold text-[#1F1A2E] flex items-center gap-2 mb-1"><MessageSquare className="size-5 text-[#6D28D9]" />Fale com a coordenação</h2>
          <p className="text-[13px] text-[#5B5470] mb-3">Conte como está a experiência com os professores de {nome}. Quem lê é a coordenação da escola.</p>
          <div className="space-y-3">
            <select value={prof} onChange={(e) => setProf(e.target.value)} aria-label="Professor"
              className="block w-full h-12 rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 text-[15px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none">
              {professores.map((p) => <option key={p.classSubjectId} value={p.classSubjectId}>{p.professor} · {p.materia}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TIPOS) as Tipo[]).map((t) => {
                const T = TIPOS[t]; const on = tipo === t;
                return (
                  <button key={t} onClick={() => setTipo(t)} className="rounded-2xl min-h-[52px] px-1 text-[13px] font-bold inline-flex flex-col items-center justify-center gap-0.5 border-2"
                    style={{ background: on ? T.fundo : "#fff", borderColor: on ? T.cor : "#EDE9F7", color: on ? T.cor : "#5B5470" }}>
                    <T.Icone className="size-4" />{T.label}
                  </button>
                );
              })}
            </div>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, MAX_RETORNO))} rows={3}
              placeholder="Escreva o seu retorno"
              className="block w-full rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 py-3 text-[15px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none resize-none" />
            {erro && <p className="text-[12px] text-[#B91C1C]">{erro}</p>}
            {enviado && <p className="text-[13px] text-[#166534] bg-[#F0FDF4] rounded-xl px-3 py-2 inline-flex items-center gap-1.5"><Check className="size-4" />Enviado para a coordenação. Obrigado!</p>}
            <button onClick={enviarRetorno} disabled={!prof || texto.trim().length < 5 || enviando}
              className="w-full h-12 rounded-2xl bg-[#6D28D9] text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              <Send className="size-4" />{enviando ? "Enviando..." : "Enviar para a coordenação"}
            </button>
          </div>
          {retornos.length > 0 && (
            <ul className="mt-4 space-y-2">
              {retornos.map((r) => {
                const T = TIPOS[r.kind] ?? TIPOS.SUGESTAO;
                return (
                  <li key={r.id} className="flex items-start gap-3 rounded-2xl bg-[#F8F7FC] p-3">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: T.fundo, color: T.cor }}><T.Icone className="size-4" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] font-bold text-[#5B5470]">{r.sobre}</span>
                      <span className="block text-[13px] text-[#1F1A2E] leading-snug">{r.texto}</span>
                      <span className="block text-[11px] text-[#8B84A0] mt-0.5">{quando(r.createdAt)} · {r.lido ? "Lido pela coordenação" : "Enviado"}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
