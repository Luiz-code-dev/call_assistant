"use client";
/**
 * Redação guiada: o aluno escreve o texto inteiro, envia e o Flow devolve um retorno
 * parágrafo por parágrafo, com perguntas. O Flow não reescreve nada e não avalia com pontos.
 * O professor pode comentar; depois o aluno reescreve (nova versão).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send, RefreshCw, PencilLine, CheckCircle2 } from "lucide-react";
import { Capa, Carregando } from "@/components/escola/reforco-ui";
import { RoboFlow } from "@/components/escola/aluno/Mascote";
import { ParagrafoComRetorno } from "@/components/escola/redacao/RetornoDaRedacao";
import FotoDaRedacao from "@/components/escola/redacao/FotoDaRedacao";
import { contarPalavras, type RetornoDoAluno } from "@/lib/escola/redacao";

type Versao = { versao: number; status: string; texto: string | null; paragrafos: string[]; palavras: number; enviadoEm: string | null; retorno: RetornoDoAluno | null };
type Dados = {
  proposta: { id: string; titulo: string; enunciado: string; genero: string; generoId: string; minPalavras: number; maxPalavras: number; maxVersoes: number; prazo: string | null; aberta: boolean; propria?: boolean };
  podeEscrever: boolean;
  versoes: Versao[];
};

export default function RedacaoAlunoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [texto, setTexto] = useState("");
  const [escrevendo, setEscrevendo] = useState(false);
  const [salvo, setSalvo] = useState<"" | "salvando" | "salvo">("");
  const [enviando, setEnviando] = useState(false);
  const [vendo, setVendo] = useState<number | null>(null);
  const [antesDaFoto, setAntesDaFoto] = useState<string | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimoSalvo = useRef("");

  const carregar = useCallback(async () => {
    const r = await fetch(`/api/escola/aluno/redacoes/${id}`, { cache: "no-store" });
    if (r.status === 401) { router.replace("/escola/aluno/entrar"); return; }
    const d = await r.json().catch(() => null);
    if (!r.ok || !d) { setErro(d?.error ?? "Não consegui abrir a redação."); return; }
    setDados(d);
    const ultima: Versao | undefined = d.versoes[d.versoes.length - 1];
    if (ultima?.status === "DRAFT") { setTexto(ultima.texto ?? ""); ultimoSalvo.current = ultima.texto ?? ""; setEscrevendo(true); }
    else if (!ultima && d.podeEscrever) setEscrevendo(true);
    else setEscrevendo(false);
    setVendo(null);
  }, [id, router]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = useCallback(async (t: string) => {
    if (t === ultimoSalvo.current) return true;
    setSalvo("salvando");
    const r = await fetch(`/api/escola/aluno/redacoes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: t }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setErro(d.error ?? "Não consegui guardar o texto."); setSalvo(""); return false; }
    ultimoSalvo.current = t; setSalvo("salvo");
    return true;
  }, [id]);

  function digitar(t: string) {
    setTexto(t); setErro("");
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => { salvar(t); }, 1500);
  }

  useEffect(() => () => { if (espera.current) clearTimeout(espera.current); }, []);

  async function enviar() {
    if (espera.current) clearTimeout(espera.current);
    setEnviando(true); setErro("");
    try {
      if (!(await salvar(texto))) return;
      const r = await fetch(`/api/escola/aluno/redacoes/${id}/enviar`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.error ?? "Não consegui enviar. Tente de novo."); return; }
      await carregar();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErro("A internet caiu. Seu texto está guardado; tente enviar de novo.");
    } finally { setEnviando(false); }
  }

  function textoDaFoto(t: string) {
    setAntesDaFoto(texto);
    digitar(t);
  }

  function reescrever() {
    const ultima = dados?.versoes[dados.versoes.length - 1];
    const base = ultima?.paragrafos.join("\n\n") ?? "";
    setTexto(base); ultimoSalvo.current = ""; setEscrevendo(true); setVendo(null);
  }

  if (erro && !dados) return <div className="min-h-screen bg-[#F6F4FE] p-6"><p className="rounded-2xl bg-[#FEF2F2] text-[#B91C1C] px-4 py-3">{erro}</p></div>;
  if (!dados) return <div className="min-h-screen bg-[#F6F4FE]"><Carregando /></div>;

  const p = dados.proposta;
  const enviadas = dados.versoes.filter((v) => v.status !== "DRAFT");
  const ultimaEnviada = enviadas[enviadas.length - 1] ?? null;
  const mostrada = vendo !== null ? enviadas.find((v) => v.versao === vendo) ?? ultimaEnviada : ultimaEnviada;
  const palavras = contarPalavras(texto);
  const corContador = palavras < p.minPalavras ? "text-[#92400E]" : palavras > p.maxPalavras ? "text-[#B91C1C]" : "text-[#166534]";
  const podeReescrever = dados.podeEscrever && !escrevendo && !!ultimaEnviada && ultimaEnviada.status !== "SUBMITTED";

  let fala = "Escreva o seu texto aqui. Quando terminar, eu leio e te faço perguntas para você melhorar. Eu não escrevo por você!";
  if (enviando) fala = "Estou lendo o seu texto com atenção...";
  else if (!escrevendo && mostrada?.status === "SUBMITTED") fala = "Seu texto foi enviado. Seu professor vai ler e te dar o retorno.";
  else if (!escrevendo && mostrada?.retorno) fala = mostrada.retorno.geral.pontoForte || "Li o seu texto! Veja as minhas perguntas em cada parágrafo.";

  return (
    <div className="min-h-screen bg-[#F6F4FE]">
      <Capa compacta titulo={p.titulo} subtitulo={p.genero} voltar={{ href: "/escola/aluno/redacao", texto: "Redações" }} />
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-10">
        <section className="flex items-end gap-3 rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(91,33,182,0.12)]">
          <RoboFlow tamanho={72} falando={enviando} humor={enviando ? "pensando" : "feliz"} />
          <p className="flex-1 rounded-3xl rounded-bl-md bg-[#F5F3FF] border border-[#E9E5F5] px-4 py-3 text-[15px] font-bold leading-snug text-[#1F1A2E] mb-1">{fala}</p>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-[0_4px_18px_rgba(91,33,182,0.08)] space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6D28D9]">Proposta</p>
          <p className="text-[15px] leading-relaxed text-[#1F1A2E] whitespace-pre-wrap">{p.enunciado || `Tema: ${p.titulo}`}</p>
          <p className="text-[13px] text-[#5B5470]">{p.propria ? "Redação que você trouxe da escola" : `Entre ${p.minPalavras} e ${p.maxPalavras} palavras`}{p.prazo ? ` · até ${new Date(p.prazo).toLocaleDateString("pt-BR")}` : ""}</p>
        </section>

        {erro && <p className="rounded-2xl bg-[#FEF2F2] text-[#B91C1C] text-sm px-4 py-3">{erro}</p>}

        {escrevendo && dados.podeEscrever && (
          <section className="rounded-3xl bg-white p-4 shadow-[0_4px_18px_rgba(91,33,182,0.08)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[#6D28D9]">{ultimaEnviada ? `Reescrita (versão ${ultimaEnviada.versao + 1})` : "Seu texto"}</p>
              <p className="text-[12px] text-[#5B5470]">{salvo === "salvando" ? "Guardando..." : salvo === "salvo" ? "Guardado" : ""}</p>
            </div>
            <FotoDaRedacao aoLer={(t) => textoDaFoto(t)} />
            {antesDaFoto !== null && (
              <p className="rounded-2xl bg-[#FFFBEB] border border-[#FCD34D] px-3 py-2 text-[14px] text-[#78350F]">
                Confira se o texto ficou igual ao do seu caderno e arrume o que o Flow não conseguiu ler (marcado com [?]).{" "}
                <button type="button" className="font-bold underline" onClick={() => { digitar(antesDaFoto); setAntesDaFoto(null); }}>Desfazer</button>
              </p>
            )}
            <textarea
              value={texto}
              onChange={(e) => digitar(e.target.value)}
              rows={16}
              maxLength={16000}
              placeholder="Comece aqui. Para começar um parágrafo novo, pule uma linha."
              className="block w-full rounded-2xl border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] outline-none px-3 py-3 text-[16px] leading-relaxed text-[#1F1A2E]"
              aria-label="Seu texto"
            />
            <p className={`text-[13px] font-semibold ${corContador}`}>{palavras} palavras · use entre {p.minPalavras} e {p.maxPalavras}</p>
            <button type="button" onClick={enviar} disabled={enviando || palavras === 0} className="w-full rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[56px] flex items-center justify-center gap-2 disabled:opacity-60">
              {enviando ? <><RefreshCw className="size-5 animate-spin" />O Flow está lendo...</> : <><Send className="size-5" />Enviar para o Flow ler</>}
            </button>
            <p className="text-xs text-[#5B5470] text-center">Seu nome não vai para a inteligência artificial. Seu professor também pode ler o texto.</p>
          </section>
        )}

        {!escrevendo && mostrada && (
          <>
            {enviadas.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {enviadas.map((v) => (
                  <button key={v.versao} type="button" onClick={() => setVendo(v.versao)}
                    className={`rounded-full px-4 min-h-[40px] text-sm font-bold ${v.versao === mostrada.versao ? "bg-[#6D28D9] text-white" : "bg-white text-[#5B21B6] border border-[#DDD6FE]"}`}>
                    Versão {v.versao}
                  </button>
                ))}
              </div>
            )}

            {mostrada.retorno && (
              <section className="rounded-3xl bg-white p-4 shadow-[0_4px_18px_rgba(91,33,182,0.08)] space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6D28D9]">Para a próxima versão</p>
                <p className="text-[16px] font-semibold text-[#1F1A2E]">{mostrada.retorno.geral.foco}</p>
                {mostrada.retorno.comentarioGeralProfessor && (
                  <p className="rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] px-3 py-2 text-[14px] text-[#3B0764] whitespace-pre-wrap"><span className="font-bold">Professor: </span>{mostrada.retorno.comentarioGeralProfessor}</p>
                )}
              </section>
            )}

            {mostrada.paragrafos.map((par, i) => {
              const r = mostrada.retorno?.paragrafos.find((x) => x.indice === i);
              return (
                <ParagrafoComRetorno key={i} numero={i + 1} paragrafo={par} genero={p.generoId}
                  apontamentos={r?.apontamentos ?? []} pontoForte={r?.pontoForte} comentarioProfessor={r?.comentarioProfessor} />
              );
            })}

            {podeReescrever && mostrada.versao === ultimaEnviada?.versao && (
              <button type="button" onClick={reescrever} className="w-full rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[56px] flex items-center justify-center gap-2">
                <PencilLine className="size-5" />Reescrever meu texto
              </button>
            )}
            {!dados.podeEscrever && ultimaEnviada && ultimaEnviada.status !== "SUBMITTED" && (
              <p className="flex items-center justify-center gap-2 text-[14px] font-semibold text-[#166534]"><CheckCircle2 className="size-5" />Redação concluída. Parabéns pelo esforço!</p>
            )}
          </>
        )}

        {!escrevendo && !mostrada && !dados.podeEscrever && (
          <p className="text-center text-[#5B5470]">Esta proposta está encerrada.</p>
        )}
      </main>
    </div>
  );
}
