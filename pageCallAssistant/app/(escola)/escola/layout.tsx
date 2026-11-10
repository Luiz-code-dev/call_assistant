import { headers } from "next/headers";
import { setTenantDb } from "@/lib/escola/db";
import EscAppShell from "@/components/escola/layout/EscAppShell";
import { getEduContext } from "@/lib/escola/context";
import { EduRole } from "@/lib/escola/types";
import { prismaEdu } from "@/lib/escola/db";
import { catalogDb } from "@/lib/escola/catalogo";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "SpeakFlow Escolas",
  description: "Reforço escolar personalizado com IA",
  manifest: "/escola-manifest.json",
  icons: {
    icon: [
      { url: "/escola-icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/escola-icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/escola-icons/icon-192.png",   sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/escola-icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/escola-icons/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#6D28D9",
  width: "device-width",
  initialScale: 1,
};

// Páginas de aluno, família e rotas públicas NÃO usam o EscAppShell
function isShellFreePath(pathname: string): boolean {
  return (
    pathname.startsWith("/escola/aluno") ||
    pathname.startsWith("/escola/familia") ||
    pathname.startsWith("/escola/entrar") ||
    pathname.startsWith("/escola/convite") ||
    pathname === "/escola/inicio" ||
    pathname === "/escola/painel" ||
    pathname === "/escola/termos" ||
    pathname === "/escola/privacidade" ||
    pathname === "/escola/excluir-conta"
  );
}

async function getShellData() {
  try {
    const ctx = await getEduContext();
    if (!ctx) return null;
    if (ctx.db) setTenantDb(ctx.db);

    let userName = "Usuário";

    if (ctx.role === "PLATFORM_ADMIN") {
      // PLATFORM_ADMIN não tem banco tenant — busca nome no catálogo
      try {
        const catalog = catalogDb;
        const admin = await catalog.platformAdmin.findFirst({
          where: { isActive: true },
          select: { name: true, email: true },
        });
        userName = admin?.name ?? admin?.email ?? "Admin";
      } catch {
        userName = "Admin";
      }
      return { role: "PLATFORM_ADMIN" as EduRole, contextName: "Plataforma", userName };
    }

    // Perfis de equipe escolar — usa EduUser no banco tenant
    if (ctx.userId) {
      const user = await prismaEdu.eduUser.findUnique({
        where: { id: ctx.userId },
        select: { name: true, email: true },
      }).catch(() => null);
      userName = user?.name ?? user?.email ?? "Usuário";
    }

    const network = await prismaEdu.eduNetwork.findUnique({
      where: { id: ctx.networkId },
      select: { name: true },
    }).catch(() => null);

    let contextName = network?.name ?? "";
    if (ctx.schoolId) {
      const school = await prismaEdu.eduSchool.findUnique({
        where: { id: ctx.schoolId },
        select: { name: true },
      }).catch(() => null);
      if (school?.name) contextName = school.name;
    }

    return { role: ctx.role as EduRole, contextName, userName };
  } catch (err) {
    console.error("[escola/layout] getShellData error:", err);
    return null;
  }
}

export default async function EscolaAuthLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  if (isShellFreePath(pathname)) {
    return <div className="theme-escola min-h-screen bg-[#F8F7FC]">{children}</div>;
  }

  const shellData = await getShellData();
  if (!shellData) {
    return <div className="theme-escola min-h-screen bg-[#F8F7FC]">{children}</div>;
  }

  return (
    <EscAppShell role={shellData.role} contextName={shellData.contextName} userName={shellData.userName}>
      {children}
    </EscAppShell>
  );
}
