import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-internal-secret");
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { userId, amount, source, description } = await req.json();

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ message: "Parâmetros inválidos" }, { status: 400 });
    }

    const userExists = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });
    }

    // Atomic conditional decrement: only succeeds if credits >= amount at the moment of write
    const [updateResult] = await db.$transaction([
      db.user.updateMany({
        where: { id: userId, credits: { gte: amount } },
        data: { credits: { decrement: amount } },
      }),
      (db as any).creditTransaction.create({
        data: {
          userId,
          type: "debit",
          amount: -amount,
          source: source ?? "usage",
          description: description ?? "Uso de sessão",
        },
      }),
    ]);

    if (updateResult.count === 0) {
      return NextResponse.json({ message: "Saldo insuficiente" }, { status: 402 });
    }

    const updated = await db.user.findUnique({ where: { id: userId }, select: { credits: true } });
    return NextResponse.json({ balance: updated?.credits ?? 0 });
  } catch (err) {
    console.error("Wallet use error:", err);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
