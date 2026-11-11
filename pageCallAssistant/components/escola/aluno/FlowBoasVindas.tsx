"use client";
/**
 * O Flow recebe o aluno na tela inicial: cumprimenta pelo horário, pergunta se já
 * estudou hoje e aponta o próximo passo (primeiro quiz, a matéria que precisa de
 * reforço ou a trilha em andamento). Tocar no Flow faz ele falar em voz alta.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Volume2, Square, Play } from "lucide-react";
import { RoboFlow, saudacao, useDigitando, useFalaDoFlow, type Humor } from "./Mascote";

export interface MateriaFlow {
  codigo: string; nome: string; cor: string;
  diagnosticoId: string | null;
  estado: "disponivel" | "em_trilha" | "feito" | "sem_diagnostico";
  trilhaAtual: string | null;
}

type Fala = { texto: string; humor: Humor; acena?: boolean };
type Acao = { texto: string; href: string; cor?: string; principal?: boolean };

const ANIMOS = [
  "Oba! Adoro quando você me chama!",
  "Cada dia um pouquinho e você vai longe!",
  "Errar faz parte de aprender. Bora tentar?",
  "Seu cérebro fica mais forte cada vez que você pratica!",
];

/** Matéria que mais precisa de reforço, pela evolução (Praticando pesa mais que Quase lá) */
function materiaMaisFraca(subjects: { subjectName: string; skills: { level: string }[] }[]): string | null {
  let pior: { nome: string; nota: number } | null = null;
  for (const s of subjects) {
    if (!s.skills.length) continue;
    const peso = s.skills.reduce((t, k) => t + (k.level === "NOT_YET" ? 1 : k.level === "ALMOST" ? 0.5 : 0), 0) / s.skills.length;
    if (peso > 0 && (!pior || peso > pior.nota)) pior = { nome: s.subjectName, nota: peso };
  }
  return pior?.nome ?? null;
}

export default function FlowBoasVindas({ nome, estudouHoje, diasSeguidos, materias, carregando }: {
  nome: string; estudouHoje: boolean; diasSeguidos: number; materias: MateriaFlow[]; carregando: boolean;
}) {
  const [fraca, setFraca] = useState<string | null>(null);
  const [passo, setPasso] = useState(0);
  const [extra, setExtra] = useState<string | null>(null);
  const { falar, parar, falando } = useFalaDoFlow();

  useEffect(() => {
    fetch("/api/escola/aluno/evolucao").then((r) => (r.ok ? r.json() : null))
      .then((d) => setFraca(d?.subjects ? materiaMaisFraca(d.subjects) : null)).catch(() => null);
  }, []);

  const { falas, acoes } = useMemo(() => {
    const ola = `${saudacao()}${nome ? `, ${nome}` : ""}! Tudo bem com você?`;
    const f: Fala[] = [{ texto: ola, humor: "feliz", acena: true }];
    f.push(estudouHoje
      ? { texto: diasSeguidos > 1 ? `Você já estudou hoje e está há ${diasSeguidos} dias seguidos. Mandou muito bem!` : "Você já estudou hoje. Mandou bem! Que tal mais uma etapa?", humor: "animado" }
      : { texto: "Você ainda não estudou hoje. Bora praticar um pouquinho comigo?", humor: "feliz" });

    const semDiagnostico = materias.filter((m) => m.diagnosticoId && m.estado === "disponivel");
    const comecou = materias.some((m) => m.estado === "em_trilha" || m.estado === "feito");
    const mFraca = fraca ? materias.find((m) => m.nome === fraca) ?? null : null;
    const emTrilha = materias.find((m) => m.estado === "em_trilha") ?? null;
    const a: Acao[] = [];

    if (!comecou && semDiagnostico.length) {
      f.push({ texto: "Primeiro, vamos descobrir o que você já sabe. Escolha a matéria do seu quiz!", humor: "animado" });
      for (const m of semDiagnostico.slice(0, 4)) a.push({ texto: m.nome, href: `/escola/aluno/diagnostico/${m.diagnosticoId}`, cor: m.cor });
    } else if (mFraca) {
      f.push({ texto: `${mFraca.nome} está precisando de reforço. Vamos praticar juntos?`, humor: "pensando" });
      const href = mFraca.estado === "em_trilha" ? "/escola/aluno/trilha" : mFraca.diagnosticoId ? `/escola/aluno/diagnostico/${mFraca.diagnosticoId}` : "/escola/aluno/trilha";
      a.push({ texto: `Praticar ${mFraca.nome}`, href, cor: mFraca.cor, principal: true });
      a.push({ texto: "Escolher outra matéria", href: "#materias" });
    } else if (emTrilha) {
      f.push({ texto: `Vamos continuar a sua trilha de ${emTrilha.nome}?`, humor: "animado" });
      a.push({ texto: `Continuar ${emTrilha.nome}`, href: "/escola/aluno/trilha", cor: emTrilha.cor, principal: true });
    } else if (semDiagnostico.length) {
      f.push({ texto: "Escolha um quiz para fazer agora:", humor: "animado" });
      for (const m of semDiagnostico.slice(0, 4)) a.push({ texto: m.nome, href: `/escola/aluno/diagnostico/${m.diagnosticoId}`, cor: m.cor });
    } else {
      f.push({ texto: "Escolha uma matéria aqui embaixo e vamos estudar!", humor: "feliz" });
      a.push({ texto: "Ver as matérias", href: "#materias" });
    }
    return { falas: f, acoes: a };
  }, [nome, estudouHoje, diasSeguidos, materias, fraca]);

  const atual = extra ? { texto: extra, humor: "animado" as Humor, acena: true } : falas[Math.min(passo, falas.length - 1)];
  const { visivel, terminou } = useDigitando(carregando ? "" : atual.texto);
  const ultimo = !extra && passo >= falas.length - 1;

  // Avança sozinho para a próxima fala depois de terminar de "digitar"
  useEffect(() => {
    if (carregando || !terminou || falando) return;
    if (extra) { const t = setTimeout(() => setExtra(null), 2600); return () => clearTimeout(t); }
    if (ultimo) return;
    const t = setTimeout(() => setPasso((p) => p + 1), 2300);
    return () => clearTimeout(t);
  }, [terminou, ultimo, carregando, falando, extra]);

  function tocarNoFlow() {
    const t = ANIMOS[Math.floor(Math.random() * ANIMOS.length)];
    setExtra(t);
    falar(t);
  }

  function ouvir() {
    if (falando) { parar(); return; }
    falar(atual.texto);
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(91,33,182,0.16)]">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#F5F3FF]" aria-hidden="true" />
      <div className="relative p-4 sm:p-6">
      <div className="flex items-end gap-2 sm:gap-5">
        <button type="button" onClick={tocarNoFlow} aria-label="Falar com o Flow" className="shrink-0 -mb-1 active:scale-95 transition-transform">
          <RoboFlow tamanho={96} acenando={!!atual.acena || falando} falando={falando || (!terminou && !carregando)} humor={atual.humor} className="sm:hidden" />
          <RoboFlow tamanho={170} acenando={!!atual.acena || falando} falando={falando || (!terminou && !carregando)} humor={atual.humor} className="hidden sm:block" />
        </button>

        <div className="flex-1 min-w-0 pb-2">
          <div className="relative rounded-3xl rounded-bl-md bg-[#F5F3FF] border border-[#E9E5F5] px-4 py-3.5 sm:px-5 sm:py-4 min-h-[86px]">
            <div className="flex items-start gap-2">
              <p className="flex-1 text-[15px] sm:text-[19px] font-bold leading-snug text-[#1F1A2E]" aria-live="polite">
                {carregando ? <span className="inline-flex gap-1 py-2">{[0, 1, 2].map((i) => <span key={i} className="size-2 rounded-full bg-[#C4B5FD] animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />)}</span> : visivel}
                {!carregando && !terminou && <span className="inline-block w-[2px] h-[1em] align-middle bg-[#6D28D9] ml-0.5 animate-pulse" />}
              </p>
              <button type="button" onClick={ouvir} aria-label={falando ? "Parar" : "Ouvir o Flow"}
                className={`shrink-0 rounded-full min-h-[40px] min-w-[40px] flex items-center justify-center ${falando ? "bg-[#6D28D9] text-white" : "bg-white text-[#6D28D9] border border-[#DDD6FE]"}`}>
                {falando ? <Square className="size-3.5 fill-current" /> : <Volume2 className="size-4" />}
              </button>
            </div>
            {!extra && falas.length > 1 && (
              <div className="flex gap-1.5 mt-2.5">
                {falas.map((_, i) => (
                  <button key={i} type="button" onClick={() => setPasso(i)} aria-label={`Fala ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === passo ? "w-6 bg-[#6D28D9]" : "w-1.5 bg-[#DDD6FE]"}`} />
                ))}
              </div>
            )}
          </div>
          {!ultimo && !carregando && (
            <button type="button" onClick={() => { setExtra(null); setPasso(falas.length - 1); }} className="mt-2 text-[13px] font-semibold text-[#6D28D9] min-h-[36px]">Pular</button>
          )}
        </div>
      </div>

          {ultimo && terminou && acoes.length > 0 && (
            <div className="mt-3 sm:pl-[190px] grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
              {acoes.map((a) => (
                <Link key={a.texto} href={a.href}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 min-h-[46px] text-[14px] font-bold transition-transform active:scale-95 ${a.principal || a.cor ? "text-white shadow-sm" : "bg-white text-[#6D28D9] border-[1.5px] border-[#DDD6FE]"}`}
                  style={a.principal || a.cor ? { background: `linear-gradient(135deg, ${a.cor ?? "#6D28D9"}, ${a.cor ?? "#6D28D9"}D9)` } : undefined}>
                  {(a.principal || a.cor) && <Play className="size-3.5 fill-current" />}{a.texto}
                </Link>
              ))}
            </div>
          )}
      </div>
    </section>
  );
}
