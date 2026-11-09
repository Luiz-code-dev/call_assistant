import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { getContentReadDb } from "@/lib/escola/conteudo-plataforma";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const db = await getContentReadDb();

    const [skills, guides, tracks, diagnostics] = await Promise.all([
      db.eduSkill.count({ where: { networkId: null } }),
      db.eduSkillGuide.count({ where: { networkId: null } }),
      db.eduTrack.count({ where: { networkId: null, source: "SPEAKFLOW" } }),
      db.eduDiagnostic.count({ where: { networkId: null, source: "SPEAKFLOW" } }),
    ]);

    const bySubject = await db.eduSkill.groupBy({
      by: ["subjectCode"],
      where: { networkId: null },
      _count: { id: true },
    });

    return NextResponse.json({
      totals: { skills, guides, tracks, diagnostics },
      bySubject: bySubject.map((r) => ({ subjectCode: r.subjectCode, count: r._count.id })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
