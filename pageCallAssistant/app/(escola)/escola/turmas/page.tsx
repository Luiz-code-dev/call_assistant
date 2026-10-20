import { redirect } from "next/navigation";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { can } from "@/lib/escola/permissions";
import { db } from "@/lib/db";

const STAGE_LABEL: Record<string, string> = {
  EARLY_CHILDHOOD: "Ed. Infantil",
  ELEMENTARY_EARLY: "Fund. Anos Iniciais",
  ELEMENTARY_LATE: "Fund. Anos Finais",
  HIGH_SCHOOL: "Ensino Médio",
  EJA: "EJA",
};

const SHIFT_LABEL: Record<string, string> = {
  MORNING: "Manhã",
  AFTERNOON: "Tarde",
  EVENING: "Noite",
  FULL_TIME: "Integral",
};

export default async function TurmasPage() {
  if (!isEscolasEnabled()) return redirect("/escola/entrar");

  const ctx = await getEduContext();
  if (!ctx) return redirect("/escola/entrar");
  if (!can(ctx.role, "class:read")) return redirect("/escola/painel");

  const currentYear = await db.eduSchoolYear.findFirst({
    where: { networkId: ctx.networkId, isCurrent: true },
    select: { id: true, year: true },
  });

  const classes = await db.eduClass.findMany({
    where: {
      networkId: ctx.networkId,
      isActive: true,
      ...(currentYear ? { schoolYearId: currentYear.id } : {}),
    },
    include: {
      school: { select: { name: true } },
      _count: { select: { subjects: true, enrollments: { where: { status: "ACTIVE" } } } },
    },
    orderBy: [{ school: { name: "asc" } }, { gradeYear: "asc" }, { name: "asc" }],
  });

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-4">
        <a href="/escola/painel" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
          ← Painel
        </a>
        <h1 className="text-xl font-bold text-foreground">
          Turmas — {currentYear?.year ?? ""}
        </h1>
      </header>

      <div className="p-6 max-w-5xl mx-auto">
        {classes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Nenhuma turma ativa encontrada para o ano letivo corrente.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card border-b border-border">
                <tr>
                  {["Escola", "Turma", "Etapa", "Turno", "Alunos", "Componentes", "Código"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-card/50 transition-colors">
                    <td className="px-4 py-3 text-foreground">{cls.school.name}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{cls.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{STAGE_LABEL[cls.stage] ?? cls.stage} — {cls.gradeYear}º</td>
                    <td className="px-4 py-3 text-muted-foreground">{SHIFT_LABEL[cls.shift] ?? cls.shift}</td>
                    <td className="px-4 py-3 text-foreground">{cls._count.enrollments}</td>
                    <td className="px-4 py-3 text-foreground">{cls._count.subjects}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{cls.accessCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
