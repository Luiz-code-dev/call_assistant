import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ message: "Token inválido" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: payload.sub } });
  const rootEmail = (process.env.ROOT_ADMIN_EMAIL ?? "").toLowerCase().trim();
  const isSuperAdmin = user?.superAdmin === true || (!!rootEmail && user?.email.toLowerCase() === rootEmail);
  if (!isSuperAdmin) return NextResponse.json({ message: "Acesso negado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const search = searchParams.get("search")?.toLowerCase().trim() ?? "";

  const users = await db.user.findMany({
    where: search ? {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ],
    } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      credits: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}
