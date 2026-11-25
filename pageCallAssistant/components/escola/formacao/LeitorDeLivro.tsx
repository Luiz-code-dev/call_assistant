import type { Livro } from "@/lib/escola/formacao/livros/indice";
import type { CapituloDoLivro } from "@/lib/escola/formacao/livros/tipos";
import "@/app/(escola)/escola/formacao/livro/livro.css";

/** Assinatura discreta do produto, abaixo do nome da rede. */
export const ASSINATURA_DO_EBOOK = "um produto SpeakFlow Escolas";

interface Props {
  livro: Livro;
  /** Capítulos com o nome da rede já aplicado. */
  capitulos: CapituloDoLivro[];
  nomeDaRede: string;
}

/** Capa, sumário e capítulos de um livro de formação. Na impressão, a capa ocupa a primeira página. */
export default function LeitorDeLivro({ livro, capitulos, nomeDaRede }: Props) {
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

      <nav aria-label="Sumário" className="mt-6 rounded-2xl bg-white border border-[#E9E5F5] px-6 py-5 print:border-0 print:px-0">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#5B5470]">Neste livro</h2>
        <ol className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {capitulos.map((capitulo, i) => (
            <li key={capitulo.id}>
              <a href={`#${capitulo.id}`} className="text-[15px] text-[#1F1A2E] hover:text-[#6D28D9] transition-colors">
                <span className="text-[#6D28D9] font-bold mr-2">{i + 1}.</span>
                {capitulo.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {capitulos.map((capitulo, i) => (
        <section
          key={capitulo.id}
          id={capitulo.id}
          className="mt-6 rounded-2xl bg-white border border-[#E9E5F5] px-5 sm:px-7 py-6 scroll-mt-4 print:border-0 print:px-0 print:mt-8"
        >
          <h2 className="text-[22px] font-extrabold text-[#1F1A2E] leading-tight break-after-avoid">
            <span className="text-[#6D28D9] mr-2">{i + 1}.</span>
            {capitulo.titulo}
          </h2>
          {/* O HTML dos capítulos é escrito pela equipe do produto e versionado no repositório. */}
          <div className="livro mt-4" dangerouslySetInnerHTML={{ __html: capitulo.html }} />
        </section>
      ))}

      <footer className="mt-8 pb-4 text-center text-[11px] text-[#5B5470]">
        {nomeDaRede} · {ASSINATURA_DO_EBOOK}
      </footer>
    </article>
  );
}
