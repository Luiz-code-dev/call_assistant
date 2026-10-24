import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

export async function GET() {
  if (process.env.FEATURE_ESCOLAS !== "true")
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let networkName: string | null = null;
  if (ctx.networkId) {
    const network = await prismaEdu.eduNetwork.findUnique({
      where: { id: ctx.networkId },
      select: { name: true },
    });
    networkName = network?.name ?? null;
  }

  return NextResponse.json({
    userId: ctx.userId,
    role: ctx.role,
    networkId: ctx.networkId,
    schoolId: ctx.schoolId,
    membershipId: ctx.membershipId,
    networkName,
  });
}
