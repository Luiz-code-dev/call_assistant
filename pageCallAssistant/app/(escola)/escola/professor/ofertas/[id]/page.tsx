import { getEduContext } from "@/lib/escola/context";
import { redirect } from "next/navigation";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";

export default async function OfertaPage({ params }: { params: { id: string } }) {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");

  const offer = await prismaEdu.eduClassSubject.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
    select: {
      id: true,
      subjectId: true,
      teacherId: true,
      classId: true,
      class: {
        select: {
          name: true,
          _count: { select: { enrollments: true } },
          schoolYear: { select: { year: true } },
          school: { select: { name: true } },
        },
      },
    },
  });

  if (!offer) redirect("/escola/professor");
  if (ctx.role === "TEACHER" && offer.teacherId !== ctx.userId) redirect("/escola/professor");

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
        <Link href="/escola/professor" className="text-[#5B5470] hover:text-[#3F3A4F] text-sm transition-colors">
          ← Minhas Turmas
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: subject?.color ?? "#7C3AED" }} />
            <h1 className="text-2xl font-bold text-[#1F1A2E]">{subject?.name ?? "Componente"}</h1>
          </div>
          <p className="text-[#5B5470] text-sm">
            {offer.class?.name} · {offer.class?.school?.name} · {offer.class?.schoolYear?.year}
          </p>
          <p className="text-[#5B5470] text-xs mt-0.5">{totalStudents} alunos matriculados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/escola/professor/turmas/${offer.classId}/cartoes`}
            className="bg-[#EDE9FE] hover:bg-[#DDD6EE] text-[#4C1D95] px-4 py-2 rounded-lg text-sm min-h-[44px] flex items-center gap-2 transition-colors font-semibold"
          >
            Imprimir cartões
          </Link>
          <Link
            href={`/escola/professor/mapa?classSubjectId=${params.id}`}
            className="bg-[#FAF9FD] hover:bg-[#F5F3FF] text-[#3F3A4F] hover:text-[#1F1A2E] px-4 py-2 rounded-lg text-sm min-h-[44px] flex items-center transition-colors"
          >
            Mapa da turma
          </Link>
          <Link
            href={`/escola/professor/aulas?classSubjectId=${params.id}`}
            className="bg-[#FAF9FD] hover:bg-[#F5F3FF] text-[#3F3A4F] hover:text-[#1F1A2E] px-4 py-2 rounded-lg text-sm min-h-[44px] flex items-center transition-colors"
          >
            Aulas registradas
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href={`/escola/professor/mapa?classSubjectId=${params.id}`}
          className="bg-white border border-[#E9E5F5] rounded-xl p-5 hover:border-[#6D28D9] transition-colors group"
        >
          <div className="text-[#6D28D9] font-semibold mb-1 group-hover:text-[#5B21B6]">Mapa da turma</div>
          <div className="text-[#5B5470] text-sm">Habilidades por aluno</div>
        </Link>
        <Link
          href={`/escola/professor/trilhas?classSubjectId=${params.id}`}
          className="bg-white border border-[#E9E5F5] rounded-xl p-5 hover:border-[#6D28D9] transition-colors group"
        >
          <div className="text-[#6D28D9] font-semibold mb-1 group-hover:text-[#5B21B6]">Trilhas atribuídas</div>
          <div className="text-[#5B5470] text-sm">{totalStudents} alunos</div>
        </Link>
        <Link
          href={`/escola/professor/aulas/nova?classSubjectId=${params.id}`}
          className="bg-white border border-[#E9E5F5] rounded-xl p-5 hover:border-[#6D28D9] transition-colors group"
        >
          <div className="text-[#6D28D9] font-semibold mb-1 group-hover:text-[#5B21B6]">Aula de hoje</div>
          <div className="text-[#5B5470] text-sm">Registrar atividade da turma</div>
        </Link>
      </div>
    </div>
  );
}
