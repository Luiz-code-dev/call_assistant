import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgSessionById, hasRole } from "@/lib/orgAuth";

type Ctx = { params: { orgId: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const challenges = await (db as any).corporateChallenge.findMany({
    where: { orgId: params.orgId },
    include: {
      _count: { select: { submissions: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(challenges);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!hasRole(org.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { title, description, type, category, scenario, targetRole, teamId, startsAt, endsAt } = body;

  if (!title || !description || !type || !category || !startsAt || !endsAt) {
    return NextResponse.json({ error: "Campos obrigatórios: title, description, type, category, startsAt, endsAt." }, { status: 400 });
  }

  const validTypes = ["audio", "quick-response", "roleplay", "scenario"];
  const validCategories = ["meetings", "sales", "support", "onboarding", "presentations", "customer-success", "interviews", "general"];
  if (!validTypes.includes(type)) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  if (!validCategories.includes(category)) return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });

  const challenge = await (db as any).corporateChallenge.create({
    data: {
      orgId: params.orgId,
      teamId: teamId ?? null,
      title,
      description,
      type,
      category,
      scenario: scenario ?? null,
      targetRole: targetRole ?? null,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      createdBy: org.userId,
    },
  });

  return NextResponse.json(challenge, { status: 201 });
}
