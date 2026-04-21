import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "token_invalid" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, avatarUrl } = body;

  const data: Record<string, string | null> = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim().slice(0, 80);
  if (typeof avatarUrl === "string") data.avatarUrl = avatarUrl.trim() || null;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });

  const user = await db.user.update({
    where: { id: payload.sub },
    data,
    select: { id: true, name: true, avatarUrl: true },
  });

  return NextResponse.json(user);
}
