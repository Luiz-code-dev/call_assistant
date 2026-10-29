import { NextRequest, NextResponse } from "next/server";

import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { bearerToken } from "@/lib/escola/app-auth";
import { verifyPendingStaffToken } from "@/lib/escola/staff-session";
import { catalogDb, findTenantsByLogin } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";

export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // App: token pendente no Bearer. Web: cookies de escolha pendente.
  const bearer = bearerToken();
  const pendingResult = bearer ? await verifyPendingStaffToken(bearer) : null;
  const pendingUid = pendingResult?.userId ?? req.cookies.get("sf_edu_pending_uid")?.value;
  const pendingEmail = pendingResult?.email ?? req.cookies.get("sf_edu_pending_email")?.value;

  if (!pendingUid || !pendingEmail) {
    return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  // Platform admin: leitura direta do catálogo (não fica em banco tenant)
  const platformAdmin = await catalogDb.platformAdmin.findUnique({
    where: { email: pendingEmail.toLowerCase().trim() },
    select: { isActive: true },
  }).catch(() => null);

  // Memberships: busca em cada rede onde o e-mail está indexado como STAFF
  const tenantIds = await findTenantsByLogin("STAFF", pendingEmail);
  const memberships: { id: string; role: string; network: { id: string; name: string }; school: { id: string; name: string } | null }[] = [];

  for (const tenantId of tenantIds) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = await getTenantDb(tenantId) as any;
      const rows = await db.eduMembership.findMany({
        where: { userId: pendingUid, isActive: true, network: { isActive: true } },
        select: {
          id: true, role: true,
          network: { select: { id: true, name: true } },
          school: { select: { id: true, name: true } },
        },
        orderBy: [{ networkId: "asc" }, { schoolId: "asc" }],
      });
      memberships.push(...rows);
    } catch { /* tenant indisponível, ignora */ }
  }

  const list = [
    ...(platformAdmin?.isActive ? [{ id: "platform", role: "PLATFORM_ADMIN", network: { id: "", name: "SpeakFlow Escolas" }, school: null }] : []),
    ...memberships,
  ];

  return NextResponse.json({ memberships: list });
}
