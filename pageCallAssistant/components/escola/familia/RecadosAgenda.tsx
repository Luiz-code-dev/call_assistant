"use client";
/**
 * Painel da família: mandar recado para o filho (elogio, lembrete, sugestão)
 * e montar a agenda de estudos. O aluno vê os dois na tela inicial.
 */
import { useEffect, useState } from "react";
import { Heart, Bell, Lightbulb, Send, Check, CalendarDays, Plus, X, Clock } from "lucide-react";
import { MATERIAS, materiaDe } from "@/components/escola/reforco-ui";

type Tipo = "ELOGIO" | "LEMBRETE" | "SUGESTAO";
interface Recado { id: string; kind: Tipo; text: string; createdAt: string; lido: boolean }
interface ItemAgenda { id: string; weekday: number; time: string; subjectCode: string | null; minutes: number }

const TIPOS: Record<Tipo, { label: string; Icone: typeof Heart; cor: string; fundo: string; sugestoes: (n: string) => string[] }> = {
  ELOGIO: { label: "Elogio", Icone: Heart, cor: "#BE185D", fundo: "#FCE7F3", sugestoes: (n) => [`Parabéns pelo esforço, ${n}! Tenho orgulho de você.`, "Vi que você praticou hoje. Continue assim!"] },
  LEMBRETE: { label: "Lembrete", Icone: Bell, cor: "#6D28D9", fundo: "#EDE9FE", sugestoes: (n) => [`${n}, hoje é dia de praticar 15 minutos.`, "Antes do jogo, faça uma etapa da sua trilha."] },
  SUGESTAO: { label: "Sugestão", Icone: Lightbulb, cor: "#B45309", fundo: "#FEF3C7", sugestoes: () => ["Que tal começar o diagnóstico de outra matéria?", "Explique para mim o que você aprendeu hoje."] },
};
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const CARTAO = "bg-white rounded-3xl p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)]";

function quando(iso: string) {
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return dias <= 0 ? `hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : dias === 1 ? "ontem" : `há ${dias} dias`;
}

export function RecadoParaFilho({ studentId, nome }: { studentId: string; nome: string }) {
  const [tipo, setTipo] = useState<Tipo>("ELOGIO");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [recados, setRecados] = useState<Recado[]>([]);

  useEffect(() => {
    fetch(`/api/escola/familia/filhos/${studentId}/recados`).then((r) => (r.ok ? r.json() : null))
      .then((d) => setRecados(d?.recados ?? [])).catch(() => {});
  }, [studentId]);

  async function enviar() {
    if (texto.trim().length < 2) return;
    setEnviando(true); setAviso("");
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/recados`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: tipo, text: texto }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnviando(false);
    if (!r?.ok) { setAviso(d?.error ?? "Não foi possível enviar. Tente de novo."); return; }
    setRecados((l) => [d.recado, ...l]);
    setTexto("");
    setAviso(`Enviado! ${nome} vê o recado ao abrir o app.`);
  }

  const t = TIPOS[tipo];
  return (
    <section className={CARTAO}>
      <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">Recado para {nome}</h2>
      <p className="text-[13px] text-[#5B5470] mb-3">Aparece na tela inicial do app de {nome}.</p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {(Object.keys(TIPOS) as Tipo[]).map((k) => {
          const on = k === tipo; const T = TIPOS[k];
          return (
            <button key={k} onClick={() => setTipo(k)}
              className="flex flex-col items-center gap-1 rounded-2xl py-2.5 min-h-[64px] text-[12px] font-bold transition-colors"
              style={on ? { background: T.cor, color: "#fff" } : { background: T.fundo, color: T.cor }}>
              <T.Icone className="size-5" />{T.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {t.sugestoes(nome).map((s) => (
          <button key={s} onClick={() => setTexto(s)} className="text-[12px] text-left rounded-full px-3 py-1.5 bg-[#F8F7FC] text-[#5B5470] hover:bg-[#EDE9FE]">{s}</button>
        ))}
      </div>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 240))} rows={3}
        placeholder={`Escreva um ${t.label.toLowerCase()} para ${nome}`}
        className="w-full rounded-2xl border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] outline-none p-3 text-[15px] text-[#1F1A2E] resize-none" />
      <div className="flex items-center justify-between mt-1 mb-3">
        <span className="text-[11px] text-[#8B84A0]">{texto.length}/240</span>
        {aviso && <span className="text-[12px] font-semibold text-[#166534]">{aviso}</span>}
      </div>
      <button onClick={enviar} disabled={enviando || texto.trim().length < 2}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl text-white font-bold min-h-[52px] disabled:opacity-50"
        style={{ background: t.cor }}>
        <Send className="size-4" />{enviando ? "Enviando..." : "Enviar recado"}
      </button>

      {recados.length > 0 && (
        <ul className="mt-4 space-y-2">
          {recados.slice(0, 4).map((r) => {
            const T = TIPOS[r.kind] ?? TIPOS.LEMBRETE;
            return (
              <li key={r.id} className="flex items-start gap-3 rounded-2xl bg-[#F8F7FC] p-3">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: T.fundo, color: T.cor }}><T.Icone className="size-4" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] text-[#1F1A2E] leading-snug">{r.text}</span>
                  <span className="block text-[11px] text-[#8B84A0] mt-0.5">{quando(r.createdAt)}</span>
                </span>
                {r.lido
                  ? <span className="text-[11px] font-bold text-[#166534] inline-flex items-center gap-1 shrink-0"><Check className="size-3.5" strokeWidth={3} />Lido</span>
                  : <span className="text-[11px] font-semibold text-[#8B84A0] shrink-0">Enviado</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function AgendaDoFilho({ studentId, nome }: { studentId: string; nome: string }) {
  const [itens, setItens] = useState<ItemAgenda[]>([]);
  const [abrir, setAbrir] = useState(false);
  const [dias, setDias] = useState<number[]>([0, 2, 4]);
  const [hora, setHora] = useState("18:00");
  const [materia, setMateria] = useState<string>("");
  const [minutos, setMinutos] = useState(20);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/escola/familia/filhos/${studentId}/agenda`).then((r) => (r.ok ? r.json() : null))
      .then((d) => setItens(d?.itens ?? [])).catch(() => {});
  }, [studentId]);

  async function salvar() {
    setErro("");
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/agenda`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekdays: dias, time: hora, subjectCode: materia || null, minutes: minutos }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível salvar."); return; }
    setItens(d.itens); setAbrir(false);
  }

  async function remover(id: string) {
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/agenda?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (r?.ok) setItens(d.itens);
  }

  return (
    <section className={CARTAO}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[16px] font-extrabold text-[#1F1A2E] flex items-center gap-2"><CalendarDays className="size-5 text-[#6D28D9]" />Agenda de estudos</h2>
        {!abrir && (
          <button onClick={() => setAbrir(true)} className="inline-flex items-center gap-1 text-[13px] font-bold text-[#6D28D9] min-h-[40px]"><Plus className="size-4" />Adicionar</button>
        )}
      </div>
      <p className="text-[13px] text-[#5B5470] mb-3">{nome} vê o horário do dia na tela inicial.</p>

      {abrir && (
        <div className="rounded-2xl bg-[#F8F7FC] p-3 mb-3 space-y-3">
          <div>
            <p className="text-[12px] font-bold text-[#5B5470] mb-1.5">Dias</p>
            <div className="flex gap-1.5">
              {DIAS.map((d, i) => {
                const on = dias.includes(i);
                return (
                  <button key={d} onClick={() => setDias((l) => on ? l.filter((x) => x !== i) : [...l, i])}
                    className={`flex-1 rounded-xl py-2 text-[12px] font-bold min-h-[40px] ${on ? "bg-[#6D28D9] text-white" : "bg-white text-[#5B5470]"}`}>{d}</button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] font-bold text-[#5B5470]">Horário
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
                className="mt-1 w-full rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 py-2.5 text-[15px] text-[#1F1A2E]" />
            </label>
            <label className="text-[12px] font-bold text-[#5B5470]">Duração
              <select value={minutos} onChange={(e) => setMinutos(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 py-2.5 text-[15px] text-[#1F1A2E]">
                {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </label>
          </div>
          <label className="block text-[12px] font-bold text-[#5B5470]">Matéria
            <select value={materia} onChange={(e) => setMateria(e.target.value)}
              className="mt-1 w-full rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 py-2.5 text-[15px] text-[#1F1A2E]">
              <option value="">Qualquer matéria (a trilha do dia)</option>
              {Object.entries(MATERIAS).map(([c, m]) => <option key={c} value={c}>{m.nome}</option>)}
            </select>
          </label>
          {erro && <p className="text-[12px] text-[#B91C1C]">{erro}</p>}
          <div className="flex gap-2">
            <button onClick={() => setAbrir(false)} className="flex-1 rounded-2xl bg-white text-[#5B5470] font-semibold min-h-[48px]">Cancelar</button>
            <button onClick={salvar} disabled={!dias.length} className="flex-1 rounded-2xl bg-[#6D28D9] text-white font-bold min-h-[48px] disabled:opacity-50">Salvar</button>
          </div>
        </div>
      )}

      {itens.length === 0 && !abrir ? (
        <p className="text-[13px] text-[#8B84A0]">Nenhum horário ainda. Combine com {nome} um horário fixo para praticar.</p>
      ) : (
        <ul className="space-y-2">
          {itens.map((i) => {
            const m = materiaDe(i.subjectCode);
            return (
              <li key={i.id} className="flex items-center gap-3 rounded-2xl bg-[#F8F7FC] p-2.5">
                <span className="w-11 text-center text-[12px] font-extrabold text-[#6D28D9]">{DIAS[i.weekday]}</span>
                <span className="flex-1 min-w-0 text-[13px] text-[#1F1A2E]">
                  <span className="font-bold inline-flex items-center gap-1"><Clock className="size-3.5" />{i.time}</span> · {m?.nome ?? "Trilha do dia"} · {i.minutes} min
                </span>
                <button onClick={() => remover(i.id)} aria-label="Remover" className="w-9 h-9 rounded-full flex items-center justify-center text-[#8B84A0] hover:bg-white"><X className="size-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
