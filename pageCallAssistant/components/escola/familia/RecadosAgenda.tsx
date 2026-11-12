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
const HORAS = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, "0")); // 06 a 22
const MINUTOS = ["00", "10", "15", "20", "30", "40", "45", "50"];
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
    setAviso(d.avisado ? `Enviado! ${nome} recebeu o aviso no celular.` : `Enviado! ${nome} vê o recado ao abrir o app.`);
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

interface GrupoAgenda { chave: string; ids: string[]; dias: number[]; time: string; subjectCode: string | null; minutes: number }

/** Um horário (hora + matéria + duração) com todos os dias em que ele acontece */
function agrupar(itens: ItemAgenda[]): GrupoAgenda[] {
  const m = new Map<string, GrupoAgenda>();
  for (const i of itens) {
    const chave = `${i.time}|${i.subjectCode ?? ""}|${i.minutes}`;
    const g = m.get(chave) ?? { chave, ids: [], dias: [], time: i.time, subjectCode: i.subjectCode, minutes: i.minutes };
    g.ids.push(i.id); if (!g.dias.includes(i.weekday)) g.dias.push(i.weekday);
    m.set(chave, g);
  }
  return Array.from(m.values()).map((g) => ({ ...g, dias: g.dias.sort() })).sort((a, b) => a.time.localeCompare(b.time));
}

function textoDias(dias: number[]) {
  if (dias.length === 7) return "Todos os dias";
  if (dias.length === 5 && [0, 1, 2, 3, 4].every((d) => dias.includes(d))) return "Segunda a sexta";
  if (dias.length === 2 && dias.includes(5) && dias.includes(6)) return "Fim de semana";
  return dias.map((d) => DIAS[d]).join(", ");
}

export function AgendaDoFilho({ studentId, nome }: { studentId: string; nome: string }) {
  const [itens, setItens] = useState<ItemAgenda[]>([]);
  const [abrir, setAbrir] = useState(false);
  const [dias, setDias] = useState<number[]>([0, 2, 4]);
  const [hora, setHora] = useState("18:00");
  const [materia, setMateria] = useState<string>("");
  const [minutos, setMinutos] = useState(20);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const carregar = () => fetch(`/api/escola/familia/filhos/${studentId}/agenda`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d) => setItens(d?.itens ?? [])).catch(() => {});
    carregar();
    // O reforço indicado pelo professor também entra na agenda (ProfessoresDoFilho)
    window.addEventListener("escola:agenda-atualizada", carregar);
    return () => window.removeEventListener("escola:agenda-atualizada", carregar);
  }, [studentId]);

  // Dias escolhidos que já têm esse mesmo horário: avisa antes de salvar
  const repetidos = dias.filter((d) => itens.some((i) => i.weekday === d && i.time === hora));

  async function salvar() {
    setErro(""); setSalvando(true);
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/agenda`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekdays: dias, time: hora, subjectCode: materia || null, minutes: minutos }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setSalvando(false);
    if (!r?.ok) { setErro(d?.error ?? "Não foi possível salvar."); return; }
    setItens(d.itens); setAbrir(false);
  }

  async function remover(ids: string[]) {
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/agenda?ids=${encodeURIComponent(ids.join(","))}`, { method: "DELETE" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (r?.ok) setItens(d.itens);
  }

  const grupos = agrupar(itens);
  const campoBase = "block w-full min-w-0 h-12 appearance-none rounded-xl border-[1.5px] border-[#DDD6EE] bg-white px-3 text-[15px] text-[#1F1A2E] focus:border-[#6D28D9] outline-none";
  const campo = "mt-1 " + campoBase;

  return (
    <section className={CARTAO}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-[16px] font-extrabold text-[#1F1A2E] flex items-center gap-2"><CalendarDays className="size-5 text-[#6D28D9]" />Agenda de estudos</h2>
        {!abrir && (
          <button onClick={() => { setErro(""); setAbrir(true); }} className="inline-flex items-center gap-1 text-[13px] font-bold text-[#6D28D9] min-h-[40px] shrink-0"><Plus className="size-4" />Adicionar</button>
        )}
      </div>
      <p className="text-[13px] text-[#5B5470] mb-3">{nome} recebe um aviso no celular na hora combinada.</p>

      {abrir && (
        <div className="rounded-2xl bg-[#F8F7FC] p-3 mb-3 space-y-4">
          <div>
            <p className="text-[12px] font-bold text-[#5B5470] mb-1.5">Dias</p>
            <div className="grid grid-cols-7 gap-1">
              {DIAS.map((d, i) => {
                const on = dias.includes(i);
                return (
                  <button key={d} onClick={() => setDias((l) => on ? l.filter((x) => x !== i) : [...l, i])}
                    className={`rounded-xl h-10 text-[12px] font-bold min-w-0 ${on ? "bg-[#6D28D9] text-white" : "bg-white text-[#5B5470]"}`}>{d}</button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-[3fr_2fr] gap-3">
            <label className="block min-w-0 text-[12px] font-bold text-[#5B5470]">Horário
              {/* Hora e minuto em listas: o campo de hora do iPhone desalinhava o número */}
              <span className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                <select aria-label="Hora" value={hora.slice(0, 2)} onChange={(e) => setHora(`${e.target.value}:${hora.slice(3, 5)}`)} className={campoBase + " px-2 text-center"}>
                  {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-[18px] font-extrabold text-[#1F1A2E]">:</span>
                <select aria-label="Minutos" value={hora.slice(3, 5)} onChange={(e) => setHora(`${hora.slice(0, 2)}:${e.target.value}`)} className={campoBase + " px-2 text-center"}>
                  {(MINUTOS.includes(hora.slice(3, 5)) ? MINUTOS : [...MINUTOS, hora.slice(3, 5)].sort()).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </span>
            </label>
            <label className="block min-w-0 text-[12px] font-bold text-[#5B5470]">Duração
              <select value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} className={campo}>
                {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </label>
          </div>
          <label className="block text-[12px] font-bold text-[#5B5470]">Matéria
            <select value={materia} onChange={(e) => setMateria(e.target.value)} className={campo}>
              <option value="">Qualquer matéria (a trilha do dia)</option>
              {Object.entries(MATERIAS).map(([c, m]) => <option key={c} value={c}>{m.nome}</option>)}
            </select>
          </label>
          {repetidos.length > 0 && (
            <p className="text-[12px] text-[#92400E] bg-[#FEF3C7] rounded-xl px-3 py-2">
              {repetidos.length === dias.length
                ? `Já existe um horário às ${hora} nesses dias.`
                : `Às ${hora} já tem horário em ${repetidos.map((d) => DIAS[d]).join(", ")}. Só os outros dias serão adicionados.`}
            </p>
          )}
          {erro && <p className="text-[12px] text-[#B91C1C]">{erro}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setAbrir(false)} className="rounded-2xl bg-white text-[#5B5470] font-semibold h-12">Cancelar</button>
            <button onClick={salvar} disabled={!dias.length || salvando || repetidos.length === dias.length}
              className="rounded-2xl bg-[#6D28D9] text-white font-bold h-12 disabled:opacity-50">{salvando ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>
      )}

      {grupos.length === 0 && !abrir ? (
        <p className="text-[13px] text-[#8B84A0]">Nenhum horário ainda. Combine com {nome} um horário fixo para praticar.</p>
      ) : (
        <ul className="space-y-2">
          {grupos.map((g) => {
            const m = materiaDe(g.subjectCode);
            const cor = m?.cor ?? "#6D28D9";
            return (
              <li key={g.chave} className="flex items-center gap-3 rounded-2xl bg-[#F8F7FC] p-3">
                <span className="rounded-xl px-2.5 py-2 text-[14px] font-extrabold text-white shrink-0 inline-flex items-center gap-1" style={{ background: cor }}>
                  <Clock className="size-3.5" />{g.time}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-bold text-[#1F1A2E] truncate">{m?.nome ?? "Trilha do dia"} · {g.minutes} min</span>
                  <span className="block text-[12px] text-[#5B5470]">{textoDias(g.dias)}</span>
                </span>
                <button onClick={() => remover(g.ids)} aria-label="Remover horário" className="w-10 h-10 rounded-full flex items-center justify-center text-[#8B84A0] hover:bg-white shrink-0"><X className="size-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
