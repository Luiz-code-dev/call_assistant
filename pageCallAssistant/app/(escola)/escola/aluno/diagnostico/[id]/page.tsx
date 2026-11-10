"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Volume2, ChevronRight, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface Opcao { text: string }
interface Atividade {
  id: string; type: string; prompt: string;
  questions: { id: string; question: string; options: Opcao[] }[];
  skillCode?: string;
  isDegrau?: boolean;
}
interface Estado {
  sessionId: string;
  questaoAtual: number;
  totalQuestoes: number;
  atividade: Atividade;
  degrauAplicado?: boolean;
  degrauSkillCode?: string;
  retomada?: boolean;
  retorno?: { isCorrect: boolean; explanation?: string };
}
interface HabilidadeAluno { code: string; tituloAluno: string; ano: number | null; nivel?: "AINDA_NAO" | "QUASE_LA" | "DOMINA" }
interface Resultado {
  domina: HabilidadeAluno[];
  quaseLa: HabilidadeAluno[];
  aindaNao: HabilidadeAluno[];
  degrau: HabilidadeAluno[];
  habilidadePartida: HabilidadeAluno | null;
  erroComum: { texto: string; exemplo: string } | null;
}
interface TrilhaAtribuida {
  id: string;
  title: string;
  primeiraAtividadeId: string | null;
}

const STEP_MIN_MS = 5_000;

export default function DiagnosticoPage() {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const router = useRouter();

  const [estado, setEstado] = useState<Estado | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [trilha, setTrilha] = useState<TrilhaAtribuida | null>(null);
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
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            const utt = new SpeechSynthesisUtterance(texto);
            utt.lang = "pt-BR";
            window.speechSynthesis.speak(utt);
          }
        });
      }).catch(() => null);
  }

  async function responder(selectedIndex: number) {
    if (!estado || respondendo) return;
    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed < STEP_MIN_MS) {
      setAvisoRapido(true);
      setTimeout(() => setAvisoRapido(false), 2500);
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
      setResultado(d.resultado ?? null);
      setTrilha(d.trilha ?? null);
      setEstado(null);
    } else {
      setEstado({ ...d, sessionId: estado.sessionId });
      startedAtRef.current = Date.now();
    }
    setRespondendo(false);
  }

  // ── Tela de carregamento ───────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#F8F7FC] flex items-center justify-center">
      <div className="text-[#5B5470] text-sm">Preparando diagnóstico...</div>
    </div>
  );

  if (erro) return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <XCircle className="size-10 text-[#B91C1C]" />
      <p className="text-[#1F1A2E] font-medium">{erro}</p>
      <button onClick={() => router.push("/escola/aluno")} className="text-[#6D28D9] underline text-sm">Voltar ao início</button>
    </div>
  );

  // ── Resultado ─────────────────────────────────────────────────────────────
  if (resultado) return (
    <div className="min-h-screen bg-[#F8F7FC]">
      <header className="bg-white border-b border-[#E9E5F5] px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-3">
            <CheckCircle2 className="size-6 text-[#166534]" />
          </div>
          <h1 className="text-[#1F1A2E] text-xl font-bold">Você terminou o diagnóstico!</h1>
          <p className="text-[#5B5470] text-sm mt-1">Agora você sabe por onde começar.</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* O que você já domina */}
        {(resultado.domina.length > 0 || resultado.quaseLa.length > 0) && (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl p-4">
            <p className="text-xs font-semibold text-[#166534] uppercase tracking-wide mb-2">O que você já sabe</p>
            <div className="flex flex-wrap gap-2">
              {resultado.domina.map((h) => (
                <span key={h.code} className="bg-[#DCFCE7] text-[#166534] px-2.5 py-1 rounded-full text-xs font-medium">Domina: {h.tituloAluno}</span>
              ))}
              {resultado.quaseLa.map((h) => (
                <span key={h.code} className="bg-[#FEF3C7] text-[#92400E] px-2.5 py-1 rounded-full text-xs font-medium">Quase lá: {h.tituloAluno}</span>
              ))}
            </div>
          </div>
        )}

        {/* Onde vamos começar */}
        {resultado.aindaNao.length > 0 && (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl p-4">
            <p className="text-xs font-semibold text-[#5B5470] uppercase tracking-wide mb-2">Onde vamos começar</p>
            {resultado.degrau.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {resultado.degrau.map((h, i) => (
                  <span key={h.code} className="flex items-center gap-1 text-xs text-[#5B5470]">
                    {i > 0 && <ChevronRight className="size-3" />}
                    <span className="bg-[#EDE9FE] text-[#6D28D9] px-2 py-0.5 rounded-full font-medium">{h.ano ? `${h.ano}º ano` : h.tituloAluno}</span>
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm text-[#1F1A2E]">
              {resultado.habilidadePartida
                ? `Vamos começar por: ${resultado.habilidadePartida.tituloAluno}. Firmando essa base, você sobe degrau a degrau.`
                : `Vamos praticar: ${resultado.aindaNao.map((h) => h.tituloAluno).join(", ")}.`}
            </p>
          </div>
        )}

        {/* Erro mais comum */}
        {resultado.erroComum && (
          <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 flex gap-3 items-start">
            <div>
              <p className="text-xs font-semibold text-[#92400E] uppercase tracking-wide mb-1">Um erro que vamos resolver juntos</p>
              <p className="text-sm text-[#1F1A2E]">{resultado.erroComum.texto}</p>
            </div>
            <button onClick={() => ouvir(resultado.erroComum?.texto ?? "")} className="shrink-0 p-2 rounded-lg bg-white/60 text-[#92400E] min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Volume2 className="size-4" />
            </button>
          </div>
        )}

        {/* Trilha atribuída */}
        {trilha ? (
          <div className="space-y-3">
            <div className="bg-[#EDE9FE] border border-[#6D28D9]/20 rounded-2xl p-4">
              <p className="text-xs font-semibold text-[#6D28D9] uppercase tracking-wide mb-1">Sua trilha está pronta</p>
              <p className="font-semibold text-[#1F1A2E]">{trilha.title}</p>
              <p className="text-xs text-[#5B5470] mt-1">5 etapas: relembrar, exemplo, praticar, aplicar e explicar</p>
            </div>
            <button
              onClick={() => trilha.primeiraAtividadeId
                ? router.push(`/escola/aluno/atividades/${trilha.primeiraAtividadeId}`)
                : router.push("/escola/aluno/trilha")}
              className="w-full py-4 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-base min-h-[52px] flex items-center justify-center gap-2 transition-colors"
            >
              Começar minha trilha <ArrowRight className="size-5" />
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl p-4 text-center">
            <p className="text-sm text-[#5B5470]">Trilha sendo preparada. Volte em instantes.</p>
          </div>
        )}

        <button
          onClick={() => router.push("/escola/aluno")}
          className="w-full py-3 rounded-2xl border border-[#E9E5F5] bg-white text-[#5B5470] font-medium text-sm min-h-[44px] transition-colors hover:border-[#6D28D9]"
        >
          Escolher outra matéria
        </button>
      </main>
    </div>
  );

  if (!estado) return null;

  const { questaoAtual, totalQuestoes, atividade, degrauAplicado, degrauSkillCode } = estado;
  const questao = atividade?.questions?.[0];
  const pct = Math.round(((questaoAtual - 1) / totalQuestoes) * 100);

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col">
      {/* Cabeçalho */}
      <header className="bg-white border-b border-[#E9E5F5] px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#5B5470] uppercase tracking-wide">
              {atividade.isDegrau ? "BASE DO CONTEÚDO" : "DIAGNÓSTICO"}
            </span>
            <span className="text-xs text-[#5B5470]">{questaoAtual} de {totalQuestoes}</span>
          </div>
          <div className="h-2 bg-[#E9E5F5] rounded-full overflow-hidden">
            <div className="h-full bg-[#6D28D9] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          {degrauAplicado && degrauSkillCode && (
            <div className="mt-2 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl px-3 py-2 text-xs text-[#92400E] font-medium">
              Vamos dar um passo atrás para firmar a base — verificando {degrauSkillCode}.
            </div>
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
          <div className="flex items-start justify-between gap-3">
            <p className="text-[#1F1A2E] font-medium leading-relaxed flex-1">
              {atividade.prompt || questao?.question}
            </p>
            <button onClick={() => ouvir(atividade.prompt || questao?.question || "")}
              className="shrink-0 p-2 rounded-lg bg-[#EDE9FE] text-[#6D28D9] min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[#DDD6EE] transition-colors">
              <Volume2 className="size-4" />
            </button>
          </div>
          {atividade.prompt && questao?.question && questao.question !== atividade.prompt && (
            <p className="text-[#1F1A2E] text-sm leading-relaxed border-t border-[#E9E5F5] pt-3">{questao.question}</p>
          )}
        </div>

        {/* Alternativas */}
        {questao?.options?.map((op, i) => (
          <button
            key={i}
            disabled={respondendo}
            onClick={() => responder(i)}
            className={`w-full text-left rounded-2xl border-2 p-4 font-medium text-[#1F1A2E] min-h-[52px] transition-all
              ${respondendo ? "opacity-60 cursor-not-allowed" : "hover:border-[#6D28D9] hover:bg-[#EDE9FE]/30 active:scale-[0.98]"}
              border-[#E9E5F5] bg-white`}
          >
            <span className="text-[#6D28D9] font-bold mr-3">{String.fromCharCode(65 + i)}.</span>
            {op.text}
          </button>
        ))}
      </main>
    </div>
  );
}
