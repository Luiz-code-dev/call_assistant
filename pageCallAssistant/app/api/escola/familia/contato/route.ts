/**
 * Contato do responsável para os avisos do reforço.
 * GET: { nome, email, whatsapp, aceitaWhatsapp, avisosEmail }
 * POST { whatsapp?, aceitaWhatsapp?, avisosEmail? }
 *
 * O WhatsApp é guardado com a autorização do responsável (data em whatsappOptInAt).
 * O envio pelo WhatsApp entra quando a conta oficial estiver aprovada.
 */
import { NextResponse } from "next/server";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { whatsappValido } from "@/lib/escola/phone";
import { syncGuardianLogin } from "@/lib/escola/catalogo-sync";

export const dynamic = "force-dynamic";

function formatar(d: string | null): string {
  if (!d) return "";
  const n = d.length === 13 && d.startsWith("55") ? d.slice(2) : d;
  return n.length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : n;
}

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const g = await ctx.db.eduGuardian.findUnique({
    where: { id: ctx.guardianId },
    select: { name: true, email: true, phone: true, whatsappOptInAt: true, emailAlertsOff: true },
  });
  if (!g) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({
    nome: g.name, email: g.email ?? "", whatsapp: formatar(g.phone),
    aceitaWhatsapp: !!g.whatsappOptInAt, avisosEmail: !g.emailAlertsOff,
  });
}

export async function POST(req: Request) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { whatsapp?: string; aceitaWhatsapp?: boolean; avisosEmail?: boolean };
  const data: Record<string, unknown> = {};

  if (typeof b.whatsapp === "string" && b.whatsapp.trim()) {
    const numero = whatsappValido(b.whatsapp);
    if (!numero) return NextResponse.json({ error: "Digite o WhatsApp com DDD, por exemplo (71) 98765-4321." }, { status: 400 });
    const outro = await ctx.db.eduGuardian.findFirst({ where: { networkId: ctx.networkId, phone: numero, id: { not: ctx.guardianId } }, select: { id: true } });
    if (outro) return NextResponse.json({ error: "Esse número já está no cadastro de outro responsável." }, { status: 409 });
    data.phone = numero;
  }
  if (typeof b.aceitaWhatsapp === "boolean") data.whatsappOptInAt = b.aceitaWhatsapp ? new Date() : null;
  if (typeof b.avisosEmail === "boolean") data.emailAlertsOff = !b.avisosEmail;
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada para salvar." }, { status: 400 });

  const g = await ctx.db.eduGuardian.update({ where: { id: ctx.guardianId }, data, select: { phone: true, whatsappOptInAt: true, emailAlertsOff: true } });
  if (data.phone) await syncGuardianLogin(String(data.phone), ctx.networkId).catch(() => null);
  return NextResponse.json({ ok: true, whatsapp: formatar(g.phone), aceitaWhatsapp: !!g.whatsappOptInAt, avisosEmail: !g.emailAlertsOff });
}
