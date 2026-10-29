#!/usr/bin/env node
/**
 * scripts/escolas/seed-usuarios-demo.mjs
 *
 * Cria/atualiza os usuários de teste nas duas bases tenant (db01 e db02)
 * e registra os LoginIndex no catálogo.
 *
 * Usuários criados (senha: Speakflow@2027):
 *   db01 – Rede Demo A:
 *     gestor.demo@speakflow.escola        NETWORK_ADMIN
 *     programadorlesd@gmail.com           NETWORK_ADMIN
 *     diretoria.software@gmail.com        SCHOOL_ADMIN
 *     coord.demo@speakflow.escola         COORDINATOR
 *     direcao.demo@speakflow.escola       SCHOOL_ADMIN
 *     prof.demo@speakflow.escola          TEACHER
 *   db02 – Rede Demo B (dados para testar isolamento):
 *     gestor.b@speakflow.escola           NETWORK_ADMIN
 *     prof.b@speakflow.escola             TEACHER
 *
 * Uso:
 *   node scripts/escolas/seed-usuarios-demo.mjs
 *   ou: npm run escolas:seed-usuarios
 */

// Carrega .env local se existir
import { readFileSync, existsSync } from "node:fs";
const envFile = new URL("../../.env.local", import.meta.url);
const envFallback = new URL("../../.env", import.meta.url);
const envPath = existsSync(envFile) ? envFile : (existsSync(envFallback) ? envFallback : null);
if (envPath) {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

import bcrypt from "bcryptjs";

const { PrismaClient: CatalogClient } = await import("@prisma/escolas-catalogo");
const { PrismaClient: TenantClient } = await import("@prisma/escolas");

const SENHA = "Speakflow@2027";
const hashPw = (pw) => bcrypt.hashSync(pw, 10);
const hashPin = (pin) => bcrypt.hashSync(pin, 10);

const catalog = new CatalogClient({
  datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } },
});

function tenantDb(envVar) {
  const url = process.env[envVar];
  if (!url) throw new Error(`Variável ${envVar} não definida.`);
  return new TenantClient({ datasources: { db: { url } } });
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function upsertUser(db, email, name) {
  return db.eduUser.upsert({
    where: { email },
    create: { email, name, passwordHash: hashPw(SENHA), isActive: true },
    update: { passwordHash: hashPw(SENHA), isActive: true, name },
  });
}

async function upsertMembership(db, userId, networkId, role, schoolId = null) {
  return db.eduMembership.upsert({
    where: { userId_networkId_role: { userId, networkId, role } },
    create: { userId, networkId, role, schoolId, isActive: true },
    update: { isActive: true, schoolId },
  }).catch(() =>
    db.eduMembership.upsert({
      where: { userId_networkId_role: { userId, networkId, role } },
      create: { userId, networkId, role, isActive: true },
      update: { isActive: true },
    })
  );
}

async function syncLogin(email, tenantId) {
  return catalog.loginIndex.upsert({
    where: { kind_identifier_tenantId: { kind: "STAFF", identifier: email.toLowerCase().trim(), tenantId } },
    create: { kind: "STAFF", identifier: email.toLowerCase().trim(), tenantId },
    update: {},
  });
}

// ── Seed Rede A (db01) ────────────────────────────────────────────────────────

async function seedRedeA() {
  const NETWORK_ID = "demo-rede-a";
  const TENANT_ID  = NETWORK_ID;
  const db = tenantDb("ESCOLAS_DB_01_URL");

  console.log("\n[seed] Rede Demo A (db01)");

  try {
    // Garante rede no catálogo
    await catalog.tenantDatabase.upsert({
      where: { key: "db01" },
      create: { key: "db01", envVar: "ESCOLAS_DB_01_URL", region: "railway-us", isShared: true, isActive: true },
      update: { isActive: true },
    });
    await catalog.tenant.upsert({
      where: { id: TENANT_ID },
      create: { id: TENANT_ID, name: "Rede Municipal Demo A (Demonstração)", kind: "PUBLIC_NETWORK", status: "ACTIVE", dbKey: "db01", plan: "SHARED" },
      update: { status: "ACTIVE" },
    });

    // Garante rede no tenant
    const rede = await db.eduNetwork.upsert({
      where: { id: NETWORK_ID },
      create: { id: NETWORK_ID, name: "Rede Municipal Demo A (Demonstração)", isActive: true, slug: NETWORK_ID },
      update: { isActive: true },
    });

    // Escola
    const escola = await db.eduSchool.upsert({
      where: { id: `escola-${NETWORK_ID}` },
      create: { id: `escola-${NETWORK_ID}`, name: "EM Professor Silva Demo", networkId: rede.id, isActive: true },
      update: { isActive: true },
    });

    // Turma com código de acesso
    const turma = await db.eduClass.upsert({
      where: { id: `turma-${NETWORK_ID}` },
      create: {
        id: `turma-${NETWORK_ID}`,
        name: "5º Ano A",
        gradeYear: 5,
        stage: "ANOS_INICIAIS",
        shift: "MANHA",
        schoolId: escola.id,
        networkId: rede.id,
        academicYearId: null,
        isActive: true,
        accessCode: "DEMOA001",
      },
      update: { isActive: true },
    });

    // Código da turma no catálogo
    await catalog.codeIndex.upsert({
      where: { code: "DEMOA001" },
      create: { code: "DEMOA001", kind: "CLASS_ACCESS", tenantId: TENANT_ID },
      update: {},
    });

    // Aluno demo
    const aluno = await db.eduStudent.upsert({
      where: { id: `aluno-${NETWORK_ID}` },
      create: {
        id: `aluno-${NETWORK_ID}`,
        fullName: "Aluno Demo Silva",
        enrollmentCode: "DEMO2027A",
        networkId: rede.id,
        pinHash: hashPin("1234"),
        isActive: true,
      },
      update: {},
    });

    // Matrícula do aluno
    await db.eduEnrollment.upsert({
      where: { id: `enroll-${NETWORK_ID}` },
      create: { id: `enroll-${NETWORK_ID}`, studentId: aluno.id, classId: turma.id, networkId: rede.id, status: "ACTIVE" },
      update: {},
    }).catch(() => {});

    // ── Usuários ────────────────────────────────────────────────────────────────
    const usuarios = [
      { email: "gestor.demo@speakflow.escola",      name: "Gestor Demo",       role: "NETWORK_ADMIN", school: null },
      { email: "programadorlesd@gmail.com",          name: "Luiz Dev",          role: "NETWORK_ADMIN", school: null },
      { email: "diretoria.software@gmail.com",       name: "Diretoria Software", role: "SCHOOL_ADMIN", school: escola.id },
      { email: "coord.demo@speakflow.escola",        name: "Coord Demo",        role: "COORDINATOR",  school: null },
      { email: "direcao.demo@speakflow.escola",      name: "Direção Demo",      role: "SCHOOL_ADMIN", school: escola.id },
      { email: "prof.demo@speakflow.escola",         name: "Prof Demo",         role: "TEACHER",       school: escola.id },
    ];

    for (const u of usuarios) {
      const user = await upsertUser(db, u.email, u.name);
      await upsertMembership(db, user.id, rede.id, u.role, u.school);
      await syncLogin(u.email, TENANT_ID);
      console.log(`  ✓ ${u.email} (${u.role})`);
    }

    console.log(`  ✓ Aluno: Aluno Demo Silva | código aula: DEMOA001 | PIN: 1234`);
  } finally {
    await db.$disconnect();
  }
}

// ── Seed Rede B (db02) — dados isolados para testar separação ─────────────────

async function seedRedeB() {
  const NETWORK_ID = "demo-rede-b";
  const TENANT_ID  = NETWORK_ID;
  const db = tenantDb("ESCOLAS_DB_02_URL");

  console.log("\n[seed] Rede Demo B (db02) — isolamento");

  try {
    // Garante rede no catálogo
    await catalog.tenantDatabase.upsert({
      where: { key: "db02" },
      create: { key: "db02", envVar: "ESCOLAS_DB_02_URL", region: "railway-us", isShared: false, isActive: true },
      update: { isActive: true },
    });
    await catalog.tenant.upsert({
      where: { id: TENANT_ID },
      create: { id: TENANT_ID, name: "Escola Particular Demo B (Demonstração)", kind: "PRIVATE_SCHOOL", status: "ACTIVE", dbKey: "db02", plan: "DEDICATED" },
      update: { status: "ACTIVE" },
    });

    // Rede
    const rede = await db.eduNetwork.upsert({
      where: { id: NETWORK_ID },
      create: { id: NETWORK_ID, name: "Escola Particular Demo B (Demonstração)", isActive: true, slug: NETWORK_ID },
      update: { isActive: true },
    });

    // Escola
    const escola = await db.eduSchool.upsert({
      where: { id: `escola-${NETWORK_ID}` },
      create: { id: `escola-${NETWORK_ID}`, name: "Escola Particular Demo B", networkId: rede.id, isActive: true },
      update: { isActive: true },
    });

    // Turma
    const turma = await db.eduClass.upsert({
      where: { id: `turma-${NETWORK_ID}` },
      create: {
        id: `turma-${NETWORK_ID}`,
        name: "6º Ano B",
        gradeYear: 6,
        stage: "ANOS_FINAIS",
        shift: "TARDE",
        schoolId: escola.id,
        networkId: rede.id,
        academicYearId: null,
        isActive: true,
        accessCode: "DEMOB001",
      },
      update: { isActive: true },
    });

    // Código da turma no catálogo
    await catalog.codeIndex.upsert({
      where: { code: "DEMOB001" },
      create: { code: "DEMOB001", kind: "CLASS_ACCESS", tenantId: TENANT_ID },
      update: {},
    });

    // Aluno demo B
    const aluno = await db.eduStudent.upsert({
      where: { id: `aluno-${NETWORK_ID}` },
      create: {
        id: `aluno-${NETWORK_ID}`,
        fullName: "Aluno Demo B Santos",
        enrollmentCode: "DEMO2027B",
        networkId: rede.id,
        pinHash: hashPin("5678"),
        isActive: true,
      },
      update: {},
    });

    await db.eduEnrollment.upsert({
      where: { id: `enroll-${NETWORK_ID}` },
      create: { id: `enroll-${NETWORK_ID}`, studentId: aluno.id, classId: turma.id, networkId: rede.id, status: "ACTIVE" },
      update: {},
    }).catch(() => {});

    // Usuários da Rede B (emails diferentes para confirmar isolamento)
    const usuarios = [
      { email: "gestor.b@speakflow.escola", name: "Gestor Demo B", role: "NETWORK_ADMIN", school: null },
      { email: "prof.b@speakflow.escola",   name: "Prof Demo B",   role: "TEACHER",       school: escola.id },
    ];

    for (const u of usuarios) {
      const user = await upsertUser(db, u.email, u.name);
      await upsertMembership(db, user.id, rede.id, u.role, u.school);
      await syncLogin(u.email, TENANT_ID);
      console.log(`  ✓ ${u.email} (${u.role})`);
    }

    console.log(`  ✓ Aluno: Aluno Demo B Santos | código aula: DEMOB001 | PIN: 5678`);
  } finally {
    await db.$disconnect();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Seed usuários demo SpeakFlow Escolas ===");
  console.log("Senha de todos os staff:", SENHA);

  await seedRedeA();
  await seedRedeB();

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  LOGINS CRIADOS / ATUALIZADOS                              ║
╠════════════════════════════════════════════════════════════╣
║  Rota: /escola/entrar   Senha: Speakflow@2027              ║
╠════════════════════════════════════════════════════════════╣
║  DB01 — Rede Municipal Demo A                              ║
║  gestor.demo@speakflow.escola        NETWORK_ADMIN         ║
║  programadorlesd@gmail.com           NETWORK_ADMIN         ║
║  diretoria.software@gmail.com        SCHOOL_ADMIN          ║
║  coord.demo@speakflow.escola         COORDINATOR           ║
║  direcao.demo@speakflow.escola       SCHOOL_ADMIN          ║
║  prof.demo@speakflow.escola          TEACHER               ║
║  Aluno: código DEMOA001 + PIN 1234                         ║
╠════════════════════════════════════════════════════════════╣
║  DB02 — Escola Particular Demo B (isolado)                 ║
║  gestor.b@speakflow.escola           NETWORK_ADMIN         ║
║  prof.b@speakflow.escola             TEACHER               ║
║  Aluno: código DEMOB001 + PIN 5678                         ║
╚════════════════════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => { console.error("[seed] Erro:", e.message); process.exit(1); })
  .finally(() => catalog.$disconnect());
