"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Volume2 } from "lucide-react";

interface Opcao { text: string }
interface Atividade { id: string; type: string; prompt: string; questions: { id: string; question: string; options: Opcao[] }[]; skillCode?: string }
interface Estado {
  sessionId: string;
  questaoAtual: number;
  totalQuestoes: number;
  atividade: Atividade;
  degrauAplicado?: boolean;
  retomada?: boolean;
}

const STEP_MIN_MS = 5_000;

export default function DiagnosticoPage() {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const router = useRouter();

  const [estado, setEstado] = useState<Estado | null>(null);
  const [concluido, setConcluido] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [respondendo, setRespondendo] = useState(false);
  const [avisoRapido, setAvisoRapido] = useState(false);
  const startedAtRef = useRef<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const iniciar = useCallback(async () => {
    setLoading(true);
    setErro("");
    const r = await fetch("/api/escola/aluno/diagnostico/sessao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "iniciar", diagnosticId }),
    });
    const d = await r.json();
    if (!r.ok) { setErro(d.error ?? "Não foi possível iniciar o diagnóstico."); setLoading(false); return; }
    setEstado(d);
    startedAtRef.current = Date.now();
    setLoading(false);
  }, [diagnosticId]);

  useEffect(() => { iniciar(); }, [iniciar]);

  function ouvir(texto: string) {
    if (!texto) return;
    fetch("/api/escola/aluno/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: texto }) })
      .then(r => r.ok ? r.blob() : null)
      .then(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {
          // fallback speechSynthesis
          if ("speechSynthesis" in window) {
            const u = new SpeechSynthesisUtterance(texto);
            u.lang = "pt-BR";
            window.speechSynthesis.speak(u);
          }
        });
      })
      .catch(() => {
        if ("speechSynthesis" in window) {
          const u = new SpeechSynthesisUtterance(texto);
          u.lang = "pt-BR";
          window.speechSynthesis.speak(u);
        }
      });
  }

  async function responder(selectedIndex: number) {
    if (!estado || respondendo) return;
    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed < STEP_MIN_MS) {
      setAvisoRapido(true);
      setTimeout(() => setAvisoRapido(false), 2000);
      return;
    }
    setRespondendo(true);
    const r = await fetch("/api/escola/aluno/diagnostico/sessao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "responder", sessionId: estado.sessionId, selectedIndex, elapsedMs: elapsed }),
    });
    const d = await r.json();
    if (!r.ok) { setErro(d.error ?? "Erro ao registrar resposta."); setRespondendo(false); return; }
    if (d.concluido) {
      setConcluido(true);
    } else {
      setEstado({ ...d, sessionId: estado.sessionId });
      startedAtRef.current = Date.now();
    }
    setRespondendo(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F7FC] flex items-center justify-center">
      <div className="text-[#5B5470]">Preparando diagnóstico...</div>
    </div>
  );

  if (erro) return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-[#B91C1C] font-medium">{erro}</p>
      <button onClick={() => router.push("/escola/aluno")} className="text-[#6D28D9] underline text-sm">Voltar</button>
    </div>
  );

  if (concluido) return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center gap-6 p-6 text-center max-w-md mx-auto">
      <div className="w-20 h-20 rounded-full bg-[#EDE9FE] flex items-center justify-center mx-auto">
        <span className="text-4xl">&#10003;</span>
      </div>
      <h1 className="text-[#1F1A2E] text-2xl font-bold">Pronto!</h1>
      <p className="text-[#5B5470]">Sua trilha está sendo preparada. Em breve aparecerá no início.</p>
      <button
        onClick={() => router.push("/escola/aluno")}
        className="w-full max-w-xs py-4 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-lg min-h-[52px] transition-colors"
      >
        Ir para o início
      </button>
    </div>
  );

  if (!estado) return null;

  const { questaoAtual, totalQuestoes, atividade, degrauAplicado } = estado;
  const questao = atividade.questions?.[0];
  const pct = Math.round(((questaoAtual - 1) / totalQuestoes) * 100);

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col">
      {/* Cabecalho */}
      <header className="bg-white border-b border-[#E9E5F5] px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#5B5470] uppercase tracking-wide">DIAGNÓSTICO</span>
            <span className="text-xs text-[#5B5470]">{questaoAtual} de {totalQuestoes}</span>
          </div>
          <div className="h-2 bg-[#E9E5F5] rounded-full overflow-hidden">
            <div className="h-full bg-[#6D28D9] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          {degrauAplicado && (
            <p className="text-xs text-[#92400E] mt-1">Vamos verificar um conceito anterior para te ajudar melhor.</p>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {avisoRapido && (
          <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl px-4 py-3 text-sm text-[#92400E] font-medium text-center">
            Vamos com calma! Leia a questão com atenção antes de responder.
          </div>
        )}

        {/* Enunciado */}
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5 space-y-3">
          {atividade.skillCode && (
            <p className="text-xs font-semibold text-[#6D28D9] uppercase tracking-wide">{atividade.skillCode}</p>
          )}
          <div className="flex items-start gap-3">
            <p className="text-[#1F1A2E] text-base leading-relaxed flex-1">{atividade.prompt}</p>
            <button
              onClick={() => ouvir(atividade.prompt + (questao ? " " + questao.question : ""))}
              title="Ouvir enunciado"
              className="shrink-0 p-2.5 rounded-xl bg-[#EDE9FE] text-[#6D28D9] hover:bg-[#DDD6EE] min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            >
              <Volume2 size={18} />
            </button>
          </div>
          {questao && questao.question !== atividade.prompt && (
            <p className="text-[#1F1A2E] font-semibold">{questao.question}</p>
          )}
        </div>

        {/* Alternativas */}
        {questao && (
          <div className="space-y-3">
            {questao.options.map((op, i) => (
              <button
                key={i}
                onClick={() => responder(i)}
                disabled={respondendo}
                className="w-full text-left bg-white border-2 border-[#E9E5F5] hover:border-[#6D28D9] hover:bg-[#F5F3FF] rounded-2xl px-5 py-4 text-[#1F1A2E] font-medium min-h-[52px] transition-all disabled:opacity-50"
              >
                <span className="text-[#6D28D9] font-bold mr-3">{String.fromCharCode(65 + i)}.</span>
                {op.text}
              </button>
            ))}
          </div>
        )}

        {respondendo && (
          <p className="text-center text-[#5B5470] text-sm">Registrando resposta...</p>
        )}
      </main>
    </div>
  );
}
