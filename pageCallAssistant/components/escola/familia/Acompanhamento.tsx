"use client";
/**
 * Acompanhamento do reforço pela família:
 * - SemanaDoFilho: os últimos 7 dias, dia a dia e por matéria (sem nota)
 * - AvisosDaFamilia: avisos no celular, WhatsApp e e-mail do responsável
 */
import { useEffect, useState } from "react";
import { MessageCircle, Mail, TrendingDown, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { IconeMateria } from "@/components/escola/reforco-ui";
import { AtivarAvisos } from "@/components/escola/aluno/RecadosAluno";

interface Dia { dia: string; rotulo: string; atividades: number; minutos: number; domina: number; quase: number; praticando: number }
interface Materia { codigo: string; nome: string; atividades: number; domina: number; quase: number; praticando: number; situacao: "indo_bem" | "atencao" | "praticando" }
interface Semana { dias: Dia[]; materias: Materia[]; total: { atividades: number; minutos: number; diasEstudados: number }; tendencia: string; frase: string }

const COR = { domina: "#16A34A", quase: "#F59E0B", praticando: "#8B5CF6", feita: "#C4B5FD" };

const SITUACAO: Record<Materia["situacao"], { texto: string; fg: string; bg: string }> = {
  indo_bem: { texto: "Indo bem", fg: "#166534", bg: "#DCFCE7" },
  atencao: { texto: "Precisa de atenção", fg: "#9A3412", bg: "#FFEDD5" },
  praticando: { texto: "Praticando", fg: "#6D28D9", bg: "#EDE9FE" },
};

export function SemanaDoFilho({ studentId }: { studentId: string }) {
  const [s, setS] = useState<Semana | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    setS(null); setErro(false);
    fetch(`/api/escola/familia/filhos/${studentId}/semana`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setS).catch(() => setErro(true));
  }, [studentId]);

  if (erro) return null;
  if (!s) return <div className="h-64 rounded-3xl bg-white/70 animate-pulse" />;

  const max = Math.max(3, ...s.dias.map((d) => d.atividades));

  return (
    <section className="bg-white rounded-3xl p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">Últimos 7 dias</h2>
        {s.tendencia === "caindo" && <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#9A3412] bg-[#FFEDD5] rounded-full px-2.5 py-1"><TrendingDown className="size-3.5" />Estudou menos</span>}
        {s.tendencia === "subindo" && <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#166534] bg-[#DCFCE7] rounded-full px-2.5 py-1"><TrendingUp className="size-3.5" />Estudou mais</span>}
      </div>
      <p className="text-[12px] text-[#5B5470] mb-4">
        {s.total.atividades} {s.total.atividades === 1 ? "atividade" : "atividades"} · cerca de {s.total.minutos} min · {s.total.diasEstudados} de 7 dias
      </p>

      {/* Gráfico: uma coluna por dia, cor pelo resultado */}
      <div className="flex items-end justify-between gap-1.5 h-36" role="img"
        aria-label={s.dias.map((d) => `${d.rotulo}: ${d.atividades} atividades`).join("; ")}>
        {s.dias.map((d) => {
          const semNivel = Math.max(0, d.atividades - d.domina - d.quase - d.praticando);
          const partes = [
            { n: d.domina, c: COR.domina }, { n: d.quase, c: COR.quase },
            { n: d.praticando, c: COR.praticando }, { n: semNivel, c: COR.feita },
          ].filter((p) => p.n > 0);
          const altura = (d.atividades / max) * 100;
          return (
            <div key={d.dia} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[11px] font-bold text-[#1F1A2E] h-4">{d.atividades || ""}</span>
              <div className="w-full max-w-[34px] flex-1 flex items-end">
                {d.atividades > 0 ? (
                  <div className="w-full rounded-xl overflow-hidden flex flex-col-reverse" style={{ height: `${Math.max(altura, 10)}%` }}>
                    {partes.map((p, i) => <div key={i} style={{ flexGrow: p.n, background: p.c }} />)}
                  </div>
                ) : (
                  <div className="w-full h-1.5 rounded-full bg-[#EDE9F7]" />
                )}
              </div>
              <span className={`text-[11px] font-bold ${d.rotulo === "Hoje" ? "text-[#6D28D9]" : "text-[#8B84A0]"}`}>{d.rotulo}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] text-[#5B5470]">
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ background: COR.domina }} />Domina</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ background: COR.quase }} />Quase lá</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ background: COR.praticando }} />Praticando</span>
      </div>

      <p className="text-[14px] text-[#1F1A2E] leading-snug mt-4 rounded-2xl bg-[#F8F7FC] p-3">{s.frase}</p>

      {s.materias.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[13px] font-extrabold text-[#1F1A2E]">Por matéria nesta semana</p>
          {s.materias.map((m) => {
            const st = SITUACAO[m.situacao];
            const total = Math.max(1, m.domina + m.quase + m.praticando);
            return (
              <div key={m.codigo} className="rounded-2xl border border-[#EDE9F7] p-3">
                <div className="flex items-center gap-2">
                  <IconeMateria chave={m.codigo} tamanho={30} />
                  <span className="text-[14px] font-bold text-[#1F1A2E] flex-1 min-w-0 truncate">{m.nome}</span>
                  <span className="text-[11px] font-bold rounded-full px-2.5 py-1 inline-flex items-center gap-1 shrink-0" style={{ color: st.fg, background: st.bg }}>
                    {m.situacao === "atencao" ? <AlertCircle className="size-3.5" /> : m.situacao === "indo_bem" ? <CheckCircle2 className="size-3.5" /> : null}{st.texto}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#F3F0FB] overflow-hidden flex">
                  <div style={{ width: `${(m.domina / total) * 100}%`, background: COR.domina }} />
                  <div style={{ width: `${(m.quase / total) * 100}%`, background: COR.quase }} />
                  <div style={{ width: `${(m.praticando / total) * 100}%`, background: COR.praticando }} />
                </div>
                <p className="text-[12px] text-[#5B5470] mt-1">{m.atividades} {m.atividades === 1 ? "atividade" : "atividades"}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface Contato { nome: string; email: string; whatsapp: string; aceitaWhatsapp: boolean; avisosEmail: boolean }

/**
 * Avisos do responsável. No painel (compacto) só aparece enquanto falta o WhatsApp ou a
 * autorização; em Configurações aparece sempre.
 */
export function AvisosDaFamilia({ sempre = false }: { sempre?: boolean }) {
  const [c, setC] = useState<Contato | null>(null);
  const [whats, setWhats] = useState("");
  const [aceita, setAceita] = useState(true);
  const [email, setEmail] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    fetch("/api/escola/familia/contato", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: Contato | null) => {
      if (!d) return;
      setC(d); setWhats(d.whatsapp); setAceita(d.aceitaWhatsapp || !d.whatsapp); setEmail(d.avisosEmail);
    }).catch(() => null);
  }, []);

  async function salvar() {
    setSalvando(true); setMsg(null);
    const r = await fetch("/api/escola/familia/contato", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(whats.trim() ? { whatsapp: whats } : {}), aceitaWhatsapp: aceita && !!whats.trim(), avisosEmail: email }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setSalvando(false);
    if (!r?.ok) { setMsg({ ok: false, t: d.error ?? "Não foi possível salvar. Tente de novo." }); return; }
    setC((p) => (p ? { ...p, whatsapp: d.whatsapp, aceitaWhatsapp: d.aceitaWhatsapp, avisosEmail: d.avisosEmail } : p));
    setWhats(d.whatsapp);
    setMsg({ ok: true, t: "Pronto! Os avisos do reforço vão chegar para você." });
  }

  const pronto = !!c && !!c.whatsapp && c.aceitaWhatsapp;
  const mostrarForm = !!c && (sempre || !pronto || msg?.ok);

  return (
    <div className="space-y-3">
      <AtivarAvisos
        api="/api/escola/familia/avisos"
        titulo="Avisos do reforço no seu celular"
        descricao="Saiba na hora quando seu filho ficar sem estudar, precisar de ajuda ou tiver uma conquista."
        bloqueado="Os avisos foram bloqueados neste celular. Libere nas configurações do navegador para receber."
      />
      {mostrarForm && (
        <section className="bg-white rounded-3xl p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0"><MessageCircle className="size-5" /></div>
            <div>
              <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">{sempre ? "Avisos do reforço" : "Receba os avisos do reforço"}</h2>
              <p className="text-[13px] text-[#5B5470] leading-snug">Quando seu filho ficar 24 horas sem estudar, precisar de ajuda em uma matéria ou terminar uma trilha.</p>
            </div>
          </div>
          <label className="text-[13px] font-semibold text-[#1F1A2E] block mb-1">Seu WhatsApp</label>
          <input value={whats} onChange={(e) => setWhats(e.target.value)} type="tel" inputMode="tel" placeholder="(71) 98765-4321"
            className="w-full bg-white text-[#1F1A2E] rounded-2xl px-4 py-3 border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] outline-none text-[15px]" />
          <label className="flex items-start gap-3 mt-3 cursor-pointer">
            <input type="checkbox" checked={aceita} onChange={(e) => setAceita(e.target.checked)} className="mt-0.5 size-5 accent-[#6D28D9] shrink-0" />
            <span className="text-[13px] text-[#1F1A2E] leading-snug">Quero receber os avisos do reforço pelo WhatsApp.</span>
          </label>
          {c?.email && (
            <label className="flex items-start gap-3 mt-2 cursor-pointer">
              <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="mt-0.5 size-5 accent-[#6D28D9] shrink-0" />
              <span className="text-[13px] text-[#1F1A2E] leading-snug inline-flex items-start gap-1.5"><Mail className="size-4 text-[#6D28D9] shrink-0 mt-px" />Também por e-mail ({c.email})</span>
            </label>
          )}
          {msg && <p className={`text-[13px] mt-3 rounded-xl px-3 py-2 ${msg.ok ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}>{msg.t}</p>}
          <button onClick={salvar} disabled={salvando}
            className="mt-3 w-full rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[48px] disabled:opacity-50">
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </section>
      )}
    </div>
  );
}
