import { useEffect, useRef } from "react";
import { Mic } from "lucide-react";
import type { Transcript, Translation } from "@call-assistant/shared-types";

interface TranscriptPanelProps {
  transcripts: Transcript[];
  translations: Map<string, Translation>;
}

export function TranscriptPanel({ transcripts, translations }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
        <Mic size={13} className="text-white/40" />
        <span className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          Conversa
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {transcripts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
            <Mic size={32} strokeWidth={1.2} />
            <p className="text-base">Aguardando fala…</p>
            <p className="text-sm text-white/15">O áudio aparecerá aqui em tempo real</p>
          </div>
        )}

        {transcripts.map((t) => {
          const translation = translations.get(t.id);
          return (
            <TranscriptEntry key={t.id} transcript={t} translation={translation} />
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

interface TranscriptEntryProps {
  transcript: Transcript;
  translation?: Translation;
}

function TranscriptEntry({ transcript, translation }: TranscriptEntryProps) {
  const isLocal = transcript.speaker === "LOCAL";

  return (
    <div className={`flex flex-col gap-2.5 ${isLocal ? "items-start" : "items-end"}`}>
      <div className="text-[11px] font-medium text-white/30 px-1">
        {isLocal ? "Entrevistador" : "Você"}
      </div>

      <div className={`max-w-[90%] flex flex-col gap-2 ${isLocal ? "items-start" : "items-end"}`}>
        <div
          className={`rounded-2xl px-5 py-3 select-text cursor-text ${
            isLocal
              ? "bg-[#1e1e2e] border border-white/12 text-white rounded-tl-sm"
              : "bg-blue-600 text-white rounded-tr-sm"
          } ${!transcript.isFinal ? "opacity-50 italic" : ""}`}
        >
          <p className="text-base leading-relaxed font-medium">{transcript.text}</p>
        </div>

        {translation && (
          <div
            className={`flex items-start gap-2 px-1 select-text cursor-text max-w-full ${
              isLocal ? "flex-row" : "flex-row-reverse"
            }`}
          >
            <span className="mt-px shrink-0 text-[10px] font-bold text-white/30 bg-white/8 border border-white/12 rounded px-1.5 py-0.5 uppercase tracking-wider">
              PT
            </span>
            <p className="text-sm text-white/60 leading-relaxed">
              {translation.targetText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
