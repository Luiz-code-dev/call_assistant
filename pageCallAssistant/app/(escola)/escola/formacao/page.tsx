import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Clock, ChevronRight } from "lucide-react";
import { getEduContext, rotaDoPapel } from "@/lib/escola/context";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import { NOME_DO_GRUPO, livrosDoPerfil, type GrupoDoLivro } from "@/lib/escola/formacao/livros/indice";

export const metadata = { title: "Formação" };

const GRUPOS: GrupoDoLivro[] = ["plataforma", "pratica"];

interface CartaoProps {
  href: string;
  titulo: string;
  subtitulo: string;
  publico: string;
  detalhe: string;
}

function Cartao({ href, titulo, subtitulo, publico, detalhe }: CartaoProps) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl bg-white border border-[#E9E5F5] hover:border-[#C4B5FD] px-6 py-5 transition-colors"
    >
      <span className="w-11 h-11 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center">
        <BookOpen size={22} />
      </span>
      <h3 className="mt-4 text-[19px] font-extrabold text-[#1F1A2E] leading-tight">{titulo}</h3>
      <p className="mt-1 text-[15px] leading-snug text-[#5B5470]">{subtitulo}</p>
      <p className="mt-3 text-[13px] text-[#5B5470]">Para: {publico}</p>
      <div className="mt-auto pt-4 flex items-center justify-between text-[13px] text-[#5B5470]">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} /> {detalhe}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-[#6D28D9]">
          Abrir <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

export default async function FormacaoPage() {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");

  const livros = livrosDoPerfil(ctx.role);

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Início", href: rotaDoPapel(ctx.role) }, { label: "Formação" }]}
        title="Formação"
        subtitle="Livros de formação para a equipe da rede. Leia na tela ou baixe em PDF."
      />

      <div className="px-7 py-6 max-w-[1100px] w-full space-y-10">
        {GRUPOS.map((grupo) => {
          const doGrupo = livros.filter((livro) => livro.grupo === grupo);
          if (doGrupo.length === 0) return null;
          return (
            <section key={grupo} aria-labelledby={`grupo-${grupo}`}>
              <h2 id={`grupo-${grupo}`} className="text-[13px] font-bold uppercase tracking-wider text-[#5B5470]">
                {NOME_DO_GRUPO[grupo]}
              </h2>
              <ul className="mt-3 grid gap-4 md:grid-cols-2">
                {doGrupo.map((livro) => (
                  <li key={livro.slug}>
                    <Cartao
                      href={`/escola/formacao/livro/${livro.slug}`}
                      titulo={livro.titulo}
                      subtitulo={livro.subtitulo}
                      publico={livro.publico}
                      detalhe={`${livro.horas} h de estudo · ${livro.capitulos} capítulos`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {livros.length === 0 && (
          <p className="text-[15px] text-[#5B5470]">Ainda não há material de formação para o seu perfil.</p>
        )}
      </div>
    </div>
  );
}
