import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { db } from "@/lib/db";
import EscAppShell from "@/components/escola/layout/EscAppShell";
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
    const role = payload["role"] as EduRole | undefined;
    const userId = payload["sub"] as string | undefined;

    if (role === "PLATFORM_ADMIN" && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      return {
        role: "PLATFORM_ADMIN" as EduRole,
        contextName: "Plataforma",
        userName: (user?.name || user?.email || "Administrador") as string,
      };
    }

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
      contextName: membership.network.name as string,
      userName: (membership.user.name || membership.user.email) as string,
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
    <EscAppShell
      role={shellData.role}
      contextName={shellData.contextName}
      userName={shellData.userName}
    >
      {children}
    </EscAppShell>
  );
}
