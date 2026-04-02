import { useEffect, useRef } from "react";
import { Mic } from "lucide-react";
import type { Transcript, Translation } from "@call-assistant/shared-types";

interface TranscriptPanelProps {
  transcripts: Transcript[];
  translations: Map<string, Translation>;
}

const PARAGRAPH_BREAK_MS = 5_000;

interface TranscriptGroup {
  key: string;
  speaker: string;
  texts: string[];
  translationTexts: string[];
  isFinal: boolean;
  lastCreatedAt: string;
}

function groupTranscripts(
  transcripts: Transcript[],
  translations: Map<string, Translation>
): TranscriptGroup[] {
  const groups: TranscriptGroup[] = [];
  for (const t of transcripts) {
    const tl = translations.get(t.id);
    const last = groups[groups.length - 1];
    const gap = last
      ? new Date(t.createdAt).getTime() - new Date(last.lastCreatedAt).getTime()
      : Infinity;
    const sameSpeaker = last?.speaker === t.speaker;
    if (last && sameSpeaker && gap < PARAGRAPH_BREAK_MS) {
      last.texts.push(t.text);
      if (tl) last.translationTexts.push(tl.targetText);
      last.isFinal = t.isFinal;
      last.lastCreatedAt = t.createdAt;
    } else {
      groups.push({
        key: t.id,
        speaker: t.speaker,
        texts: [t.text],
        translationTexts: tl ? [tl.targetText] : [],
        isFinal: t.isFinal,
        lastCreatedAt: t.createdAt,
      });
    }
  }
  return groups;
}

export function TranscriptPanel({ transcripts, translations }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const groups = groupTranscripts(transcripts, translations);

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
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
            <Mic size={32} strokeWidth={1.2} />
            <p className="text-base">Aguardando fala…</p>
            <p className="text-sm text-white/15">O áudio aparecerá aqui em tempo real</p>
          </div>
        )}

        {groups.map((g) => (
          <TranscriptGroupEntry key={g.key} group={g} />
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

interface TranscriptGroupEntryProps {
  group: TranscriptGroup;
}

function TranscriptGroupEntry({ group }: TranscriptGroupEntryProps) {
  const isLocal = group.speaker === "LOCAL";
  const fullText = group.texts.join(" ");
  const fullTranslation = group.translationTexts.join(" ");

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
          } ${!group.isFinal ? "opacity-50 italic" : ""}`}
        >
          <p className="text-base leading-relaxed font-medium">{fullText}</p>
        </div>

        {fullTranslation && (
          <div
            className={`flex items-start gap-2 px-1 select-text cursor-text max-w-full ${
              isLocal ? "flex-row" : "flex-row-reverse"
            }`}
          >
            <span className="mt-px shrink-0 text-[10px] font-bold text-white/30 bg-white/8 border border-white/12 rounded px-1.5 py-0.5 uppercase tracking-wider">
              PT
            </span>
            <p className="text-sm text-white/60 leading-relaxed">{fullTranslation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
