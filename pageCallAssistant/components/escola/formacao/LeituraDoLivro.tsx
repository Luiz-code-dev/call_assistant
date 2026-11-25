"use client";

import { useState, type ReactNode } from "react";
import { Award, Check, CheckCircle2, Circle, Lock } from "lucide-react";

export interface CapituloParaLer {
  id: string;
  titulo: string;
  /** Texto do capítulo, já montado no servidor. */
  conteudo: ReactNode;
}

export interface PerguntaDaAvaliacao {
  pergunta: string;
  alternativas: string[];
}

interface Correcao {
  acertou: boolean;
  correta: number;
  explicacao: string;
}

interface Resultado {
  acertos: number;
  total: number;
  aprovado: boolean;
  correcoes: Correcao[];
}

interface Props {
  slug: string;
  capitulos: CapituloParaLer[];
  lidosIniciais: string[];
  perguntas: PerguntaDaAvaliacao[];
  /** Acertos necessários para ser aprovado. */
  acertosNecessarios: number;
  /** Melhor resultado já obtido, se houver. */
  melhorResultado: { acertos: number; total: number; aprovado: boolean } | null;
  seloInicial: boolean;
}

const LETRAS = ["a", "b", "c", "d", "e", "f"];

/** Sumário com o que já foi lido, capítulos com "marcar como lido" e avaliação final. */
export default function LeituraDoLivro({ slug, capitulos, lidosIniciais, perguntas, acertosNecessarios, melhorResultado, seloInicial }: Props) {
  const [lidos, setLidos] = useState<string[]>(lidosIniciais);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [selo, setSelo] = useState(seloInicial);
  const [respostas, setRespostas] = useState<Array<number | null>>(() => perguntas.map(() => null));
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [corrigindo, setCorrigindo] = useState(false);
  const [erroDaAvaliacao, setErroDaAvaliacao] = useState<string | null>(null);

  const total = capitulos.length;
  const quantos = capitulos.filter((c) => lidos.includes(c.id)).length;
  const leituraCompleta = total > 0 && quantos === total;
  const proximo = capitulos.find((c) => !lidos.includes(c.id)) ?? null;
  const porcentagem = total > 0 ? Math.round((quantos / total) * 100) : 0;
  const todasRespondidas = respostas.every((r) => r !== null);

  async function marcar(capituloId: string, lido: boolean) {
    setSalvando(capituloId);
    setErro(null);
    try {
      const r = await fetch(`/api/escola/formacao/livros/${slug}/leitura`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capituloId, lido }),
      });
      const dados = await r.json().catch(() => null);
      if (!r.ok || !dados) throw new Error(dados?.error ?? "Não foi possível salvar. Tente de novo.");
      setLidos(dados.capitulosLidos as string[]);
      if (dados.selo) setSelo(true);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(null);
    }
  }

  async function enviarAvaliacao() {
    setCorrigindo(true);
    setErroDaAvaliacao(null);
    try {
      const r = await fetch(`/api/escola/formacao/livros/${slug}/avaliacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respostas }),
      });
      const dados = await r.json().catch(() => null);
      if (!r.ok || !dados) throw new Error(dados?.error ?? "Não foi possível corrigir. Tente de novo.");
      setResultado(dados as Resultado);
      if (dados.selo) setSelo(true);
    } catch (e) {
      setErroDaAvaliacao((e as Error).message);
    } finally {
      setCorrigindo(false);
    }
  }

  function refazer() {
    setResultado(null);
    setRespostas(perguntas.map(() => null));
  }

  return (
    <>
      {/* Progresso da leitura */}
      <section aria-label="Progresso da leitura" className="mt-6 rounded-2xl bg-white border border-[#E9E5F5] px-6 py-5 print:hidden">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wider text-[#5B5470]">Sua leitura</p>
            <p className="mt-1 text-[16px] font-bold text-[#1F1A2E]">
              {quantos} de {total} capítulos lidos
            </p>
          </div>
          {selo ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] text-[#92400E] px-4 py-2 text-[14px] font-bold">
              <Award size={18} /> Selo de Formação conquistado
            </span>
          ) : proximo ? (
            <a
              href={`#${proximo.id}`}
              className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            >
              {quantos === 0 ? "Começar a leitura" : "Continuar de onde parei"}
            </a>
          ) : (
            <a
              href="#avaliacao"
              className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            >
              Fazer a avaliação final
            </a>
          )}
        </div>
        <div
          className="mt-4 h-2.5 rounded-full bg-[#EDE9FE] overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={porcentagem}
          aria-label="Capítulos lidos"
        >
          <div className="h-full rounded-full bg-[#6D28D9] transition-all" style={{ width: `${porcentagem}%` }} />
        </div>
        <p className="mt-2 text-[13px] text-[#5B5470]">
          Para conquistar o Selo de Formação deste livro, marque todos os capítulos como lidos e acerte ao menos {acertosNecessarios} das{" "}
          {perguntas.length} questões da avaliação final.
        </p>
        {erro && (
          <p role="alert" className="mt-2 text-[14px] font-semibold text-[#B91C1C]">
            {erro}
          </p>
        )}
      </section>

      {/* Sumário */}
      <nav aria-label="Sumário" className="mt-6 rounded-2xl bg-white border border-[#E9E5F5] px-6 py-5 print:border-0 print:px-0">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#5B5470]">Neste livro</h2>
        <ol className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {capitulos.map((capitulo, i) => {
            const lido = lidos.includes(capitulo.id);
            return (
              <li key={capitulo.id}>
                <a href={`#${capitulo.id}`} className="flex items-start gap-2 text-[15px] text-[#1F1A2E] hover:text-[#6D28D9] transition-colors">
                  <span className="mt-0.5 shrink-0 print:hidden" aria-hidden="true">
                    {lido ? <CheckCircle2 size={17} className="text-[#15803D]" /> : <Circle size={17} className="text-[#C4B5FD]" />}
                  </span>
                  <span>
                    <span className="text-[#6D28D9] font-bold mr-2">{i + 1}.</span>
                    {capitulo.titulo}
                    <span className="sr-only">{lido ? " (lido)" : " (não lido)"}</span>
                  </span>
                </a>
              </li>
            );
          })}
          <li>
            <a href="#avaliacao" className="flex items-start gap-2 text-[15px] text-[#1F1A2E] hover:text-[#6D28D9] transition-colors print:hidden">
              <span className="mt-0.5 shrink-0" aria-hidden="true">
                {selo ? <Award size={17} className="text-[#B45309]" /> : <Circle size={17} className="text-[#C4B5FD]" />}
              </span>
              <span className="font-semibold">Avaliação final</span>
            </a>
          </li>
        </ol>
      </nav>

      {/* Capítulos */}
      {capitulos.map((capitulo, i) => {
        const lido = lidos.includes(capitulo.id);
        return (
          <section
            key={capitulo.id}
            id={capitulo.id}
            className="mt-6 rounded-2xl bg-white border border-[#E9E5F5] px-5 sm:px-7 py-6 scroll-mt-4 print:border-0 print:px-0 print:mt-8"
          >
            <h2 className="text-[22px] font-extrabold text-[#1F1A2E] leading-tight break-after-avoid">
              <span className="text-[#6D28D9] mr-2">{i + 1}.</span>
              {capitulo.titulo}
            </h2>
            {capitulo.conteudo}
            <div className="mt-5 pt-4 border-t border-[#E9E5F5] flex items-center justify-between gap-3 flex-wrap print:hidden">
              <span className="text-[13px] text-[#5B5470]">
                Capítulo {i + 1} de {total}
              </span>
              <button
                type="button"
                onClick={() => marcar(capitulo.id, !lido)}
                disabled={salvando === capitulo.id}
                aria-pressed={lido}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] disabled:opacity-60 ${
                  lido ? "bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]" : "bg-[#6D28D9] text-white hover:bg-[#5B21B6]"
                }`}
              >
                <Check size={16} />
                {salvando === capitulo.id ? "Salvando..." : lido ? "Lido" : "Marcar como lido"}
              </button>
            </div>
          </section>
        );
      })}

      {/* Avaliação final */}
      <section
        id="avaliacao"
        aria-labelledby="titulo-avaliacao"
        className="mt-6 rounded-2xl bg-white border border-[#E9E5F5] px-5 sm:px-7 py-6 scroll-mt-4 print:hidden"
      >
        <h2 id="titulo-avaliacao" className="text-[22px] font-extrabold text-[#1F1A2E] leading-tight">
          Avaliação final
        </h2>

        {selo && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#FEF3C7] px-4 py-3 text-[#92400E]">
            <Award size={22} className="shrink-0 mt-0.5" />
            <p className="text-[15px] leading-snug">
              <b>Selo de Formação conquistado.</b> Você leu o livro e foi aprovado na avaliação. O selo aparece no seu perfil e na tela Formação.
            </p>
          </div>
        )}

        {!leituraCompleta ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#F5F3FF] px-4 py-3 text-[#4C1D95]">
            <Lock size={20} className="shrink-0 mt-0.5" />
            <p className="text-[15px] leading-snug">
              A avaliação abre quando todos os capítulos estiverem marcados como lidos. Faltam {total - quantos}.
            </p>
          </div>
        ) : resultado ? (
          <div className="mt-4">
            <p
              role="status"
              className={`rounded-xl px-4 py-3 text-[15px] font-semibold ${resultado.aprovado ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FFF7E0] text-[#92400E]"}`}
            >
              Você acertou {resultado.acertos} de {resultado.total}.{" "}
              {resultado.aprovado ? "Aprovado." : `Para ser aprovado, é preciso acertar ao menos ${acertosNecessarios}. Reveja os capítulos e tente de novo.`}
            </p>
            <ol className="mt-4 space-y-4">
              {perguntas.map((pergunta, i) => {
                const correcao = resultado.correcoes[i];
                return (
                  <li key={pergunta.pergunta} className="text-[15px] leading-relaxed text-[#1F1A2E]">
                    <p className="font-semibold">
                      {i + 1}. {pergunta.pergunta}
                    </p>
                    <p className={`mt-1 ${correcao?.acertou ? "text-[#166534]" : "text-[#B91C1C]"}`}>
                      {correcao?.acertou ? "Você acertou." : "Você errou."} Resposta certa: {LETRAS[correcao?.correta ?? 0]}){" "}
                      {pergunta.alternativas[correcao?.correta ?? 0]}
                    </p>
                    {correcao?.explicacao && <p className="text-[#5B5470]">{correcao.explicacao}</p>}
                  </li>
                );
              })}
            </ol>
            {!resultado.aprovado && (
              <button
                type="button"
                onClick={refazer}
                className="mt-5 inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
              >
                Tentar de novo
              </button>
            )}
          </div>
        ) : (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (todasRespondidas && !corrigindo) void enviarAvaliacao();
            }}
          >
            <p className="text-[15px] text-[#5B5470]">
              São {perguntas.length} questões. Para ser aprovado, acerte ao menos {acertosNecessarios}. Você pode tentar mais de uma vez.
              {melhorResultado && ` Seu melhor resultado até agora: ${melhorResultado.acertos} de ${melhorResultado.total}.`}
            </p>
            <ol className="mt-4 space-y-5">
              {perguntas.map((pergunta, i) => (
                <li key={pergunta.pergunta}>
                  <fieldset>
                    <legend className="text-[16px] font-semibold text-[#1F1A2E] leading-snug">
                      {i + 1}. {pergunta.pergunta}
                    </legend>
                    <div className="mt-2 space-y-1.5">
                      {pergunta.alternativas.map((alternativa, j) => (
                        <label
                          key={alternativa}
                          className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-[15px] leading-snug cursor-pointer min-h-[44px] ${
                            respostas[i] === j ? "border-[#6D28D9] bg-[#F5F3FF]" : "border-[#E9E5F5] hover:border-[#C4B5FD]"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`questao-${i}`}
                            className="mt-1 accent-[#6D28D9]"
                            checked={respostas[i] === j}
                            onChange={() => setRespostas((atuais) => atuais.map((r, k) => (k === i ? j : r)))}
                          />
                          <span>
                            {LETRAS[j]}) {alternativa}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </li>
              ))}
            </ol>
            {erroDaAvaliacao && (
              <p role="alert" className="mt-4 text-[14px] font-semibold text-[#B91C1C]">
                {erroDaAvaliacao}
              </p>
            )}
            <button
              type="submit"
              disabled={!todasRespondidas || corrigindo}
              className="mt-5 inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {corrigindo ? "Corrigindo..." : "Enviar respostas"}
            </button>
            {!todasRespondidas && <p className="mt-2 text-[13px] text-[#5B5470]">Responda a todas as questões para enviar.</p>}
          </form>
        )}
      </section>
    </>
  );
}
