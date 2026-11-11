/**
 * Suporte da família: o assistente do painel manda aqui o que não conseguiu resolver.
 * POST { assunto, descricao, tentativas[], responderPor, whatsapp?, diagnostico{} }
 * Envia um e-mail para a equipe (EMAIL_SUPORTE) com o contato do responsável e o
 * diagnóstico do aparelho. Limite: 5 pedidos por responsável por hora.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { enviarPedidoSuporte } from "@/lib/escola/email-familia";

export const dynamic = "force-dynamic";

const schema = z.object({
  assunto: z.string().min(2).max(120),
  descricao: z.string().min(5).max(3000),
  tentativas: z.array(z.string().max(200)).max(20).default([]),
  responderPor: z.enum(["email", "whatsapp"]).default("email"),
  whatsapp: z.string().max(30).optional(),
  diagnostico: z.record(z.string().max(40), z.string().max(400)).default({}),
});

const LIMITE = 5;
const JANELA_MS = 60 * 60 * 1000;
const pedidos = new Map<string, number[]>();

function dentroDoLimite(chave: string, agora = Date.now()): boolean {
  const recentes = (pedidos.get(chave) ?? []).filter((t) => agora - t < JANELA_MS);
  if (recentes.length >= LIMITE) { pedidos.set(chave, recentes); return false; }
  recentes.push(agora);
  pedidos.set(chave, recentes);
  return true;
}

function formatarFone(d: string | null | undefined): string | null {
  if (!d) return null;
  const n = d.length === 13 && d.startsWith("55") ? d.slice(2) : d;
  return n.length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : n;
}

export async function POST(req: Request) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Entre de novo no painel da família para falar com o suporte." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Conte um pouco mais sobre o que aconteceu." }, { status: 400 });
  if (!dentroDoLimite(ctx.guardianId)) {
    return NextResponse.json({ error: "Você já mandou vários pedidos nesta hora. Nossa equipe já está vendo. Tente de novo mais tarde." }, { status: 429 });
  }
  const d = parsed.data;

  const g = await ctx.db.eduGuardian.findUnique({ where: { id: ctx.guardianId }, select: { name: true, email: true, phone: true } });
  if (!g) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const links: { studentId: string }[] = await ctx.db.eduGuardianLink.findMany({
    where: { guardianId: ctx.guardianId, isActive: true }, select: { studentId: true },
  }).catch(() => []);
  const alunos: { fullName: string }[] = links.length
    ? await ctx.db.eduStudent.findMany({ where: { id: { in: links.map((l) => l.studentId) } }, select: { fullName: true } }).catch(() => [])
    : [];
  const rede = await ctx.db.eduNetwork.findUnique({ where: { id: ctx.networkId }, select: { name: true, city: true, state: true } }).catch(() => null);

  const protocolo = randomBytes(3).toString("hex").toUpperCase();
  const enviado = await enviarPedidoSuporte({
    protocolo,
    assunto: d.assunto,
    descricao: d.descricao,
    tentativas: d.tentativas,
    responsavel: { nome: g.name, email: g.email ?? null, whatsapp: formatarFone(d.whatsapp?.replace(/\D/g, "") || g.phone), responderPor: d.responderPor },
    filhos: alunos.map((a) => a.fullName),
    rede: rede ? `${rede.name} (${rede.city}/${rede.state})` : ctx.networkId,
    diagnostico: { ...d.diagnostico, "Recebido em": new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) },
  });
  if (!enviado && process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Não conseguimos enviar agora. Tente de novo em alguns minutos." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, protocolo });
}
