"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Volume2, ChevronRight, XCircle, ArrowRight, Star, Sparkles, Lightbulb, Trophy } from "lucide-react";
import { CARTAO, BOTAO, BOTAO_CLARO, FUNDO, Carregando, IconeMateria, materiaDe } from "@/components/escola/reforco-ui";

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
  erroComum: { texto: string; exemplo: string; questao?: { enunciado: string; marcada: string; certa: string } } | null;
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
  const [materia, setMateria] = useState<string | null>(null);
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
    setMateria(d.materia ?? null);
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

  const m = materiaDe(materia);
  const cor = m?.cor ?? "#6D28D9";

  // ── Tela de carregamento ───────────────────────────────────────────────────
  if (loading) return <Carregando texto="Preparando o diagnóstico..." />;

  if (erro) return (
    <div className={`${FUNDO} flex flex-col items-center justify-center gap-4 p-6 text-center`}>
      <XCircle className="size-10 text-[#B91C1C]" />
      <p className="text-[#1F1A2E] font-semibold">{erro}</p>
      <button onClick={() => router.push("/escola/aluno")} className={BOTAO}>Voltar ao início</button>
    </div>
  );

  // ── Resultado ─────────────────────────────────────────────────────────────
  if (resultado) return (
    <div className={FUNDO}>
      <header className="relative overflow-hidden rounded-b-[32px] text-white text-center"
        style={{ background: `linear-gradient(135deg, ${cor}, #6D28D9)` }}>
        <div className="absolute -top-14 -right-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute top-16 -left-12 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative max-w-lg mx-auto px-5 pt-10 pb-16">
          <div className="mx-auto w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[#FBBF24] flex items-center justify-center shadow-lg">
              <Trophy className="size-7 text-white" />
            </div>
          </div>
          <Star className="absolute top-8 left-10 size-5 text-[#FDE68A] fill-current" />
          <Sparkles className="absolute top-14 right-12 size-5 text-white/80" />
          <h1 className="text-2xl font-extrabold mt-4">Você terminou o diagnóstico!</h1>
          <p className="text-sm text-white/85 mt-1">{m ? `${m.nome}: agora você sabe por onde começar.` : "Agora você sabe por onde começar."}</p>
        </div>
      </header>

      <main className="relative max-w-lg mx-auto px-4 -mt-10 space-y-4 pb-10">
        {/* O que você já sabe */}
        {(resultado.domina.length > 0 || resultado.quaseLa.length > 0) && (
          <section className={`${CARTAO} p-5`}>
            <p className="text-sm font-extrabold text-[#166534] mb-3 flex items-center gap-2"><Star className="size-4 fill-current" />O que você já sabe</p>
            <div className="flex flex-wrap gap-2">
              {resultado.domina.map((h) => (
                <span key={h.code} className="bg-[#DCFCE7] text-[#166534] px-3 py-1.5 rounded-full text-xs font-bold">{h.tituloAluno}</span>
              ))}
              {resultado.quaseLa.map((h) => (
                <span key={h.code} className="bg-[#FEF3C7] text-[#92400E] px-3 py-1.5 rounded-full text-xs font-bold">Quase lá: {h.tituloAluno}</span>
              ))}
            </div>
          </section>
        )}

        {/* Onde vamos começar */}
        {resultado.aindaNao.length > 0 && (
          <section className={`${CARTAO} p-5`}>
            <p className="text-sm font-extrabold text-[#1F1A2E] mb-2">Onde vamos começar</p>
            {resultado.degrau.length > 1 && (() => {
              // Escada de baixo para cima: da base até o conteúdo do ano do aluno
              const sabe = new Set([...resultado.domina, ...resultado.quaseLa].map((h) => h.code));
              const degraus = [...resultado.degrau].reverse();
              const partida = resultado.habilidadePartida?.code ?? null;
              const iPartida = degraus.findIndex((h) => h.code === partida);
              return (
                <ol className="mb-4 space-y-2">
                  {[...degraus].reverse().map((h) => {
                    const i = degraus.findIndex((x) => x.code === h.code);
                    const objetivo = i === degraus.length - 1;
                    const comeca = h.code === partida;
                    const jaSabe = !comeca && (sabe.has(h.code) || (iPartida >= 0 && i < iPartida));
                    return (
                      <li key={h.code} className="flex items-center gap-3 rounded-2xl p-2.5"
                        style={comeca ? { background: cor + "14", boxShadow: `inset 0 0 0 2px ${cor}` } : { background: "#F8F7FC" }}>
                        <span className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0"
                          style={comeca ? { background: cor, color: "#fff" } : jaSabe ? { background: "#DCFCE7", color: "#166534" } : { background: "#fff", color: "#8B84A0" }}>
                          {jaSabe ? <Star className="size-4 fill-current" /> : h.ano ? `${h.ano}º` : i + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm leading-snug ${comeca ? "font-extrabold text-[#1F1A2E]" : "font-semibold text-[#5B5470]"}`}>{h.tituloAluno}</span>
                          <span className="block text-[11px] font-semibold" style={{ color: comeca ? cor : jaSabe ? "#166534" : "#8B84A0" }}>
                            {comeca ? "Você começa aqui" : jaSabe ? "Você já sabe" : objetivo ? "Conteúdo do seu ano" : "Próximo degrau"}{h.ano ? ` · ${h.ano}º ano` : ""}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              );
            })()}
            <p className="text-sm text-[#1F1A2E] leading-relaxed">
              {resultado.habilidadePartida
                ? <>Vamos começar por <strong>{resultado.habilidadePartida.tituloAluno}</strong>. Firmando essa base, você sobe degrau a degrau.</>
                : <>Vamos praticar: <strong>{resultado.aindaNao.map((h) => h.tituloAluno).join(", ")}</strong>.</>}
            </p>
          </section>
        )}

        {/* Erro mais comum */}
        {resultado.erroComum && (
          <section className="rounded-3xl bg-[#FFF7E0] p-5 flex gap-3 items-start">
            <div className="w-10 h-10 rounded-2xl bg-[#FBBF24] text-white flex items-center justify-center shrink-0"><Lightbulb className="size-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-extrabold text-[#92400E] mb-2">Um erro que vamos resolver juntos</p>
              {resultado.erroComum.questao && (
                <div className="rounded-2xl bg-white p-3 mb-2 space-y-1.5">
                  <p className="text-[13px] text-[#5B5470] leading-snug">{resultado.erroComum.questao.enunciado}</p>
                  <p className="text-[13px] leading-snug"><span className="font-bold text-[#B45309]">Você marcou:</span> <span className="text-[#1F1A2E]">{resultado.erroComum.questao.marcada}</span></p>
                  <p className="text-[13px] leading-snug"><span className="font-bold text-[#166534]">O certo é:</span> <span className="text-[#1F1A2E]">{resultado.erroComum.questao.certa}</span></p>
                </div>
              )}
              <p className="text-sm text-[#1F1A2E] leading-relaxed">{resultado.erroComum.questao ? <><span className="font-bold">Pense assim: </span>{resultado.erroComum.texto}</> : resultado.erroComum.texto}</p>
            </div>
            <button onClick={() => ouvir(resultado.erroComum?.texto ?? "")} aria-label="Ouvir"
              className="shrink-0 rounded-full bg-white text-[#92400E] min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Volume2 className="size-4" />
            </button>
          </section>
        )}

        {/* Trilha atribuída */}
        {trilha ? (
          <section className={`${CARTAO} p-5 space-y-4`}>
            <div className="flex items-center gap-3">
              <IconeMateria chave={materia} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: cor }}>Sua trilha está pronta</p>
                <p className="font-extrabold text-[#1F1A2E] leading-snug">{trilha.title}</p>
              </div>
            </div>
            <div className="flex justify-between gap-1">
              {["Relembrar", "Exemplo", "Praticar", "Aplicar", "Explicar"].map((e, i) => (
                <div key={e} className="flex-1 flex flex-col items-center gap-1">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold"
                    style={i === 0 ? { background: cor, color: "#fff" } : { background: "#F3F0FB", color: "#8B84A0" }}>{i + 1}</span>
                  <span className="text-[10px] font-semibold text-[#5B5470]">{e}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push("/escola/aluno/trilha")}
              className={`${BOTAO} w-full text-base`} style={{ background: cor }}>
              Começar minha trilha <ArrowRight className="size-5" />
            </button>
          </section>
        ) : (
          <section className={`${CARTAO} p-5 text-center`}>
            <p className="text-sm text-[#5B5470]">Sua trilha está sendo preparada. Volte em instantes.</p>
          </section>
        )}

        <button onClick={() => router.push("/escola/aluno")} className={`${BOTAO_CLARO} w-full`}>
          Escolher outra matéria
        </button>
      </main>
    </div>
  );

  if (!estado) return null;

  const { questaoAtual, totalQuestoes, atividade, degrauAplicado } = estado;
  const questao = atividade?.questions?.[0];
  const pct = Math.round(((questaoAtual - 1) / totalQuestoes) * 100);

  return (
    <div className={`${FUNDO} flex flex-col`}>
      {/* Cabeçalho */}
      <header className="relative overflow-hidden rounded-b-[28px] text-white" style={{ background: `linear-gradient(135deg, ${cor}, ${cor}CC)` }}>
        <div className="absolute -top-12 -right-8 w-36 h-36 rounded-full bg-white/10" />
        <div className="relative max-w-lg mx-auto px-5 pt-4 pb-5">
          <div className="flex items-center justify-between min-h-[44px]">
            <button onClick={() => router.push("/escola/aluno")} className="inline-flex items-center gap-1 rounded-full bg-white/15 pl-2 pr-3 min-h-[40px] text-sm font-semibold">
              <ChevronRight className="size-4 rotate-180" />Sair
            </button>
            <span className="text-sm font-bold bg-white/15 rounded-full px-3 py-1">{questaoAtual} de {totalQuestoes}</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-white/80 mt-2">
            {atividade.isDegrau ? "Base do conteúdo" : "Diagnóstico"}{m ? ` · ${m.nome}` : ""}
          </p>
          <div className="mt-2 h-3 bg-white/25 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 flex flex-col gap-4">
        {degrauAplicado && (
          <div className="rounded-2xl bg-[#FFF7E0] px-4 py-3 text-sm text-[#92400E] font-semibold">
            Vamos dar um passo atrás para firmar a base.
          </div>
        )}
        {avisoRapido && (
          <div className="rounded-2xl bg-[#FFF7E0] px-4 py-3 text-sm text-[#92400E] font-semibold text-center">
            Vamos com calma! Leia a questão com atenção antes de responder.
          </div>
        )}

        {/* Enunciado */}
        <section className={`${CARTAO} p-5 space-y-3`}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-[#1F1A2E] text-[17px] font-semibold leading-relaxed flex-1">
              {atividade.prompt || questao?.question}
            </p>
            <button onClick={() => ouvir(`${atividade.prompt || questao?.question || ""} ${(questao?.options ?? []).map((op, i) => `Alternativa ${String.fromCharCode(65 + i)}: ${op.text}.`).join(" ")}`)} aria-label="Ouvir"
              className="shrink-0 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center" style={{ background: cor + "18", color: cor }}>
              <Volume2 className="size-5" />
            </button>
          </div>
          {atividade.prompt && questao?.question && questao.question !== atividade.prompt && (
            <p className="text-[#1F1A2E] leading-relaxed border-t border-[#F3F0FB] pt-3">{questao.question}</p>
          )}
        </section>

        {/* Alternativas */}
        <div className="space-y-3">
          {questao?.options?.map((op, i) => (
            <button
              key={i}
              disabled={respondendo}
              onClick={() => responder(i)}
              className={`w-full flex items-center gap-3 text-left rounded-2xl bg-white p-3 pr-4 font-semibold text-[#1F1A2E] min-h-[60px] shadow-[0_2px_10px_rgba(91,33,182,0.07)] border-2 border-transparent transition-all
                ${respondendo ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98] hover:border-[#C4B5FD]"}`}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0" style={{ background: cor + "18", color: cor }}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="leading-snug">{op.text}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
