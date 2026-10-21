import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCrmUser, getCrmSession } from "@/lib/crmAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isCrmUser(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const lead = await (db as any).crmLead.findUnique({
    where: { id: params.id },
    include: {
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isCrmUser(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const session = await getCrmSession(req);

  const body = await req.json().catch(() => ({}));
  const { name, email, phone, company, role, teamSize, origin, status, score, notes, lastContact, addNote } = body;

  const data: any = { updatedAt: new Date() };
  if (name !== undefined)        data.name        = name;
  if (email !== undefined)       data.email       = email.toLowerCase();
  if (phone !== undefined)       data.phone       = phone;
  if (company !== undefined)     data.company     = company;
  if (role !== undefined)        data.role        = role;
  if (teamSize !== undefined)    data.teamSize    = teamSize;
  if (origin !== undefined)      data.origin      = origin;
  if (status !== undefined)      data.status      = status;
  if (score !== undefined)       data.score       = score;
  if (notes !== undefined)       data.notes       = notes;
  if (lastContact !== undefined) data.lastContact = lastContact ? new Date(lastContact) : null;

  const lead = await (db as any).crmLead.update({ where: { id: params.id }, data });

  if (addNote && session) {
    await (db as any).crmActivity.create({
      data: { leadId: params.id, authorId: session.sub, type: "note", content: addNote },
    });
  }
  if (status !== undefined && session) {
    await (db as any).crmActivity.create({
      data: { leadId: params.id, authorId: session.sub, type: "status_change", content: `Status alterado para "${status}"` },
    });
  }

  return NextResponse.json(lead);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isCrmUser(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await (db as any).crmLead.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
