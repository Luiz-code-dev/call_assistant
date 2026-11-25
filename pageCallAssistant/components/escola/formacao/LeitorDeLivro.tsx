import type { Livro } from "@/lib/escola/formacao/livros/indice";
import type { CapituloDoLivro } from "@/lib/escola/formacao/livros/tipos";
import LeituraDoLivro, { type PerguntaDaAvaliacao } from "@/components/escola/formacao/LeituraDoLivro";
import { acertosNecessarios, aprovado } from "@/lib/escola/formacao/leitura";
import type { LeituraDoLivro as Leitura } from "@/lib/escola/formacao/leitura-db";
import "@/app/(escola)/escola/formacao/livro/livro.css";

/** Assinatura discreta do produto, abaixo do nome da rede. */
export const ASSINATURA_DO_EBOOK = "um produto SpeakFlow Escolas";

interface Props {
  livro: Livro;
  /** Capítulos com o nome da rede já aplicado. */
  capitulos: CapituloDoLivro[];
  nomeDaRede: string;
  /** O que a pessoa já leu e o resultado da avaliação. */
  leitura: Leitura;
  /** Questões da avaliação final, sem o gabarito. */
  perguntas: PerguntaDaAvaliacao[];
}

/** Capa, leitura acompanhada e avaliação de um livro de formação. Na impressão, a capa ocupa a primeira página. */
export default function LeitorDeLivro({ livro, capitulos, nomeDaRede, leitura, perguntas }: Props) {
  return (
    <article className="max-w-4xl mx-auto w-full px-5 sm:px-7 py-6 print:max-w-none print:px-0 print:py-0">
      <header className="rounded-2xl bg-[#6D28D9] text-white px-6 sm:px-10 py-10 print:rounded-none print:min-h-[240mm] print:flex print:flex-col print:justify-center print:break-after-page">
        <div>
          <p className="text-[18px] font-extrabold leading-tight">{nomeDaRede}</p>
          <p className="text-[11px] opacity-80 leading-tight">{ASSINATURA_DO_EBOOK}</p>
        </div>
        <p className="mt-10 text-[13px] font-semibold uppercase tracking-wider opacity-80">Formação da equipe</p>
        <h1 className="mt-1 text-[32px] sm:text-[38px] font-extrabold leading-tight">{livro.titulo}</h1>
        <p className="mt-3 text-[17px] leading-snug opacity-90 max-w-xl">{livro.subtitulo}</p>
        <p className="mt-8 text-[14px] opacity-80">
          Para: {livro.publico} · Carga horária sugerida: {livro.horas} horas
        </p>
      </header>

      <LeituraDoLivro
        slug={livro.slug}
        capitulos={capitulos.map((capitulo) => ({
          id: capitulo.id,
          titulo: capitulo.titulo,
          // O HTML dos capítulos é escrito pela equipe do produto e versionado no repositório.
          conteudo: <div className="livro mt-4" dangerouslySetInnerHTML={{ __html: capitulo.html }} />,
        }))}
        lidosIniciais={leitura.capitulosLidos}
        perguntas={perguntas}
        acertosNecessarios={acertosNecessarios(perguntas.length)}
        melhorResultado={
          leitura.avaliacaoAcertos !== null && leitura.avaliacaoTotal !== null
            ? { acertos: leitura.avaliacaoAcertos, total: leitura.avaliacaoTotal, aprovado: aprovado(leitura.avaliacaoAcertos, leitura.avaliacaoTotal) }
            : null
        }
        seloInicial={leitura.concluidoEm !== null}
      />

      <footer className="mt-8 pb-4 text-center text-[11px] text-[#5B5470]">
        {nomeDaRede} · {ASSINATURA_DO_EBOOK}
      </footer>
    </article>
  );
}
