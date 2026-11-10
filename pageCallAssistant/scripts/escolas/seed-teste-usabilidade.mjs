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

    // P0.2: EduClassSubject — vincula 5ºA a Matemática com prof.demo como titular
    const profDemoMembro = await db.eduMembership.findFirst({ where: { networkId: rede.id, role: "TEACHER" } });
    const matSubjectA = await db.eduSubject.findFirst({ where: { networkId: rede.id, name: { contains: "atem" } } });
    if (matSubjectA) {
      await db.eduClassSubject.upsert({
        where: { classId_subjectId: { classId: turma.id, subjectId: matSubjectA.id } },
        create: { networkId: rede.id, classId: turma.id, subjectId: matSubjectA.id, teacherId: profDemoMembro?.userId ?? null },
        update: { teacherId: profDemoMembro?.userId ?? null },
      });
      console.log("  ok: EduClassSubject 5A + Matematica criado");
    } else {
      console.log("  AVISO: EduSubject Matematica nao encontrado na Rede A");
    }

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

    // P0.2: EduClassSubject — vincula 6ºB a Matemática com prof.b como titular
    const matSubjectB = await db.eduSubject.findFirst({ where: { networkId: rede.id, name: { contains: "atem" } } });
    if (matSubjectB) {
      await db.eduClassSubject.upsert({
        where: { classId_subjectId: { classId: turma.id, subjectId: matSubjectB.id } },
        create: { networkId: rede.id, classId: turma.id, subjectId: matSubjectB.id, teacherId: profMembro?.userId ?? null },
        update: { teacherId: profMembro?.userId ?? null },
      });
      console.log("  ok: EduClassSubject 6B + Matematica criado");
    } else {
      console.log("  AVISO: EduSubject Matematica nao encontrado na Rede B");
    }

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

    // Diagnóstico de Frações do 6º ano: o do pacote (DIAG-FRAC-6A-INICIO, biblioteca SpeakFlow).
    // O diagnóstico próprio que este seed criava (sem acento e com a certa sempre na primeira
    // alternativa) fica ARCHIVED: era o que aparecia no celular do aluno.
    const diagAntigo = await db.eduDiagnostic.findUnique({ where: { id: "diag-fracoes-6a-rede-b" }, select: { id: true, status: true } });
    if (diagAntigo && diagAntigo.status !== "ARCHIVED") {
      await db.eduDiagnostic.update({ where: { id: diagAntigo.id }, data: { status: "ARCHIVED" } });
      console.log("  ok: diag-fracoes-6a-rede-b ARCHIVED (substituído por DIAG-FRAC-6A-INICIO)");
    }

    const codigosFrac6 = ["EF06MA07","EF06MA08","EF06MA09","EF06MA10"];
    const skillsFrac6 = await db.eduSkill.findMany({
      where: { code: { in: codigosFrac6 } },
      select: { id: true, code: true },
    });
    const skillMapFrac = Object.fromEntries(skillsFrac6.map(s => [s.code, s]));

    const diag = await db.eduDiagnostic.findUnique({
      where: { id: "DIAG-FRAC-6A-INICIO" },
      include: {
        items: {
          where: { role: "NORMAL", isDegrauLegacy: false },
          orderBy: { order: "asc" },
          include: {
            skill: { select: { id: true, code: true } },
            activity: { include: { questions: { orderBy: { order: "asc" }, take: 1 } } },
          },
        },
      },
    });
    if (!diag || diag.status !== "APPROVED" || diag.items.length === 0) {
      throw new Error("DIAG-FRAC-6A-INICIO não importado: rode o conteudo-pacote-import.mjs antes deste seed");
    }
    console.log(`  ok: diagnóstico de Frações do pacote (${diag.id}) com ${diag.items.length} itens`);

    // 15 respostas ao diagnostico: Aluno Demo B Santos NAO responde
    // 6 de 15 erram EF06MA07 → caem no degrau EF05MA04
    // 4 alunos marcam "2/5" em 1/2 + 1/3 → erro soma-num-e-den-separado
    const now = new Date();
    const alunosQueResponderam = alunosExtra.slice(0, 15);
    const erramEF06MA07 = new Set(alunosQueResponderam.slice(0, 6).map(a => a.id));
    const erroFracaoIds = new Set(alunosQueResponderam.slice(0, 4).map(a => a.id));

    // Habilidades prerequisito para o degrau
    const skillEF05MA04 = await db.eduSkill.findUnique({ where: { code: "EF05MA04" }, select: { id: true, code: true } }).catch(() => null);
    const skillEF04MA09 = await db.eduSkill.findUnique({ where: { code: "EF04MA09" }, select: { id: true, code: true } }).catch(() => null);

    for (const aluno of alunosQueResponderam) {
      const masteryEF06MA07 = erramEF06MA07.has(aluno.id) ? "NOT_YET" : "MASTERED";
      await db.eduSkillMastery.upsert({
        where: { studentId_skillId: { studentId: aluno.id, skillId: skillEF06MA07.id } },
        create: { networkId: rede.id, studentId: aluno.id, skillId: skillEF06MA07.id, level: masteryEF06MA07, source: "DIAGNOSTIC" },
        update: { level: masteryEF06MA07 },
      }).catch(() => {});

      // Masteries EF06MA08-10
      for (const cod of ["EF06MA08","EF06MA09","EF06MA10"]) {
        const sk = skillMapFrac[cod];
        if (!sk) continue;
        const lv = Math.random() > 0.35 ? "MASTERED" : "ALMOST";
        await db.eduSkillMastery.upsert({
          where: { studentId_skillId: { studentId: aluno.id, skillId: sk.id } },
          create: { networkId: rede.id, studentId: aluno.id, skillId: sk.id, level: lv, source: "DIAGNOSTIC" },
          update: { level: lv },
        }).catch(() => {});
      }

      // Alunos que erram EF06MA07 → prerequisito EF05MA04 marcado NOT_YET
      if (erramEF06MA07.has(aluno.id) && skillEF05MA04) {
        await db.eduSkillMastery.upsert({
          where: { studentId_skillId: { studentId: aluno.id, skillId: skillEF05MA04.id } },
          create: { networkId: rede.id, studentId: aluno.id, skillId: skillEF05MA04.id, level: "NOT_YET", source: "DIAGNOSTIC" },
          update: { level: "NOT_YET" },
        }).catch(() => {});
      }
    }
    console.log(`  ok: 15 respostas (6 erram EF06MA07 → degrau EF05MA04; 4 com erro soma-num-e-den-separado)`);

    // Respostas dos 15 colegas ao DIAG-FRAC-6A-INICIO, gravadas como sessões concluídas.
    // A alternativa é escolhida pelo texto, nunca pelo índice: a posição da certa varia.
    const textoOpcao = (o) => (typeof o === "string" ? o : o?.text ?? "");
    const escolher = (q, texto) => {
      const idx = (q.options ?? []).findIndex((o) => textoOpcao(o).trim() === texto);
      if (idx < 0) throw new Error(`alternativa "${texto}" não encontrada em "${q.question}"`);
      return idx;
    };
    const ordemSeed = diag.items.map((_, i) => i);
    for (const aluno of alunosQueResponderam) {
      const answers = diag.items.map((item, qIdx) => {
        const q = item.activity.questions[0];
        const certa = textoOpcao(q.options[q.correctIndex]);
        let texto = certa;
        if (erroFracaoIds.has(aluno.id) && /1\/2 \+ 1\/3/.test(q.question)) {
          texto = "2/5";
        } else if (erramEF06MA07.has(aluno.id) && item.skill.code === "EF06MA07") {
          // primeira alternativa errada com erro comum
          texto = textoOpcao(q.options.find((o, i) => i !== q.correctIndex && o?.misconceptionCode) ?? q.options.find((_, i) => i !== q.correctIndex));
        }
        const selectedIndex = escolher(q, texto);
        const opcao = q.options[selectedIndex];
        return {
          qIdx, activityId: item.activityId, skillCode: item.skill.code, skillId: item.skill.id,
          selectedIndex, isCorrect: selectedIndex === q.correctIndex,
          misconceptionCode: selectedIndex === q.correctIndex ? null : (opcao?.misconceptionCode ?? null),
          elapsedMs: 20_000, answeredAt: subDays(now, 14).toISOString(),
        };
      });
      const sessId = `seed-sess-frac6-${aluno.id}`;
      const sessData = {
        networkId: rede.id, studentId: aluno.id, activityId: diag.items[0].activityId, diagnosticId: diag.id,
        currentQuestion: answers.length, shuffleOrder: ordemSeed, extraItems: [], answers,
        minMsPerQuestion: 5000, expiresAt: subDays(now, 13), completedAt: subDays(now, 14),
      };
      await db.eduAttemptSession.upsert({ where: { id: sessId }, create: { id: sessId, ...sessData }, update: sessData });
    }

    // Trilha do degrau EF05MA04: atribuida aos 6 alunos que erraram EF06MA07
    const trilhaDegrau = await db.eduTrack.findUnique({ where: { id: "SF-TRACK-EF05MA04" }, select: { id: true } }).catch(() => null);
    if (trilhaDegrau && skillEF05MA04) {
      for (const aluno of alunosQueResponderam.filter(a => erramEF06MA07.has(a.id))) {
        await db.eduTrackAssignment.upsert({
          where: { id: `assign-degrau-${aluno.id}` },
          create: {
            id: `assign-degrau-${aluno.id}`,
            networkId: rede.id,
            trackId: trilhaDegrau.id,
            studentId: aluno.id,
            classId: turma.id,
            assignedBy: coordUser.id,
            assignedAt: subDays(now, 14),
            reason: "AUTO",
          },
          update: {},
        }).catch(() => {});
      }
      // 2 dos 6 alunos completaram e chegaram em MASTERED
      const alunosMastered = alunosQueResponderam.slice(0, 2).filter(a => erramEF06MA07.has(a.id));
      for (const aluno of alunosMastered) {
        await db.eduSkillMastery.upsert({
          where: { studentId_skillId: { studentId: aluno.id, skillId: skillEF05MA04.id } },
          create: { networkId: rede.id, studentId: aluno.id, skillId: skillEF05MA04.id, level: "MASTERED", source: "TRACK" },
          update: { level: "MASTERED" },
        }).catch(() => {});
      }
      console.log(`  ok: trilha degrau EF05MA04 atribuida a 6 alunos; 2 chegaram em MASTERED`);
    }

    // Historico de 3 semanas de pratica
    for (let w = 0; w < 3; w++) {
      for (const aluno of alunosQueResponderam.slice(0, 10)) {
        for (const cod of ["EF06MA07","EF06MA08"]) {
          const sk = skillMapFrac[cod];
          if (!sk) continue;
          await db.eduSkillMasteryEvent.create({
            data: {
              networkId: rede.id,
              studentId: aluno.id,
              skillId: sk.id,
              level: Math.random() > 0.5 ? "MASTERED" : "NOT_YET",
              source: "ACTIVITY",
              createdAt: subDays(now, 7 * (w + 1) + randomInt(0, 5)),
            },
          }).catch(() => {});
        }
      }
    }
    // 3 alunos sem eventos recentes (alunosExtra[16, 17, 18])
    for (let idx = 16; idx <= 18 && idx < alunosExtra.length; idx++) {
      const aluno = alunosExtra[idx];
      const sk = skillMapFrac["EF06MA07"];
      if (aluno && sk) {
        await db.eduSkillMasteryEvent.create({
          data: {
            networkId: rede.id,
            studentId: aluno.id,
            skillId: sk.id,
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
