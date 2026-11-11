"use client";
/**
 * Flow no cantinho da atividade: o aluno toca e pede ajuda. O Flow dá pistas,
 * explica palavras e faz perguntas, mas nunca entrega a resposta (regras no servidor:
 * lib/escola/ajudante.ts). A conversa fica em ChatFlow (texto, voz e aviso à família).
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { RoboFlow } from "./Mascote";
import ChatFlow from "./ChatFlow";

export default function AjudanteFlow({ activityId }: { activityId: string }) {
  const [aberto, setAberto] = useState(false);
  const [jaAbriu, setJaAbriu] = useState(false);
  const [convite, setConvite] = useState(false);

  // Depois de um tempinho na atividade, o Flow acena oferecendo ajuda (uma vez)
  useEffect(() => {
    const t = setTimeout(() => setConvite(true), 7000);
    const t2 = setTimeout(() => setConvite(false), 16000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  function abrir() { setConvite(false); setAberto(true); setJaAbriu(true); }

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

      {/* Cartão compacto que flutua embaixo, sem fundo escuro: a atividade continua visível.
          Fica montado depois de aberto (escondido) para não perder a conversa ao fechar. */}
      {jaAbriu && (
        <div className={`fixed z-50 inset-x-2 bottom-2 sm:inset-x-auto sm:right-6 sm:bottom-6 pb-[env(safe-area-inset-bottom)] pointer-events-none ${aberto ? "" : "hidden"}`}>
          <section role="dialog" aria-label="Flow, o ajudante"
            className="pointer-events-auto relative flex flex-col bg-white w-full sm:w-[380px] h-[min(46dvh,420px)] sm:h-[min(70dvh,560px)] rounded-[24px] border border-[#E9E5F5] shadow-[0_16px_44px_rgba(46,16,101,0.28)] overflow-hidden">
            <header className="flex items-center gap-2.5 px-3 py-2 bg-gradient-to-br from-[#5B21B6] via-[#6D28D9] to-[#8B5CF6] text-white shrink-0">
              <span className="w-9 h-9 rounded-xl bg-white/95 flex items-center justify-center overflow-hidden shrink-0">
                <RoboFlow tamanho={34} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold leading-tight text-[15px]">Flow</p>
                <p className="text-[11px] text-white/85 truncate">Te ajudo a pensar. A resposta é sua!</p>
              </div>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar"
                className="rounded-full bg-white/15 hover:bg-white/25 min-w-[40px] min-h-[40px] flex items-center justify-center"><X className="size-5" /></button>
            </header>
            <div className="flex-1 min-h-0"><ChatFlow contexto={{ activityId }} /></div>
          </section>
        </div>
      )}
    </>
  );
}
