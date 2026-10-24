import { db } from "@/lib/db";
import EscAppShell from "@/components/escola/layout/EscAppShell";
import { getEduContext } from "@/lib/escola/context";
import { EduRole } from "@/lib/escola/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = db as any;

async function getShellData() {
  const ctx = await getEduContext(); // mesmo segredo do login e do middleware
  if (!ctx) return null;

  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true, email: true } });
  const userName = (user?.name || user?.email || "Usuário") as string;

  if (ctx.role === "PLATFORM_ADMIN") {
    return { role: "PLATFORM_ADMIN" as EduRole, contextName: "Plataforma", userName };
  }

  const network = await prisma.eduNetwork.findUnique({ where: { id: ctx.networkId }, select: { name: true } });
  let contextName = (network?.name ?? "") as string;
  if (ctx.schoolId) {
    const school = await prisma.eduSchool.findUnique({ where: { id: ctx.schoolId }, select: { name: true } });
    if (school?.name) contextName = school.name as string;
  }
  return { role: ctx.role, contextName, userName };
}

export default async function EscolaAuthLayout({ children }: { children: React.ReactNode }) {
  const shellData = await getShellData();
  if (!shellData) {
    return <div className="theme-escola min-h-screen">{children}</div>;
  }
  return (
    <EscAppShell role={shellData.role} contextName={shellData.contextName} userName={shellData.userName}>
      {children}
    </EscAppShell>
  );
}
