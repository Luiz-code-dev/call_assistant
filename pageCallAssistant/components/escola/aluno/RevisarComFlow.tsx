"use client";
/**
 * "Flow, olha meu texto": antes de enviar uma resposta escrita, o Flow dá UMA dica
 * de melhoria (sem reescrever, sem dizer se está certo, sem nota). 3 vezes por atividade.
 */
import { useState } from "react";
import { Sparkles, Volume2, Square } from "lucide-react";
import { RoboFlow, useDigitando, useFalaDoFlow } from "./Mascote";

export default function RevisarComFlow({ activityId, texto }: { activityId: string; texto: string }) {
  const [dica, setDica] = useState<string | null>(null);
  const [pensando, setPensando] = useState(false);
  const [usos, setUsos] = useState(0);
  const { visivel, terminou } = useDigitando(dica ?? "");
  const { falar, parar, falando } = useFalaDoFlow();
  const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;

  async function pedir() {
    setPensando(true);
    try {
      const r = await fetch("/api/escola/aluno/ajudante/revisar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityId, texto }),
      });
      const d = await r.json().catch(() => ({}));
      setDica(d.dica ?? d.error ?? "Não consegui olhar agora. Tente de novo daqui a pouquinho.");
      setUsos((u) => u + 1);
    } catch {
      setDica("A internet caiu. Confira a conexão e tente de novo.");
    } finally { setPensando(false); }
  }

  return (
    <div className="space-y-3">
      {(dica || pensando) && (
        <div className="flex items-end gap-2.5 rounded-3xl bg-white p-3 shadow-[0_4px_18px_rgba(91,33,182,0.10)] border border-[#EDE9F7]">
          <RoboFlow tamanho={64} falando={pensando || falando || (!!dica && !terminou)} humor={pensando ? "pensando" : "feliz"} />
          <div className="flex-1 min-w-0 rounded-2xl rounded-bl-md bg-[#F5F3FF] px-3.5 py-2.5 flex items-start gap-2 mb-1">
            <p className="flex-1 text-[15px] leading-snug text-[#1F1A2E]" aria-live="polite">{pensando ? "Deixa eu ler o seu texto..." : visivel}</p>
            {dica && !pensando && (
              <button type="button" onClick={() => (falando ? parar() : falar(dica))} aria-label={falando ? "Parar" : "Ouvir"}
                className={`shrink-0 rounded-full w-8 h-8 flex items-center justify-center ${falando ? "bg-[#6D28D9] text-white" : "bg-white text-[#6D28D9] border border-[#DDD6FE]"}`}>
                {falando ? <Square className="size-3 fill-current" /> : <Volume2 className="size-4" />}
              </button>
            )}
          </div>
        </div>
      )}
      <button type="button" onClick={pedir} disabled={pensando || palavras < 5 || usos >= 3}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-[#DDD6FE] bg-[#F5F3FF] font-bold text-[#5B21B6] hover:border-[#6D28D9] disabled:opacity-50 min-h-[48px]">
        <Sparkles className="size-4" />
        {usos >= 3 ? "Agora é com você: releia e envie" : palavras < 5 ? "Escreva um pouco para o Flow olhar" : usos ? "Flow, olha de novo" : "Flow, olha meu texto"}
      </button>
    </div>
  );
}
