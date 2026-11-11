/**
 * GET /api/escola/familia/filhos/[studentId]/conversa -> { nome, assuntos[], perguntas[] }
 * "Para conversar com o seu filho": o que ele estudou nos últimos 7 dias e 3 perguntas
 * para puxar conversa. A IA recebe só os assuntos e o ano (sem nome nem matrícula).
 * Guarda o resultado por 12 horas para o mesmo conjunto de assuntos.
 */
import { NextResponse } from "next/server";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { subjectInfo } from "@/lib/escola/subjects";
import { tituloParaAluno } from "@/lib/escola/texto-aluno";
import { getOpenAI } from "@/lib/openai";
import { assuntosDaSemana, perguntasSemIA, promptDaConversa, limparPerguntas } from "@/lib/escola/conversa-familia";

export const dynamic = "force-dynamic";

const cache = new Map<string, { em: number; perguntas: string[] }>();
const VALIDADE_MS = 12 * 60 * 60 * 1000;

export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const db = ctx.db;
  const link = await db.eduGuardianLink.findFirst({ where: { guardianId: ctx.guardianId, studentId: params.studentId, isActive: true }, select: { id: true } });
  if (!link) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const aluno = await db.eduStudent.findUnique({ where: { id: params.studentId }, select: { fullName: true } });
  const nome = (aluno?.fullName ?? "").trim().split(/\s+/)[0] || "Seu filho";
  const desde = new Date(Date.now() - 7 * 86_400_000);
  const subs: Array<{ submittedAt: Date; masteryLevel: string | null; activity: { title: string; subjectCode: string | null } }> = await db.eduSubmission.findMany({
    where: { studentId: params.studentId, submittedAt: { gte: desde }, status: { not: "IN_PROGRESS" } },
    select: { submittedAt: true, masteryLevel: true, activity: { select: { title: true, subjectCode: true } } },
    orderBy: { submittedAt: "desc" }, take: 100,
  }).catch(() => []);
  const assuntos = assuntosDaSemana(
    subs.map((s) => ({ quando: new Date(s.submittedAt), materia: s.activity?.subjectCode ?? null, titulo: s.activity?.title ?? "", nivel: s.masteryLevel })),
    (c) => subjectInfo(c).name, tituloParaAluno,
  );
  if (!assuntos.length) return NextResponse.json({ nome, assuntos, perguntas: [] });

  const chave = `${params.studentId}:${assuntos.map((a) => `${a.assunto}|${a.situacao}`).join(";")}`;
  const guardado = cache.get(chave);
  if (guardado && Date.now() - guardado.em < VALIDADE_MS) return NextResponse.json({ nome, assuntos, perguntas: guardado.perguntas });

  let perguntas = perguntasSemIA(assuntos, nome);
  if (process.env.OPENAI_API_KEY) {
    try {
      const enr = await db.eduEnrollment.findFirst({ where: { studentId: params.studentId, status: "ACTIVE" }, orderBy: { startedAt: "desc" }, select: { class: { select: { gradeYear: true } } } }).catch(() => null);
      const r = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini", temperature: 0.6, max_tokens: 220,
        messages: [{ role: "user", content: promptDaConversa(assuntos, enr?.class?.gradeYear ?? null) }],
      });
      const ia = limparPerguntas(r.choices[0]?.message?.content ?? "");
      if (ia.length >= 2) perguntas = ia;
    } catch (err) {
      console.error("[familia/conversa]", (err as Error).message);
    }
  }
  cache.set(chave, { em: Date.now(), perguntas });
  return NextResponse.json({ nome, assuntos, perguntas });
}
