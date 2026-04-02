import { Sparkles, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
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
  const { current, suggestions, currentIndex, viewPrevious, viewNext } = useCopilotStore();
  const [copied, setCopied] = useState<number | null>(null);
  const isLive = currentIndex === suggestions.length - 1;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!current) {
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
      {/* Navigation bar */}
      {suggestions.length > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/3 shrink-0">
          <button
            onClick={viewPrevious}
            disabled={currentIndex === 0}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            title="Resposta anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/40 font-medium tabular-nums">
              {currentIndex + 1} / {suggestions.length}
            </span>
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ao vivo
              </span>
            )}
          </div>
          <button
            onClick={viewNext}
            disabled={isLive}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            title="Próxima resposta"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {current.contextSummary && (
        <div className="px-5 pt-4 pb-3 border-b border-white/10 bg-white/3 shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-1.5">
            O que foi dito
          </p>
          <p className="text-sm text-white/65 leading-relaxed select-text cursor-text line-clamp-3">
            {current.contextSummary}
          </p>
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto px-4 pt-4 pb-6 space-y-3 scroll-smooth">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 px-1 mb-1">
            Respostas sugeridas
          </p>

          {current.suggestions.length === 0 && (
            <p className="text-sm text-white/30 text-center mt-6 italic">
              Nenhuma sugestão gerada
            </p>
          )}

          {current.suggestions.map((s, i) => {
            const { badge: badgeCls, dot: dotCls } = getLabelStyle(i);
            return (
              <div
                key={i}
                className="flex flex-col gap-2.5 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/8"
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

                <p className="text-sm font-semibold text-white leading-relaxed select-text cursor-text">
                  {s}
                </p>

                {current.suggestionTranslations[i] ? (
                  <div className="flex items-start gap-2 pt-1 border-t border-white/8">
                    <span className="mt-px shrink-0 text-[10px] font-bold text-white/25 bg-white/6 border border-white/10 rounded px-1.5 py-0.5 uppercase tracking-wider">
                      PT
                    </span>
                    <p className="text-[13px] text-white/50 leading-snug select-text cursor-text line-clamp-3">
                      {current.suggestionTranslations[i]}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0f0f17] to-transparent" />
      </div>
    </div>
  );
}
