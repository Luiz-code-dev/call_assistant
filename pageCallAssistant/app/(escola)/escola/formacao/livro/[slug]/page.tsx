import { notFound, redirect } from "next/navigation";
import { getEduContext, rotaDoPapel } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import LeitorDeLivro from "@/components/escola/formacao/LeitorDeLivro";
import BotaoImprimir from "@/components/escola/formacao/BotaoImprimir";
import { avaliacaoDoLivro, capitulosDoLivro, comNomeDaRede, livroDoPerfil } from "@/lib/escola/formacao/livros/indice";
import { leituraDoLivro } from "@/lib/escola/formacao/leitura-db";

export const metadata = { title: "Formação" };

const NOME_PADRAO = "Rede de ensino";

export default async function LivroPage(props: { params: Promise<{ slug: string }> }) {
  const ctx = await getEduContext({ permitirApoio: true });
  if (!ctx) redirect("/escola/entrar");
  if (ctx.db) setTenantDb(ctx.db);

  const { slug } = await props.params;
  // Só abre o livro do próprio perfil: quem não pode ver recebe "não encontrado".
  const livro = livroDoPerfil(slug, ctx.role);
  if (!livro) notFound();

  const [capitulos, avaliacao] = await Promise.all([capitulosDoLivro(livro.slug), avaliacaoDoLivro(livro.slug)]);
  if (!capitulos || !avaliacao) notFound();

  // O gabarito fica no servidor: a tela recebe só as perguntas e as alternativas
  const perguntas = avaliacao.map((questao) => ({ pergunta: questao.pergunta, alternativas: questao.alternativas }));
  const semLeitura = { livroSlug: livro.slug, capitulosLidos: [], ultimoCapitulo: null, avaliacaoAcertos: null, avaliacaoTotal: null, concluidoEm: null };
  // Se a leitura não puder ser lida, o livro abre mesmo assim, sem o progresso
  const leitura =
    ctx.networkId && ctx.userId
      ? await leituraDoLivro(ctx.db ?? prismaEdu, ctx.networkId, ctx.userId, livro.slug).catch(() => semLeitura)
      : semLeitura;

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
      <LeitorDeLivro livro={livro} capitulos={capitulosDaRede} nomeDaRede={nomeDaRede} leitura={leitura} perguntas={perguntas} />
    </div>
  );
}
