import { getEduContext } from "@/lib/escola/context";
import { redirect } from "next/navigation";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";
import { STAGE_LABEL, SHIFT_LABEL } from "@/lib/escola/types";

export default async function ProfessorPage() {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");
  if (!["TEACHER","NETWORK_ADMIN","COORDINATOR"].includes(ctx.role)) redirect("/escola/painel");

  const offers = await prismaEdu.eduClassSubject.findMany({
    where: { networkId: ctx.networkId, teacherId: ctx.userId },
    include: {
      subject: { select: { name: true, color: true } },
      class: {
        select: { id: true, name: true, stage: true, gradeYear: true, shift: true, schoolYear: { select: { year: true } }, school: { select: { name: true } } },
      },
      _count: { select: { assessments: true } },
    },
    orderBy: { class: { schoolYear: { year: "desc" } } },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Minhas Turmas</h1>
        <p className="text-gray-400 text-sm mt-1">{offers.length} oferta{offers.length !== 1 ? "s" : ""} ativa{offers.length !== 1 ? "s" : ""}</p>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">📚</div>
          <div>Nenhuma turma atribuída ainda.</div>
          <p className="text-sm mt-2">Fale com a direção para ser vinculado a uma turma.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer: { id: string; subject: { name: string; color: string | null }; class: { id: string; name: string; stage: string; gradeYear: number; shift: string; schoolYear: { year: number }; school: { name: string } }; _count: { assessments: number } }) => (
            <Link
              key={offer.id}
              href={`/escola/professor/ofertas/${offer.id}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-purple-700 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: offer.subject?.color ?? "#7C3AED" }} />
                <span className="text-white font-medium group-hover:text-purple-400 transition-colors">{offer.subject?.name}</span>
              </div>
              <div className="text-gray-400 font-semibold">{offer.class?.name}</div>
              <div className="text-gray-600 text-xs mt-1">
                {STAGE_LABEL[offer.class?.stage as keyof typeof STAGE_LABEL] ?? offer.class?.stage} · {offer.class?.gradeYear}º ano · {SHIFT_LABEL[offer.class?.shift as keyof typeof SHIFT_LABEL] ?? offer.class?.shift}
              </div>
              <div className="text-gray-600 text-xs">{offer.class?.school?.name} · {offer.class?.schoolYear?.year}</div>
              <div className="mt-3 text-purple-500 text-xs">{offer._count?.assessments} avaliação{offer._count?.assessments !== 1 ? "ões" : ""}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
