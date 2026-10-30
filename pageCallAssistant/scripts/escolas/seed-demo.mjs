#!/usr/bin/env node
/**
 * scripts/escolas/seed-demo.mjs
 *
 * Seed idempotente para as redes de demonstração:
 *   Rede Demo A — base compartilhada db01
 *   Rede Demo B — base exclusiva db02
 *
 * Segurança: recusa rodar em rede cujo nome NÃO termine com "(Demonstração)".
 *
 * Uso:
 *   npm run escolas:seed-demo
 *   node scripts/escolas/seed-demo.mjs
 */
import { PrismaClient as CatalogClient } from "@prisma/escolas-catalogo";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";

// ── helpers ───────────────────────────────────────────────────────────────────
const SALT_ROUNDS = 10;
const hashPin = (pin) => bcrypt.hashSync(pin, SALT_ROUNDS);
const hashPw = (pw) => bcrypt.hashSync(pw, SALT_ROUNDS);

function tenantClient(envVar) {
  const url = process.env[envVar];
  if (!url) throw new Error(`Variável ${envVar} não definida.`);
  return new PrismaClient({ datasources: { db: { url } } });
}

// ── Importação dinâmica do cliente correto ────────────────────────────────────
let PrismaClient;
try {
  // Tenta cliente gerado da base escolas
  ({ PrismaClient } = await import("@prisma/escolas"));
} catch {
  throw new Error("Cliente Prisma da base escolas não gerado. Execute: npm run db:generate:escolas");
}

// ── Catálogo ──────────────────────────────────────────────────────────────────
const catalog = new CatalogClient({
  datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } },
});

// ── Definição das redes de demo ───────────────────────────────────────────────
const DEMOS = [
  {
    id: "demo-rede-a",
    name: "Rede Municipal Demo A (Demonstração)",
    kind: "PUBLIC_NETWORK",
    dbKey: "db01",
    envVar: "ESCOLAS_DB_01_URL",
    plan: "SHARED",
  },
  {
    id: "demo-rede-b",
    name: "Escola Demo B (Demonstração)",
    kind: "PRIVATE_SCHOOL",
    dbKey: "db02",
    envVar: "ESCOLAS_DB_02_URL",
    plan: "DEDICATED",
  },
];

// ── BNCC import helper (roda por base) ────────────────────────────────────────
async function importBncc(db) {
  const count = await db.eduSkill.count({ where: { networkId: null } });
  if (count >= 1304) {
    console.log(`  [bncc] ${count} habilidades já presentes, pulando.`);
    return;
  }
  // Importa do arquivo JSON gerado pelo script de BNCC
  const { default: skills } = await import("../../data/bncc-habilidades.json", { assert: { type: "json" } });
  console.log(`  [bncc] Importando ${skills.length} habilidades BNCC...`);
  for (const s of skills) {
    await db.eduSkill.upsert({
      where: { code: s.code },
      create: { code: s.code, description: s.description, shortLabel: s.shortLabel, stage: s.stage, gradeYear: s.gradeYear, subjectId: s.subjectId, networkId: null },
      update: { description: s.description, shortLabel: s.shortLabel },
    });
  }
  console.log(`  [bncc] Importação concluída.`);
}

// ── Seed de cada rede ─────────────────────────────────────────────────────────
async function seedRede(demo) {
  if (!demo.name.endsWith("(Demonstração)")) {
    throw new Error(`Rede "${demo.name}" não termina com (Demonstração). Abortando.`);
  }

  const url = process.env[demo.envVar];
  if (!url) {
    console.warn(`  [skip] Variável ${demo.envVar} não definida — pulando ${demo.name}.`);
    return;
  }

  console.log(`\n[seed] Rede: ${demo.name} (base: ${demo.dbKey})`);

  // Garante TenantDatabase no catálogo
  await catalog.tenantDatabase.upsert({
    where: { key: demo.dbKey },
    create: { key: demo.dbKey, envVar: demo.envVar, region: "railway-us", isShared: demo.plan === "SHARED", isActive: true },
    update: { envVar: demo.envVar, isActive: true },
  });

  // Garante Tenant no catálogo
  await catalog.tenant.upsert({
    where: { id: demo.id },
    create: { id: demo.id, name: demo.name, kind: demo.kind, status: "ACTIVE", dbKey: demo.dbKey, plan: demo.plan },
    update: { name: demo.name, status: "ACTIVE", dbKey: demo.dbKey },
  });

  const db = tenantClient(demo.envVar);

  try {
    await importBncc(db);

    // Cria/atualiza rede
    await db.eduNetwork.upsert({
      where: { id: demo.id },
      create: { id: demo.id, name: demo.name, isActive: true, slug: demo.id },
      update: { name: demo.name, isActive: true },
    });

    // EduUser: gestor da rede
    const gestorEmail = `gestor@${demo.id}.demo`;
    const gestor = await db.eduUser.upsert({
      where: { email: gestorEmail },
      create: { email: gestorEmail, name: "Gestor Demo", passwordHash: hashPw("Demo@2025"), isActive: true },
      update: {},
    });

    // Membership do gestor
    await db.eduMembership.upsert({
      where: { userId_networkId_role: { userId: gestor.id, networkId: demo.id, role: "NETWORK_ADMIN" } },
      create: { userId: gestor.id, networkId: demo.id, role: "NETWORK_ADMIN", isActive: true },
      update: { isActive: true },
    }).catch(() => {}); // campo composto pode não existir

    // Escola
    const escola = await db.eduSchool.upsert({
      where: { id: `escola-${demo.id}` },
      create: { id: `escola-${demo.id}`, name: `Escola ${demo.name}`, networkId: demo.id, isActive: true },
      update: {},
    });

    // Ano letivo
    const anoLetivo = await db.eduSchoolYear.upsert({
      where: { networkId_year: { networkId: demo.id, year: 2025 } },
      create: { networkId: demo.id, year: 2025, startsAt: new Date("2025-02-01"), endsAt: new Date("2025-12-15"), isCurrent: true },
      update: { isCurrent: true },
    });

    // Turma
    const turma = await db.eduClass.upsert({
      where: { id: `turma-${demo.id}` },
      create: {
        id: `turma-${demo.id}`,
        name: "5º Ano A",
        gradeYear: 5,
        stage: "ELEMENTARY_EARLY",
        shift: "MORNING",
        school: { connect: { id: escola.id } },
        schoolYear: { connect: { id: anoLetivo.id } },
        networkId: demo.id,
        isActive: true,
        accessCode: `DEMO${demo.dbKey.toUpperCase()}A`,
      },
      update: {},
    });

    // Aluno
    const aluno = await db.eduStudent.upsert({
      where: { id: `aluno-${demo.id}` },
      create: {
        id: `aluno-${demo.id}`,
        fullName: "Aluno Demonstração",
        enrollmentCode: `ALU${demo.id.toUpperCase().replace(/-/g, "")}`,
        networkId: demo.id,
        pinHash: hashPin("123456"),
        isActive: true,
      },
      update: {},
    });

    // Matrícula
    await db.eduEnrollment.upsert({
      where: { id: `enroll-${demo.id}` },
      create: {
        id: `enroll-${demo.id}`,
        studentId: aluno.id,
        classId: turma.id,
        networkId: demo.id,
        status: "ACTIVE",
      },
      update: {},
    }).catch(() => {});

    // Professor
    const profEmail = `professor@${demo.id}.demo`;
    const prof = await db.eduUser.upsert({
      where: { email: profEmail },
      create: { email: profEmail, name: "Professor Demo", passwordHash: hashPw("Demo@2025"), isActive: true },
      update: {},
    });

    await db.eduMembership.upsert({
      where: { userId_networkId_role: { userId: prof.id, networkId: demo.id, role: "TEACHER" } },
      create: { userId: prof.id, networkId: demo.id, schoolId: escola.id, role: "TEACHER", isActive: true },
      update: { isActive: true },
    }).catch(() => {});

    // Responsável familiar
    const famEmail = `familia@${demo.id}.demo`;
    await db.eduGuardian.upsert({
      where: { email: famEmail },
      create: {
        email: famEmail,
        name: "Responsável Demo",
        passwordHash: hashPw("Demo@2025"),
        networkId: demo.id,
        isActive: true,
      },
      update: {},
    }).catch(() => {});

    // Registra login index no catálogo
    for (const email of [gestorEmail, profEmail, famEmail]) {
      await catalog.loginIndex.upsert({
        where: { kind_identifier_tenantId: { kind: email === famEmail ? "GUARDIAN" : "STAFF", identifier: email, tenantId: demo.id } },
        create: { kind: email === famEmail ? "GUARDIAN" : "STAFF", identifier: email, tenantId: demo.id },
        update: {},
      });
    }

    // Code index para turma
    await catalog.codeIndex.upsert({
      where: { code: `DEMO${demo.dbKey.toUpperCase()}A` },
      create: { code: `DEMO${demo.dbKey.toUpperCase()}A`, kind: "CLASS_ACCESS", tenantId: demo.id },
      update: {},
    });

    // Contas de revisão das lojas (apenas Rede A)
    if (demo.id === "demo-rede-a") {
      const reviewAccounts = [
        { email: "review.apple@demo.speakflow.ai", name: "Revisor Apple Store" },
        { email: "review.google@demo.speakflow.ai", name: "Revisor Google Play" },
        { email: "review.microsoft@demo.speakflow.ai", name: "Revisor Microsoft Store" },
      ];
      for (const acc of reviewAccounts) {
        const u = await db.eduUser.upsert({
          where: { email: acc.email },
          create: { email: acc.email, name: acc.name, passwordHash: hashPw("Review@2025!"), isActive: true },
          update: {},
        });
        await db.eduMembership.upsert({
          where: { userId_networkId_role: { userId: u.id, networkId: demo.id, role: "TEACHER" } },
          create: { userId: u.id, networkId: demo.id, schoolId: escola.id, role: "TEACHER", isActive: true },
          update: { isActive: true },
        }).catch(() => {});
        await catalog.loginIndex.upsert({
          where: { kind_identifier_tenantId: { kind: "STAFF", identifier: acc.email, tenantId: demo.id } },
          create: { kind: "STAFF", identifier: acc.email, tenantId: demo.id },
          update: {},
        });
      }
    }

    console.log(`  [seed] OK: ${demo.name}`);
  } finally {
    await db.$disconnect();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  for (const demo of DEMOS) {
    await seedRede(demo);
  }
  console.log("\n[seed-demo] Concluído.");
}

main()
  .catch((err) => {
    console.error("[seed-demo] Erro:", err.message);
    process.exit(1);
  })
  .finally(() => catalog.$disconnect());
