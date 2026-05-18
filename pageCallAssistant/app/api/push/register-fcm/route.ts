import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ message: "Token inválido" }, { status: 401 });
  }

  const { fcmToken, platform } = await req.json();

  if (!fcmToken || typeof fcmToken !== "string") {
    return NextResponse.json({ message: "fcmToken é obrigatório" }, { status: 400 });
  }

  await (db as any).user.update({
    where: { id: payload.sub },
    data: { fcmToken, fcmPlatform: platform ?? null },
  });

  return NextResponse.json({ message: "Token registrado com sucesso" });
}

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ message: "Token inválido" }, { status: 401 });
  }

  await (db as any).user.update({
    where: { id: payload.sub },
    data: { fcmToken: null, fcmPlatform: null },
  });

  return NextResponse.json({ message: "Token removido" });
}
