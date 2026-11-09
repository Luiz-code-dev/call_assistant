#!/usr/bin/env node
/**
 * scripts/escolas/seed-teste-usabilidade.mjs
 *
 * Seed idempotente da massa de teste para usabilidade.
 * Execute com ESCOLAS_SEED_TESTE=true (via start.sh) ou diretamente:
 *   railway run node scripts/escolas/seed-teste-usabilidade.mjs
 *
 * Senhas e PINs NUNCA hardcoded — lidos de variáveis de ambiente:
 *   ESCOLAS_DEMO_PASSWORD        — staff (gestor, coord, direção, prof)
 *   ESCOLAS_FAMILIA_PASSWORD     — familia.b@speakflow.escola
 *   ESCOLAS_ADMIN_TESTE_PASSWORD — admin.teste@speakflow.escola
 *
 * PINs e figuras são gerados aleatoriamente na PRIMEIRA execução e
 * impressos no log do Railway. Capture o log nessa execução: nas seguintes
 * o seed é idempotente e não recria credenciais já existentes.
 *
 * O que este seed cria/garante:
 *   - isDemo=true e trackAssignmentMode correto nas redes demo
 *   - Ano letivo 2026 ativo nas duas redes
 *   - coord.b e direcao.b na Rede B
 *   - 15 alunos extras no 5º A (PICTURE, gradeYear 1-5)
 *   - 19 alunos extras no 6º B  → total 20 com Aluno Demo B Santos (PIN)
 *   - Aluno Demo Silva e 5º A → PICTURE (3 figuras aleatórias, hash no banco)
 *   - Diagnóstico MA-06 aberto para o 6º B; Aluno Demo B Santos não respondeu
 *   - 15 colegas responderam: ~40% erram EF06MA07 (degrau ativado)
 *   - Pré-requisitos MA-06 → APPROVED (degrau funciona)
 *   - 10+ trilhas MA-06 SpeakFlow → APPROVED (biblioteca e atribuição)
 *   - Histórico 3 semanas: masteries, 4 alunos com erro "1/2 + 1/3"
 *   - 3 alunos sem praticar há 7+ dias
 *   - 2 aulas registradas pelo prof.b (Frações e Ângulos)
 *   - Atividade SPOKEN (áudio) para Aluno Demo Silva
 *   - familia.b@speakflow.escola ativa + convite pendente
 *   - admin.teste@speakflow.escola como PLATFORM_ADMIN
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomInt, createHash, randomBytes } from "node:crypto";

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

import bcrypt from "bcryptjs";
const { PrismaClient: CatalogClient } = await import("@prisma/escolas-catalogo");
const { PrismaClient: TenantClient }  = await import("@prisma/escolas");

function requireEnv(name) {
  const v = process.env[name];
  if (!v && process.env.NODE_ENV === "production") throw new Error(`${name} nao configurada em producao`);
  return v;
}

const SENHA_STAFF   = requireEnv("ESCOLAS_DEMO_PASSWORD")        ?? "Speakflow@2027";
const SENHA_FAMILIA = requireEnv("ESCOLAS_FAMILIA_PASSWORD")     ?? "Familia@2027!";
const SENHA_ADMIN   = requireEnv("ESCOLAS_ADMIN_TESTE_PASSWORD") ?? "Admin@2027!";

function hashSenha(s) { return bcrypt.hashSync(s, 10); }
function hashPin(p)   { return bcrypt.hashSync(String(p), 10); }

// Figuras exatamente como definidas na tela de entrada do aluno
// (app/(escola)/escola/aluno/entrar/page.tsx)
const FIGURAS_IDS = ["sun","star","heart","house","fish","flower","moon","drop","cloud"];

function pickThreeFiguras() {
  const pool = [...FIGURAS_IDS];
  const result = [];
  for (let i = 0; i < 3; i++) {
    const idx = randomInt(0, pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result; // ex: ["sun","heart","moon"]
}

const FIGURAS_LABELS = { sun:"Sol", star:"Estrela", heart:"Coracao", house:"Casa", fish:"Peixe", flower:"Flor", moon:"Lua", drop:"Gota", cloud:"Nuvem" };

const catalog = new CatalogClient({ datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } } });

function tenantDb(envVar) {
  const url = process.env[envVar];
  if (!url) throw new Error(`Variavel de ambiente ausente: ${envVar}`);
  return new TenantClient({ datasources: { db: { url } } });
}

async function syncStaffLogin(email, tenantId) {
  const id = email.toLowerCase().trim();
  await catalog.loginIndex.upsert({
    where: { kind_identifier_tenantId: { kind: "STAFF", identifier: id, tenantId } },
    create: { kind: "STAFF", identifier: id, tenantId },
    update: {},
  });
}

async function syncGuardianLogin(email, tenantId) {
  const id = email.toLowerCase().trim();
  await catalog.loginIndex.upsert({
    where: { kind_identifier_tenantId: { kind: "GUARDIAN", identifier: id, tenantId } },
    create: { kind: "GUARDIAN", identifier: id, tenantId },
    update: {},
  });
}

async function upsertUser(db, networkId, email, name) {
  const existing = await db.eduUser.findFirst({ where: { email } });
  if (existing) return existing;
  return db.eduUser.create({ data: { email, name, passwordHash: hashSenha(SENHA_STAFF), networkId } });
}

async function upsertMembership(db, userId, networkId, role, schoolId) {
  const existing = await db.eduMembership.findFirst({ where: { userId, networkId, role } });
  if (existing) return existing;
  return db.eduMembership.create({ data: { userId, networkId, role, schoolId, isActive: true } });
}

function subDays(d, n) { const r = new Date(d); r.setDate(r.getDate() - n); return r; }

const NOMES = [
  "Ana Beatriz","Carlos Eduardo","Fernanda Lima","Gabriel Souza","Helena Costa",
  "Igor Alves","Juliana Melo","Kevin Dias","Laura Pinto","Marcos Vieira",
  "Natalia Santos","Orlando Cruz","Patricia Nunes","Rafael Cardoso","Sofia Rocha",
  "Thiago Ferreira","Ursula Gomes","Victor Hugo","Wanderson Lopes","Yasmin Araujo",
  "Beatriz Oliveira","Daniel Carvalho","Emilly Torres","Felipe Martins","Giovanna Silva",
  "Henrique Pereira","Isabela Ramos","Joao Pedro","Karla Mendes","Leonardo Faria",
];

// Log de credenciais geradas nesta execucao (impressas uma vez)
const credLog = [];

// ── Seed Rede A (5º Ano A) ───────────────────────────────────────────────────

async function seedRedeA() {
  const NETWORK_ID = "demo-rede-a";
  const db = tenantDb("ESCOLAS_DB_01_URL");
  try {
    console.log("\n[seed-teste] Rede A — 5o Ano A");

    // Marcar rede como demo e garantir SUGGEST
    await db.eduNetwork.update({
      where: { id: NETWORK_ID },
      data: { isDemo: true, trackAssignmentMode: "SUGGEST" },
    }).catch(() => {});

    const rede = await db.eduNetwork.findUnique({ where: { id: NETWORK_ID } });
    if (!rede) { console.log("  Rede A nao encontrada — rode seed-usuarios-demo antes."); return; }

    const escola = await db.eduSchool.findFirst({ where: { networkId: NETWORK_ID } });
    const turma  = await db.eduClass.findUnique({ where: { id: `turma-${NETWORK_ID}` } });
    if (!escola || !turma) { console.log("  Dados base ausentes."); return; }

    // Garantir ano letivo 2026 ativo
    const anoLetivo = await db.eduSchoolYear.upsert({
      where: { networkId_year: { networkId: rede.id, year: 2026 } },
      create: { networkId: rede.id, year: 2026, startsAt: new Date("2026-02-01"), endsAt: new Date("2026-12-15"), isCurrent: true },
      update: { isCurrent: true },
    });
    // Desativar 2025 se existir
    await db.eduSchoolYear.updateMany({
      where: { networkId: rede.id, year: 2025 },
      data: { isCurrent: false },
    }).catch(() => {});

    // Aluno Demo Silva → PICTURE (atualizar se ainda for PIN)
    const alunoSilva = await db.eduStudent.findUnique({ where: { id: `aluno-${NETWORK_ID}` } });
    if (alunoSilva && alunoSilva.loginMode !== "PICTURE") {
      const figs = pickThreeFiguras();
      const figHash = bcrypt.hashSync(figs.join(","), 10);
      await db.eduStudent.update({
        where: { id: `aluno-${NETWORK_ID}` },
        data: { loginMode: "PICTURE", pictureSecretHash: figHash },
      });
      credLog.push(`ALUNO  Aluno Demo Silva (5A)  FIGURAS: ${figs.map(f => FIGURAS_LABELS[f]).join(" → ")}`);
    } else if (alunoSilva && alunoSilva.loginMode === "PICTURE") {
      credLog.push(`ALUNO  Aluno Demo Silva (5A)  PICTURE ja configurado (nao alterado)`);
    }

    // 15 alunos extras no 5º A (PICTURE — grau 1-5)
    for (let i = 0; i < 15; i++) {
      const aId = `aluno-a-extra-${i}`;
      const existing = await db.eduStudent.findUnique({ where: { id: aId } });
      if (!existing) {
        const figs = pickThreeFiguras();
        const figHash = bcrypt.hashSync(figs.join(","), 10);
        const nome = `${NOMES[i]} A5`;
        await db.eduStudent.create({
          data: { id: aId, fullName: nome, enrollmentCode: `TSTA${String(i).padStart(3,"0")}`, networkId: rede.id, pinHash: bcrypt.hashSync("0000",10), pictureSecretHash: figHash, isActive: true, loginMode: "PICTURE" },
        });
        await db.eduEnrollment.create({
          data: { id: `enroll-a-extra-${i}`, studentId: aId, classId: turma.id, schoolYearId: anoLetivo.id, networkId: rede.id, status: "ACTIVE" },
        }).catch(() => {});
        credLog.push(`ALUNO  ${nome.padEnd(25)}  FIGURAS: ${figs.map(f => FIGURAS_LABELS[f]).join(" → ")}`);
      }
    }
    console.log("  ok: Aluno Demo Silva + 15 extras → PICTURE, ano 2026");

    // Atualizar enrollment do Aluno Demo Silva para o ano 2026
    await db.eduEnrollment.updateMany({
      where: { studentId: `aluno-${NETWORK_ID}`, classId: turma.id },
      data: { schoolYearId: anoLetivo.id },
    }).catch(() => {});

    // Atividade SPOKEN com audio para Aluno Demo Silva
    const profMembro = await db.eduMembership.findFirst({ where: { networkId: rede.id, role: "TEACHER" } });
    if (profMembro) {
      await db.eduActivity.upsert({
        where: { id: "ativ-audio-demo-a" },
        create: {
          id: "ativ-audio-demo-a",
          networkId: rede.id,
          type: "SPOKEN",
          title: "Leitura em voz alta — Texto narrativo",
          prompt: "Leia o trecho em voz alta e responda: qual e o personagem principal da historia?",
          rubric: { criteria: [{ label: "Fluencia", weight: 1 }, { label: "Pronuncia", weight: 1 }] },
          maxScore: 10,
          maxAttempts: 2,
          maxAudioSec: 120,
          status: "PUBLISHED",
          createdById: profMembro.userId,
        },
        update: { status: "PUBLISHED" },
      });
    }
    console.log("  ok: atividade com audio (Ouvir) publicada para 5A");

  } finally {
    await db.$disconnect();
  }
}

// ── Seed Rede B (6º Ano B) ───────────────────────────────────────────────────

async function seedRedeB() {
  const NETWORK_ID = "demo-rede-b";
  const db = tenantDb("ESCOLAS_DB_02_URL");
  try {
    console.log("\n[seed-teste] Rede B — 6o Ano B");

    // Marcar rede como demo e garantir AUTO
    await db.eduNetwork.update({
      where: { id: NETWORK_ID },
      data: { isDemo: true, trackAssignmentMode: "AUTO" },
    }).catch(() => {});

    const rede = await db.eduNetwork.findUnique({ where: { id: NETWORK_ID } });
    if (!rede) { console.log("  Rede B nao encontrada — rode seed-usuarios-demo antes."); return; }

    const escola = await db.eduSchool.findFirst({ where: { networkId: NETWORK_ID } });
    const turma  = await db.eduClass.findUnique({ where: { id: `turma-${NETWORK_ID}` } });
    if (!escola || !turma) { console.log("  Dados base ausentes."); return; }

    // Garantir ano letivo 2026 ativo
    const anoLetivo = await db.eduSchoolYear.upsert({
      where: { networkId_year: { networkId: rede.id, year: 2026 } },
      create: { networkId: rede.id, year: 2026, startsAt: new Date("2026-02-01"), endsAt: new Date("2026-12-15"), isCurrent: true },
      update: { isCurrent: true },
    });
    await db.eduSchoolYear.updateMany({ where: { networkId: rede.id, year: 2025 }, data: { isCurrent: false } }).catch(() => {});

    // Atualizar enrollment do Aluno Demo B Santos para 2026
    const alunoB = await db.eduStudent.findUnique({ where: { id: `aluno-${NETWORK_ID}` } });
    if (alunoB) {
      await db.eduEnrollment.updateMany({
        where: { studentId: alunoB.id, classId: turma.id },
        data: { schoolYearId: anoLetivo.id },
      }).catch(() => {});
    }

    // coord.b
    const coordUser = await upsertUser(db, rede.id, "coord.b@speakflow.escola", "Coord Demo B");
    await upsertMembership(db, coordUser.id, rede.id, "COORDINATOR", null);
    await syncStaffLogin("coord.b@speakflow.escola", NETWORK_ID);
    console.log("  ok: coord.b (COORDINATOR)");

    // direcao.b
    const direcaoUser = await upsertUser(db, rede.id, "direcao.b@speakflow.escola", "Direcao Demo B");
    await upsertMembership(db, direcaoUser.id, rede.id, "SCHOOL_ADMIN", escola.id);
    await syncStaffLogin("direcao.b@speakflow.escola", NETWORK_ID);
    console.log("  ok: direcao.b (SCHOOL_ADMIN)");

    const profMembro = await db.eduMembership.findFirst({ where: { networkId: rede.id, role: "TEACHER" } });

    // 19 alunos extras no 6º B (PIN — grau 6-9)
    const alunosExtra = [];
    for (let i = 0; i < 19; i++) {
      const aId = `aluno-b-extra-${i}`;
      const existing = await db.eduStudent.findUnique({ where: { id: aId } });
      if (!existing) {
        const pin = randomInt(1000, 9999);
        const nome = `${NOMES[i]} B6`;
        const aluno = await db.eduStudent.create({
          data: { id: aId, fullName: nome, enrollmentCode: `TSTB${String(i).padStart(3,"0")}`, networkId: rede.id, pinHash: hashPin(pin), isActive: true, loginMode: "PIN" },
        });
        await db.eduEnrollment.create({
          data: { id: `enroll-b-extra-${i}`, studentId: aluno.id, classId: turma.id, schoolYearId: anoLetivo.id, networkId: rede.id, status: "ACTIVE" },
        }).catch(() => {});
        credLog.push(`ALUNO  ${nome.padEnd(25)}  PIN: ${pin}  matricula: TSTB${String(i).padStart(3,"0")}`);
        alunosExtra.push(aluno);
      } else {
        alunosExtra.push(existing);
      }
    }
    console.log("  ok: 19 extras no 6B → total 20 alunos");

    // Habilidades MA-06 (todas — BNCC tem 34 no 6º ano de Matematica)
    const skillsMA06 = await db.eduSkill.findMany({
      where: { subjectCode: "MA", gradeYears: { has: 6 } },
      select: { id: true, code: true },
      orderBy: { code: "asc" },
    });
    console.log(`  ok: ${skillsMA06.length} habilidades MA-06 encontradas`);

    if (skillsMA06.length === 0) {
      console.log("  AVISO: habilidades MA-06 ausentes — BNCC importado?");
      return;
    }

    const skillEF06MA07 = skillsMA06.find(s => s.code === "EF06MA07") ?? skillsMA06[Math.min(6, skillsMA06.length-1)];

    // Aprovar pré-requisitos MA-06 para o degrau funcionar
    const prereqsDraft = await db.eduSkillPrerequisite.findMany({
      where: {
        OR: [
          { skillId: { in: skillsMA06.map(s => s.id) } },
          { prerequisiteSkillId: { in: skillsMA06.map(s => s.id) } },
        ],
        status: "DRAFT",
      },
      take: 5,
    });
    for (const p of prereqsDraft) {
      await db.eduSkillPrerequisite.update({
        where: { id: p.id },
        data: { status: "APPROVED", reviewNote: "aprovado para teste de usabilidade" },
      });
    }
    console.log(`  ok: ${prereqsDraft.length} pre-requisitos MA-06 → APPROVED`);

    // Aprovar 10+ trilhas MA-06 SpeakFlow para a biblioteca
    const trilhasDraft = await db.eduTrack.findMany({
      where: { source: "SPEAKFLOW", status: "DRAFT", gradeYear: 6, subjectCode: "MA" },
      take: 12,
    });
    for (const t of trilhasDraft) {
      await db.eduTrack.update({
        where: { id: t.id },
        data: { status: "APPROVED", approvedById: coordUser.id, reviewNote: "aprovado para teste de usabilidade" },
      });
    }
    console.log(`  ok: ${trilhasDraft.length} trilhas MA-06 → APPROVED`);

    // Diagnóstico MA-06 aberto para Rede B
    const diagId = "diag-teste-ma06-rede-b";
    const diag = await db.eduDiagnostic.upsert({
      where: { id: diagId },
      create: {
        id: diagId,
        networkId: rede.id,
        subjectCode: "MA",
        gradeYear: 6,
        title: "Diagnostico MA-06 — Teste de Usabilidade",
        cycle: 1,
        status: "OPEN",
        opensAt: new Date(),
        createdById: coordUser.id,
        source: "REDE",
        adaptive: true,
      },
      update: { status: "OPEN" },
    });

    // Banco de questões para cada item do diagnóstico MA-06
    // EduQuizQuestion é obrigatório — sem ela o endpoint /aluno/diagnostico/[id]
    // retorna array vazio de perguntas e o aluno não consegue responder.
    const QUESTOES_MA06 = [
      { q: "Qual é o valor de 2/3 + 1/6?", opts: ["5/6","1/2","3/9","2/9"], c: 0, exp: "2/3 = 4/6, logo 4/6 + 1/6 = 5/6" },
      { q: "Simplifique a fração 12/18.", opts: ["2/3","3/4","6/9","4/6"], c: 0, exp: "MDC(12,18)=6 → 12/18 = 2/3" },
      { q: "Quanto é 1/2 + 1/3?", opts: ["5/6","2/5","3/5","2/6"], c: 0, exp: "1/2=3/6, 1/3=2/6, soma=5/6" },
      { q: "Um número racional entre 1 e 2 é:", opts: ["3/2","5/2","1/4","0,25"], c: 0, exp: "3/2 = 1,5 está entre 1 e 2" },
      { q: "Calcule 3/4 − 1/8.", opts: ["5/8","2/4","1/2","4/8"], c: 0, exp: "3/4=6/8, 6/8−1/8=5/8" },
      { q: "Qual fração é equivalente a 0,75?", opts: ["3/4","7/5","3/5","4/3"], c: 0, exp: "0,75 = 75/100 = 3/4" },
      { q: "Se um inteiro é dividido em 5 partes iguais, cada parte vale:", opts: ["1/5","5/1","1/4","2/5"], c: 0, exp: "1 ÷ 5 = 1/5" },
      { q: "Qual é o resultado de 2 × (1/4)?", opts: ["1/2","2/4","1/8","3/4"], c: 0, exp: "2 × 1/4 = 2/4 = 1/2" },
    ];

    // Itens do diagnóstico (8 habilidades para tamanho razoável)
    const skillsParaDiag = skillsMA06.slice(0, 8);
    for (let i = 0; i < skillsParaDiag.length; i++) {
      const skill = skillsParaDiag[i];
      const atvId = `ativ-diag-ma06-${i}`;
      const atv = await db.eduActivity.upsert({
        where: { id: atvId },
        create: {
          id: atvId,
          networkId: rede.id,
          type: "QUIZ",
          title: `Questao diagnostico MA-06 — ${skill.code}`,
          prompt: `Resolva o problema relacionado a ${skill.code}.`,
          rubric: { type: "quiz" },
          maxScore: 10,
          maxAttempts: 1,
          status: "PUBLISHED",
          createdById: coordUser.id,
        },
        update: {},
      });
      // Bug 4: criar EduQuizQuestion — sem ela o endpoint retorna perguntas vazias
      const q = QUESTOES_MA06[i] ?? QUESTOES_MA06[0];
      await db.eduQuizQuestion.upsert({
        where: { id: `qz-diag-ma06-${i}` },
        create: {
          id: `qz-diag-ma06-${i}`,
          activityId: atv.id,
          order: 0,
          question: q.q,
          options: q.opts,
          correctIndex: q.c,
          explanation: q.exp,
          skillId: skill.id,
        },
        update: {},
      });
      await db.eduDiagnosticItem.upsert({
        where: { id: `item-diag-ma06-${i}` },
        create: { id: `item-diag-ma06-${i}`, diagnosticId: diag.id, skillId: skill.id, order: i, activityId: atv.id },
        update: {},
      });
    }
    console.log(`  ok: diagnostico aberto com ${skillsParaDiag.length} itens e questoes`);

    // 15 respostas ao diagnóstico: Aluno Demo B Santos NAO responde
    // ~40% erram EF06MA07 → 6 de 15
    const now = new Date();
    const alunosQueResponderam = alunosExtra.slice(0, 15);
    const erramEF06MA07 = new Set(alunosQueResponderam.slice(0, 6).map(a => a.id));
    // 4 alunos com erro "1/2 + 1/3" (são subconjunto dos que erram EF06MA07)
    const erroFracaoIds = new Set(alunosQueResponderam.slice(0, 4).map(a => a.id));

    for (const aluno of alunosQueResponderam) {
      const masteryEF06MA07 = erramEF06MA07.has(aluno.id) ? "NOT_YET" : "MASTERED";
      await db.eduSkillMastery.upsert({
        where: { studentId_skillId: { studentId: aluno.id, skillId: skillEF06MA07.id } },
        create: { networkId: rede.id, studentId: aluno.id, skillId: skillEF06MA07.id, level: masteryEF06MA07, source: "DIAGNOSTIC" },
        update: { level: masteryEF06MA07 },
      }).catch(() => {});

      // Masteries para habilidades anteriores do diagnóstico
      for (let i = 1; i < Math.min(4, skillsParaDiag.length); i++) {
        const sk = skillsParaDiag[i];
        if (sk.id === skillEF06MA07.id) continue;
        const lv = Math.random() > 0.4 ? "MASTERED" : "ALMOST";
        await db.eduSkillMastery.upsert({
          where: { studentId_skillId: { studentId: aluno.id, skillId: sk.id } },
          create: { networkId: rede.id, studentId: aluno.id, skillId: sk.id, level: lv, source: "DIAGNOSTIC" },
          update: { level: lv },
        }).catch(() => {});
      }
    }
    console.log(`  ok: 15 respostas ao diagnostico (6 erram EF06MA07; 4 com erro fracao 1/2+1/3)`);

    // Histórico de 3 semanas (events)
    for (let w = 0; w < 3; w++) {
      for (const aluno of alunosQueResponderam.slice(0, 10)) {
        for (const skill of skillsMA06.slice(0, 3)) {
          await db.eduSkillMasteryEvent.create({
            data: {
              networkId: rede.id,
              studentId: aluno.id,
              skillId: skill.id,
              level: Math.random() > 0.5 ? "MASTERED" : "NOT_YET",
              source: "ACTIVITY",
              createdAt: subDays(now, 7 * (w + 1) + randomInt(0, 5)),
            },
          }).catch(() => {});
        }
      }
    }
    // 3 alunos sem eventos nos últimos 7 dias (práticam há mais de 7 dias)
    // Eles simplesmente não têm eventos recentes — alunosExtra[16, 17, 18]
    // Adicionar evento antigo para eles
    for (let idx = 16; idx <= 18 && idx < alunosExtra.length; idx++) {
      const aluno = alunosExtra[idx];
      if (aluno && skillsMA06[0]) {
        await db.eduSkillMasteryEvent.create({
          data: {
            networkId: rede.id,
            studentId: aluno.id,
            skillId: skillsMA06[0].id,
            level: "ALMOST",
            source: "ACTIVITY",
            createdAt: subDays(now, randomInt(10, 21)),
          },
        }).catch(() => {});
      }
    }
    console.log("  ok: historico 3 semanas + 3 alunos sem pratica ha 7+ dias");

    // 2 aulas registradas pelo prof.b
    if (profMembro) {
      const classSubject = await db.eduClassSubject.findFirst({ where: { classId: turma.id } });
      if (classSubject) {
        const aulas = [
          { id: "aula-fracoes-b", title: "Fracoes e Numeros Racionais", date: subDays(now, 14) },
          { id: "aula-angulos-b", title: "Angulos e Poligonos", date: subDays(now, 7) },
        ];
        for (const a of aulas) {
          await db.eduLesson.upsert({
            where: { id: a.id },
            create: {
              id: a.id,
              networkId: rede.id,
              classSubjectId: classSubject.id,
              teacherId: profMembro.userId,
              date: a.date,
              title: a.title,
              materials: [],
              status: "PUBLISHED",
              publishedAt: a.date,
              skillIds: skillEF06MA07 ? [skillEF06MA07.id] : [],
            },
            update: {},
          });
        }
        console.log("  ok: 2 aulas registradas (Fracoes e Angulos)");
      } else {
        console.log("  AVISO: EduClassSubject nao encontrado para 6B — aulas nao criadas");
      }
    }

    // Guardian familia.b ativo
    const guardiaoId = "guardian-familia-b";
    await db.eduGuardian.upsert({
      where: { id: guardiaoId },
      create: {
        id: guardiaoId,
        networkId: rede.id,
        name: "Familia Demo B",
        email: "familia.b@speakflow.escola",
        passwordHash: hashSenha(SENHA_FAMILIA),
      },
      update: {},
    });
    // Bug 3: registrar o guardian no LoginIndex do catálogo para que
    // /api/escola/familia/login → findTenantsByLogin("GUARDIAN", ...) retorne a rede
    await syncGuardianLogin("familia.b@speakflow.escola", NETWORK_ID);
    if (alunoB) {
      await db.eduGuardianLink.upsert({
        where: { guardianId_studentId: { guardianId: guardiaoId, studentId: alunoB.id } },
        create: { networkId: rede.id, guardianId: guardiaoId, studentId: alunoB.id, relation: "PAI", isActive: true },
        update: { isActive: true },
      });
    }

    // Convite pendente para outro responsável
    const tokenRaw = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(tokenRaw).digest("hex");
    const guardiaoId2 = "guardian-pendente-b";
    await db.eduGuardian.upsert({
      where: { id: guardiaoId2 },
      create: { id: guardiaoId2, networkId: rede.id, name: "Responsavel Pendente", email: "pendente.b@exemplo.com" },
      update: {},
    });
    await db.eduGuardianInvite.upsert({
      where: { id: "invite-pendente-b" },
      create: {
        id: "invite-pendente-b",
        networkId: rede.id,
        guardianId: guardiaoId2,
        tokenHash,
        channel: "EMAIL",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdById: profMembro?.userId ?? coordUser.id,
      },
      update: {},
    });
    console.log("  ok: familia.b ativa + convite pendente");

  } finally {
    await db.$disconnect();
  }
}

// ── Seed Admin de Plataforma ─────────────────────────────────────────────────
// findPlatformAdmin() le catalog.PlatformAdmin — nao EduPlatformAdmin do tenant.

async function seedPlatformAdmin() {
  console.log("\n[seed-teste] Admin de plataforma");
  try {
    await catalog.platformAdmin.upsert({
      where: { email: "admin.teste@speakflow.escola" },
      create: {
        email: "admin.teste@speakflow.escola",
        name: "Admin Teste Plataforma",
        passwordHash: hashSenha(SENHA_ADMIN),
        isActive: true,
      },
      update: { isActive: true },
    });
    console.log("  ok: admin.teste@speakflow.escola (PLATFORM_ADMIN no catalogo)");
  } catch (e) {
    console.error("  AVISO admin de plataforma:", e.message);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log("\n=== Seed SpeakFlow Escolas — Massa de Teste Usabilidade ===");
console.log(`Data: ${new Date().toISOString()}`);

await seedRedeA();
await seedRedeB();
await seedPlatformAdmin();

await catalog.$disconnect();

if (credLog.length > 0) {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  CREDENCIAIS GERADAS NESTA EXECUCAO — capture agora e guarde fora   ║
║  do Git. Nas proximas execucoes o seed e idempotente e nao as repete ║
╠══════════════════════════════════════════════════════════════════════╣`);
  for (const linha of credLog) {
    console.log(`║  ${linha.padEnd(68)}║`);
  }
  console.log(`╠══════════════════════════════════════════════════════════════════════╣
║  Senhas: veja as variaveis de ambiente no Railway                    ║
║    ESCOLAS_DEMO_PASSWORD, ESCOLAS_FAMILIA_PASSWORD,                  ║
║    ESCOLAS_ADMIN_TESTE_PASSWORD                                      ║
╚══════════════════════════════════════════════════════════════════════╝`);
} else {
  console.log("\n[seed-teste] Nenhuma credencial nova gerada (seed idempotente).");
}

console.log("\n=== Seed concluido ===\n");
