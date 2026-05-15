import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSuperAdmin } from "@/lib/superAdmin";

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

  return NextResponse.json({ ok: true, email: user.email, crmAccess: grant === true });
}
