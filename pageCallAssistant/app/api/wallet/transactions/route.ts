import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ message: "Token inválido" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const size = parseInt(searchParams.get("size") || "20", 10);

    const dbAny = db as any;
    const [transactions, total] = await Promise.all([
      dbAny.creditTransaction.findMany({
        where: { userId: payload.sub },
        orderBy: { createdAt: "desc" },
        skip: page * size,
        take: size,
      }),
      dbAny.creditTransaction.count({ where: { userId: payload.sub } }),
    ]);

    return NextResponse.json({ content: transactions, totalElements: total });
  } catch {
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
