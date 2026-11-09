/**
 * GET /api/escola/aluno/materias
 * Retorna todos os componentes BNCC do ano do aluno com status do diagnóstico.
 * O aluno pode escolher qualquer matéria — sem depender da escola.
 */
import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

// Componentes BNCC por etapa (EF Anos Iniciais 1-5, Anos Finais 6-9)
const COMPONENTES_ANOS_INICIAIS = ["LP","MA","CI","HI","GE","AR","EF"];
const COMPONENTES_ANOS_FINAIS   = ["LP","MA","CI","HI","GE","AR","EF","LI"];
const COMPONENTE_FACULTATIVO     = "ER"; // Ensino Religioso

const NOMES: Record<string, string> = {
  LP: "Língua Portuguesa", MA: "Matemática",    CI: "Ciências",
  HI: "História",          GE: "Geografia",     AR: "Arte",
  EF: "Educação Física",   LI: "Língua Inglesa", ER: "Ensino Religioso",
};
const CORES: Record<string, string> = {
  LP: "#BE185D", MA: "#1D4ED8", CI: "#0F766E", HI: "#C2410C",
  GE: "#15803D", AR: "#7C3AED", EF: "#0369A1", LI: "#6D28D9", ER: "#92400E",
};

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ materias: [] });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);

  const enr = await P.eduEnrollment.findFirst({
    where: { studentId: ctx.studentId, status: "ACTIVE" },
    include: { class: { select: { gradeYear: true } } },
  });
  const gradeYear: number = enr?.class?.gradeYear ?? 6;

  // Componentes do ano (ER incluso se a rede habilitou)
  const network = await P.eduNetwork.findUnique({
    where: { id: ctx.networkId },
    select: { id: true },
  });
  const base = gradeYear <= 5 ? COMPONENTES_ANOS_INICIAIS : COMPONENTES_ANOS_FINAIS;
  const codigos = [...base, COMPONENTE_FACULTATIVO]; // ER sempre incluído por ora

  // Diagnósticos disponíveis (APPROVED biblioteca ou OPEN da rede) por subjectCode
  const diags = await P.eduDiagnostic.findMany({
    where: {
      subjectCode: { in: codigos },
      gradeYear,
      status: { in: ["OPEN", "APPROVED"] },
      OR: [{ networkId: ctx.networkId }, { networkId: null }],
    },
    select: { id: true, subjectCode: true, status: true, networkId: true },
  });

  // Sessões concluídas do aluno (por diagnosticId)
  const sessoes = await P.eduAttemptSession.findMany({
    where: { studentId: ctx.studentId, completedAt: { not: null } },
    select: { diagnosticId: true },
  });
  const feitos = new Set(sessoes.map((s: { diagnosticId: string | null }) => s.diagnosticId).filter(Boolean));

  // Trilhas ativas por subjectCode
  const trilhasAtivas = await P.eduTrackAssignment.findMany({
    where: { studentId: ctx.studentId, networkId: ctx.networkId, endedAt: null },
    include: { track: { select: { subjectCode: true, title: true, gradeYear: true } } },
  });
  const trilhaPorMateria: Record<string, string> = {};
  for (const ta of trilhasAtivas) {
    if (ta.track?.subjectCode) trilhaPorMateria[ta.track.subjectCode] = ta.track.title;
  }

  // Monta resposta
  const materias = codigos
    .filter((c) => c !== COMPONENTE_FACULTATIVO || network) // ER sempre por ora
    .map((codigo) => {
      // Prefere diagnóstico da rede (OPEN), senão da biblioteca (APPROVED)
      const diagRede = diags.find((d: { subjectCode: string; networkId: string | null; status: string }) => d.subjectCode === codigo && d.networkId === ctx.networkId);
      const diagBib  = diags.find((d: { subjectCode: string; networkId: string | null }) => d.subjectCode === codigo && d.networkId === null);
      const diag = diagRede ?? diagBib ?? null;

      const diagFeito = diag ? feitos.has(diag.id) : false;
      const trilhaAtiva = trilhaPorMateria[codigo] ?? null;

      let estado: "sem_diagnostico" | "disponivel" | "em_trilha" | "feito" = "sem_diagnostico";
      if (trilhaAtiva) estado = "em_trilha";
      else if (diagFeito) estado = "feito";
      else if (diag) estado = "disponivel";

      return {
        codigo,
        nome: NOMES[codigo] ?? codigo,
        cor: CORES[codigo] ?? "#6D28D9",
        diagnosticoId: diag?.id ?? null,
        estado,
        trilhaAtual: trilhaAtiva,
      };
    })
    .filter((m) => m.estado !== "sem_diagnostico" || m.diagnosticoId !== null);

  return NextResponse.json({ materias, gradeYear });
}
