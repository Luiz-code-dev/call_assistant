#!/usr/bin/env node
/**
 * scripts/escolas/inventario.mjs
 *
 * Inventário somente-leitura da massa de teste SpeakFlow Escolas.
 * Execute: railway run node scripts/escolas/inventario.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const { PrismaClient: CatalogClient } = await import("@prisma/escolas-catalogo");
const { PrismaClient: TenantClient }  = await import("@prisma/escolas");

const catalog = new CatalogClient({ datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } } });

function tenantDb(envVar) {
  const url = process.env[envVar];
  if (!url) return null;
  return new TenantClient({ datasources: { db: { url } } });
}

function listTenantEnvVars() {
  return Object.keys(process.env).filter(k => /^ESCOLAS_DB_\d+_URL$/.test(k)).sort();
}

function sep(titulo) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`  ${titulo}`);
  console.log("=".repeat(72));
}

async function main() {
  console.log("\nINVENTARIO DA MASSA DE TESTE — SpeakFlow Escolas");
  console.log(`Gerado em: ${new Date().toISOString()}`);

  // ── A1: Saúde ────────────────────────────────────────────────────────────
  sep("A1 — SAUDE");
  try {
    const tenants = await catalog.tenantDatabase.findMany({
      select: { key: true, isShared: true },
      orderBy: { key: "asc" },
    });
    console.log(`Bases tenant no catalogo: ${tenants.length}`);
    tenants.forEach(t => console.log(`  ${t.key}  shared=${t.isShared}`));
  } catch (e) { console.error("Catalogo inacessivel:", e.message); }

  // ── A2: Redes ────────────────────────────────────────────────────────────
  sep("A2 — REDES, ESCOLAS E TURMAS");
  const tenantVars = listTenantEnvVars();
  if (tenantVars.length === 0) console.log("  Nenhuma variavel ESCOLAS_DB_*_URL encontrada.");

  for (const envVar of tenantVars) {
    const db = tenantDb(envVar);
    if (!db) continue;
    try {
      const redes = await db.eduNetwork.findMany({
        include: { schools: true, schoolYears: { where: { isCurrent: true } } },
        orderBy: { name: "asc" },
      });
      for (const r of redes) {
        const anoAtivo = r.schoolYears[0];
        console.log(`\nRede: ${r.id}`);
        console.log(`  nome=${r.name}`);
        console.log(`  kind=${r.kind ?? "-"}  isDemo=${r.isDemo ?? "campo ausente"}  trackMode=${r.trackAssignmentMode}  adaptive=${r.diagnosticAdaptive}`);
        console.log(`  anoLetivo=${anoAtivo ? anoAtivo.year + " (" + anoAtivo.startsAt.toISOString().slice(0,10) + " – " + anoAtivo.endsAt.toISOString().slice(0,10) + ")" : "nenhum"}`);
        for (const s of r.schools) {
          console.log(`  Escola: ${s.name}  ativa=${s.isActive}`);
          const turmas = await db.eduClass.findMany({
            where: { schoolId: s.id },
            include: { _count: { select: { enrollments: true } } },
            orderBy: [{ gradeYear: "asc" }, { name: "asc" }],
          });
          for (const t of turmas) {
            console.log(`    Turma: ${t.name}  gradeYear=${t.gradeYear}  alunos=${t._count.enrollments}  accessCode=${t.accessCode ?? "-"}  loginMode=${t.defaultLoginMode ?? "PIN"}`);
          }
        }
      }
    } catch (e) { console.error(`${envVar}: ${e.message}`); }
    await db.$disconnect();
  }

  // ── A3: Usuários ─────────────────────────────────────────────────────────
  sep("A3 — USUARIOS DE TESTE");
  for (const envVar of tenantVars) {
    const db = tenantDb(envVar);
    if (!db) continue;
    try {
      const membros = await db.eduMembership.findMany({
        include: {
          user: { select: { email: true, name: true } },
          network: { select: { name: true } },
          school: { select: { name: true } },
        },
        orderBy: [{ networkId: "asc" }, { role: "asc" }],
      });
      console.log(`\n${envVar}: ${membros.length} membros`);
      for (const m of membros) {
        console.log(`  ${m.user.email.padEnd(45)} | ${m.role.padEnd(15)} | rede: ${m.network.name} | escola: ${m.school?.name ?? "-"}`);
      }
    } catch (e) { console.error(`${envVar}: ${e.message}`); }
    await db.$disconnect();
  }

  // Plataforma admin
  for (const envVar of tenantVars) {
    const db = tenantDb(envVar);
    if (!db) continue;
    try {
      const admins = await db.eduPlatformAdmin.findMany({
        include: { user: { select: { email: true } } },
      });
      if (admins.length > 0) {
        console.log("  PLATFORM_ADMIN:");
        admins.forEach(a => console.log(`    ${a.user.email}  ativo=${a.isActive}`));
      }
    } catch { /* modelo pode nao existir em todas as bases */ }
    await db.$disconnect();
  }

  // ── A4: Alunos ───────────────────────────────────────────────────────────
  sep("A4 — ALUNOS");
  for (const envVar of tenantVars) {
    const db = tenantDb(envVar);
    if (!db) continue;
    try {
      const alunos = await db.eduStudent.findMany({
        include: {
          enrollments: {
            include: { class: { select: { name: true, gradeYear: true } } },
            where: { status: "ACTIVE" },
          },
        },
        orderBy: { fullName: "asc" },
      });
      console.log(`\n${envVar}: ${alunos.length} aluno(s)`);
      for (const a of alunos) {
        const turma = a.enrollments[0]?.class;
        const masteries = await db.eduSkillMastery.findMany({ where: { studentId: a.id } });
        const lv = { NOT_YET: 0, ALMOST: 0, MASTERED: 0 };
        for (const m of masteries) lv[m.level] = (lv[m.level] ?? 0) + 1;
        const temFig = a.pictureSecretHash ? "sim" : "nao";
        console.log(`  ${a.fullName.padEnd(35)} | ${a.loginMode.padEnd(8)} | figHash=${temFig} | turma: ${turma?.name ?? "-"} | dom=${lv.MASTERED} quase=${lv.ALMOST} ainda=${lv.NOT_YET}`);
      }

      const links = await db.eduGuardianLink.findMany({
        where: { isActive: true },
        include: { guardian: { select: { email: true, name: true, passwordHash: true } } },
      });
      console.log(`  Responsaveis ativos: ${links.length}`);
      for (const l of links) {
        console.log(`    ${l.guardian.name} (${l.guardian.email ?? "-"}) senha=${l.guardian.passwordHash ? "setada" : "nao setada"}`);
      }
    } catch (e) { console.error(`${envVar}: ${e.message}`); }
    await db.$disconnect();
  }

  // ── A5: Família ──────────────────────────────────────────────────────────
  sep("A5 — FAMILIA");
  for (const envVar of tenantVars) {
    const db = tenantDb(envVar);
    if (!db) continue;
    try {
      const guardians = await db.eduGuardian.findMany({
        include: {
          links: { include: { guardian: false } },
          invites: true,
        },
      });
      console.log(`\n${envVar}: ${guardians.length} responsavel(is)`);
      for (const g of guardians) {
        console.log(`  ${g.name} | ${g.email ?? "-"} | senha=${g.passwordHash ? "setada" : "nao setada"} | filhos=${g.links.length}`);
        for (const inv of g.invites) {
          console.log(`    convite: aceito=${inv.acceptedAt ? inv.acceptedAt.toISOString().slice(0,10) : "pendente"} expires=${inv.expiresAt.toISOString().slice(0,10)}`);
        }
      }
    } catch (e) { console.error(`${envVar}: ${e.message}`); }
    await db.$disconnect();
  }

  // ── A6: Conteúdo ─────────────────────────────────────────────────────────
  sep("A6 — CONTEUDO");
  for (const envVar of tenantVars) {
    const db = tenantDb(envVar);
    if (!db) continue;
    try {
      const prereqs = await db.eduSkillPrerequisite.groupBy({ by: ["status"], _count: true });
      const trilhas = await db.eduTrack.groupBy({ by: ["status", "source"], _count: { _all: true } });
      const diags   = await db.eduDiagnostic.groupBy({ by: ["status", "source"], _count: { _all: true } });
      const skillsMA6 = await db.eduSkill.count({ where: { subjectCode: "MA", gradeYears: { has: 6 } } });
      console.log(`\n${envVar}:`);
      console.log(`  Habilidades MA-06: ${skillsMA6}`);
      console.log(`  Pre-requisitos: ${prereqs.map(r => r.status + ":" + r._count).join(", ")}`);
      console.log(`  Trilhas: ${trilhas.map(r => r.source + "/" + r.status + ":" + r._count._all).join(", ")}`);
      console.log(`  Diagnosticos: ${diags.map(r => r.source + "/" + r.status + ":" + r._count._all).join(", ")}`);
      const hasApproved = prereqs.some(r => r.status === "APPROVED" && r._count > 0);
      console.log(`  Degrau ativo: ${hasApproved ? "SIM" : "NAO (todos DRAFT)"}`);
    } catch (e) { console.error(`${envVar}: ${e.message}`); }
    await db.$disconnect();
  }

  // ── A7: Atividade em andamento ───────────────────────────────────────────
  sep("A7 — ATIVIDADE EM ANDAMENTO");
  for (const envVar of tenantVars) {
    const db = tenantDb(envVar);
    if (!db) continue;
    try {
      const diags = await db.eduDiagnostic.findMany({
        where: { status: "OPEN" },
        include: { _count: { select: { items: true } } },
      });
      console.log(`\n${envVar}: ${diags.length} diagnostico(s) aberto(s)`);
      for (const d of diags) {
        console.log(`  ${d.id.slice(0,30)} | ${d.title} | rede=${d.networkId ?? "global"} | itens=${d._count.items}`);
      }

      const sessoes = await db.eduClassSession.findMany({
        where: { closedAt: null, expiresAt: { gt: new Date() } },
        include: { class: { select: { name: true, gradeYear: true } } },
      });
      console.log(`  Sessoes abertas: ${sessoes.length}`);
      for (const s of sessoes) {
        console.log(`    codigo=${s.code} | turma=${s.class.name} | expira=${s.expiresAt.toISOString().slice(0,10)}`);
      }

      const aulas = await db.eduLesson.findMany({
        where: { status: "PUBLISHED" },
        include: { _count: { select: { objectives: true } } },
        orderBy: { date: "desc" },
        take: 5,
      });
      console.log(`  Aulas publicadas (ultimas 5): ${aulas.length}`);
      for (const a of aulas) {
        console.log(`    ${a.date.toISOString().slice(0,10)} | ${a.title} | obj=${a._count.objectives}`);
      }

      const mastEvents = await db.eduSkillMasteryEvent.count();
      console.log(`  Total masteryEvents: ${mastEvents}`);

      const suggests = await db.eduTrackAssignment.count({ where: { endedAt: null } });
      console.log(`  Atribuicoes trilha em aberto: ${suggests}`);
    } catch (e) { console.error(`${envVar}: ${e.message}`); }
    await db.$disconnect();
  }

  await catalog.$disconnect();
  console.log("\n\nInventario concluido.\n");
}

main().catch(e => { console.error(e); process.exit(1); });
