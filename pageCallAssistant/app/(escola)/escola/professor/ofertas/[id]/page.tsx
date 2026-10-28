import { getEduContext } from "@/lib/escola/context";
import { redirect } from "next/navigation";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";
import { ASSESSMENT_STATUS_LABEL, ASSESSMENT_TYPE_LABEL } from "@/lib/escola/types";

export default async function OfertaPage({ params }: { params: { id: string } }) {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");

  // findFirst em vez de findUnique: networkId é filtro de segurança, não constraint única.
  // Removido _count.entries (EduGradeEntry — módulo de notas FEATURE_ESCOLAS_NOTAS=false).
  const offer = await prismaEdu.eduClassSubject.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
    select: {
      id: true,
      subjectId: true,
      teacherId: true,
      class: {
        select: {
          name: true,
          _count: { select: { enrollments: true } },
          schoolYear: { select: { year: true } },
          school: { select: { name: true } },
        },
      },
      assessments: {
        orderBy: { id: "desc" },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          weight: true,
          maxScore: true,
          term: { select: { name: true } },
        },
      },
    },
  });

  if (!offer) redirect("/escola/professor");
  if (ctx.role === "TEACHER" && offer.teacherId !== ctx.userId) redirect("/escola/professor");

  // Lookup do componente separado (EduClassSubject não tem relação @relation com EduSubject).
  const subject = offer.subjectId
    ? await prismaEdu.eduSubject.findFirst({
        where: { id: offer.subjectId },
        select: { name: true, color: true },
      })
    : null;

  const totalStudents = offer.class?._count?.enrollments ?? 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-2">
        <Link href="/escola/professor" className="text-[#5B5470] hover:text-[#3F3A4F] text-sm transition-colors">← Minhas Turmas</Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: subject?.color ?? "#7C3AED" }} />
            <h1 className="text-2xl font-bold text-[#1F1A2E]">{subject?.name ?? "Componente"}</h1>
          </div>
          <p className="text-[#5B5470] text-sm">{offer.class?.name} · {offer.class?.school?.name} · {offer.class?.schoolYear?.year}</p>
          <p className="text-[#5B5470] text-xs mt-0.5">{totalStudents} alunos matriculados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/escola/professor/ofertas/${params.id}/assuntos`} className="bg-[#FAF9FD] hover:bg-[#F5F3FF] text-[#3F3A4F] hover:text-[#1F1A2E] px-4 py-2 rounded-lg text-sm min-h-[44px] flex items-center transition-colors">Assuntos</Link>
          <Link href={`/escola/professor/ofertas/${params.id}/avaliacoes`} className="bg-[#FAF9FD] hover:bg-[#F5F3FF] text-[#3F3A4F] hover:text-[#1F1A2E] px-4 py-2 rounded-lg text-sm min-h-[44px] flex items-center transition-colors">Avaliações</Link>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-[#1F1A2E] mb-4">Avaliações <span className="text-[#5B5470] text-sm">({offer.assessments?.length ?? 0})</span></h2>

      {offer.assessments?.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#E9E5F5] rounded-xl text-[#5B5470]">
          <div className="text-sm font-medium mb-1">Nenhuma avaliação criada</div>
          <Link href={`/escola/professor/ofertas/${params.id}/avaliacoes`} className="text-[#6D28D9] text-sm mt-2 inline-block hover:underline">Criar avaliação →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {offer.assessments?.map((a: { id: string; title: string; type: string; status: string; weight: unknown; maxScore: unknown; term: { name: string } | null }) => (
            <div key={a.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[#1F1A2E] font-medium">{a.title}</div>
                <div className="text-[#5B5470] text-xs">
                  {ASSESSMENT_TYPE_LABEL[a.type as keyof typeof ASSESSMENT_TYPE_LABEL] ?? a.type}
                  {a.term && ` · ${a.term.name}`}
                  {` · peso ${String(a.weight)} · máx ${String(a.maxScore)}`}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-2 py-0.5 rounded text-xs ${a.status === "PUBLISHED" ? "bg-[#DCFCE7] text-[#166534]" : a.status === "GRADING" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#FAF9FD] text-[#5B5470]"}`}>
                  {ASSESSMENT_STATUS_LABEL[a.status as keyof typeof ASSESSMENT_STATUS_LABEL] ?? a.status}
                </span>
                <span className="text-[#5B5470] text-xs">{totalStudents} alunos</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
