#!/usr/bin/env node
/**
 * scripts/escolas/reset-aluno-demo.mjs
 *
 * Apaga dados de reforço de um aluno de demonstração:
 *   - sessões de diagnóstico
 *   - respostas (embutidas em EduAttemptSession.answers)
 *   - eventos de domínio (EduSkillMasteryEvent)
 *   - domínio de habilidades (EduSkillMastery)
 *   - atribuições de trilha (EduTrackAssignment)
 *
 * Uso:
 *   npm run escolas:reset-aluno-demo -- --student <id> [--materia MA]
 *
 * Segurança:
 *   - Recusa rodar se a rede não tiver isDemo = true.
 *   - Nunca exposto como botão na tela da escola.
 *   - Com --materia, apaga só dados daquele componente (subjectCode).
 */

import { parseArgs } from "node:util";
import { PrismaClient as CatalogClient } from "@prisma/escolas-catalogo";

let PrismaClient;
try {
  ({ PrismaClient } = await import("@prisma/escolas"));
} catch {
  throw new Error("Cliente Prisma da base escolas não gerado. Execute: npm run db:generate:escolas");
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    student: { type: "string" },
    materia: { type: "string" },
  },
  allowPositionals: true,
});

const studentId = values.student;
const materia   = values.materia ?? null;

if (!studentId) {
  console.error("Uso: npm run escolas:reset-aluno-demo -- --student <id> [--materia MA]");
  process.exit(1);
}

// ── Conecta ao catálogo para buscar a rede do aluno ───────────────────────────
const catalog = new CatalogClient();

const dbUrl = process.env.ESCOLAS_DB_01_URL ?? process.env.ESCOLAS_DB_URL;
if (!dbUrl) {
  console.error("ESCOLAS_DB_01_URL ou ESCOLAS_DB_URL não definida.");
  process.exit(1);
}
const db = new PrismaClient({ datasources: { db: { url: dbUrl } } });

try {
  // Busca o aluno e sua rede
  const enrollment = await db.eduEnrollment.findFirst({
    where: { studentId },
    include: { class: { include: { school: { include: { network: true } } } } },
  });

  if (!enrollment) {
    console.error(`Aluno ${studentId} não encontrado.`);
    process.exit(1);
  }

  const network = enrollment.class?.school?.network;
  if (!network) {
    console.error("Rede do aluno não encontrada.");
    process.exit(1);
  }
  if (!network.isDemo) {
    console.error(`BLOQUEADO: a rede "${network.name}" não tem isDemo = true. Reset recusado.`);
    process.exit(1);
  }

  const networkId = network.id;
  console.log(`Rede: ${network.name} (${networkId}) — isDemo: true`);
  console.log(`Aluno: ${studentId}${materia ? ` — matéria: ${materia}` : " — todas as matérias"}`);

  // ── 1. Atribuições de trilha ─────────────────────────────────────────────
  if (materia) {
    const trilhaIds = await db.eduTrack.findMany({
      where: { subjectCode: materia, OR: [{ networkId }, { networkId: null }] },
      select: { id: true },
    });
    const ids = trilhaIds.map((t) => t.id);
    if (ids.length > 0) {
      const del = await db.eduTrackAssignment.deleteMany({
        where: { studentId, networkId, trackId: { in: ids } },
      });
      console.log(`  EduTrackAssignment deletadas: ${del.count}`);
    }
  } else {
    const del = await db.eduTrackAssignment.deleteMany({
      where: { studentId, networkId },
    });
    console.log(`  EduTrackAssignment deletadas: ${del.count}`);
  }

  // ── 2. Sessões de diagnóstico (incluem respostas em answers JSON) ────────
  if (materia) {
    const diagIds = await db.eduDiagnostic.findMany({
      where: { subjectCode: materia, OR: [{ networkId }, { networkId: null }] },
      select: { id: true },
    });
    const ids = diagIds.map((d) => d.id);
    if (ids.length > 0) {
      const del = await db.eduAttemptSession.deleteMany({
        where: { studentId, networkId, diagnosticId: { in: ids } },
      });
      console.log(`  EduAttemptSession deletadas: ${del.count}`);
    }
  } else {
    const del = await db.eduAttemptSession.deleteMany({
      where: { studentId, networkId },
    });
    console.log(`  EduAttemptSession deletadas: ${del.count}`);
  }

  // ── 3. Eventos de domínio e domínio de habilidades ───────────────────────
  if (materia) {
    // Busca skillIds do componente
    const skills = await db.eduSkill.findMany({
      where: { code: { startsWith: materia === "LP" ? "EF" : materia === "MA" ? "EF" : "EF" } },
      select: { id: true, code: true },
    });
    // Filtra pelo componente: EF06MA07, EF05LP03 — prefixo determinado pelo subjectCode
    const prefix = subjectCodeToPrefix(materia);
    const skillIds = skills.filter((s) => s.code.includes(prefix)).map((s) => s.id);

    if (skillIds.length > 0) {
      const delEvts = await db.eduSkillMasteryEvent.deleteMany({
        where: { studentId, networkId, skillId: { in: skillIds } },
      });
      const delMast = await db.eduSkillMastery.deleteMany({
        where: { studentId, networkId, skillId: { in: skillIds } },
      });
      console.log(`  EduSkillMasteryEvent deletados: ${delEvts.count}`);
      console.log(`  EduSkillMastery deletados: ${delMast.count}`);
    }
  } else {
    const delEvts = await db.eduSkillMasteryEvent.deleteMany({
      where: { studentId, networkId },
    });
    const delMast = await db.eduSkillMastery.deleteMany({
      where: { studentId, networkId },
    });
    console.log(`  EduSkillMasteryEvent deletados: ${delEvts.count}`);
    console.log(`  EduSkillMastery deletados: ${delMast.count}`);
  }

  console.log("Reset concluído.");
} catch (err) {
  console.error("Erro no reset:", err);
  process.exit(1);
} finally {
  await db.$disconnect();
  await catalog.$disconnect();
}

function subjectCodeToPrefix(code) {
  const map = {
    LP: "LP", MA: "MA", CI: "CI", HI: "HI",
    GE: "GE", AR: "AR", EF: "EF", LI: "LI", ER: "ER",
  };
  return map[code] ?? code;
}
