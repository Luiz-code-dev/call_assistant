import { useEffect, useState } from "react";
import { Mic, PhoneOff, X, ArrowRight, Sparkles } from "lucide-react";
import { useSessionStore } from "../../application/store/sessionStore";
import type { Session } from "@call-assistant/shared-types";
import { useTranscriptStore } from "../../application/store/transcriptStore";
import { useTranscription } from "../../application/hooks/useTranscription";
import { useAudioBridge } from "../../application/hooks/useAudioBridge";
import { TranscriptPanel } from "../components/TranscriptPanel";
import { CopilotPanel } from "../components/CopilotPanel";
import { useCopilotStore } from "../../application/store/copilotStore";

export function SessionPage() {
  const { session, isConnecting, error, startSession, stopSession, clearError } =
    useSessionStore();
  const { transcripts, translations, clear } = useTranscriptStore();
  const { clear: clearCopilot } = useCopilotStore();
  const [showPreCall, setShowPreCall] = useState(false);
  const [showCopilot, setShowCopilot] = useState(true);

  useTranscription(session?.id ?? null);
  useAudioBridge(session?.id ?? null);

  useEffect(() => {
    if (session?.status === "ENDED") {
      clear();
      clearCopilot();
    }
  }, [session?.status, clear, clearCopilot]);

  const handleStartClick = () => setShowPreCall(true);

  const handlePreCallConfirm = (meetingContext: string) => {
    setShowPreCall(false);
    startSession({
      sourceLanguage: "en-US",
      targetLanguage: "pt-BR",
      enableTts: false,
      enableSuggestions: false,
      meetingContext: meetingContext.trim() || undefined,
    });
  };

  const isActive = session?.status === "ACTIVE";

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f] text-white select-none">
      {showPreCall && (
        <PreCallModal
          onConfirm={handlePreCallConfirm}
          onCancel={() => setShowPreCall(false)}
        />
      )}

      <Header
        isActive={isActive}
        isConnecting={isConnecting}
        onStart={handleStartClick}
        onStop={stopSession}
      />

      {error && (
        <div
          className="mx-4 mt-2 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-lg text-sm text-red-300 flex justify-between"
          role="alert"
        >
          <span>{error}</span>
          <button onClick={clearError} className="ml-4 text-red-300 hover:text-red-100">
            ✕
          </button>
        </div>
      )}

      <main className="flex-1 overflow-hidden p-4 flex gap-3">
        <div className="flex-1 rounded-xl border border-white/10 bg-white/5 overflow-hidden min-w-0">
          <TranscriptPanel transcripts={transcripts} translations={translations} />
        </div>

        {showCopilot && (
          <div className="w-80 shrink-0 rounded-xl border border-white/10 bg-white/5 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
              <div className="flex items-center gap-1.5 text-white/50">
                <Sparkles size={12} />
                <span className="text-xs font-medium">Copilot</span>
              </div>
              <button
                onClick={() => setShowCopilot(false)}
                className="text-white/20 hover:text-white/60 text-[10px] transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CopilotPanel />
            </div>
          </div>
        )}

        {!showCopilot && (
          <button
            onClick={() => setShowCopilot(true)}
            className="self-start mt-1 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors"
            title="Mostrar Copilot"
          >
            <Sparkles size={14} />
          </button>
        )}
      </main>

      <StatusBar session={session} />
    </div>
  );
}

interface HeaderProps {
  isActive: boolean;
  isConnecting: boolean;
  onStart: () => void;
  onStop: () => void;
}

function Header({ isActive, isConnecting, onStart, onStop }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-white/10 app-drag-region">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-400 animate-pulse" : "bg-white/20"}`} />
        <span className="text-sm font-medium text-white/70">Call Assistant</span>
      </div>

      <div className="flex items-center gap-2 app-no-drag">
        {isActive ? (
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-sm transition-colors"
          >
            <PhoneOff size={14} />
            End Session
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={isConnecting}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
          >
            {isConnecting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Mic size={14} />
            )}
            {isConnecting ? "Connecting..." : "Start Session"}
          </button>
        )}
      </div>
    </header>
  );
}

interface StatusBarProps {
  session: Session | null;
}

function StatusBar({ session }: StatusBarProps) {
  return (
    <footer className="px-5 py-2 border-t border-white/10 flex items-center gap-3 text-xs text-white/30">
      {session ? (
        <>
          <span>Session: {session.id.slice(0, 8)}…</span>
          <span>·</span>
          <span>{session.config.sourceLanguage} → {session.config.targetLanguage}</span>
          <span>·</span>
          <span className={session.status === "ACTIVE" ? "text-green-400" : ""}>{session.status}</span>
        </>
      ) : (
        <span>No active session</span>
      )}
    </footer>
  );
}

interface PreCallModalProps {
  onConfirm: (meetingContext: string) => void;
  onCancel: () => void;
}

function PreCallModal({ onConfirm, onCancel }: PreCallModalProps) {
  const [context, setContext] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onConfirm(context);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-white">Contexto da Reunião</h2>
            <p className="text-xs text-white/40 mt-0.5">A IA usará esse contexto para traduzir e sugerir respostas</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <textarea
            autoFocus
            value={context}
            onChange={(e) => setContext(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              "Exemplo:\n• Sistema financeiro, integração com API bancária\n• Cliente: Banco XYZ — reunião de alinhamento de sprint\n• Termos técnicos: endpoint, payload, webhook"
            }
            className="w-full h-36 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-colors"
          />
          <p className="text-xs text-white/25 mt-1.5">Ctrl+Enter para iniciar · Esc para cancelar</p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/8 transition-colors"
          >
            Pular
          </button>
          <button
            onClick={() => onConfirm(context)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            Iniciar Sessão
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
