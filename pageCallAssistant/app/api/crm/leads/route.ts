import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCrmUser, getCrmSession } from "@/lib/crmAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isCrmUser(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const status  = searchParams.get("status") ?? undefined;
  const search  = searchParams.get("q") ?? "";
  const limit   = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200);
  const offset  = parseInt(searchParams.get("offset") ?? "0");

  const where: any = {};
  if (status && status !== "all") where.status = status;
  if (search) {
    where.OR = [
      { name:    { contains: search, mode: "insensitive" } },
      { email:   { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  const [leads, total] = await Promise.all([
    (db as any).crmLead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      include: { _count: { select: { activities: true } } },
    }),
    (db as any).crmLead.count({ where }),
  ]);

  return NextResponse.json({ leads, total });
}

export async function POST(req: NextRequest) {
  if (!(await isCrmUser(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const session = await getCrmSession(req);

  const body = await req.json().catch(() => ({}));
  const { name, email, phone, company, role, teamSize, origin, status, score, notes } = body;

  if (!name || !email) return NextResponse.json({ error: "nome e email obrigatórios." }, { status: 400 });

  const lead = await (db as any).crmLead.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ?? null,
      company: company ?? null,
      role: role ?? null,
      teamSize: teamSize ?? null,
      origin: origin ?? "manual",
      status: status ?? "novo",
      score: score ?? 0,
      notes: notes ?? null,
      assignedTo: session?.sub ?? null,
      lastContact: new Date(),
    },
  });

  if (notes && session) {
    await (db as any).crmActivity.create({
      data: { leadId: lead.id, authorId: session.sub, type: "note", content: `Lead criado. ${notes}` },
    });
  }

  return NextResponse.json(lead, { status: 201 });
}
