/**
 * Secretaria: liga ou desliga o canal de apoio, escolhe a partir de que ano ele aparece
 * e indica, por nome, quem lê os pedidos. A secretaria administra a equipe, mas só lê
 * os pedidos quem estiver na equipe.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { ANOS_POSSIVEIS } from "@/lib/escola/apoio-aluno";

export const runtime = "nodejs";

async function contexto() {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getEduContext();
  if (!ctx || !ctx.userId) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (ctx.role !== "NETWORK_ADMIN") return { erro: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  if (ctx.db) setTenantDb(ctx.db);
  return { ctx, P: (ctx.db ?? prismaEdu) as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const PAPEL: Record<string, string> = { NETWORK_ADMIN: "Secretaria", COORDINATOR: "Coordenação", SCHOOL_ADMIN: "Direção", TEACHER: "Professor(a)" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function estado(P: any, networkId: string) {
  const [rede, equipe, vinculos] = await Promise.all([
    P.eduNetwork.findUnique({ where: { id: networkId }, select: { apoioAtivo: true, apoioAnoMinimo: true } }),
    P.eduEquipeApoio.findMany({ where: { networkId }, select: { userId: true } }),
    P.eduMembership.findMany({
      where: { networkId, isActive: true, user: { isActive: true } },
      select: { role: true, user: { select: { id: true, name: true, email: true } }, school: { select: { name: true } } },
      take: 2000,
    }),
  ]);
  const naEquipe = new Set((equipe as { userId: string }[]).map((e) => e.userId));
  const pessoas = new Map<string, { id: string; nome: string; email: string; funcao: string; naEquipe: boolean }>();
  for (const v of vinculos as { role: string; user: { id: string; name: string; email: string }; school: { name: string } | null }[]) {
    if (pessoas.has(v.user.id)) continue;
    pessoas.set(v.user.id, {
      id: v.user.id, nome: v.user.name, email: v.user.email,
      funcao: [PAPEL[v.role] ?? v.role, v.school?.name].filter(Boolean).join(" · "), naEquipe: naEquipe.has(v.user.id),
    });
  }
  return {
    ativo: !!rede?.apoioAtivo, anoMinimo: rede?.apoioAnoMinimo ?? 7, anos: ANOS_POSSIVEIS,
    pessoas: Array.from(pessoas.values()).sort((a, b) => Number(b.naEquipe) - Number(a.naEquipe) || a.nome.localeCompare(b.nome, "pt-BR")),
  };
}

export async function GET() {
  const { ctx, P, erro } = await contexto();
  if (erro) return erro;
  return NextResponse.json(await estado(P, ctx!.networkId));
}

export async function PATCH(req: NextRequest) {
  const { ctx, P, erro } = await contexto();
  if (erro) return erro;
  const networkId = ctx!.networkId;
  const b = (await req.json().catch(() => ({}))) as { ativo?: unknown; anoMinimo?: unknown; incluir?: unknown; retirar?: unknown };

  if (typeof b.ativo === "boolean" || b.anoMinimo !== undefined) {
    const data: Record<string, unknown> = {};
    if (typeof b.ativo === "boolean") data.apoioAtivo = b.ativo;
    if (b.anoMinimo !== undefined) {
      const ano = Number(b.anoMinimo);
      if (!(ANOS_POSSIVEIS as readonly number[]).includes(ano)) return NextResponse.json({ error: "Escolha um ano entre o 6º e o 9º." }, { status: 400 });
      data.apoioAnoMinimo = ano;
    }
    await P.eduNetwork.update({ where: { id: networkId }, data });
    await P.eduAuditLog.create({
      data: { networkId, actorType: "user", actorId: ctx!.userId, action: "apoio.configuracao", entity: "EduNetwork", entityId: networkId, metadata: data },
    }).catch(() => {});
  }

  for (const [campo, acao] of [["incluir", "apoio.equipe.incluida"], ["retirar", "apoio.equipe.retirada"]] as const) {
    const userId = b[campo];
    if (typeof userId !== "string" || !userId) continue;
    const pessoa = await P.eduMembership.findFirst({ where: { networkId, userId, isActive: true }, select: { id: true } });
    if (!pessoa) return NextResponse.json({ error: "Pessoa não encontrada nesta rede." }, { status: 404 });
    if (campo === "incluir") {
      await P.eduEquipeApoio.upsert({
        where: { networkId_userId: { networkId, userId } },
        create: { networkId, userId, addedById: ctx!.userId },
        update: {},
      });
    } else {
      await P.eduEquipeApoio.deleteMany({ where: { networkId, userId } });
    }
    await P.eduAuditLog.create({
      data: { networkId, actorType: "user", actorId: ctx!.userId, action: acao, entity: "EduUser", entityId: userId },
    }).catch(() => {});
  }

  return NextResponse.json(await estado(P, networkId));
}
