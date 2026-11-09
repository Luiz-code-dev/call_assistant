#!/usr/bin/env node
/**
 * scripts/escolas/reset-teste.mjs
 *
 * Apaga e recria apenas as redes de demonstração (isDemo=true).
 * Recusa executar se encontrar uma rede sem isDemo=true (proteção contra
 * apagar dados de clientes reais).
 *
 * Execute: railway run npm run escolas:reset-teste
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

for (const name of [".env.local", ".env"]) {
  const p = join(ROOT, name);
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    break;
  }
}

const { PrismaClient: TenantClient } = await import("@prisma/escolas");

function listTenantEnvVars() {
  return Object.keys(process.env).filter(k => /^ESCOLAS_DB_\d+_URL$/.test(k)).sort();
}

function tenantDb(envVar) {
  const url = process.env[envVar];
  if (!url) throw new Error(`Variável de ambiente ausente: ${envVar}`);
  return new TenantClient({ datasources: { db: { url } } });
}

async function main() {
  console.log("\n[reset-teste] Verificando redes...");

  const tenantVars = listTenantEnvVars();
  if (tenantVars.length === 0) {
    console.error("Nenhuma variável ESCOLAS_DB_*_URL encontrada. Encerrando.");
    process.exit(1);
  }

  for (const envVar of tenantVars) {
    const db = tenantDb(envVar);
    try {
      const redes = await db.eduNetwork.findMany({ select: { id: true, name: true, isDemo: true } });
      const naoDemos = redes.filter(r => !r.isDemo);
      if (naoDemos.length > 0) {
        console.error(`\n❌  ERRO DE SEGURANÇA: ${envVar} contém redes sem isDemo=true:`);
        naoDemos.forEach(r => console.error(`   - ${r.id}: ${r.name}`));
        console.error("Corrija os dados antes de continuar. Encerrando sem apagar nada.");
        process.exit(1);
      }
    } finally {
      await db.$disconnect();
    }
  }

  console.log("  ✓ Todas as redes são de demonstração (isDemo=true). Prosseguindo...\n");

  for (const envVar of tenantVars) {
    const db = tenantDb(envVar);
    try {
      // Ordem de deleção respeita FKs (mais dependentes primeiro).
      // EduTermClosure tem onDelete: Restrict em EduTerm → deve vir antes.
      // EduGradeEntry → EduAssessment → EduPlanUnit → EduTeachingPlan → EduTerm
      // devem todos vir antes de EduSchoolYear.
      const models = [
        // folhas sem filhos dependentes
        "eduSkillMasteryEvent","eduSkillMastery","eduAttemptSession",
        "eduSubmission","eduGuardianConsent","eduGuardianInvite","eduGuardianLink",
        "eduFamilyCode","eduGuardian","eduTrackProgress","eduTrackAssignment",
        "eduTeacherAlert","eduLessonObjective","eduLesson","eduSessionPresence",
        "eduClassSession","eduDiagnosticItem","eduDiagnostic",
        "eduQuizQuestion","eduActivitySkill","eduActivity",
        "eduTrackItem","eduTrack","eduSkillGuide","eduSkillPrerequisite",
        "eduEnrollment","eduStudent","eduAuditLog","eduImportBatch","eduInvite",
        // EduTermClosure tem Restrict em EduTerm — vem antes
        "eduTermClosure",
        // EduGradeEntry → EduAssessment → EduTerm → EduSchoolYear
        "eduGradeEntry","eduAssessment",
        // EduPlanUnit → EduTeachingPlan → EduSchoolYear
        "eduPlanUnit","eduTeachingPlan",
        "eduTerm",
        "eduClassSubject","eduClass","eduSchoolYear",
        "eduSubject","eduSchool","eduMembership","eduUser","eduNetwork",
      ];
      let total = 0;
      for (const m of models) {
        try {
          const r = await db[m].deleteMany({});
          if (r.count > 0) { console.log(`  ${envVar} ${m}: ${r.count} registros apagados`); total += r.count; }
        } catch (e) {
          // Propagar erros reais (FK violation, etc.); ignorar só "modelo inexistente"
          if (!e.message.includes("does not exist") && !e.message.includes("Unknown model")) {
            console.error(`  ERRO ao apagar ${m}: ${e.message}`);
          }
        }
      }
      console.log(`  ${envVar}: ${total} registros apagados no total`);
    } finally {
      await db.$disconnect();
    }
  }

  console.log("\n[reset-teste] Recriando massa de teste...");
  execSync("node scripts/escolas/seed-usuarios-demo.mjs", { stdio: "inherit", cwd: ROOT });
  if (process.env.ESCOLAS_SEED_TESTE === "true" || true) {
    execSync("node scripts/escolas/seed-teste-usabilidade.mjs", { stdio: "inherit", cwd: ROOT });
  }
  console.log("\n✓ Reset concluído.\n");
}

main().catch(e => { console.error(e); process.exit(1); });
