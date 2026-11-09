/**
 * GET /api/escola/aluno/materias
 * Retorna todos os componentes BNCC do ano do aluno com status do diagnóstico.
 * O aluno pode escolher qualquer matéria — sem depender da escola.
 *
 * Busca diagnósticos por subjectCode (biblioteca) ou subjectId (rede),
 * porque diagnósticos criados pela escola têm subjectId mas podem não ter
 * subjectCode preenchido.
 */
import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

const COMPONENTES_ANOS_INICIAIS = ["LP", "MA", "CI", "HI", "GE", "AR", "EF"];
const COMPONENTES_ANOS_FINAIS   = ["LP", "MA", "CI", "HI", "GE", "AR", "EF", "LI"];
const COMPONENTE_FACULTATIVO     = "ER";

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

  const base = gradeYear <= 5 ? COMPONENTES_ANOS_INICIAIS : COMPONENTES_ANOS_FINAIS;
  const codigos = [...base, COMPONENTE_FACULTATIVO];

  // Mapa subjectCode → subjectId para buscar diagnósticos sem subjectCode
  const subjects = await P.eduSubject.findMany({
    where: { code: { in: codigos } },
    select: { id: true, code: true },
  });
  const subjectIdByCode: Record<string, string> = {};
  for (const s of subjects) subjectIdByCode[s.code] = s.id;

  // Diagnósticos: por subjectCode (biblioteca global) OU subjectId (rede)
  const subjectIds = Object.values(subjectIdByCode);
  const diags = await P.eduDiagnostic.findMany({
    where: {
      gradeYear,
      status: { in: ["OPEN", "APPROVED"] },
      OR: [
        // biblioteca SpeakFlow — tem subjectCode
        { networkId: null, source: "SPEAKFLOW", subjectCode: { in: codigos } },
        // diagnósticos da rede — podem ter subjectCode ou subjectId
        { networkId: ctx.networkId, subjectCode: { in: codigos } },
        { networkId: ctx.networkId, subjectId: { in: subjectIds } },
      ],
    },
    select: { id: true, subjectCode: true, subjectId: true, status: true, networkId: true },
  });

  // Normaliza: se não tem subjectCode, resolve pelo subjectId
  const codeById: Record<string, string> = {};
  for (const s of subjects) codeById[s.id] = s.code;

  const diagsNormalized = diags.map((d: { id: string; subjectCode: string | null; subjectId: string | null; status: string; networkId: string | null }) => ({
    ...d,
    subjectCode: d.subjectCode ?? (d.subjectId ? codeById[d.subjectId] ?? null : null),
  }));

  // Sessões concluídas do aluno (por diagnosticId)
  const sessoes = await P.eduAttemptSession.findMany({
    where: { studentId: ctx.studentId, completedAt: { not: null } },
    select: { diagnosticId: true },
  });
  const feitos = new Set(sessoes.map((s: { diagnosticId: string | null }) => s.diagnosticId).filter(Boolean));

  // Trilhas ativas por subjectCode
  const trilhasAtivas = await P.eduTrackAssignment.findMany({
    where: { studentId: ctx.studentId, networkId: ctx.networkId, endedAt: null },
    include: { track: { select: { subjectCode: true, subjectId: true, title: true } } },
  });
  const trilhaPorMateria: Record<string, string> = {};
  for (const ta of trilhasAtivas) {
    const sc = ta.track?.subjectCode ?? (ta.track?.subjectId ? codeById[ta.track.subjectId] ?? null : null);
    if (sc) trilhaPorMateria[sc] = ta.track.title;
  }

  // Monta resposta
  const materias = codigos.map((codigo) => {
    // Prefere OPEN da rede (escola abriu), depois APPROVED da rede, depois biblioteca
    const diagRede = diagsNormalized.find((d: { subjectCode: string | null; networkId: string | null; status: string }) =>
      d.subjectCode === codigo && d.networkId === ctx.networkId && d.status === "OPEN"
    );
    const diagRedeAppr = diagsNormalized.find((d: { subjectCode: string | null; networkId: string | null; status: string }) =>
      d.subjectCode === codigo && d.networkId === ctx.networkId && d.status === "APPROVED"
    );
    const diagBib = diagsNormalized.find((d: { subjectCode: string | null; networkId: string | null }) =>
      d.subjectCode === codigo && d.networkId === null
    );
    const diag = diagRede ?? diagRedeAppr ?? diagBib ?? null;

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
      // Só expõe o diagnosticoId quando o diagnóstico ainda não foi feito
      diagnosticoId: estado === "disponivel" ? (diag?.id ?? null) : null,
      estado,
      trilhaAtual: trilhaAtiva,
    };
  }).filter((m) => m.estado !== "sem_diagnostico");

  return NextResponse.json({ materias, gradeYear });
}
