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
 *     coord.b@speakflow.escola       COORDINATOR
 *     direcao.b@speakflow.escola     SCHOOL_ADMIN
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

/** Código de família fixo para o demo (o QR da ficha leva a /escola/familia/primeiro-acesso?codigo=...) */
async function demoCodigoFamilia(db, networkId, studentId, codigo) {
  const { createHash } = await import("crypto");
  const codeHash = createHash("sha256").update(codigo).digest("hex");
  const expiresAt = new Date(Date.now() + 365 * 86400000);
  await db.eduFamilyCode.upsert({
    where: { studentId },
    create: { networkId, studentId, codeHash, activationsLeft: 50, expiresAt },
    update: { codeHash, activationsLeft: 50, expiresAt, failedCount: 0, lockedUntil: null },
  });
  const key = `FAM${codeHash.toUpperCase()}`;
  await catalog.codeIndex.upsert({ where: { code: key }, create: { code: key, kind: "FAMILY_CODE", tenantId: networkId, expiresAt }, update: { tenantId: networkId, expiresAt } });
}

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

async function upsertUser(db, networkId, email, name) {
  return db.eduUser.upsert({
    where: { networkId_email: { networkId, email } },
    create: { networkId, email, name, passwordHash: hashPw(SENHA), isActive: true },
    update: { passwordHash: hashPw(SENHA), isActive: true, name },
  });
}

async function upsertMembership(db, userId, networkId, role, schoolId = null) {
  // schoolId é nullable — upsert com chave composta nullable não funciona no Prisma/SQL
  // (NULL != NULL). Usamos findFirst + create/update.
  const existing = await db.eduMembership.findFirst({
    where: { userId, networkId, role, schoolId: schoolId ?? null },
  });
  if (existing) {
    return db.eduMembership.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
  }
  return db.eduMembership.create({
    data: { userId, networkId, role, schoolId: schoolId ?? null, isActive: true },
  });
}

async function syncLogin(email, tenantId) {
  return catalog.loginIndex.upsert({
    where: { kind_identifier_tenantId: { kind: "STAFF", identifier: email.toLowerCase().trim(), tenantId } },
    create: { kind: "STAFF", identifier: email.toLowerCase().trim(), tenantId },
    update: {},
  });
}

// ── Turma de demonstração com dados (professor, colegas e evolução) ──────────
//
// Sem isto, o professor de demonstração não tinha turma nem matéria atribuída e os painéis
// (Mapa da Turma, coordenação, secretaria) apareciam vazios. Tudo aqui é fictício e
// idempotente: rodar de novo regrava os mesmos registros. Não toca no aluno principal
// do demo (ele faz o diagnóstico de verdade nas demonstrações).

const COLEGAS = [
  "Ana Demo Ribeiro", "Caio Demo Almeida", "Davi Demo Moreira", "Lara Demo Queiroz",
  "Luan Demo Pacheco", "Maya Demo Teixeira", "Nina Demo Barros", "Theo Demo Vidal",
];
// Caminho de cada colega por conteúdo: [diagnóstico, depois da 1ª trilha, depois da 2ª trilha]
const CAMINHOS = [
  ["NOT_YET", "ALMOST", "MASTERED"],
  ["NOT_YET", "NOT_YET", "ALMOST"],
  ["ALMOST", "MASTERED", "MASTERED"],
  ["NOT_YET", "ALMOST", "ALMOST"],
  ["MASTERED", "MASTERED", "MASTERED"],
  ["NOT_YET", "NOT_YET", "NOT_YET"],
  ["ALMOST", "ALMOST", "MASTERED"],
];
const DIA = 86_400_000;

/** Mesma regra de lib/escola/mastery-event.ts (consolidate). */
function consolidar(levels) {
  if (!levels.length) return "NOT_YET";
  const ordem = { NOT_YET: 1, ALMOST: 2, MASTERED: 3 };
  const last3 = levels.slice(-3);
  const ultima = last3[last3.length - 1];
  const conta = (l) => last3.filter((x) => x === l).length;
  const anteriores = last3.slice(0, -1);
  const historicoBom = anteriores.length > 0 && anteriores.every((x) => ordem[x] >= ordem.ALMOST);
  if (ultima === "MASTERED") return conta("MASTERED") >= 2 || historicoBom || anteriores.length === 0 ? "MASTERED" : "ALMOST";
  if (ultima === "ALMOST") return "ALMOST";
  return conta("NOT_YET") >= 2 || anteriores.length === 0 ? "NOT_YET" : "ALMOST";
}

async function seedTurmaComDados(db, { networkId, classIds, turmaId, schoolYearId, teacherId, skillCodes }) {
  // 1. Matérias da rede e vínculo do professor com as turmas
  const materias = [
    { name: "Matemática", area: "Matemática", color: "#1D4ED8", code: "MA" },
    { name: "Língua Portuguesa", area: "Linguagens", color: "#BE185D", code: "LP" },
  ];
  for (const m of materias) {
    const subject = await db.eduSubject.upsert({
      where: { networkId_name: { networkId, name: m.name } },
      create: { networkId, name: m.name, area: m.area, color: m.color, isActive: true },
      update: { isActive: true },
    });
    for (const classId of classIds) {
      await db.eduClassSubject.upsert({
        where: { classId_subjectId: { classId, subjectId: subject.id } },
        create: { networkId, classId, subjectId: subject.id, teacherId },
        update: { teacherId },
      });
    }
  }

  // 2. Colegas fictícios na turma principal
  const colegaIds = [];
  for (let i = 0; i < COLEGAS.length; i++) {
    const id = `colega${i + 1}-${networkId}`;
    await db.eduStudent.upsert({
      where: { id },
      create: { id, networkId, fullName: COLEGAS[i], enrollmentCode: `DEMOCOLEGA${i + 1}`, pinHash: hashPin(String(4000 + i * 137)), isActive: true },
      update: { isActive: true, fullName: COLEGAS[i] },
    });
    await db.eduEnrollment.upsert({
      where: { id: `enroll-${id}` },
      create: { id: `enroll-${id}`, studentId: id, classId: turmaId, schoolYearId, networkId, status: "ACTIVE" },
      update: { status: "ACTIVE", classId: turmaId },
    });
    colegaIds.push(id);
  }

  // 3. Evolução por conteúdo: diagnóstico há 3 semanas, trilhas depois
  const skills = await db.eduSkill.findMany({ where: { code: { in: skillCodes } }, select: { id: true, code: true } });
  if (!skills.length) { console.log("  (sem habilidades da BNCC no banco: turma criada sem evolução)"); return; }
  const agora = Date.now();
  await db.eduSkillMasteryEvent.deleteMany({ where: { networkId, studentId: { in: colegaIds } } });
  const eventos = [];
  const niveis = [];
  colegaIds.forEach((studentId, a) => {
    skills.forEach((skill, k) => {
      const caminho = CAMINHOS[(a * 3 + k) % CAMINHOS.length];
      const obs = [
        { level: caminho[0], source: "DIAGNOSTIC", createdAt: new Date(agora - 21 * DIA + k * 60_000) },
        { level: caminho[0], source: "DIAGNOSTIC", createdAt: new Date(agora - 21 * DIA + k * 60_000 + 30_000) },
        { level: caminho[1], source: "TRACK", createdAt: new Date(agora - 12 * DIA + k * 60_000) },
        { level: caminho[2], source: "TRACK", createdAt: new Date(agora - (2 + (a % 4)) * DIA + k * 60_000) },
      ];
      for (const o of obs) eventos.push({ networkId, studentId, skillId: skill.id, ...o });
      niveis.push({ studentId, skillId: skill.id, level: consolidar(obs.map((o) => o.level)) });
    });
  });
  await db.eduSkillMasteryEvent.createMany({ data: eventos });
  for (const n of niveis) {
    await db.eduSkillMastery.upsert({
      where: { studentId_skillId: { studentId: n.studentId, skillId: n.skillId } },
      create: { networkId, studentId: n.studentId, skillId: n.skillId, level: n.level, source: "TRACK" },
      update: { level: n.level, source: "TRACK" },
    });
  }

  // 4. Entregas recentes numa atividade pronta de cada conteúdo (alimentam "praticaram na semana")
  let entregas = 0;
  for (const skill of skills) {
    const atividade = await db.eduActivity.findFirst({
      where: { networkId: null, skillIds: { has: skill.id }, type: "QUIZ" },
      select: { id: true },
      orderBy: { id: "asc" },
    }).catch(() => null);
    if (!atividade) continue;
    for (let a = 0; a < colegaIds.length; a++) {
      const studentId = colegaIds[a];
      const nivel = niveis.find((n) => n.studentId === studentId && n.skillId === skill.id)?.level ?? "ALMOST";
      const quando = new Date(agora - (1 + (a % 5)) * DIA);
      await db.eduSubmission.upsert({
        where: { activityId_studentId_attempt: { activityId: atividade.id, studentId, attempt: 1 } },
        create: { networkId, activityId: atividade.id, studentId, attempt: 1, status: "EVALUATED", masteryLevel: nivel, skillId: skill.id, submittedAt: quando, evaluatedAt: quando },
        update: { status: "EVALUATED", masteryLevel: nivel, submittedAt: quando, evaluatedAt: quando },
      });
      entregas++;
    }
  }
  console.log(`  ✓ Turma com dados: ${colegaIds.length} colegas, ${skills.length} conteúdos, ${eventos.length} observações, ${entregas} entregas`);
}

// ── Rede A — escolas-dados-01 ─────────────────────────────────────────────────

/** Proposta de redação de exemplo para a turma demo (idempotente; não apaga textos dos alunos). */
async function seedRedacaoDemo(db, { networkId, classIds, teacherId }) {
  try {
    for (const classId of classIds) {
      const turma = await db.eduClass.findUnique({ where: { id: classId }, select: { schoolId: true } });
      if (!turma) continue;
      await db.eduEssayPrompt.upsert({
        where: { id: `redacao-demo-${classId}` },
        create: {
          id: `redacao-demo-${classId}`, networkId, schoolId: turma.schoolId, classId, createdById: teacherId,
          title: "O esporte na escola",
          instructions: "A escola deveria ter mais aulas de esporte? Escreva um texto dando a sua opinião. Explique os seus motivos e dê pelo menos um exemplo do seu dia a dia.",
          genre: "DISSERTATIVO", minWords: 40, maxWords: 800, maxVersions: 3,
        },
        update: { isOpen: true, maxWords: 800 },
      });
    }
  } catch (e) {
    console.log(`  (redação demo não criada: ${e.message})`);
  }
}

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

    const anoLetivoA = await db.eduSchoolYear.upsert({
      where: { networkId_year: { networkId: rede.id, year: 2025 } },
      create: { networkId: rede.id, year: 2025, startsAt: new Date("2025-02-01"), endsAt: new Date("2025-12-15"), isCurrent: true },
      update: { isCurrent: true },
    });

    await db.eduClass.upsert({
      where: { id: `turma-${NETWORK_ID}` },
      create: {
        id: `turma-${NETWORK_ID}`, name: "5º Ano A", gradeYear: 5,
        stage: "ELEMENTARY_EARLY", shift: "MORNING",
        school: { connect: { id: escola.id } }, schoolYear: { connect: { id: anoLetivoA.id } }, networkId: rede.id,
        isActive: true, accessCode: "DEMA25",
      },
      update: { isActive: true, name: "5º Ano A", gradeYear: 5, stage: "ELEMENTARY_EARLY" },
    });

    await catalog.codeIndex.upsert({
      where: { code: "DEMA25" },
      create: { code: "DEMA25", kind: "CLASS_ACCESS", tenantId: NETWORK_ID },
      update: {},
    });

    const aluno = await db.eduStudent.upsert({
      where: { id: `aluno-${NETWORK_ID}` },
      create: { id: `aluno-${NETWORK_ID}`, fullName: "Aluno Demo Silva", enrollmentCode: "DEMO2027A", networkId: rede.id, pinHash: hashPin("1234"), isActive: true, accessCode: "REFA6ANA", birthDate: new Date("2015-05-10T12:00:00Z") },
      update: { accessCode: "REFA6ANA", birthDate: new Date("2015-05-10T12:00:00Z") },
    });
    // Código do aluno (entrada no reforço), registrado no catálogo
    await catalog.codeIndex.upsert({
      where: { code: "REFA6ANA" },
      create: { code: "REFA6ANA", kind: "STUDENT_ACCESS", tenantId: NETWORK_ID },
      update: { kind: "STUDENT_ACCESS", tenantId: NETWORK_ID },
    });

    await db.eduEnrollment.upsert({
      where: { id: `enroll-${NETWORK_ID}` },
      create: { id: `enroll-${NETWORK_ID}`, studentId: aluno.id, classId: `turma-${NETWORK_ID}`, schoolYearId: anoLetivoA.id, networkId: rede.id, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });

    const usuarios = [
      { email: "gestor.demo@speakflow.escola",  name: "Gestor Demo",  role: "NETWORK_ADMIN", school: null },
      { email: "coord.demo@speakflow.escola",   name: "Coord Demo",   role: "COORDINATOR",   school: null },
      { email: "direcao.demo@speakflow.escola", name: "Direção Demo", role: "SCHOOL_ADMIN",  school: escola.id },
      { email: "prof.demo@speakflow.escola",    name: "Prof Demo",    role: "TEACHER",        school: escola.id },
    ];

    let profUserId = null;
    for (const u of usuarios) {
      const user = await upsertUser(db, rede.id, u.email, u.name);
      await upsertMembership(db, user.id, rede.id, u.role, u.school);
      await syncLogin(u.email, NETWORK_ID);
      if (u.role === "TEACHER") profUserId = user.id;
      console.log(`  ✓ ${u.email} (${u.role})`);
    }

    // Sessão demo permanente — aluno usa DEMA25 para entrar na turma
    await db.eduClassSession.upsert({
      where: { code: "DEMA25" },
      create: {
        networkId: rede.id,
        classId: `turma-${NETWORK_ID}`,
        openedById: profUserId ?? `prof-${NETWORK_ID}`,
        code: "DEMA25",
        expiresAt: new Date("2099-12-31"),
      },
      update: { expiresAt: new Date("2099-12-31"), closedAt: null },
    });

    if (profUserId) {
      await seedTurmaComDados(db, {
        networkId: rede.id, classIds: [`turma-${NETWORK_ID}`], turmaId: `turma-${NETWORK_ID}`,
        schoolYearId: anoLetivoA.id, teacherId: profUserId,
        skillCodes: ["EF05MA01", "EF05MA03", "EF05MA07", "EF05MA08", "EF05LP01", "EF05LP03", "EF35LP03"],
      });
      await seedRedacaoDemo(db, { networkId: rede.id, classIds: [`turma-${NETWORK_ID}`], teacherId: profUserId });
    }

    console.log(`  ✓ Aluno: "Aluno Demo Silva" | código DEMA25 | PIN 1234`);
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

    // P2.5: turma 6B → 2026
    await db.eduSchoolYear.updateMany({ where: { networkId: rede.id, year: 2025 }, data: { isCurrent: false } }).catch(() => {});
    const anoLetivoB = await db.eduSchoolYear.upsert({
      where: { networkId_year: { networkId: rede.id, year: 2026 } },
      create: { networkId: rede.id, year: 2026, startsAt: new Date("2026-02-01"), endsAt: new Date("2026-12-15"), isCurrent: true },
      update: { isCurrent: true },
    });

    await db.eduClass.upsert({
      where: { id: `turma-${NETWORK_ID}` },
      create: {
        id: `turma-${NETWORK_ID}`, name: "6º Ano B", gradeYear: 6,
        stage: "ELEMENTARY_LATE", shift: "AFTERNOON",
        school: { connect: { id: escola.id } }, schoolYear: { connect: { id: anoLetivoB.id } }, networkId: rede.id,
        isActive: true, accessCode: "DEMB25",
      },
      // O seed-demo antigo cria esta turma como "5º Ano A": corrige nome, ano e etapa
      update: { isActive: true, name: "6º Ano B", gradeYear: 6, stage: "ELEMENTARY_LATE", shift: "AFTERNOON", schoolYear: { connect: { id: anoLetivoB.id } } },
    });

    await catalog.codeIndex.upsert({
      where: { code: "DEMB25" },
      create: { code: "DEMB25", kind: "CLASS_ACCESS", tenantId: NETWORK_ID },
      update: {},
    });

    const aluno = await db.eduStudent.upsert({
      where: { id: `aluno-${NETWORK_ID}` },
      create: { id: `aluno-${NETWORK_ID}`, fullName: "Aluno Demo B Santos", enrollmentCode: "DEMO2027B", networkId: rede.id, pinHash: hashPin("5678"), isActive: true, accessCode: "REFB6ANB", birthDate: new Date("2015-03-12T12:00:00Z") },
      update: { accessCode: "REFB6ANB", birthDate: new Date("2015-03-12T12:00:00Z") },
    });
    // Código do aluno (entrada no reforço), registrado no catálogo
    await catalog.codeIndex.upsert({
      where: { code: "REFB6ANB" },
      create: { code: "REFB6ANB", kind: "STUDENT_ACCESS", tenantId: NETWORK_ID },
      update: { kind: "STUDENT_ACCESS", tenantId: NETWORK_ID },
    });
    // Ficha de acesso da família (demo): código fixo FAMB-6ANB, com folga de cadastros para os testes
    await demoCodigoFamilia(db, NETWORK_ID, aluno.id, "FAMB6ANB");

    await db.eduEnrollment.upsert({
      where: { id: `enroll-${NETWORK_ID}` },
      create: { id: `enroll-${NETWORK_ID}`, studentId: aluno.id, classId: `turma-${NETWORK_ID}`, schoolYearId: anoLetivoB.id, networkId: rede.id, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });

    // Irmã do Aluno Demo B Santos, no 5º ano da mesma escola: a família acompanha os dois filhos
    await db.eduClass.upsert({
      where: { id: `turma5-${NETWORK_ID}` },
      create: {
        id: `turma5-${NETWORK_ID}`, name: "5º Ano B", gradeYear: 5,
        stage: "ELEMENTARY_EARLY", shift: "MORNING",
        school: { connect: { id: escola.id } }, schoolYear: { connect: { id: anoLetivoB.id } }, networkId: rede.id,
        isActive: true, accessCode: "DEMB55",
      },
      update: { isActive: true, name: "5º Ano B", gradeYear: 5, stage: "ELEMENTARY_EARLY", schoolYear: { connect: { id: anoLetivoB.id } } },
    });
    await catalog.codeIndex.upsert({
      where: { code: "DEMB55" },
      create: { code: "DEMB55", kind: "CLASS_ACCESS", tenantId: NETWORK_ID },
      update: {},
    });
    const irma = await db.eduStudent.upsert({
      where: { id: `aluna5-${NETWORK_ID}` },
      create: { id: `aluna5-${NETWORK_ID}`, fullName: "Bia Demo B Santos", enrollmentCode: "DEMO2027B5", networkId: rede.id, pinHash: hashPin("2468"), isActive: true, accessCode: "REFB5ANB", birthDate: new Date("2016-07-20T12:00:00Z") },
      update: { accessCode: "REFB5ANB", birthDate: new Date("2016-07-20T12:00:00Z"), isActive: true },
    });
    // Código do aluno (entrada no reforço), registrado no catálogo
    await catalog.codeIndex.upsert({
      where: { code: "REFB5ANB" },
      create: { code: "REFB5ANB", kind: "STUDENT_ACCESS", tenantId: NETWORK_ID },
      update: { kind: "STUDENT_ACCESS", tenantId: NETWORK_ID },
    });
    // Ficha de acesso da família (demo): código fixo FAMB-5ANB, com folga de cadastros para os testes
    await demoCodigoFamilia(db, NETWORK_ID, irma.id, "FAMB5ANB");
    await db.eduEnrollment.upsert({
      where: { id: `enroll5-${NETWORK_ID}` },
      create: { id: `enroll5-${NETWORK_ID}`, studentId: irma.id, classId: `turma5-${NETWORK_ID}`, schoolYearId: anoLetivoB.id, networkId: rede.id, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });

    const usuarios = [
      { email: "gestor.b@speakflow.escola", name: "Gestor Demo B", role: "NETWORK_ADMIN", school: null },
      { email: "prof.b@speakflow.escola",   name: "Prof Demo B",   role: "TEACHER",        school: escola.id },
      // Coordenação e direção na mesma rede do aluno do 6º ano: os perfis enxergam os mesmos dados
      { email: "coord.b@speakflow.escola",   name: "Coord Demo B",   role: "COORDINATOR",  school: null },
      { email: "direcao.b@speakflow.escola", name: "Direção Demo B", role: "SCHOOL_ADMIN", school: escola.id },
    ];

    let profUserId = null;
    for (const u of usuarios) {
      const user = await upsertUser(db, rede.id, u.email, u.name);
      await upsertMembership(db, user.id, rede.id, u.role, u.school);
      await syncLogin(u.email, NETWORK_ID);
      if (u.role === "TEACHER") profUserId = user.id;
      console.log(`  ✓ ${u.email} (${u.role})`);
    }

    // Sessão demo permanente — aluno usa DEMB25 para entrar na turma
    await db.eduClassSession.upsert({
      where: { code: "DEMB25" },
      create: {
        networkId: rede.id,
        classId: `turma-${NETWORK_ID}`,
        openedById: profUserId ?? `prof-${NETWORK_ID}`,
        code: "DEMB25",
        expiresAt: new Date("2099-12-31"),
      },
      update: { expiresAt: new Date("2099-12-31"), closedAt: null },
    });

    if (profUserId) {
      await seedTurmaComDados(db, {
        networkId: rede.id, classIds: [`turma-${NETWORK_ID}`, `turma5-${NETWORK_ID}`], turmaId: `turma-${NETWORK_ID}`,
        schoolYearId: anoLetivoB.id, teacherId: profUserId,
        skillCodes: ["EF06MA01", "EF06MA03", "EF06MA05", "EF06MA06", "EF06LP04", "EF06LP06", "EF67LP04"],
      });
      await seedRedacaoDemo(db, { networkId: rede.id, classIds: [`turma-${NETWORK_ID}`, `turma5-${NETWORK_ID}`], teacherId: profUserId });
    }

    console.log(`  ✓ Aluno: "Aluno Demo B Santos" | código DEMB25 | PIN 5678`);
    console.log(`  ✓ Aluna: "Bia Demo B Santos" (5º Ano B) | PIN 2468`);
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
║    Aluno: código DEMA25  PIN 1234                          ║
╠══════════════════════════════════════════════════════════════╣
║  escolas-dados-02 — Escola Particular Demo B (isolado)       ║
║    gestor.b@speakflow.escola      NETWORK_ADMIN              ║
║    coord.b@speakflow.escola       COORDINATOR                ║
║    direcao.b@speakflow.escola     SCHOOL_ADMIN               ║
║    prof.b@speakflow.escola        TEACHER                    ║
║    Aluno: código DEMB25  PIN 5678                          ║
║    Aluna 5º B (irmã): Bia Demo B Santos  PIN 2468          ║
╚══════════════════════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => { console.error("[seed] Erro:", e.message); process.exit(1); })
  .finally(() => catalog.$disconnect());
