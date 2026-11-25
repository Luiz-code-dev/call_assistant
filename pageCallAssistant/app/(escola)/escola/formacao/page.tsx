import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, BookOpen, Clock, ChevronRight } from "lucide-react";
import { getEduContext, rotaDoPapel } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import { NOME_DO_GRUPO, livrosDoPerfil, type GrupoDoLivro } from "@/lib/escola/formacao/livros/indice";
import { leiturasDaPessoa, type LeituraDoLivro } from "@/lib/escola/formacao/leitura-db";
import { TITULO_FORMACAO_COMPLETA } from "@/lib/escola/formacao/leitura";

export const metadata = { title: "Formação" };

const GRUPOS: GrupoDoLivro[] = ["plataforma", "pratica"];

interface CartaoProps {
  href: string;
  titulo: string;
  subtitulo: string;
  publico: string;
  detalhe: string;
  /** Capítulos lidos e total do livro. */
  lidos: number;
  total: number;
  selo: boolean;
}

function Cartao({ href, titulo, subtitulo, publico, detalhe, lidos, total, selo }: CartaoProps) {
  const porcentagem = total > 0 ? Math.round((Math.min(lidos, total) / total) * 100) : 0;
  const acao = selo ? "Reler" : lidos === 0 ? "Começar" : lidos >= total ? "Fazer a avaliação" : "Continuar";
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl bg-white border border-[#E9E5F5] hover:border-[#C4B5FD] px-6 py-5 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="w-11 h-11 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center">
          <BookOpen size={22} />
        </span>
        {selo && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] text-[#92400E] px-3 py-1 text-[12px] font-bold">
            <Award size={14} /> Selo conquistado
          </span>
        )}
      </div>
      <h3 className="mt-4 text-[19px] font-extrabold text-[#1F1A2E] leading-tight">{titulo}</h3>
      <p className="mt-1 text-[15px] leading-snug text-[#5B5470]">{subtitulo}</p>
      <p className="mt-3 text-[13px] text-[#5B5470]">Para: {publico}</p>
      <div className="mt-4">
        <div className="h-2 rounded-full bg-[#EDE9FE] overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full bg-[#6D28D9]" style={{ width: `${porcentagem}%` }} />
        </div>
        <p className="mt-1.5 text-[13px] text-[#5B5470]">
          {lidos === 0 ? "Leitura ainda não iniciada" : `${Math.min(lidos, total)} de ${total} capítulos lidos`}
        </p>
      </div>
      <div className="mt-auto pt-4 flex items-center justify-between text-[13px] text-[#5B5470]">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} /> {detalhe}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-[#6D28D9]">
          {acao} <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

export default async function FormacaoPage() {
  const ctx = await getEduContext({ permitirApoio: true });
  if (!ctx) redirect("/escola/entrar");

  if (ctx.db) setTenantDb(ctx.db);
  const livros = livrosDoPerfil(ctx.role);
  // Se a leitura não puder ser lida, a tela abre mesmo assim, sem o progresso
  const leituras: Map<string, LeituraDoLivro> =
    ctx.networkId && ctx.userId
      ? await leiturasDaPessoa(ctx.db ?? prismaEdu, ctx.networkId, ctx.userId).catch(() => new Map<string, LeituraDoLivro>())
      : new Map<string, LeituraDoLivro>();
  const selos = livros.filter((livro) => leituras.get(livro.slug)?.concluidoEm).length;
  const formacaoCompleta = livros.length > 0 && selos === livros.length;

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Início", href: rotaDoPapel(ctx.role) }, { label: "Formação" }]}
        title="Formação"
        subtitle="Livros de formação para a equipe da rede. Acompanhe a sua leitura e conquiste o Selo de Formação de cada livro."
      />

      <div className="px-7 py-6 max-w-[1100px] w-full space-y-10">
        {livros.length > 0 && (
          <section aria-label="Selos de Formação" className="rounded-2xl bg-white border border-[#E9E5F5] px-6 py-5 flex items-center gap-4 flex-wrap">
            <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selos > 0 ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#F5F3FF] text-[#C4B5FD]"}`}>
              <Award size={30} />
            </span>
            <div className="flex-1 min-w-[220px]">
              <p className="text-[13px] font-bold uppercase tracking-wider text-[#5B5470]">Selos de Formação</p>
              <p className="mt-0.5 text-[19px] font-extrabold text-[#1F1A2E] leading-tight">
                {formacaoCompleta ? TITULO_FORMACAO_COMPLETA : `${selos} de ${livros.length} ${livros.length === 1 ? "livro concluído" : "livros concluídos"}`}
              </p>
              <p className="mt-1 text-[14px] leading-snug text-[#5B5470]">
                {formacaoCompleta
                  ? "Você concluiu todos os livros do seu perfil."
                  : "Cada livro concluído vale um selo: leia todos os capítulos e seja aprovado na avaliação final."}
              </p>
            </div>
          </section>
        )}

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
                      lidos={leituras.get(livro.slug)?.capitulosLidos.length ?? 0}
                      total={livro.capitulos}
                      selo={!!leituras.get(livro.slug)?.concluidoEm}
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
