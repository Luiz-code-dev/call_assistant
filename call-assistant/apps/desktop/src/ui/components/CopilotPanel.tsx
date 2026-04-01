import { Sparkles, Copy, Check, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useCopilotStore } from "../../application/store/copilotStore";

const LABELS = ["Curta", "Profissional", "Detalhada"];
const LABEL_COLORS = [
  "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "text-purple-400 bg-purple-400/10 border-purple-400/20",
];

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
      <div className="flex flex-col h-full items-center justify-center gap-3 text-white/20 px-6 text-center">
        <Sparkles size={28} strokeWidth={1.5} />
        <p className="text-sm">Aguardando transcrição…</p>
        <p className="text-xs text-white/15 leading-snug">
          O Copilot vai sugerir respostas automaticamente
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {latest.contextSummary && (
        <div className="px-4 py-3 border-b border-white/8 bg-white/3">
          <div className="flex items-start gap-2">
            <MessageSquare size={12} className="text-white/30 mt-0.5 shrink-0" />
            <p className="text-xs text-white/50 leading-relaxed select-text cursor-text">
              {latest.contextSummary}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {latest.suggestions.length === 0 && (
          <p className="text-xs text-white/30 text-center mt-4 italic">
            Nenhuma sugestão gerada
          </p>
        )}

        {latest.suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => handleCopy(s, i)}
            className="group w-full flex flex-col gap-2 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/9 border border-white/8 hover:border-white/16 text-left transition-all"
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${LABEL_COLORS[i] ?? "text-white/40 bg-white/5 border-white/10"}`}
              >
                {LABELS[i] ?? `Opção ${i + 1}`}
              </span>
              <span className="text-white/20 group-hover:text-white/50 transition-colors">
                {copied === i ? (
                  <Check size={13} className="text-green-400" />
                ) : (
                  <Copy size={13} />
                )}
              </span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed select-text cursor-text">
              {s}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
