import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const rows = await p.eduClassSubject.findMany({
      where: { networkId: ctx.networkId, teacherId: ctx.userId },
      select: {
        id: true,
        subjectId: true,
        classId: true,
        class: {
          select: {
            id: true,
            name: true,
            gradeYear: true,
            shift: true,
            school: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { class: { name: "asc" } },
    });

    // EduClassSubject não tem @relation com EduSubject — lookup separado
    const subjectIds = Array.from(new Set<string>(rows.map((r: { subjectId: string }) => r.subjectId).filter(Boolean)));
    const subjects: { id: string; name: string; color: string | null }[] = subjectIds.length
      ? await p.eduSubject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true, color: true },
        })
      : [];
    const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));

    const ofertas = rows.map((r: { id: string; subjectId: string; classId: string; class: object }) => ({
      ...r,
      subject: subjectMap[r.subjectId] ?? null,
    }));

    return NextResponse.json({ ofertas });
  } catch (err) {
    console.error("[api/professor/ofertas]", err);
    return NextResponse.json({ error: "Erro ao buscar ofertas" }, { status: 500 });
  }
}
