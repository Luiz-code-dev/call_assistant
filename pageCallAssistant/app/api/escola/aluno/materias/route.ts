/**
 * GET /api/escola/aluno/materias
 * Retorna os componentes BNCC do ano do aluno com estado do diagnóstico.
 *
 * EduSubject NÃO tem campo "code". Para diagnósticos de rede que só têm
 * subjectId (sem subjectCode), normalizamos o EduSubject.name pelo mapa
 * NAME_TO_CODE. Para a biblioteca SpeakFlow (networkId null), os diagnósticos
 * já têm subjectCode preenchido.
 *
 * Sem "as any": se o campo não existe no schema, o TypeScript deve reclamar.
 */
import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

type PrismaAny = typeof prismaEdu & Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Prisma de tenant gerado dinamicamente não tem tipagem estática
const db = prismaEdu as PrismaAny;

const COMPONENTES_ANOS_INICIAIS = ["LP", "MA", "CI", "HI", "GE", "AR", "EF"] as const;
const COMPONENTES_ANOS_FINAIS   = ["LP", "MA", "CI", "HI", "GE", "AR", "EF", "LI"] as const;
const COMPONENTE_FACULTATIVO    = "ER" as const;

const NOMES: Record<string, string> = {
  LP: "Língua Portuguesa", MA: "Matemática",    CI: "Ciências",
  HI: "História",          GE: "Geografia",     AR: "Arte",
  EF: "Educação Física",   LI: "Língua Inglesa", ER: "Ensino Religioso",
};
const CORES: Record<string, string> = {
  LP: "#BE185D", MA: "#1D4ED8", CI: "#0F766E", HI: "#C2410C",
  GE: "#15803D", AR: "#7C3AED", EF: "#0369A1", LI: "#6D28D9", ER: "#92400E",
};

/** Normaliza EduSubject.name para código BNCC (LP, MA, etc.) */
const NAME_TO_CODE: Record<string, string> = {
  "língua portuguesa": "LP", "portugues":      "LP", "lingua portuguesa": "LP",
  "matemática":        "MA", "matematica":     "MA",
  "ciências":          "CI", "ciencias":       "CI",
  "história":          "HI", "historia":       "HI",
  "geografia":         "GE",
  "arte":              "AR",
  "educação física":   "EF", "educacao fisica": "EF",
  "língua inglesa":    "LI", "ingles":          "LI", "língua inglesa":  "LI",
  "ensino religioso":  "ER",
};

function nameToCode(name: string): string | null {
  return NAME_TO_CODE[name.toLowerCase().trim()] ?? null;
}

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ materias: [] });

  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);

  try {
    // Turma do aluno
    const enr = await (db as any).eduEnrollment.findFirst({
      where: { studentId: ctx.studentId, status: "ACTIVE" },
      select: { class: { select: { gradeYear: true } } },
    });
    const gradeYear: number = (enr as any)?.class?.gradeYear ?? 6;

    const base = gradeYear <= 5 ? [...COMPONENTES_ANOS_INICIAIS] : [...COMPONENTES_ANOS_FINAIS];
    const codigos: string[] = [...base, COMPONENTE_FACULTATIVO];

    // Sujeitos da rede (sem campo "code" — usamos name normalization)
    const subjects: Array<{ id: string; name: string }> = await (db as any).eduSubject.findMany({
      where: { networkId: ctx.networkId, isActive: true },
      select: { id: true, name: true },
    });
    // subjectId → código BNCC
    const codeBySubjectId: Record<string, string> = {};
    for (const s of subjects) {
      const code = nameToCode(s.name);
      if (code) codeBySubjectId[s.id] = code;
    }
    const subjectIdsParaCodigos = Object.keys(codeBySubjectId);

    // Diagnósticos: biblioteca (subjectCode) + rede (subjectCode ou subjectId)
    type DiagRow = { id: string; subjectCode: string | null; subjectId: string | null; status: string; networkId: string | null };
    const diagsRaw: DiagRow[] = await (db as any).eduDiagnostic.findMany({
      where: {
        gradeYear,
        status: { in: ["OPEN", "APPROVED"] },
        OR: [
          // Biblioteca SpeakFlow global
          { networkId: null, source: "SPEAKFLOW", subjectCode: { in: codigos } },
          // Rede — com subjectCode
          { networkId: ctx.networkId, subjectCode: { in: codigos } },
          // Rede — só subjectId (diagnósticos mais antigos)
          ...(subjectIdsParaCodigos.length > 0
            ? [{ networkId: ctx.networkId, subjectId: { in: subjectIdsParaCodigos } }]
            : []),
        ],
      },
      select: { id: true, subjectCode: true, subjectId: true, status: true, networkId: true },
    });

    // Normaliza subjectCode: biblioteca já tem; rede resolve pelo subjectId
    const diags = diagsRaw.map((d) => ({
      ...d,
      subjectCode: d.subjectCode ?? (d.subjectId ? codeBySubjectId[d.subjectId] ?? null : null),
    }));

    // Sessões já concluídas pelo aluno
    const sessoes: Array<{ diagnosticId: string | null }> = await (db as any).eduAttemptSession.findMany({
      where: { studentId: ctx.studentId, completedAt: { not: null } },
      select: { diagnosticId: true },
    });
    const feitos = new Set(sessoes.map((s) => s.diagnosticId).filter(Boolean) as string[]);

    // Trilhas ativas por subjectCode
    type TaRow = { track: { subjectCode: string | null; subjectId: string | null; title: string } | null };
    const trilhasAtivas: TaRow[] = await (db as any).eduTrackAssignment.findMany({
      where: { studentId: ctx.studentId, networkId: ctx.networkId, endedAt: null },
      select: { track: { select: { subjectCode: true, subjectId: true, title: true } } },
    });
    const trilhaPorMateria: Record<string, string> = {};
    for (const ta of trilhasAtivas) {
      if (!ta.track) continue;
      const sc = ta.track.subjectCode ?? (ta.track.subjectId ? codeBySubjectId[ta.track.subjectId] ?? null : null);
      if (sc) trilhaPorMateria[sc] = ta.track.title;
    }

    // Monta resposta por componente
    const materias = codigos
      .map((codigo) => {
        const diagRede   = diags.find((d) => d.subjectCode === codigo && d.networkId === ctx.networkId && d.status === "OPEN");
        const diagRedeAp = diags.find((d) => d.subjectCode === codigo && d.networkId === ctx.networkId && d.status === "APPROVED");
        const diagBib    = diags.find((d) => d.subjectCode === codigo && d.networkId === null);
        const diag = diagRede ?? diagRedeAp ?? diagBib ?? null;

        const diagFeito  = diag ? feitos.has(diag.id) : false;
        const trilhaAtiva = trilhaPorMateria[codigo] ?? null;

        let estado: "sem_diagnostico" | "disponivel" | "em_trilha" | "feito" = "sem_diagnostico";
        if (trilhaAtiva)       estado = "em_trilha";
        else if (diagFeito)    estado = "feito";
        else if (diag)         estado = "disponivel";

        return {
          codigo,
          nome: NOMES[codigo] ?? codigo,
          cor:  CORES[codigo] ?? "#6D28D9",
          // diagnosticoId só no estado "disponivel" para evitar re-abertura
          diagnosticoId: estado === "disponivel" ? (diag?.id ?? null) : null,
          estado,
          trilhaAtual: trilhaAtiva,
        };
      })
      .filter((m) => m.estado !== "sem_diagnostico");

    return NextResponse.json({ materias, gradeYear });
  } catch (err) {
    console.error("[/api/escola/aluno/materias]", (err as Error).message, err);
    return NextResponse.json({ error: "Erro interno ao carregar matérias." }, { status: 500 });
  }
}
