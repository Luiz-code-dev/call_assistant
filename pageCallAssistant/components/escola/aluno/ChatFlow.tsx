"use client";
/**
 * A conversa com o Flow, usada no cantinho da atividade e na foto do dever.
 * - Pistas e perguntas, nunca a resposta (regras no servidor: lib/escola/ajudante.ts)
 * - Microfone: o aluno fala a dúvida (transcrita em /api/escola/aluno/ajudante/ouvir)
 * - Depois de 3 pedidos de ajuda, o Flow oferece avisar a família
 */
import { useEffect, useRef, useState } from "react";
import { Send, Volume2, Square, Mic, HeartHandshake } from "lucide-react";
import { saudacao, useFalaDoFlow } from "./Mascote";
import { ehPedidoDeAjuda } from "@/lib/escola/pedido-ajuda";

export type Msg = { de: "aluno" | "flow"; texto: string };
export type Contexto = { activityId: string } | { dever: { enunciado: string; materia?: string | null; ano?: number | null } };

const ATALHOS = ["Não entendi a pergunta", "Me dá uma pista", "Como eu começo?", "O que significa uma palavra?"];
const PEDIDOS_PARA_OFERECER = 3;

const MAX_GRAVACAO_MS = 30_000;

function tipoDeAudio(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}

/** Grava a fala do aluno: toque para começar, toque de novo para parar (para sozinho em 30 s) */
function useGravador(aoTerminar: (b: Blob, tipo: string) => void) {
  const [gravando, setGravando] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const suportado = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && tipoDeAudio() !== "";

  async function comecar(): Promise<string | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = tipoDeAudio();
      const r = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      const partes: BlobPart[] = [];
      r.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearTimeout(timer.current);
        setGravando(false);
        aoTerminar(new Blob(partes, { type: r.mimeType || tipo }), r.mimeType || tipo);
      };
      r.start();
      rec.current = r;
      setGravando(true);
      timer.current = setTimeout(() => r.state === "recording" && r.stop(), MAX_GRAVACAO_MS);
      return null;
    } catch {
      return "Não consegui usar o microfone. Libere o microfone no navegador ou escreva a sua dúvida.";
    }
  }
  function parar() { if (rec.current?.state === "recording") rec.current.stop(); }
  useEffect(() => () => { clearTimeout(timer.current); if (rec.current?.state === "recording") rec.current.stop(); }, []);
  return { gravando, comecar, parar, suportado };
}

/**
 * modo "cartao": rolagem própria (cantinho da atividade).
 * modo "pagina": as mensagens seguem a rolagem da página e o campo fica fixo embaixo
 * (foto do dever), para não ter uma rolagem dentro da outra no celular.
 */
export default function ChatFlow({ contexto, saudacaoInicial, compacto = true, modo = "cartao" }: { contexto: Contexto; saudacaoInicial?: string; compacto?: boolean; modo?: "cartao" | "pagina" }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ de: "flow", texto: saudacaoInicial ?? `${saudacao()}! Eu sou o Flow. Posso te dar pistas e explicar palavras, mas a resposta quem descobre é você. Onde você travou?` }]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [falandoIdx, setFalandoIdx] = useState<number | null>(null);
  const [oferta, setOferta] = useState<"nao" | "aberta" | "feita">("nao");
  const { falar, parar, falando } = useFalaDoFlow();
  const fim = useRef<HTMLDivElement>(null);
  const pedidos = msgs.filter((m) => m.de === "aluno").length;

  const gravador = useGravador(async (blob, tipo) => {
    setOuvindo(true);
    try {
      const fd = new FormData();
      fd.append("audio", new File([blob], tipo.includes("mp4") ? "fala.m4a" : tipo.includes("ogg") ? "fala.ogg" : "fala.webm", { type: tipo }));
      const r = await fetch("/api/escola/aluno/ajudante/ouvir", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.texto) await enviar(d.texto);
      else setMsgs((m) => [...m, { de: "flow", texto: d.error ?? "Não entendi direito. Tente falar de novo." }]);
    } catch {
      setMsgs((m) => [...m, { de: "flow", texto: "A internet caiu enquanto eu ouvia. Tente de novo." }]);
    } finally { setOuvindo(false); }
  });

  useEffect(() => { if (!falando) setFalandoIdx(null); }, [falando]);
  useEffect(() => { fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, pensando, ouvindo, oferta]);

  async function enviar(t: string) {
    const pergunta = t.trim();
    if (!pergunta || pensando) return;
    const nova: Msg[] = [...msgs, { de: "aluno", texto: pergunta }];
    setMsgs(nova); setTexto(""); setPensando(true);
    try {
      const r = await fetch("/api/escola/aluno/ajudante", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contexto, mensagens: nova.slice(-10) }),
      });
      const d = await r.json().catch(() => ({}));
      setMsgs((m) => [...m, { de: "flow", texto: d.resposta ?? d.error ?? "Hum, não consegui pensar agora. Tente de novo daqui a pouquinho!" }]);
      if (oferta === "nao" && nova.filter((m) => m.de === "aluno" && ehPedidoDeAjuda(m.texto)).length >= PEDIDOS_PARA_OFERECER) {
        setMsgs((m) => [...m, { de: "flow", texto: "Esse assunto está difícil, né? Tudo bem, isso acontece. Quer que eu conte para a sua família, para alguém sentar com você?" }]);
        setOferta("aberta");
      }
    } catch {
      setMsgs((m) => [...m, { de: "flow", texto: "Parece que a internet caiu. Confira a conexão e tente de novo." }]);
    } finally {
      setPensando(false);
    }
  }

  async function responderOferta(sim: boolean) {
    setOferta("feita");
    if (!sim) {
      setMsgs((m) => [...m, { de: "aluno", texto: "Não, vou tentar mais" }, { de: "flow", texto: "Combinado! Eu continuo aqui com você. Qual parte você quer tentar agora?" }]);
      return;
    }
    setMsgs((m) => [...m, { de: "aluno", texto: "Sim, pode avisar" }]);
    setPensando(true);
    try {
      const r = await fetch("/api/escola/aluno/ajudante/avisar-familia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify("activityId" in contexto ? { activityId: contexto.activityId } : {}),
      });
      const d = await r.json().catch(() => ({}));
      const fala = !r.ok ? "Não consegui avisar agora. Chame alguém da sua casa e mostre esta atividade."
        : d.temFamilia === false ? "Sua família ainda não entrou no SpeakFlow. Chame um adulto de casa e mostre esta atividade, combinado?"
        : d.avisados > 0 ? "Pronto, avisei a sua família! Enquanto isso, a gente continua tentando juntos."
        : "Sua família já foi avisada hoje. Mostre esta atividade para alguém de casa quando puder.";
      setMsgs((m) => [...m, { de: "flow", texto: fala }]);
    } catch {
      setMsgs((m) => [...m, { de: "flow", texto: "A internet caiu. Chame alguém da sua casa e mostre esta atividade." }]);
    } finally { setPensando(false); }
  }

  async function microfone() {
    if (gravador.gravando) { gravador.parar(); return; }
    parar();
    const erro = await gravador.comecar();
    if (erro) setMsgs((m) => [...m, { de: "flow", texto: erro }]);
  }

  function ouvir(i: number, t: string) {
    if (falando && falandoIdx === i) { parar(); return; }
    setFalandoIdx(i); falar(t);
  }

  const ocupado = pensando || ouvindo;
  const txt = compacto ? "text-[14px] sm:text-[15px] leading-snug" : "text-[15px] sm:text-[16px] leading-relaxed";

  return (
    <div className={modo === "pagina" ? "" : "flex flex-col min-h-0 h-full"}>
      <div className={modo === "pagina" ? "px-1 py-2 space-y-3" : "flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-2.5 bg-[#FBFAFF]"}>
        {msgs.map((m, i) => m.de === "flow" ? (
          <div key={i} className="flex items-end gap-2 max-w-[92%]">
            <div className={`rounded-2xl rounded-bl-md bg-white border border-[#EDE9F7] px-3 py-2 ${txt} text-[#1F1A2E] shadow-sm`}>{m.texto}</div>
            <button type="button" onClick={() => ouvir(i, m.texto)} aria-label="Ouvir"
              className={`shrink-0 rounded-full w-8 h-8 flex items-center justify-center ${falando && falandoIdx === i ? "bg-[#6D28D9] text-white" : "bg-[#EDE9FE] text-[#6D28D9]"}`}>
              {falando && falandoIdx === i ? <Square className="size-3 fill-current" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        ) : (
          <div key={i} className="flex justify-end">
            <div className={`rounded-2xl rounded-br-md bg-[#6D28D9] text-white px-3 py-2 ${txt} max-w-[85%] whitespace-pre-wrap`}>{m.texto}</div>
          </div>
        ))}
        {oferta === "aberta" && !pensando && (
          <div className="flex flex-wrap gap-2 pl-1">
            <button type="button" onClick={() => responderOferta(true)} className="inline-flex items-center gap-1.5 rounded-full bg-[#6D28D9] text-white text-[13px] font-bold px-4 min-h-[40px]"><HeartHandshake className="size-4" />Sim, pode avisar</button>
            <button type="button" onClick={() => responderOferta(false)} className="rounded-full border-[1.5px] border-[#DDD6FE] bg-white text-[#5B21B6] text-[13px] font-bold px-4 min-h-[40px]">Não, vou tentar mais</button>
          </div>
        )}
        {ocupado && (
          <div className="flex items-center gap-2 pl-1 text-[12px] text-[#5B5470]">
            {[0, 1, 2].map((k) => <span key={k} className="size-2 rounded-full bg-[#C4B5FD] animate-bounce" style={{ animationDelay: `${k * 120}ms` }} />)}
            {ouvindo && <span>Ouvindo o que você falou...</span>}
          </div>
        )}
        <div ref={fim} className={modo === "pagina" ? "h-36" : ""} />
      </div>

      <div className={modo === "pagina"
        ? "fixed z-40 inset-x-0 bottom-0 border-t border-[#EDE9F7] bg-white/95 backdrop-blur shadow-[0_-8px_24px_rgba(46,16,101,0.08)] pb-[env(safe-area-inset-bottom)]"
        : "border-t border-[#EDE9F7] bg-white px-2.5 pt-2 pb-2.5 space-y-2 shrink-0"}>
      <div className={modo === "pagina" ? "max-w-2xl mx-auto px-3 pt-2 pb-3 space-y-2" : "space-y-2"}>
        {pedidos === 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {ATALHOS.map((a) => (
              <button key={a} type="button" onClick={() => enviar(a)} disabled={ocupado}
                className="shrink-0 rounded-full border-[1.5px] border-[#DDD6FE] bg-[#F5F3FF] text-[#5B21B6] text-[12px] font-semibold px-3 min-h-[34px] disabled:opacity-50">{a}</button>
            ))}
          </div>
        )}
        {gravador.gravando && (
          <p className="flex items-center gap-2 text-[13px] font-bold text-[#B91C1C] px-1"><span className="size-2.5 rounded-full bg-[#DC2626] animate-pulse" />Gravando... toque no microfone de novo para enviar</p>
        )}
        <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="flex items-end gap-2">
          {gravador.suportado && (
            <button type="button" onClick={microfone} disabled={pensando || ouvindo} aria-label={gravador.gravando ? "Parar e enviar" : "Falar com o Flow"}
              className={`shrink-0 rounded-2xl w-[44px] h-[44px] flex items-center justify-center disabled:opacity-40 ${gravador.gravando ? "bg-[#DC2626] text-white animate-pulse" : "bg-[#EDE9FE] text-[#6D28D9]"}`}>
              {gravador.gravando ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
            </button>
          )}
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={1} maxLength={500} disabled={gravador.gravando}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(texto); } }}
            placeholder={gravador.gravando ? "Estou ouvindo..." : "Sua dúvida..."}
            className="flex-1 min-w-0 resize-none rounded-2xl border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none px-3 py-2 h-[44px] text-[16px] leading-snug text-[#1F1A2E]" />
          <button type="submit" disabled={ocupado || !texto.trim()} aria-label="Enviar"
            className="shrink-0 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 text-white w-[44px] h-[44px] flex items-center justify-center"><Send className="size-5" /></button>
        </form>
      </div>
      </div>
    </div>
  );
}
