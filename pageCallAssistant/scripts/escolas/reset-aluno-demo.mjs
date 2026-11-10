#!/usr/bin/env node
/**
 * scripts/escolas/reset-aluno-demo.mjs
 *
 * Apaga os dados de reforço de um aluno de demonstração, para ensaiar de novo:
 *   - sessões de diagnóstico (com as respostas)
 *   - eventos de domínio (EduSkillMasteryEvent) e domínio (EduSkillMastery)
 *   - atribuições e progresso de trilha (EduTrackAssignment / EduTrackProgress)
 *   - entregas das atividades da biblioteca (EduSubmission), não as da escola
 *
 * Uso:
 *   npm run escolas:reset-aluno-demo -- --student aluno-demo-rede-b [--rede demo-rede-b] [--materia MA]
 *
 * - Procura o aluno em todas as bases (ESCOLAS_DB_*_URL), não só na db01.
 * - Define app.network_id na transação (RLS ativo: sem isso o aluno "não existe").
 * - A rede vem de --rede ou do id do seed (aluno-<rede>).
 * - Recusa rodar se a rede não tiver isDemo = true.
 */
import { parseArgs } from "node:util";

let PrismaClient;
try {
  ({ PrismaClient } = await import("@prisma/escolas"));
} catch {
  throw new Error("Cliente Prisma da base escolas não gerado. Execute: npm run db:generate:escolas");
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { student: { type: "string" }, rede: { type: "string" }, materia: { type: "string" } },
  allowPositionals: true,
});
const studentId = values.student;
const materia = values.materia ?? null;
const networkId = values.rede ?? (studentId?.startsWith("aluno-") ? studentId.slice("aluno-".length) : null);

if (!studentId || !networkId) {
  console.error("Uso: npm run escolas:reset-aluno-demo -- --student <id> [--rede <networkId>] [--materia MA]");
  process.exit(1);
}

const envVars = Object.keys(process.env).filter((k) => /^ESCOLAS_DB_\d+_URL$/.test(k) && process.env[k]).sort();
if (envVars.length === 0 && process.env.ESCOLAS_DB_URL) envVars.push("ESCOLAS_DB_URL");
if (envVars.length === 0) {
  console.error("Nenhuma ESCOLAS_DB_*_URL definida.");
  process.exit(1);
}

let encontrado = false;
for (const envVar of envVars) {
  const db = new PrismaClient({ datasources: { db: { url: process.env[envVar] } } });
  try {
    const resultado = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.network_id', ${networkId}, true)`;
      const aluno = await tx.eduStudent.findFirst({ where: { id: studentId, networkId }, select: { id: true, fullName: true } });
      if (!aluno) return null;
      const rede = await tx.eduNetwork.findUnique({ where: { id: networkId }, select: { name: true, isDemo: true } });
      if (!rede?.isDemo) throw new Error(`BLOQUEADO: a rede "${rede?.name ?? networkId}" não tem isDemo = true. Reset recusado.`);

      // Filtros por matéria (opcional)
      let trackIds = null, diagIds = null, skillIds = null;
      if (materia) {
        trackIds = (await tx.eduTrack.findMany({ where: { subjectCode: materia, OR: [{ networkId }, { networkId: null }] }, select: { id: true } })).map((t) => t.id);
        diagIds = (await tx.eduDiagnostic.findMany({ where: { subjectCode: materia, OR: [{ networkId }, { networkId: null }] }, select: { id: true } })).map((d) => d.id);
        skillIds = (await tx.eduSkill.findMany({ where: { subjectCode: materia }, select: { id: true } })).map((s) => s.id);
      }
      const assigns = await tx.eduTrackAssignment.findMany({
        where: { studentId, networkId, ...(trackIds ? { trackId: { in: trackIds } } : {}) }, select: { id: true },
      });
      const assignIds = assigns.map((a) => a.id);
      const prog = await tx.eduTrackProgress.deleteMany({ where: { studentId, assignmentId: { in: assignIds } } });
      const atr = await tx.eduTrackAssignment.deleteMany({ where: { id: { in: assignIds } } });
      const ses = await tx.eduAttemptSession.deleteMany({
        where: { studentId, networkId, ...(diagIds ? { diagnosticId: { in: diagIds } } : {}) },
      });
      const evt = await tx.eduSkillMasteryEvent.deleteMany({ where: { studentId, networkId, ...(skillIds ? { skillId: { in: skillIds } } : {}) } });
      const dom = await tx.eduSkillMastery.deleteMany({ where: { studentId, networkId, ...(skillIds ? { skillId: { in: skillIds } } : {}) } });
      // Entregas das atividades da biblioteca (trilha), para refazer do zero; atividades da escola ficam
      const libActs = (await tx.eduActivity.findMany({ where: { networkId: null, ...(materia ? { subjectCode: materia } : {}) }, select: { id: true } })).map((a) => a.id);
      const ent = await tx.eduSubmission.deleteMany({ where: { studentId, networkId, activityId: { in: libActs } } });
      return { aluno: aluno.fullName, rede: rede.name, prog: prog.count, atr: atr.count, ses: ses.count, evt: evt.count, dom: dom.count, ent: ent.count };
    });
    if (resultado) {
      encontrado = true;
      console.log(`[${envVar}] ${resultado.aluno} (${resultado.rede})${materia ? `, matéria ${materia}` : ", todas as matérias"}`);
      console.log(`  sessões de diagnóstico: ${resultado.ses}`);
      console.log(`  trilhas atribuídas: ${resultado.atr} (progresso: ${resultado.prog})`);
      console.log(`  eventos de domínio: ${resultado.evt}, domínios: ${resultado.dom}`);
      console.log(`  entregas da trilha: ${resultado.ent}`);
      console.log("Reset concluído.");
    }
  } catch (err) {
    console.error(`[${envVar}] ${err.message}`);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
  if (encontrado) break;
}
if (!encontrado && !process.exitCode) {
  console.error(`Aluno ${studentId} não encontrado na rede ${networkId} em nenhuma base (${envVars.join(", ")}).`);
  process.exit(1);
}
