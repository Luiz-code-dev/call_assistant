import { getEduContext } from "@/lib/escola/context";
import { redirect } from "next/navigation";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";
import { Bell } from "lucide-react";
import { STAGE_LABEL, SHIFT_LABEL } from "@/lib/escola/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

export default async function ProfessorPage() {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");
  if (!["TEACHER","NETWORK_ADMIN","COORDINATOR"].includes(ctx.role)) redirect("/escola/painel");

  // ── Turmas do professor ──────────────────────────────────────────
  // Toda a busca em try/catch — se qualquer query falhar a página
  // mostra estado vazio em vez de Application Error.
  let offers: {
    id: string; subjectId: string;
    class: { id: string; name: string; stage: string; gradeYear: number; shift: string; schoolYear: { year: number }; school: { name: string } };
    _count: { assessments: number };
  }[] = [];
  try {
    offers = await prismaEdu.eduClassSubject.findMany({
      where: { networkId: ctx.networkId, teacherId: ctx.userId },
      select: {
        id: true, subjectId: true,
        class: {
          select: {
            id: true, name: true, stage: true, gradeYear: true, shift: true,
            schoolYear: { select: { year: true } },
            school: { select: { name: true } },
          },
        },
        _count: { select: { assessments: true } },
      },
      orderBy: { class: { schoolYear: { year: "desc" } } },
    });
  } catch { offers = []; }

  // Busca componentes separadamente (EduClassSubject não tem @relation com EduSubject)
  let subjectMap: Record<string, { name: string; color: string | null }> = {};
  try {
    const subjectIds = Array.from(new Set(offers.map(o => o.subjectId)));
    if (subjectIds.length) {
      const subjectsRaw = await prismaEdu.eduSubject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true, color: true },
      });
      subjectMap = Object.fromEntries(
        (subjectsRaw as { id: string; name: string; color: string | null }[]).map(s => [s.id, s])
      );
    }
  } catch { subjectMap = {}; }

  // ── Alertas ──────────────────────────────────────────────────────
  // EduTeacherAlert não tem @relation no schema — lookup separado.
  // Usamos try/catch (não .catch) para capturar erros síncronos
  // caso o modelo ainda não exista no Prisma client em produção.
  let alertas: { id: string; type: string; studentId: string | null; trackId: string | null }[] = [];
  let studentNameMap: Record<string, string> = {};
  let trackTitleMap: Record<string, string> = {};
  try {
    if (ctx.role === "TEACHER") {
      alertas = await p.eduTeacherAlert.findMany({
        where: { networkId: ctx.networkId, teacherUserId: ctx.userId, readAt: null },
        orderBy: { createdAt: "desc" as const },
        take: 5,
        select: { id: true, type: true, studentId: true, trackId: true },
      });
    }
    const alertStudentIds = alertas.map(a => a.studentId).filter((id): id is string => Boolean(id));
    const alertTrackIds   = alertas.map(a => a.trackId).filter((id): id is string => Boolean(id));
    const [alertStudents, alertTracks] = await Promise.all([
      alertStudentIds.length
        ? prismaEdu.eduStudent.findMany({ where: { id: { in: alertStudentIds } }, select: { id: true, fullName: true } })
        : [],
      alertTrackIds.length
        ? p.eduTrack.findMany({ where: { id: { in: alertTrackIds } }, select: { id: true, title: true } })
        : [],
    ]);
    studentNameMap = Object.fromEntries(
      (alertStudents as { id: string; fullName: string }[]).map(s => [s.id, s.fullName])
    );
    trackTitleMap = Object.fromEntries(
      (alertTracks as { id: string; title: string }[]).map(t => [t.id, t.title])
    );
  } catch { alertas = []; studentNameMap = {}; trackTitleMap = {}; }

  const TYPE_LABEL: Record<string, string> = {
    TRACK_COMPLETED: "concluiu a trilha",
    STUDENT_STUCK:   "está travado em",
    NOT_STARTED:     "não começou a trilha",
  };
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="mb-6 bg-[#FEF3C7] border border-yellow-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-[#92400E]" />
            <span className="font-semibold text-sm text-[#92400E]">{alertas.length} aviso{alertas.length !== 1 ? "s" : ""}</span>
          </div>
          {alertas.map((a) => (
            <p key={a.id} className="text-sm text-[#92400E]">
              <span className="font-medium">{a.studentId ? (studentNameMap[a.studentId] ?? "Aluno") : "Aluno"}</span>{" "}
              {TYPE_LABEL[a.type] ?? a.type}{" "}
              {a.trackId && trackTitleMap[a.trackId] ? <span className="italic">{trackTitleMap[a.trackId]}</span> : null}.
            </p>
          ))}
          <Link href="/api/escola/professor/alertas" className="text-xs text-[#92400E] underline">Ver todos</Link>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1F1A2E]">Minhas Turmas</h1>
        <p className="text-[#5B5470] text-sm mt-1">{offers.length} oferta{offers.length !== 1 ? "s" : ""} ativa{offers.length !== 1 ? "s" : ""}</p>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]">
          <div>Nenhuma turma atribuída ainda.</div>
          <p className="text-sm mt-2">Fale com a direção para ser vinculado a uma turma.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer: {
            id: string;
            subjectId: string;
            class: { id: string; name: string; stage: string; gradeYear: number; shift: string; schoolYear: { year: number }; school: { name: string } };
            _count: { assessments: number };
          }) => {
            const subject = subjectMap[offer.subjectId];
            return (
              <Link
                key={offer.id}
                href={`/escola/professor/ofertas/${offer.id}`}
                className="bg-white border border-[#E9E5F5] rounded-xl p-4 hover:border-purple-700 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject?.color ?? "#7C3AED" }} />
                  <span className="text-[#1F1A2E] font-medium group-hover:text-purple-400 transition-colors">{subject?.name ?? "Componente"}</span>
                </div>
                <div className="text-[#5B5470] font-semibold">{offer.class?.name}</div>
                <div className="text-[#5B5470] text-xs mt-1">
                  {STAGE_LABEL[offer.class?.stage as keyof typeof STAGE_LABEL] ?? offer.class?.stage} · {offer.class?.gradeYear}º ano · {SHIFT_LABEL[offer.class?.shift as keyof typeof SHIFT_LABEL] ?? offer.class?.shift}
                </div>
                <div className="text-[#5B5470] text-xs">{offer.class?.school?.name} · {offer.class?.schoolYear?.year}</div>
                <div className="mt-3 text-purple-500 text-xs">{offer._count?.assessments} avaliação{offer._count?.assessments !== 1 ? "ões" : ""}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
