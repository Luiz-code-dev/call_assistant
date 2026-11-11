"use client";
/**
 * Flow na tela de retorno: comemora Domina e Quase lá, acolhe quem ainda está praticando
 * e chama para a próxima etapa (ou para tentar de novo). Sem nota: só o nível em palavras.
 */
import { Volume2, Square } from "lucide-react";
import { RoboFlow, useDigitando, useFalaDoFlow, type Humor } from "./Mascote";

export function falaDoRetorno(p: { pendente: boolean; nivel: string | null; podeTentar: boolean; base: boolean; tipo: string }): { texto: string; humor: Humor; acena: boolean } {
  if (p.pendente) return { texto: "Estou lendo a sua resposta com carinho. Só um instantinho!", humor: "pensando", acena: false };
  if (p.nivel === "MASTERED") return { texto: "Uau, você domina esse assunto! Estou muito orgulhoso. Bora para a próxima etapa?", humor: "animado", acena: true };
  if (p.nivel === "ALMOST") return { texto: "Quase lá! Faltou só um pouquinho. Leia as dicas aqui embaixo e siga em frente, você está indo muito bem.", humor: "feliz", acena: true };
  if (p.nivel === "NOT_YET" && p.podeTentar) return { texto: "Errar faz parte de aprender! Leia a dica com calma e tente de novo. Eu sei que você consegue.", humor: "pensando", acena: false };
  if (p.nivel === "NOT_YET" && p.base) return { texto: "Vamos firmar a base primeiro. Preparei uma trilha com o que vem antes, e aí você volta aqui mais forte!", humor: "feliz", acena: false };
  if (p.nivel === "NOT_YET") return { texto: "Você se esforçou e isso conta muito. Vamos continuar a trilha e praticar mais um pouco?", humor: "feliz", acena: false };
  return { texto: p.tipo === "WRITTEN" ? "Recebi o seu texto! Veja o retorno aqui embaixo e siga para a próxima etapa." : "Mandou bem por terminar! Veja o retorno e siga para a próxima etapa.", humor: "feliz", acena: true };
}

export default function FlowRetorno(props: { pendente: boolean; nivel: string | null; podeTentar: boolean; base: boolean; tipo: string }) {
  const fala = falaDoRetorno(props);
  const { visivel, terminou } = useDigitando(fala.texto);
  const { falar, parar, falando } = useFalaDoFlow();
  return (
    <section className="relative flex items-end gap-3 rounded-3xl bg-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(91,33,182,0.12)]">
      <button type="button" onClick={() => (falando ? parar() : falar(fala.texto))} aria-label="Ouvir o Flow" className="shrink-0 active:scale-95 transition-transform">
        <RoboFlow tamanho={88} acenando={fala.acena || falando} falando={falando || !terminou} humor={fala.humor} />
      </button>
      <div className="flex-1 min-w-0 rounded-3xl rounded-bl-md bg-[#F5F3FF] border border-[#E9E5F5] px-4 py-3 flex items-start gap-2 mb-1">
        <p className="flex-1 text-[15px] sm:text-[17px] font-bold leading-snug text-[#1F1A2E]" aria-live="polite">{visivel}</p>
        <button type="button" onClick={() => (falando ? parar() : falar(fala.texto))} aria-label={falando ? "Parar" : "Ouvir"}
          className={`shrink-0 rounded-full w-9 h-9 flex items-center justify-center ${falando ? "bg-[#6D28D9] text-white" : "bg-white text-[#6D28D9] border border-[#DDD6FE]"}`}>
          {falando ? <Square className="size-3 fill-current" /> : <Volume2 className="size-4" />}
        </button>
      </div>
    </section>
  );
}
