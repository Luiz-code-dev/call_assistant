import { notFound, redirect } from "next/navigation";
import { getEduContext, rotaDoPapel } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import LeitorDeLivro from "@/components/escola/formacao/LeitorDeLivro";
import BotaoImprimir from "@/components/escola/formacao/BotaoImprimir";
import { capitulosDoLivro, comNomeDaRede, livroDoPerfil } from "@/lib/escola/formacao/livros/indice";

export const metadata = { title: "Formação" };

const NOME_PADRAO = "Rede de ensino";

export default async function LivroPage(props: { params: Promise<{ slug: string }> }) {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");
  if (ctx.db) setTenantDb(ctx.db);

  const { slug } = await props.params;
  // Só abre o livro do próprio perfil: quem não pode ver recebe "não encontrado".
  const livro = livroDoPerfil(slug, ctx.role);
  if (!livro) notFound();

  const capitulos = await capitulosDoLivro(livro.slug);
  if (!capitulos) notFound();

  const rede = ctx.networkId
    ? await prismaEdu.eduNetwork.findUnique({ where: { id: ctx.networkId }, select: { name: true } }).catch(() => null)
    : null;
  const nomeDaRede = rede?.name || NOME_PADRAO;
  const capitulosDaRede = capitulos.map((capitulo) => ({ ...capitulo, html: comNomeDaRede(capitulo.html, nomeDaRede) }));

  return (
    <div className="flex flex-col min-h-full">
      <div className="print:hidden">
        <EscPageHeader
          breadcrumb={[
            { label: "Início", href: rotaDoPapel(ctx.role) },
            { label: "Formação", href: "/escola/formacao" },
            { label: livro.titulo },
          ]}
          title={livro.titulo}
          subtitle={`Para: ${livro.publico}`}
          action={<BotaoImprimir />}
        />
      </div>
      <LeitorDeLivro livro={livro} capitulos={capitulosDaRede} nomeDaRede={nomeDaRede} />
    </div>
  );
}
