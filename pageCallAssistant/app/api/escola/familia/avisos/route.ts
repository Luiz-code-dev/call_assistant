/**
 * Avisos do reforço no celular do responsável (web push).
 * GET: { disponivel, chave }.  POST {endpoint, keys:{p256dh, auth}}: inscreve.  DELETE {endpoint}: desinscreve.
 */
import { NextResponse } from "next/server";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { avisosConfigurados } from "@/lib/escola/avisos";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json({ disponivel: avisosConfigurados(), chave: process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_KEY ?? "" });
}

export async function POST(req: Request) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!b.endpoint || !/^https:\/\//.test(b.endpoint) || !b.keys?.p256dh || !b.keys?.auth) {
    return NextResponse.json({ error: "Inscrição inválida." }, { status: 400 });
  }
  await ctx.db.eduGuardianPushSubscription.deleteMany({ where: { endpoint: b.endpoint } });
  await ctx.db.eduGuardianPushSubscription.create({
    data: { networkId: ctx.networkId, guardianId: ctx.guardianId, endpoint: b.endpoint, p256dh: b.keys.p256dh, auth: b.keys.auth },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (b.endpoint) await ctx.db.eduGuardianPushSubscription.deleteMany({ where: { endpoint: b.endpoint, guardianId: ctx.guardianId } });
  return NextResponse.json({ ok: true });
}
