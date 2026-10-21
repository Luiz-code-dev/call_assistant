import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendB2BApprovalEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS    = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase());
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const headerSecret = req.headers.get("x-internal-secret");
  if (INTERNAL_SECRET && headerSecret === INTERNAL_SECRET) return true;

  const session = await getSession();
  if (!session) return false;
  const user = await (db as any).user.findUnique({ where: { id: session.sub }, select: { email: true } });
  return !!user && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { email, revoke, seats } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "email obrigatório." }, { status: 400 });

  const target = await (db as any).user.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true, name: true, email: true },
  });

  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const seatLimit = Math.max(1, parseInt(seats) || 16);
  await (db as any).user.update({
    where: { id: target.id },
    data: { b2bAccess: !revoke, ...(!revoke ? { b2bSeatLimit: seatLimit } : {}) },
  });

  if (!revoke) {
    sendB2BApprovalEmail(target.email, target.name ?? "").catch(() => {});
  }

  return NextResponse.json({ ok: true, b2bAccess: !revoke, email: target.email, name: target.name });
}

const PRE_APPROVE_MARKER = "__B2B_PRE_APPROVED__";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const email  = req.nextUrl.searchParams.get("email");
  const revoke = req.nextUrl.searchParams.get("revoke") === "1";
  const seats  = Math.max(1, parseInt(req.nextUrl.searchParams.get("seats") ?? "5") || 5);

  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    return new NextResponse("<h2>Acesso negado.</h2>", { status: 403, headers: { "Content-Type": "text/html" } });
  }
  if (!email) return new NextResponse("<h2>E-mail obrigatório.</h2>", { status: 400, headers: { "Content-Type": "text/html" } });

  const normalizedEmail = email.toLowerCase();

  const target = await (db as any).user.findFirst({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true },
  });

  if (!target) {
    // User hasn't registered yet — store pre-approval marker
    const existing = await (db as any).supportMessage.findFirst({
      where: { name: PRE_APPROVE_MARKER, email: normalizedEmail },
    });
    if (!existing) {
      await (db as any).supportMessage.create({
        data: { name: PRE_APPROVE_MARKER, email: normalizedEmail, message: "Pré-aprovação B2B pendente" },
      });
    }
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;max-width:500px;margin:auto">
        <h2 style="color:#7c3aed">Pré-aprovação registrada</h2>
        <p>O e-mail <strong>${normalizedEmail}</strong> ainda nao possui conta no SpeakFlow.</p>
        <p>A aprovacao B2B sera aplicada <strong>automaticamente</strong> assim que essa pessoa criar a conta.</p>
        <p style="color:#6b7280;font-size:13px">Voce pode encaminhar o link de cadastro: <br><a href="https://www.speakflow.ia.br/register">speakflow.ia.br/register</a></p>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  await (db as any).user.update({
    where: { id: target.id },
    data: { b2bAccess: !revoke, ...((!revoke) ? { b2bSeatLimit: seats } : {}) },
  });

  if (!revoke) {
    sendB2BApprovalEmail(target.email, target.name ?? "").catch(() => {});
  }

  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:40px;max-width:500px;margin:auto">
      <h2 style="color:${revoke ? "#dc2626" : "#16a34a"}">${revoke ? "Acesso revogado" : "Acesso aprovado!"}</h2>
      <p>Usuario: <strong>${target.name}</strong> (${target.email})</p>
      <p>${revoke ? "O acesso B2B foi removido." : `Limite de assentos: <strong>${seats}</strong>. O usuario recebeu e-mail de confirmacao e ja pode criar a organizacao.`}</p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
