import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { bearerToken } from "@/lib/escola/app-auth";
import { verifyPendingStaffToken } from "@/lib/escola/staff-session";

export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // App: token pendente no Bearer. Web: cookie de escolha pendente.
  const bearer = bearerToken();
  const pendingUid = bearer ? await verifyPendingStaffToken(bearer) : req.cookies.get("sf_edu_pending_uid")?.value;
  if (!pendingUid) {
    return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [memberships, platformAdmin] = await Promise.all([
    (db as any).eduMembership.findMany({
      where: { userId: pendingUid, isActive: true, network: { isActive: true } },
      select: {
        id: true, role: true,
        network: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
      },
      orderBy: [{ networkId: "asc" }, { schoolId: "asc" }],
    }),
    (db as any).eduPlatformAdmin.findUnique({ where: { userId: pendingUid }, select: { isActive: true } }),
  ]);

  const list = [
    ...(platformAdmin?.isActive ? [{ id: "platform", role: "PLATFORM_ADMIN", network: { id: "", name: "SpeakFlow Escolas" }, school: null }] : []),
    ...memberships,
  ];

  return NextResponse.json({ memberships: list });
}
