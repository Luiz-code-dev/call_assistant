import { headers } from "next/headers";
import { setTenantDb } from "@/lib/escola/db";

import EscAppShell from "@/components/escola/layout/EscAppShell";
import { getEduContext } from "@/lib/escola/context";
import { EduRole } from "@/lib/escola/types";

// Páginas do aluno e da família NÃO usam o EscAppShell (barra lateral da equipe)
function isShellFreePath(pathname: string): boolean {
  return (
    pathname.startsWith("/escola/aluno") ||
    pathname.startsWith("/escola/familia") ||
    pathname.startsWith("/escola/entrar") ||
    pathname === "/escola/inicio" ||
    pathname === "/escola/termos" ||
    pathname === "/escola/privacidade"
  );
}

async function getShellData() {
  try {
    const ctx = await getEduContext(); // mesmo segredo do login e do middleware
    if (!ctx) return null;
    // enterWith dentro de getEduContext() não propaga para o caller — reaplicar aqui
    if (ctx.db) setTenantDb(ctx.db);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = ctx.db as any;

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
  } catch (err) {
    console.error("[escola/layout] getShellData error:", err);
    return null;
  }
}

export default async function EscolaAuthLayout({ children }: { children: React.ReactNode }) {
  // Páginas de aluno e família não usam o shell da equipe
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  if (isShellFreePath(pathname)) {
    return <div className="theme-escola min-h-screen bg-[#F8F7FC]">{children}</div>;
  }

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
