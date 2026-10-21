import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSuperAdmin } from "@/lib/superAdmin";
import { sendCrmAccessEmail } from "@/lib/email";
import { sendPushToUsers } from "@/lib/webpush";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { email, grant } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "email obrigatório." }, { status: 400 });

  const user = await (db as any).user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  await (db as any).user.update({
    where: { id: user.id },
    data: { crmAccess: grant === true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://speakflow.ia.br";

  if (grant === true) {
    await Promise.allSettled([
      sendCrmAccessEmail(user.email, user.name ?? "", true),
      sendPushToUsers([user.id], {
        title: "📊 Acesso ao CRM liberado!",
        body: "Você agora tem acesso ao CRM & Growth Center. Toque para abrir.",
        url: `${appUrl}/crm`,
      }),
    ]);
  } else {
    await Promise.allSettled([
      sendCrmAccessEmail(user.email, user.name ?? "", false),
      sendPushToUsers([user.id], {
        title: "Acesso ao CRM removido",
        body: "Seu acesso ao CRM & Growth Center foi revogado pelo administrador.",
        url: `${appUrl}/home`,
      }),
    ]);
  }

  return NextResponse.json({ ok: true, email: user.email, crmAccess: grant === true });
}
