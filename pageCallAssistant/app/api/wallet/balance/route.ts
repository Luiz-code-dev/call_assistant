import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
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

    const PLAN_CREDITS: Record<string, number> = { free: 50, basic: 500, premium: 1000 };

    const [user, usedResult] = await Promise.all([
      db.user.findUnique({
        where: { id: payload.sub },
        select: { credits: true, plan: true },
      }),
      (db as any).creditTransaction.aggregate({
        where: { userId: payload.sub, type: "debit" },
        _sum: { amount: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });
    }

    const monthlyAllocation = PLAN_CREDITS[user.plan] ?? 50;
    const usedThisCycle = usedResult._sum.amount ?? 0;

    return NextResponse.json({
      balance: user.credits,
      bonusBalance: 0,
      trialBalance: 0,
      monthlyAllocation,
      usedThisCycle,
    });
  } catch {
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
