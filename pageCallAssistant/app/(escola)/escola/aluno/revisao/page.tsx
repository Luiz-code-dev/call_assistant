"use client";
/**
 * Revisão de 2 minutos com o Flow: até 5 perguntinhas do que o aluno errou, com áudio.
 * Errou a 1ª vez: tenta de novo. Na 2ª, o Flow mostra a certa e explica (é revisão,
 * a atividade já foi entregue). Sem nota: só "firmou" quando o cartão termina as caixas.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Volume2, Square, CheckCircle2, RefreshCw, Star } from "lucide-react";
import { Capa } from "@/components/escola/reforco-ui";
import { RoboFlow, useFalaDoFlow, type Humor } from "@/components/escola/aluno/Mascote";

type Cartao = { cartaoId: string; versao: number; pergunta: string; opcoes: string[]; materia: string | null; assunto: string | null };
type Resultado = { correto: boolean; final: boolean; certa?: number; explicacao?: string | null; firmou?: boolean };

export default function RevisaoPage() {
  const router = useRouter();
  const [cartoes, setCartoes] = useState<Cartao[] | null>(null);
  const [i, setI] = useState(0);
  const [tentativa, setTentativa] = useState(1);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [res, setRes] = useState<Resultado | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [firmados, setFirmados] = useState(0);
  const { falar, parar, falando } = useFalaDoFlow();

  useEffect(() => {
    fetch("/api/escola/aluno/revisao", { cache: "no-store" })
      .then((r) => { if (r.status === 401) router.replace("/escola/aluno/entrar"); return r.json(); })
      .then((d) => setCartoes(d.cartoes ?? []))
      .catch(() => setCartoes([]));
  }, [router]);

  const c = cartoes?.[i];
  const acabou = cartoes !== null && i >= cartoes.length;

  async function responder(idx: number) {
    if (!c || enviando || res?.final) return;
    setEscolha(idx); setEnviando(true);
    try {
      const r = await fetch("/api/escola/aluno/revisao/responder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartaoId: c.cartaoId, versao: c.versao, escolha: idx, tentativa }),
      });
      const d: Resultado = await r.json();
      setRes(d);
      if (d.final && d.correto && tentativa === 1) setAcertos((a) => a + 1);
      if (d.firmou) setFirmados((f) => f + 1);
      if (!d.final) setTentativa(2);
    } finally { setEnviando(false); }
  }

  function proxima() { parar(); setI((n) => n + 1); setTentativa(1); setEscolha(null); setRes(null); }

  let fala: { texto: string; humor: Humor } = { texto: "Revisão de 2 minutos! Vamos lembrar o que você está praticando?", humor: "animado" };
  if (cartoes && !cartoes.length) fala = { texto: "Nada para revisar agora! Quando você praticar mais, eu separo umas perguntinhas para você.", humor: "feliz" };
  else if (acabou) fala = { texto: acertos === cartoes!.length ? "Você acertou todas de primeira! Que memória boa!" : "Revisão feita! Cada vez que você revisa, o assunto fica mais firme na cabeça.", humor: "animado" };
  else if (res && !res.final) fala = { texto: "Quase! Leia de novo com calma e tente mais uma vez.", humor: "pensando" };
  else if (res?.final && res.correto) fala = { texto: res.firmou ? "Acertou! Esse assunto ficou firme, não vou mais perguntar." : "Acertou! Mandou bem.", humor: "animado" };
  else if (res?.final) fala = { texto: "Essa era difícil! Veja a certa e a explicação. Amanhã eu pergunto de novo.", humor: "feliz" };

  const textoParaOuvir = c && !acabou && !res ? `${c.pergunta}. ${c.opcoes.map((o, k) => `Opção ${k + 1}: ${o}`).join(". ")}` : fala.texto;

  return (
    <div className="min-h-screen bg-[#F6F4FE]">
      <Capa compacta titulo="Revisão de 2 minutos" subtitulo="Perguntinhas do que você está praticando" voltar={{ href: "/escola/aluno", texto: "Início" }} />
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-16">
        <section className="flex items-end gap-3 rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(91,33,182,0.12)]">
          <RoboFlow tamanho={84} falando={falando} acenando={!!(acabou || res?.correto)} humor={fala.humor} />
          <div className="flex-1 min-w-0 rounded-3xl rounded-bl-md bg-[#F5F3FF] border border-[#E9E5F5] px-4 py-3 flex items-start gap-2 mb-1">
            <p className="flex-1 text-[15px] sm:text-[17px] font-bold leading-snug text-[#1F1A2E]" aria-live="polite">{fala.texto}</p>
            <button type="button" onClick={() => (falando ? parar() : falar(textoParaOuvir))} aria-label={falando ? "Parar" : "Ouvir"}
              className={`shrink-0 rounded-full w-9 h-9 flex items-center justify-center ${falando ? "bg-[#6D28D9] text-white" : "bg-white text-[#6D28D9] border border-[#DDD6FE]"}`}>
              {falando ? <Square className="size-3 fill-current" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </section>

        {cartoes === null && <div className="h-64 rounded-3xl bg-[#E9E5F5] animate-pulse" />}

        {c && !acabou && (
          <section className="rounded-3xl bg-white p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#6D28D9] truncate">{c.materia ?? "Revisão"}{c.assunto ? ` · ${c.assunto}` : ""}</p>
              <div className="flex gap-1.5 shrink-0">{cartoes!.map((_, k) => <span key={k} className={`h-2 rounded-full ${k === i ? "w-6 bg-[#6D28D9]" : k < i ? "w-2 bg-[#A78BFA]" : "w-2 bg-[#E9E5F5]"}`} />)}</div>
            </div>
            <p className="text-[18px] font-extrabold leading-snug text-[#1F1A2E]">{c.pergunta}</p>
            <div className="grid gap-2.5">
              {c.opcoes.map((o, k) => {
                const certa = res?.final && res.certa === k;
                const errada = res && escolha === k && !res.correto;
                return (
                  <button key={k} type="button" onClick={() => responder(k)} disabled={enviando || !!res?.final || (!!res && !res.final && escolha === k)}
                    className={`text-left rounded-2xl border-2 px-4 py-3 min-h-[52px] text-[15px] font-semibold transition-colors ${certa ? "border-[#16A34A] bg-[#DCFCE7] text-[#14532D]" : errada ? "border-[#F59E0B] bg-[#FEF3C7] text-[#78350F]" : "border-[#E9E5F5] bg-white text-[#1F1A2E] hover:border-[#6D28D9]"}`}>
                    {o}
                  </button>
                );
              })}
            </div>
            {res?.final && res.explicacao && (
              <p className="rounded-2xl bg-[#F5F3FF] px-4 py-3 text-[14px] leading-relaxed text-[#1F1A2E]"><b>Por quê:</b> {res.explicacao}</p>
            )}
            {res?.final && (
              <button type="button" onClick={proxima} className="w-full rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[52px]">
                {i + 1 < cartoes!.length ? "Próxima" : "Terminar"}
              </button>
            )}
          </section>
        )}

        {(acabou || (cartoes && !cartoes.length)) && (
          <section className="rounded-3xl bg-white p-6 text-center shadow-[0_4px_18px_rgba(91,33,182,0.08)] space-y-4">
            {cartoes!.length > 0 ? (
              <div className="flex justify-center gap-6">
                <div><p className="text-3xl font-extrabold text-[#6D28D9]">{cartoes!.length}</p><p className="text-xs text-[#5B5470]">revisadas</p></div>
                <div><p className="text-3xl font-extrabold text-[#15803D] flex items-center gap-1 justify-center"><CheckCircle2 className="size-6" />{acertos}</p><p className="text-xs text-[#5B5470]">de primeira</p></div>
                {firmados > 0 && <div><p className="text-3xl font-extrabold text-[#C2410C] flex items-center gap-1 justify-center"><Star className="size-6" />{firmados}</p><p className="text-xs text-[#5B5470]">ficaram firmes</p></div>}
              </div>
            ) : <RefreshCw className="size-10 text-[#C4B5FD] mx-auto" />}
            <Link href="/escola/aluno" className="inline-flex items-center justify-center w-full rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold min-h-[52px]">Voltar ao início</Link>
          </section>
        )}
      </main>
    </div>
  );
}
