import { Sparkles, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useCopilotStore } from "../../application/store/copilotStore";

const LABELS = ["Curta", "Profissional", "Detalhada"];
const DEFAULT_STYLE = { dot: "bg-white/40", badge: "text-white/40 bg-white/5 border-white/15" } as const;
const LABEL_STYLES: Array<{ dot: string; badge: string }> = [
  { dot: "bg-emerald-400", badge: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25" },
  { dot: "bg-blue-400",    badge: "text-blue-300 bg-blue-400/10 border-blue-400/25" },
  { dot: "bg-purple-400",  badge: "text-purple-300 bg-purple-400/10 border-purple-400/25" },
];
function getLabelStyle(i: number) { return LABEL_STYLES[i] ?? DEFAULT_STYLE; }

export function CopilotPanel() {
  const { latest } = useCopilotStore();
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!latest) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-white/20 px-8 text-center">
        <Sparkles size={32} strokeWidth={1.2} />
        <p className="text-base font-medium">Copilot pronto</p>
        <p className="text-sm text-white/15 leading-snug">
          Respostas sugeridas aparecerão aqui durante a entrevista
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {latest.contextSummary && (
        <div className="px-5 py-4 border-b border-white/10 bg-white/3 shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-1.5">
            O que foi dito
          </p>
          <p className="text-sm text-white/65 leading-relaxed select-text cursor-text">
            {latest.contextSummary}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 px-1 mb-1">
          Respostas sugeridas
        </p>

        {latest.suggestions.length === 0 && (
          <p className="text-sm text-white/30 text-center mt-6 italic">
            Nenhuma sugestão gerada
          </p>
        )}

        {latest.suggestions.map((s, i) => {
          const { badge: badgeCls, dot: dotCls } = getLabelStyle(i);
          return (
            <div
              key={i}
              className="flex flex-col gap-3 px-4 py-4 rounded-2xl bg-white/5 border border-white/8"
            >
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badgeCls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
                  {LABELS[i] ?? `Opção ${i + 1}`}
                </span>
                <button
                  onClick={() => handleCopy(s, i)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white/40 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/15 transition-all"
                  title="Copiar resposta em inglês"
                >
                  {copied === i ? (
                    <>
                      <Check size={12} className="text-green-400" />
                      <span className="text-green-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copiar
                    </>
                  )}
                </button>
              </div>

              <p className="text-base font-medium text-white leading-relaxed select-text cursor-text">
                {s}
              </p>

              {latest.suggestionTranslations[i] ? (
                <div className="flex items-start gap-2 pt-1 border-t border-white/8">
                  <span className="mt-px shrink-0 text-[10px] font-bold text-white/25 bg-white/6 border border-white/10 rounded px-1.5 py-0.5 uppercase tracking-wider">
                    PT
                  </span>
                  <p className="text-sm text-white/55 leading-relaxed select-text cursor-text">
                    {latest.suggestionTranslations[i]}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
