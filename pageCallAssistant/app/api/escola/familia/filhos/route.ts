import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

// Cores dos circulos de inicial (deterministico por studentId).
const AVATAR_COLORS = ["#6D28D9", "#BE185D", "#1D4ED8", "#0F766E", "#C2410C", "#15803D"];
function pickColor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const links = await (prismaEdu as any).eduGuardianLink.findMany({
      where: { guardianId: ctx.guardianId, isActive: true },
      select: { studentId: true },
    });
    const ids = links.map((l: { studentId: string }) => l.studentId);
    if (!ids.length) return NextResponse.json({ filhos: [] });

    const students = await (prismaEdu as any).eduStudent.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, fullName: true,
        enrollments: {
          where: { status: "ACTIVE" },
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { class: { select: { name: true, school: { select: { name: true } } } } },
        },
      },
    });

    const filhos = students.map((s: any) => {
      const enr = s.enrollments[0];
      return {
        studentId: s.id,
        firstName: s.fullName.trim().split(/\s+/)[0],
        fullName: s.fullName,
        className: enr?.class?.name ?? null,
        schoolName: enr?.class?.school?.name ?? null,
        initials: initialsOf(s.fullName),
        color: pickColor(s.id),
      };
    });
    return NextResponse.json({ filhos });
  } catch (err) {
    console.error("[familia/filhos:GET]", err);
    return NextResponse.json({ error: "Não foi possível carregar os filhos." }, { status: 500 });
  }
}
