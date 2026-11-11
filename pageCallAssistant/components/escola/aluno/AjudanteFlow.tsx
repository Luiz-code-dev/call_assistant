"use client";
/**
 * Flow no cantinho da atividade: o aluno toca e pede ajuda. O Flow dá pistas,
 * explica palavras e faz perguntas, mas nunca entrega a resposta (regras no servidor:
 * lib/escola/ajudante.ts).
 */
import { useEffect, useRef, useState } from "react";
import { X, Send, Volume2, Square } from "lucide-react";
import { RoboFlow, saudacao, useFalaDoFlow } from "./Mascote";

type Msg = { de: "aluno" | "flow"; texto: string };

const ATALHOS = ["Não entendi a pergunta", "Me dá uma pista", "Como eu começo?", "O que significa uma palavra?"];

export default function AjudanteFlow({ activityId }: { activityId: string }) {
  const [aberto, setAberto] = useState(false);
  const [convite, setConvite] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [falandoIdx, setFalandoIdx] = useState<number | null>(null);
  const { falar, parar, falando } = useFalaDoFlow();
  const fim = useRef<HTMLDivElement>(null);

  // Depois de um tempinho na atividade, o Flow acena oferecendo ajuda (uma vez)
  useEffect(() => {
    const t = setTimeout(() => setConvite(true), 7000);
    const t2 = setTimeout(() => setConvite(false), 16000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  useEffect(() => { if (!falando) setFalandoIdx(null); }, [falando]);
  useEffect(() => { fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, pensando]);

  function abrir() {
    setConvite(false);
    setAberto(true);
    if (!msgs.length) {
      setMsgs([{ de: "flow", texto: `${saudacao()}! Eu sou o Flow. Posso te dar pistas e explicar palavras, mas a resposta quem descobre é você. Onde você travou?` }]);
    }
  }

  async function enviar(t: string) {
    const pergunta = t.trim();
    if (!pergunta || pensando) return;
    const nova: Msg[] = [...msgs, { de: "aluno", texto: pergunta }];
    setMsgs(nova); setTexto(""); setPensando(true);
    try {
      const r = await fetch("/api/escola/aluno/ajudante", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId, mensagens: nova.slice(-10) }),
      });
      const d = await r.json().catch(() => ({}));
      setMsgs((m) => [...m, { de: "flow", texto: d.resposta ?? "Hum, não consegui pensar agora. Tente de novo daqui a pouquinho!" }]);
    } catch {
      setMsgs((m) => [...m, { de: "flow", texto: "Parece que a internet caiu. Confira a conexão e tente de novo." }]);
    } finally {
      setPensando(false);
    }
  }

  function ouvir(i: number, t: string) {
    if (falando && falandoIdx === i) { parar(); return; }
    setFalandoIdx(i); falar(t);
  }

  return (
    <>
      {/* Botão no cantinho */}
      {!aberto && (
        <div className="fixed z-40 right-4 bottom-4 sm:right-6 sm:bottom-6 flex items-end gap-2 pb-[env(safe-area-inset-bottom)]">
          {convite && (
            <button type="button" onClick={abrir}
              className="mb-6 max-w-[200px] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-left text-[13px] font-bold text-[#1F1A2E] shadow-[0_8px_24px_rgba(91,33,182,0.22)] border border-[#E9E5F5]">
              Travou em alguma parte? Toque em mim que eu te ajudo a pensar!
            </button>
          )}
          <button type="button" onClick={abrir} aria-label="Pedir ajuda ao Flow"
            className="rounded-full bg-white shadow-[0_10px_28px_rgba(91,33,182,0.30)] border-2 border-[#EDE9FE] w-[76px] h-[76px] flex items-center justify-center active:scale-95 transition-transform overflow-hidden">
            <RoboFlow tamanho={66} acenando={convite} />
          </button>
        </div>
      )}

      {/* Espaço extra no fim da página para dar para rolar a atividade acima do cartão */}
      {aberto && <div aria-hidden="true" className="h-[min(48dvh,440px)] sm:hidden" />}

      {/* Painel da conversa */}
      {aberto && (
        // Cartão compacto que flutua embaixo, sem fundo escuro: a atividade continua visível e rolando
        <div className="fixed z-50 inset-x-2 bottom-2 sm:inset-x-auto sm:right-6 sm:bottom-6 pb-[env(safe-area-inset-bottom)] pointer-events-none">
          <section role="dialog" aria-label="Flow, o ajudante"
            className="pointer-events-auto relative flex flex-col bg-white w-full sm:w-[380px] h-[min(46dvh,420px)] sm:h-[min(70dvh,560px)] rounded-[24px] border border-[#E9E5F5] shadow-[0_16px_44px_rgba(46,16,101,0.28)] overflow-hidden">
            <header className="flex items-center gap-2.5 px-3 py-2 bg-gradient-to-br from-[#5B21B6] via-[#6D28D9] to-[#8B5CF6] text-white shrink-0">
              <span className="w-9 h-9 rounded-xl bg-white/95 flex items-center justify-center overflow-hidden shrink-0">
                <RoboFlow tamanho={34} falando={pensando || falando} humor={pensando ? "pensando" : "feliz"} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold leading-tight text-[15px]">Flow</p>
                <p className="text-[11px] text-white/85 truncate">{pensando ? "Pensando numa pista..." : "Te ajudo a pensar. A resposta é sua!"}</p>
              </div>
              <button type="button" onClick={() => { parar(); setAberto(false); }} aria-label="Fechar"
                className="rounded-full bg-white/15 hover:bg-white/25 min-w-[40px] min-h-[40px] flex items-center justify-center"><X className="size-5" /></button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-2.5 bg-[#FBFAFF]">
              {msgs.map((m, i) => m.de === "flow" ? (
                <div key={i} className="flex items-end gap-2 max-w-[92%]">
                  <div className="rounded-2xl rounded-bl-md bg-white border border-[#EDE9F7] px-3 py-2 text-[14px] sm:text-[15px] leading-snug text-[#1F1A2E] shadow-sm">{m.texto}</div>
                  <button type="button" onClick={() => ouvir(i, m.texto)} aria-label="Ouvir"
                    className={`shrink-0 rounded-full w-8 h-8 flex items-center justify-center ${falando && falandoIdx === i ? "bg-[#6D28D9] text-white" : "bg-[#EDE9FE] text-[#6D28D9]"}`}>
                    {falando && falandoIdx === i ? <Square className="size-3 fill-current" /> : <Volume2 className="size-4" />}
                  </button>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div className="rounded-2xl rounded-br-md bg-[#6D28D9] text-white px-3 py-2 text-[14px] sm:text-[15px] leading-snug max-w-[85%] whitespace-pre-wrap">{m.texto}</div>
                </div>
              ))}
              {pensando && (
                <div className="flex items-center gap-1.5 pl-1">{[0, 1, 2].map((k) => <span key={k} className="size-2 rounded-full bg-[#C4B5FD] animate-bounce" style={{ animationDelay: `${k * 120}ms` }} />)}</div>
              )}
              <div ref={fim} />
            </div>

            <div className="border-t border-[#EDE9F7] bg-white px-2.5 pt-2 pb-2.5 space-y-2 shrink-0">
              {msgs.length <= 2 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {ATALHOS.map((a) => (
                    <button key={a} type="button" onClick={() => enviar(a)} disabled={pensando}
                      className="shrink-0 rounded-full border-[1.5px] border-[#DDD6FE] bg-[#F5F3FF] text-[#5B21B6] text-[12px] font-semibold px-3 min-h-[34px] disabled:opacity-50">{a}</button>
                  ))}
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="flex items-end gap-2">
                <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={1} maxLength={500}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(texto); } }}
                  placeholder="Escreva a sua dúvida..."
                  className="flex-1 min-w-0 resize-none rounded-2xl border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none px-3 py-2 h-[44px] text-[16px] leading-snug text-[#1F1A2E]" />
                <button type="submit" disabled={pensando || !texto.trim()} aria-label="Enviar"
                  className="shrink-0 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 text-white w-[44px] h-[44px] flex items-center justify-center"><Send className="size-5" /></button>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
