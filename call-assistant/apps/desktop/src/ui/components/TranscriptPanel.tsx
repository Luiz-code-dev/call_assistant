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
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
        <Mic size={12} className="text-white/30" />
        <span className="text-xs font-semibold tracking-widest text-white/30 uppercase">
          Transcrição
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {transcripts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20 mt-16">
            <Mic size={28} strokeWidth={1.5} />
            <p className="text-sm">Aguardando fala…</p>
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
    <div className={`flex flex-col gap-2 ${isLocal ? "items-end" : "items-start"}`}>
      <div className={`max-w-[88%] flex flex-col gap-1.5 ${isLocal ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 select-text cursor-text ${
            isLocal
              ? "bg-blue-600 text-white rounded-br-md"
              : "bg-white/12 text-white rounded-bl-md"
          } ${!transcript.isFinal ? "opacity-50 italic" : ""}`}
        >
          <p className="text-sm leading-relaxed font-medium">{transcript.text}</p>
        </div>

        {translation && (
          <div
            className={`flex items-start gap-1.5 px-1 select-text cursor-text ${
              isLocal ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <span className="mt-0.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider shrink-0">
              PT
            </span>
            <p className="text-sm text-white/55 leading-snug">
              {translation.targetText}
            </p>
          </div>
        )}
      </div>

      <span className="text-[10px] text-white/20 px-1">
        {isLocal ? "Você" : "Remoto"}
        {transcript.confidence > 0 && ` · ${Math.round(transcript.confidence * 100)}%`}
      </span>
    </div>
  );
}
