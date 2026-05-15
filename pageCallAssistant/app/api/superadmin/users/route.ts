import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSuperAdmin, isRootAdmin } from "@/lib/superAdmin";

export const dynamic = "force-dynamic";

// Grant or revoke superAdmin by email
export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { email, grant } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "email obrigatório." }, { status: 400 });

  if (grant === false && isRootAdmin(email)) {
    return NextResponse.json(
      { error: "A conta root não pode ser revogada via API. Altere ROOT_ADMIN_EMAIL no servidor." },
      { status: 403 }
    );
  }

  const target = await (db as any).user.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true, name: true, email: true },
  });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  await (db as any).user.update({
    where: { id: target.id },
    data: { superAdmin: grant !== false },
  });

  return NextResponse.json({ ok: true, email: target.email, superAdmin: grant !== false });
}

// Update b2bSeatLimit for a user (retroactively adjust agreed seats)
export async function PATCH(req: NextRequest) {
  if (!(await isSuperAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { email, b2bSeatLimit, b2bAccess } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "email obrigatório." }, { status: 400 });

  const target = await (db as any).user.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (b2bSeatLimit !== undefined) data.b2bSeatLimit = Math.max(1, parseInt(b2bSeatLimit) || 1);
  if (b2bAccess !== undefined) data.b2bAccess = Boolean(b2bAccess);

  await (db as any).user.update({ where: { id: target.id }, data });
  return NextResponse.json({ ok: true });
}
