#!/usr/bin/env node
/**
 * scripts/escolas/seed-usuarios-demo.mjs
 *
 * Seed idempotente de demo: estrutura + usuários + BNCC nos 3 bancos.
 *
 * Bancos:
 *   escolas-catalogo  — roteamento / login index (ESCOLAS_CATALOG_URL)
 *   escolas-dados-01  — Rede Demo A              (ESCOLAS_DB_01_URL)
 *   escolas-dados-02  — Rede Demo B              (ESCOLAS_DB_02_URL)
 *
 * Usuários criados (senha: Speakflow@2027):
 *   DB01 – Rede Demo A:
 *     gestor.demo@speakflow.escola   NETWORK_ADMIN
 *     coord.demo@speakflow.escola    COORDINATOR
 *     direcao.demo@speakflow.escola  SCHOOL_ADMIN
 *     prof.demo@speakflow.escola     TEACHER
 *   DB02 – Rede Demo B:
 *     gestor.b@speakflow.escola      NETWORK_ADMIN
 *     prof.b@speakflow.escola        TEACHER
 *
 * Uso:
 *   railway run npm run escolas:seed-usuarios
 *   node scripts/escolas/seed-usuarios-demo.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

// Carrega .env local se existir
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

import bcrypt from "bcryptjs";
const { PrismaClient: CatalogClient } = await import("@prisma/escolas-catalogo");
const { PrismaClient: TenantClient }  = await import("@prisma/escolas");

const SENHA = "Speakflow@2027";
const hashPw  = (pw)  => bcrypt.hashSync(pw, 10);
const hashPin = (pin) => bcrypt.hashSync(pin, 10);

const catalog = new CatalogClient({ datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } } });

function tenantDb(envVar) {
  const url = process.env[envVar];
  if (!url) throw new Error(`Variável ${envVar} não definida.`);
  return new TenantClient({ datasources: { db: { url } } });
}

// ── BNCC import (idempotente) ─────────────────────────────────────────────────

async function importBncc(db, label) {
  const count = await db.eduSkill.count({ where: { networkId: null } });
  if (count >= 1304) {
    console.log(`  [bncc] ${label}: ${count} habilidades já presentes — ok.`);
    return;
  }
  const csvPath = join(ROOT, "prisma/data/bncc-ef.csv");
  if (!existsSync(csvPath)) {
    console.warn(`  [bncc] ${label}: arquivo ${csvPath} não encontrado — pulando.`);
    return;
  }
  const lines = readFileSync(csvPath, "utf8").split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const idx = (col) => header.indexOf(col);
  const rows = lines.slice(1).map((l) => {
    const cols = l.split(",");
    return {
      code:        cols[idx("code")]?.trim(),
      subjectCode: cols[idx("subjectCode")]?.trim(),
      stage:       cols[idx("stage")]?.trim(),
      gradeYears:  (cols[idx("gradeYears")] ?? "").split(";").map(Number).filter(Boolean),
      description: cols[idx("description")]?.trim(),
      shortLabel:  cols[idx("shortLabel")]?.trim(),
    };
  }).filter((r) => r.code);

  console.log(`  [bncc] ${label}: importando ${rows.length} habilidades...`);
  let n = 0;
  for (const r of rows) {
    await db.eduSkill.upsert({
      where: { code: r.code },
      create: { ...r, networkId: null },
      update: { description: r.description, shortLabel: r.shortLabel },
    });
    n++;
  }
  console.log(`  [bncc] ${label}: ${n} habilidades importadas.`);
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

// ── Rede A — escolas-dados-01 ─────────────────────────────────────────────────

async function seedRedeA() {
  const NETWORK_ID = "demo-rede-a";
  const db = tenantDb("ESCOLAS_DB_01_URL");
  console.log("\n[seed] escolas-dados-01 — Rede Demo A");

  try {
    await catalog.tenantDatabase.upsert({
      where: { key: "db01" },
      create: { key: "db01", envVar: "ESCOLAS_DB_01_URL", region: "railway-us", isShared: true,  isActive: true },
      update: { isActive: true },
    });
    await catalog.tenant.upsert({
      where: { id: NETWORK_ID },
      create: { id: NETWORK_ID, name: "Rede Municipal Demo A (Demonstração)", kind: "PUBLIC_NETWORK", status: "ACTIVE", dbKey: "db01", plan: "SHARED" },
      update: { status: "ACTIVE" },
    });

    // BNCC
    await importBncc(db, "db01");

    const rede = await db.eduNetwork.upsert({
      where: { id: NETWORK_ID },
      create: {
        id: NETWORK_ID, name: "Rede Municipal Demo A (Demonstração)",
        city: "Cidade Demo", state: "SP", isActive: true,
        gradeConfig: {},
      },
      update: { isActive: true },
    });

    const escola = await db.eduSchool.upsert({
      where: { id: `escola-${NETWORK_ID}` },
      create: { id: `escola-${NETWORK_ID}`, name: "EM Professor Silva Demo", networkId: rede.id, isActive: true },
      update: { isActive: true },
    });

    await db.eduClass.upsert({
      where: { id: `turma-${NETWORK_ID}` },
      create: {
        id: `turma-${NETWORK_ID}`, name: "5º Ano A", gradeYear: 5,
        stage: "ANOS_INICIAIS", shift: "MANHA",
        schoolId: escola.id, networkId: rede.id, academicYearId: null,
        isActive: true, accessCode: "DEMOA001",
      },
      update: { isActive: true },
    });

    await catalog.codeIndex.upsert({
      where: { code: "DEMOA001" },
      create: { code: "DEMOA001", kind: "CLASS_ACCESS", tenantId: NETWORK_ID },
      update: {},
    });

    const aluno = await db.eduStudent.upsert({
      where: { id: `aluno-${NETWORK_ID}` },
      create: { id: `aluno-${NETWORK_ID}`, fullName: "Aluno Demo Silva", enrollmentCode: "DEMO2027A", networkId: rede.id, pinHash: hashPin("1234"), isActive: true },
      update: {},
    });

    await db.eduEnrollment.upsert({
      where: { id: `enroll-${NETWORK_ID}` },
      create: { id: `enroll-${NETWORK_ID}`, studentId: aluno.id, classId: `turma-${NETWORK_ID}`, networkId: rede.id, status: "ACTIVE" },
      update: {},
    }).catch(() => {});

    const usuarios = [
      { email: "gestor.demo@speakflow.escola",  name: "Gestor Demo",  role: "NETWORK_ADMIN", school: null },
      { email: "coord.demo@speakflow.escola",   name: "Coord Demo",   role: "COORDINATOR",   school: null },
      { email: "direcao.demo@speakflow.escola", name: "Direção Demo", role: "SCHOOL_ADMIN",  school: escola.id },
      { email: "prof.demo@speakflow.escola",    name: "Prof Demo",    role: "TEACHER",        school: escola.id },
    ];

    for (const u of usuarios) {
      const user = await upsertUser(db, u.email, u.name);
      await upsertMembership(db, user.id, rede.id, u.role, u.school);
      await syncLogin(u.email, NETWORK_ID);
      console.log(`  ✓ ${u.email} (${u.role})`);
    }
    console.log(`  ✓ Aluno: "Aluno Demo Silva" | código DEMOA001 | PIN 1234`);
  } finally {
    await db.$disconnect();
  }
}

// ── Rede B — escolas-dados-02 ─────────────────────────────────────────────────

async function seedRedeB() {
  const NETWORK_ID = "demo-rede-b";
  const db = tenantDb("ESCOLAS_DB_02_URL");
  console.log("\n[seed] escolas-dados-02 — Rede Demo B (isolamento)");

  try {
    await catalog.tenantDatabase.upsert({
      where: { key: "db02" },
      create: { key: "db02", envVar: "ESCOLAS_DB_02_URL", region: "railway-us", isShared: false, isActive: true },
      update: { isActive: true },
    });
    await catalog.tenant.upsert({
      where: { id: NETWORK_ID },
      create: { id: NETWORK_ID, name: "Escola Particular Demo B (Demonstração)", kind: "PRIVATE_SCHOOL", status: "ACTIVE", dbKey: "db02", plan: "DEDICATED" },
      update: { status: "ACTIVE" },
    });

    // BNCC
    await importBncc(db, "db02");

    const rede = await db.eduNetwork.upsert({
      where: { id: NETWORK_ID },
      create: {
        id: NETWORK_ID, name: "Escola Particular Demo B (Demonstração)",
        city: "Cidade Demo B", state: "RJ", isActive: true,
        gradeConfig: {},
      },
      update: { isActive: true },
    });

    const escola = await db.eduSchool.upsert({
      where: { id: `escola-${NETWORK_ID}` },
      create: { id: `escola-${NETWORK_ID}`, name: "Escola Particular Demo B", networkId: rede.id, isActive: true },
      update: { isActive: true },
    });

    await db.eduClass.upsert({
      where: { id: `turma-${NETWORK_ID}` },
      create: {
        id: `turma-${NETWORK_ID}`, name: "6º Ano B", gradeYear: 6,
        stage: "ANOS_FINAIS", shift: "TARDE",
        schoolId: escola.id, networkId: rede.id, academicYearId: null,
        isActive: true, accessCode: "DEMOB001",
      },
      update: { isActive: true },
    });

    await catalog.codeIndex.upsert({
      where: { code: "DEMOB001" },
      create: { code: "DEMOB001", kind: "CLASS_ACCESS", tenantId: NETWORK_ID },
      update: {},
    });

    const aluno = await db.eduStudent.upsert({
      where: { id: `aluno-${NETWORK_ID}` },
      create: { id: `aluno-${NETWORK_ID}`, fullName: "Aluno Demo B Santos", enrollmentCode: "DEMO2027B", networkId: rede.id, pinHash: hashPin("5678"), isActive: true },
      update: {},
    });

    await db.eduEnrollment.upsert({
      where: { id: `enroll-${NETWORK_ID}` },
      create: { id: `enroll-${NETWORK_ID}`, studentId: aluno.id, classId: `turma-${NETWORK_ID}`, networkId: rede.id, status: "ACTIVE" },
      update: {},
    }).catch(() => {});

    const usuarios = [
      { email: "gestor.b@speakflow.escola", name: "Gestor Demo B", role: "NETWORK_ADMIN", school: null },
      { email: "prof.b@speakflow.escola",   name: "Prof Demo B",   role: "TEACHER",        school: escola.id },
    ];

    for (const u of usuarios) {
      const user = await upsertUser(db, u.email, u.name);
      await upsertMembership(db, user.id, rede.id, u.role, u.school);
      await syncLogin(u.email, NETWORK_ID);
      console.log(`  ✓ ${u.email} (${u.role})`);
    }
    console.log(`  ✓ Aluno: "Aluno Demo B Santos" | código DEMOB001 | PIN 5678`);
  } finally {
    await db.$disconnect();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Seed SpeakFlow Escolas — 3 bancos ===");
  console.log("Senha staff:", SENHA);

  await seedRedeA();
  await seedRedeB();

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LOGINS CRIADOS / ATUALIZADOS                                ║
╠══════════════════════════════════════════════════════════════╣
║  Rota: /escola/entrar   Senha: Speakflow@2027                ║
╠══════════════════════════════════════════════════════════════╣
║  escolas-dados-01 — Rede Municipal Demo A                    ║
║    gestor.demo@speakflow.escola   NETWORK_ADMIN              ║
║    coord.demo@speakflow.escola    COORDINATOR                ║
║    direcao.demo@speakflow.escola  SCHOOL_ADMIN               ║
║    prof.demo@speakflow.escola     TEACHER                    ║
║    Aluno: código DEMOA001  PIN 1234                          ║
╠══════════════════════════════════════════════════════════════╣
║  escolas-dados-02 — Escola Particular Demo B (isolado)       ║
║    gestor.b@speakflow.escola      NETWORK_ADMIN              ║
║    prof.b@speakflow.escola        TEACHER                    ║
║    Aluno: código DEMOB001  PIN 5678                          ║
╚══════════════════════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => { console.error("[seed] Erro:", e.message); process.exit(1); })
  .finally(() => catalog.$disconnect());
