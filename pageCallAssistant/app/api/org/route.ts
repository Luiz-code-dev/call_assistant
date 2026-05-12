import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const memberships = await (db as any).orgMember.findMany({
    where: { userId: session.sub },
    include: {
      org: {
        select: {
          id: true, name: true, slug: true, logoUrl: true, industry: true, plan: true,
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json(memberships.map((m: any) => ({ ...m.org, role: m.role })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, industry, domain } = body;

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: "Nome da organização é obrigatório (mínimo 2 caracteres)." }, { status: 400 });
  }

  let slug = slugify(name);
  const existing = await (db as any).organization.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const org = await (db as any).organization.create({
    data: {
      name: name.trim(),
      slug,
      industry: industry ?? null,
      domain: domain ?? null,
      ownerId: session.sub,
      members: {
        create: {
          userId: session.sub,
          role: "owner",
        },
      },
    },
  });

  return NextResponse.json(org, { status: 201 });
}
