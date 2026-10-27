import { redirect } from "next/navigation";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { db } from "@/lib/db";

export default async function AlunoPainelPage() {
  if (!isEscolasEnabled()) return redirect("/escola/entrar");

  const ctx = await getStudentContext();
  if (!ctx) return redirect("/escola/entrar");

  const [student, enrollment] = await Promise.all([
    db.eduStudent.findUnique({
      where: { id: ctx.studentId },
      select: { fullName: true },
    }),
    db.eduEnrollment.findUnique({
      where: { id: ctx.enrollmentId },
      select: {
        class: {
          select: {
            name: true,
            gradeYear: true,
            school: { select: { name: true } },
            subjects: {
              select: {
                id: true,
                subjectId: true,
                assessments: {
                  where: { status: "PUBLISHED" },
                  select: {
                    id: true,
                    title: true,
                    type: true,
                    maxScore: true,
                    weight: true,
                    appliedAt: true,
                    entries: {
                      where: { studentId: ctx.studentId },
                      orderBy: { version: "desc" },
                      take: 1,
                      select: { value: true, absent: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const cls = enrollment?.class;

  const subjectIds = cls?.subjects.map((cs) => cs.subjectId) ?? [];
  const subjectRows = subjectIds.length
    ? await db.eduSubject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true },
      })
    : [];
  const subjectName = Object.fromEntries(subjectRows.map((s) => [s.id, s.name]));

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">SpeakFlow Escolas</h1>
          <p className="text-xs text-muted-foreground">
            {cls?.school.name} — {cls?.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-foreground font-medium">{student?.fullName}</span>
          <form action="/api/escola/aluno/sair" method="POST">
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto space-y-8">
        {!cls ? (
          <p className="text-center text-muted-foreground py-16">Matrícula não encontrada.</p>
        ) : cls.subjects.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Nenhuma nota publicada ainda.</p>
        ) : (
          cls.subjects.map((cs) => (
            <section key={cs.id}>
              <h2 className="text-lg font-semibold text-foreground mb-3">{subjectName[cs.subjectId] ?? cs.subjectId}</h2>
              {cs.assessments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem avaliações publicadas.</p>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-card border-b border-border">
                      <tr>
                        {["Avaliação", "Tipo", "Nota", "Máx.", "Situação"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {cs.assessments.map((a) => {
                        const grade = a.entries[0];
                        return (
                          <tr key={a.id} className="hover:bg-card/50 transition-colors">
                            <td className="px-4 py-3 text-foreground">{a.title}</td>
                            <td className="px-4 py-3 text-muted-foreground">{a.type}</td>
                            <td className="px-4 py-3 font-semibold text-foreground">
                              {grade ? (grade.absent ? "Falta" : (grade.value != null ? grade.value.toString() : "—")) : "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{a.maxScore.toString()}</td>
                            <td className="px-4 py-3">
                              {grade?.absent ? (
                                <span className="text-destructive text-xs font-medium">Ausente</span>
                              ) : grade?.value !== null && grade?.value !== undefined ? (
                                <span className="text-[#166534] text-xs font-medium">Lançado</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">Pendente</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))
        )}
      </div>
    </main>
  );
}
