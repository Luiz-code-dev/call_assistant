import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { db } from "@/lib/db";
import EscolaShell from "@/components/escola/EscolaShell";
import { EduRole } from "@/lib/escola/types";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = db as any;

const secret = new TextEncoder().encode(
  process.env.EDU_STUDENT_JWT_SECRET || "edu-student-dev-secret"
);

async function getShellData() {
  const cookieStore = cookies();
  const ctxToken = cookieStore.get("sf_edu_ctx")?.value;
  if (!ctxToken) return null;
  try {
    const { payload } = await jwtVerify(ctxToken, secret);
    const membershipId = payload["mid"] as string | undefined;
    if (!membershipId) return null;
    const membership = await prisma.eduMembership.findUnique({
      where: { id: membershipId, isActive: true },
      include: {
        network: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    });
    if (!membership) return null;
    return {
      role: membership.role as EduRole,
      networkName: membership.network.name,
      userName: membership.user.name || membership.user.email,
    };
  } catch {
    return null;
  }
}

export default async function EscolaAuthLayout({ children }: { children: React.ReactNode }) {
  const shellData = await getShellData();

  if (!shellData) {
    return <>{children}</>;
  }

  return (
    <EscolaShell
      role={shellData.role}
      networkName={shellData.networkName}
      userName={shellData.userName}
    >
      {children}
    </EscolaShell>
  );
}
