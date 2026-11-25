/**
 * Secretaria: cadastro do assistente social e do psicólogo da equipe de apoio.
 * GET    -> cadastros da rede e se a consulta automática ao conselho está ligada
 * POST   -> novo cadastro: confere o registro, cria o convite e manda o e-mail ao profissional
 * DELETE -> exclui um cadastro (e o acesso, se já estava ativo)
 */
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { generateInviteToken, registerStaffInviteInCatalog, deregisterInviteFromCatalog } from "@/lib/escola/invite";
import { remetenteFamilia } from "@/lib/escola/email-familia";
import { urlDoSite } from "@/lib/escola/public-url";
import { consultarCfp, consultaDoCfpConfigurada } from "@/lib/escola/apoio-cfp";
import { validarCadastro, emailConviteProfissional, CONSELHO, type FuncaoRegistrada } from "@/lib/escola/apoio-profissional";

export const runtime = "nodejs";
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

async function contexto() {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getEduContext();
  if (!ctx || !ctx.userId) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (ctx.role !== "NETWORK_ADMIN") return { erro: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  if (ctx.db) setTenantDb(ctx.db);
  return { ctx, P: (ctx.db ?? prismaEdu) as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function lista(P: any, networkId: string) {
  const cadastros: any[] = await P.eduApoioCadastro.findMany({ // eslint-disable-line @typescript-eslint/no-explicit-any
    where: { networkId }, orderBy: { createdAt: "desc" }, take: 500,
    select: { id: true, name: true, email: true, funcao: true, conselho: true, registro: true, uf: true, schoolIds: true, verificacao: true, situacaoNoConselho: true, status: true, createdAt: true, termoAceitoEm: true, recusadoEm: true },
  });
  return { consultaAutomatica: consultaDoCfpConfigurada(), cadastros };
}

export async function GET() {
  const { ctx, P, erro } = await contexto();
  if (erro) return erro;
  return NextResponse.json(await lista(P, ctx!.networkId));
}

export async function POST(req: NextRequest) {
  const { ctx, P, erro } = await contexto();
  if (erro) return erro;
  const networkId = ctx!.networkId;
  const v = validarCadastro((await req.json().catch(() => ({}))) as Record<string, unknown>);
  if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });

  // Quem já tem acesso à rede é indicado pela lista de pessoas, não por um cadastro novo
  const jaNaRede = await P.eduMembership.findFirst({ where: { networkId, isActive: true, user: { email: v.email } }, select: { id: true } });
  if (jaNaRede) return NextResponse.json({ error: "Esta pessoa já tem acesso à rede. Indique-a na lista de pessoas da rede, logo abaixo." }, { status: 409 });

  const escolas: { id: string; name: string }[] = v.schoolIds.length ? await P.eduSchool.findMany({ where: { networkId, id: { in: v.schoolIds } }, select: { id: true, name: true } }) : [];
  if (v.schoolIds.length && escolas.length !== v.schoolIds.length) return NextResponse.json({ error: "Escola não encontrada nesta rede." }, { status: 400 });

  // Conferência do registro: psicólogo é consultado no conselho quando a consulta está ligada
  let verificacao = "DECLARADO"; let situacaoNoConselho: string | null = null;
  if (v.funcao === "PSICOLOGO" && consultaDoCfpConfigurada()) {
    const c = await consultarCfp(v.registro, v.uf, v.nome);
    if (c.resultado === "NAO_ENCONTRADO") return NextResponse.json({ error: "O Conselho de Psicologia não confirmou este registro para este nome. Confira o nome completo, o número e a UF." }, { status: 422 });
    if (c.resultado === "INATIVO") return NextResponse.json({ error: `O registro aparece no Conselho de Psicologia como "${c.situacao ?? "não ativo"}". Só é possível cadastrar profissional com registro ativo.` }, { status: 422 });
    if (c.resultado === "ATIVO") { verificacao = "CONSULTADO"; situacaoNoConselho = c.situacao; }
  }

  // Convite anterior da mesma pessoa, ainda pendente, é substituído
  const antigos: { id: string; inviteId: string | null }[] = await P.eduApoioCadastro.findMany({ where: { networkId, email: v.email, status: { not: "ATIVO" } }, select: { id: true, inviteId: true } });
  for (const a of antigos) await apagarConvite(P, a.inviteId);
  if (antigos.length) await P.eduApoioCadastro.deleteMany({ where: { id: { in: antigos.map((a) => a.id) } } });

  const { raw, hash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + SETE_DIAS);
  const convite = await P.eduInvite.create({
    data: { networkId, schoolId: null, email: v.email, name: v.nome, role: "SUPPORT", tokenHash: hash, expiresAt, userId: null, createdById: ctx!.userId },
  });
  await registerStaffInviteInCatalog(hash, networkId, expiresAt);
  const cadastro = await P.eduApoioCadastro.create({
    data: {
      networkId, inviteId: convite.id, email: v.email, name: v.nome, funcao: v.funcao, conselho: CONSELHO[v.funcao].sigla, registro: v.registro, uf: v.uf,
      schoolIds: escolas.map((e) => e.id), verificacao, situacaoNoConselho, declaradoPorId: ctx!.userId,
    },
  });
  await P.eduAuditLog.create({
    data: { networkId, actorType: "user", actorId: ctx!.userId, action: "apoio.profissional.cadastrado", entity: "EduApoioCadastro", entityId: cadastro.id, metadata: { funcao: v.funcao, verificacao, declarouVeracidade: true } },
  }).catch(() => {});

  const [rede, gestor] = await Promise.all([
    P.eduNetwork.findUnique({ where: { id: networkId }, select: { name: true } }),
    P.eduUser.findUnique({ where: { id: ctx!.userId }, select: { name: true } }),
  ]);
  const enviado = await enviar(v.email, emailConviteProfissional({
    nome: v.nome, rede: rede?.name ?? "Rede de ensino", funcao: v.funcao as FuncaoRegistrada, registro: v.registro, uf: v.uf,
    atende: escolas.length ? escolas.map((e) => e.name).join(", ") : "Toda a rede",
    cadastradoPor: gestor?.name ?? "Secretaria de Educação", link: `${urlDoSite()}/escola/convite/${raw}`,
  }));
  return NextResponse.json({ ...(await lista(P, networkId)), enviado, verificacao }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { ctx, P, erro } = await contexto();
  if (erro) return erro;
  const networkId = ctx!.networkId;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const c = await P.eduApoioCadastro.findFirst({ where: { id, networkId }, select: { id: true, inviteId: true, userId: true, status: true } });
  if (!c) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  await apagarConvite(P, c.inviteId);
  if (c.userId) {
    // Tira da equipe e desliga o perfil de profissional de apoio; outros vínculos da pessoa não mudam
    await P.eduEquipeApoio.deleteMany({ where: { networkId, userId: c.userId } });
    await P.eduMembership.updateMany({ where: { networkId, userId: c.userId, role: "SUPPORT" }, data: { isActive: false } });
  }
  await P.eduApoioCadastro.delete({ where: { id: c.id } });
  await P.eduAuditLog.create({
    data: { networkId, actorType: "user", actorId: ctx!.userId, action: "apoio.profissional.excluido", entity: "EduApoioCadastro", entityId: c.id, metadata: { situacaoAnterior: c.status } },
  }).catch(() => {});
  return NextResponse.json(await lista(P, networkId));
}

/** Apaga o convite e tira o código do catálogo, para o link deixar de valer. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apagarConvite(P: any, inviteId: string | null) {
  if (!inviteId) return;
  const convite = await P.eduInvite.findUnique({ where: { id: inviteId }, select: { tokenHash: true, acceptedAt: true } }).catch(() => null);
  if (!convite || convite.acceptedAt) return;
  await deregisterInviteFromCatalog(convite.tokenHash).catch(() => null);
  await P.eduInvite.delete({ where: { id: inviteId } }).catch(() => null);
}

async function enviar(para: string, msg: { subject: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log(`[DEV] convite de profissional de apoio para ${para}`); return false; }
  try {
    const r = await new Resend(key).emails.send({ from: remetenteFamilia(), to: para, subject: msg.subject, text: msg.text });
    return !(r as { error?: unknown }).error;
  } catch { return false; }
}
