import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgSessionById } from "@/lib/orgAuth";

type Ctx = { params: { orgId: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const where = org.role === "member"
    ? { orgId: params.orgId, userId: org.userId }
    : { orgId: params.orgId };

  const certs = await (db as any).corporateCertification.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return NextResponse.json(certs);
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const submissions = await (db as any).corpChallengeSubmission.findMany({
    where: { orgId: params.orgId, userId: org.userId },
    select: { totalScore: true, fluencyScore: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (submissions.length < 3) {
    return NextResponse.json({ error: "Mínimo de 3 submissões necessárias para gerar certificado." }, { status: 400 });
  }

  const scores = submissions.map((s: any) => s.totalScore ?? 50);
  const fluencyScores = submissions.map((s: any) => s.fluencyScore ?? 50);
  const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  const avgFluency = fluencyScores.reduce((a: number, b: number) => a + b, 0) / fluencyScores.length;

  const uniqueDays = new Set(submissions.map((s: any) => new Date(s.createdAt).toDateString())).size;
  const consistency = Math.min(100, uniqueDays * 10);

  let level = "A2";
  if (avgScore >= 85) level = "C1";
  else if (avgScore >= 70) level = "B2";
  else if (avgScore >= 55) level = "B1";
  else if (avgScore >= 40) level = "A2";
  else level = "A1";

  const existing = await (db as any).corporateCertification.findFirst({
    where: { orgId: params.orgId, userId: org.userId },
    orderBy: { issuedAt: "desc" },
  });

  if (existing) {
    const daysSince = (Date.now() - new Date(existing.issuedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 30) {
      return NextResponse.json({ error: "Certificado gerado recentemente. Aguarde 30 dias para renovar." }, { status: 429 });
    }
  }

  const cert = await (db as any).corporateCertification.create({
    data: {
      orgId: params.orgId,
      userId: org.userId,
      level,
      score: avgScore,
      fluency: avgFluency,
      consistency,
    },
  });

  return NextResponse.json(cert, { status: 201 });
}
