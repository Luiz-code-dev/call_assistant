import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pendingUid = req.cookies.get("sf_edu_pending_uid")?.value;
  if (!pendingUid) {
    return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberships = await (db as any).eduMembership.findMany({
    where: { userId: pendingUid, isActive: true, network: { isActive: true } },
    select: {
      id: true,
      role: true,
      network: { select: { id: true, name: true } },
      school: { select: { id: true, name: true } },
    },
    orderBy: [{ networkId: "asc" }, { schoolId: "asc" }],
  });

  return NextResponse.json({ memberships });
}
