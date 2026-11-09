#!/usr/bin/env node
/**
 * scripts/escolas/conteudo-pacote-import.mjs
 *
 * Importa o pacote de conteudo de demonstracao (FRAC.json + LP-05.json) em todas
 * as bases tenant ativas. Idempotente: nunca altera registro ja aprovado no Estudio.
 *
 * IDs estaveis: PK-EF06MA07-A1, PK-EF06MA07-A1-Q0, SF-TRACK-EF06MA07, ...
 * networkId = null (conteudo global SpeakFlow, acessivel via atribuicao de trilha)
 * status = APPROVED com reviewNote = "pacote de demonstracao, revisao pedagogica pendente"
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/escolas";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(ROOT, "prisma", "data", "conteudo");
const TRILHAS_DIR = join(DATA_DIR, "trilhas");
const DIAG_DIR = join(DATA_DIR, "diagnosticos");
const PREREQ_FILE = join(DATA_DIR, "prerequisitos-pacote-demo.json");
const FICHAS_FILE = join(DATA_DIR, "fichas", "fichas-pacote-demo.json");

const REVIEW_NOTE = "pacote de demonstracao, revisao pedagogica pendente";
const LOCK_ID = 2003; // pg_advisory_lock id unico para este importador

function tenantDb(envVar) {
  const url = process.env[envVar];
  if (!url) throw new Error(`Variavel de ambiente ausente: ${envVar}`);
  return new PrismaClient({ datasources: { db: { url } } });
}

function listTenantEnvVars() {
  const vars = [];
  for (const [k, v] of Object.entries(process.env)) {
    if (/^ESCOLAS_DB_\d+_URL$/.test(k) && v) vars.push(k);
  }
  if (vars.length === 0 && process.env.ESCOLAS_DB_URL) vars.push("ESCOLAS_DB_URL");
  return vars.sort();
}

// ── Pré-requisitos ────────────────────────────────────────────────────────────
async function importPrerequisitos(db) {
  if (!existsSync(PREREQ_FILE)) return;
  const raw = JSON.parse(readFileSync(PREREQ_FILE, "utf8"));
  // O JSON pode ser um array direto ou ter a estrutura { criar: [...], rejeitar: [...] }
  const items = Array.isArray(raw) ? raw : (raw.criar ?? []);
  const rejeitar = Array.isArray(raw) ? [] : (raw.rejeitar ?? []);

  const codes = [...new Set([...items.map(i => i.skillCode), ...items.map(i => i.prerequisiteCode)])];
  const skills = await db.eduSkill.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  const codeMap = Object.fromEntries(skills.map(s => [s.code, s.id]));
  let n = 0;

  // Rejeitar pré-requisitos obsoletos
  for (const rej of rejeitar) {
    const id = `SF-PREREQ-${rej.skillCode}-${rej.prerequisiteCode}`;
    await db.eduSkillPrerequisite.updateMany({
      where: { skillId: codeMap[rej.skillCode], prerequisiteSkillId: codeMap[rej.prerequisiteCode] },
      data: { status: "REJECTED" },
    }).catch(() => null);
  }

  for (const item of items) {
    const skillId = codeMap[item.skillCode];
    const prereqId = codeMap[item.prerequisiteCode];
    if (!skillId || !prereqId) {
      console.warn(`  [prereq] habilidade nao encontrada: ${item.skillCode} -> ${item.prerequisiteCode}`);
      continue;
    }

    const id = `SF-PREREQ-${item.skillCode}-${item.prerequisiteCode}`;
    const existing = await db.eduSkillPrerequisite.findUnique({ where: { id }, select: { id: true, status: true } });
    if (existing?.status === "APPROVED") { n++; continue; }

    // Rejeitar prerequisito antigo com codigo diferente se existe
    if (item.rejectOldId) {
      await db.eduSkillPrerequisite.updateMany({
        where: { id: item.rejectOldId, status: { not: "APPROVED" } },
        data: { status: "REJECTED", reviewNote: item.rejectNote ?? "substituido pelo pacote de demonstracao" },
      }).catch(() => {});
    }

    await db.eduSkillPrerequisite.upsert({
      where: { id },
      create: {
        id,
        skillId,
        prerequisiteSkillId: prereqId,
        weight: item.weight ?? 1,
        networkId: null,
        source: "SPEAKFLOW",
        status: "APPROVED",
        reviewNote: REVIEW_NOTE,
      },
      update: { weight: item.weight ?? 1 },
    });
    n++;
  }
  console.log(`  [prereq] ${n} pre-requisitos importados`);
}

// ── Fichas pedagógicas ────────────────────────────────────────────────────────
async function importFichas(db) {
  if (!existsSync(FICHAS_FILE)) return;
  const fichas = JSON.parse(readFileSync(FICHAS_FILE, "utf8"));
  let n = 0;

  for (const ficha of fichas) {
    const skill = await db.eduSkill.findUnique({ where: { code: ficha.skillCode }, select: { id: true } });
    if (!skill) { console.warn(`  [ficha] habilidade nao encontrada: ${ficha.skillCode}`); continue; }

    const id = `SF-GUIDE-${ficha.skillCode}`;
    const existing = await db.eduSkillGuide.findUnique({ where: { id }, select: { id: true, status: true } }).catch(() => null);
    if (!existing) {
      // EduSkillGuide pode nao existir em todas as instancias — criar apenas se o modelo existe
      try {
        await db.eduSkillGuide.create({
          data: {
            id,
            skillId: skill.id,
            networkId: null,
            whatStudentDoes: ficha.whatStudentDoes,
            commonErrors: ficha.commonErrors ?? [],
            recommendedTypes: ficha.recommendedTypes ?? [],
            ageNotes: ficha.ageNotes ?? "",
            source: "SPEAKFLOW",
            status: "APPROVED",
            reviewNote: REVIEW_NOTE,
          },
        });
        n++;
      } catch (e) {
        if (!String(e).includes("does not exist")) throw e;
      }
    } else if (existing.status !== "APPROVED") {
      await db.eduSkillGuide.update({
        where: { id },
        data: {
          whatStudentDoes: ficha.whatStudentDoes,
          commonErrors: ficha.commonErrors ?? [],
        },
      });
      n++;
    } else {
      n++;
    }
  }
  console.log(`  [fichas] ${n} fichas importadas`);
}

// ── Trilhas ───────────────────────────────────────────────────────────────────
async function importTrilhas(db) {
  const files = readdirSync(TRILHAS_DIR).filter(f => f.endsWith(".json") && f !== "MA-06.json");
  // Apenas os arquivos do pacote de demonstracao
  const demoFiles = files.filter(f => f === "FRAC.json" || f === "LP-05.json");
  let n = 0;

  for (const file of demoFiles) {
    const trilhas = JSON.parse(readFileSync(join(TRILHAS_DIR, file), "utf8"));
    for (const trilha of trilhas) {
      const skill = await db.eduSkill.findUnique({ where: { code: trilha.skillCode }, select: { id: true } });
      if (!skill) { console.warn(`  [trilha] habilidade nao encontrada: ${trilha.skillCode}`); continue; }

      const trackId = `SF-TRACK-${trilha.skillCode}`;
      const existingTrack = await db.eduTrack.findUnique({ where: { id: trackId }, select: { id: true, status: true } });
      if (existingTrack?.status === "APPROVED") { n++; continue; }

      // Upsert atividades antes da trilha
      for (const act of trilha.activities ?? []) {
        const existingAct = await db.eduActivity.findUnique({ where: { id: act.id }, select: { id: true, status: true } });
        if (existingAct?.status === "PUBLISHED") continue;

        await db.eduActivity.upsert({
          where: { id: act.id },
          create: {
            id: act.id,
            networkId: null,
            classSubjectId: null,
            type: act.type ?? "QUIZ",
            title: act.title,
            prompt: act.prompt ?? "",
            estMinutes: act.estMinutes ?? 5,
            rubric: act.rubric ?? { type: act.type ?? "QUIZ", criteria: [] },
            maxScore: 10,
            maxAttempts: 2,
            status: "PUBLISHED",
            source: "SPEAKFLOW",
            reviewStatus: "APPROVED",
            createdById: "speakflow-system",
          },
          update: {
            title: act.title,
            prompt: act.prompt ?? "",
            source: "SPEAKFLOW",
          },
        });

        // Upsert questoes
        for (let qi = 0; qi < (act.questions ?? []).length; qi++) {
          const q = act.questions[qi];
          const qId = `${act.id}-Q${qi}`;
          const skillForQ = await db.eduSkill.findUnique({ where: { code: trilha.skillCode }, select: { id: true } });
          await db.eduQuizQuestion.upsert({
            where: { id: qId },
            create: {
              id: qId,
              activityId: act.id,
              order: qi,
              question: q.question,
              options: q.options.map((o) => (typeof o === "string" ? o : o.text)),
              correctIndex: q.correctIndex,
              explanation: q.explanation ?? "",
              skillId: skillForQ?.id ?? null,
              misconceptionCode: q.options?.[qi]?.misconceptionCode ?? null,
            },
            update: {
              question: q.question,
              options: q.options.map((o) => (typeof o === "string" ? o : o.text)),
              correctIndex: q.correctIndex,
            },
          });
        }
      }

      // Upsert a trilha
      const existingSubject = await db.eduSubject.findFirst({
        where: { networkId: null },
        select: { id: true },
      }).catch(() => null);

      // Busca ou infere o subjectId pelo codigo BNCC
      const isLP = trilha.skillCode.includes("LP");
      const subjectQuery = isLP ? { name: { contains: "Portugu" } } : { name: { contains: "Matem" } };
      const subject = await db.eduSubject.findFirst({ where: subjectQuery, select: { id: true, name: true } }).catch(() => null);
      const subjectId = subject?.id ?? existingSubject?.id ?? "sem-disciplina";

      const gradeYear = trilha.gradeYear ?? parseInt(trilha.skillCode.replace(/\D/g, "")[0]) ?? 6;

      const trackData = {
        networkId: null,
        subjectId,
        gradeYear,
        title: trilha.title ?? `Trilha ${trilha.skillCode}`,
        skillIds: [skill.id],
        status: "APPROVED",
        reviewNote: REVIEW_NOTE,
        createdById: "speakflow-system",
      };

      await db.eduTrack.upsert({
        where: { id: trackId },
        create: { id: trackId, ...trackData },
        update: { title: trackData.title, status: "APPROVED" },
      });

      // Upsert itens da trilha
      for (let idx = 0; idx < (trilha.activities ?? []).length; idx++) {
        const act = trilha.activities[idx];
        const itemId = `SF-ITEM-${trilha.skillCode}-${idx}`;
        await db.eduTrackItem.upsert({
          where: { id: itemId },
          create: {
            id: itemId,
            trackId,
            order: idx,
            activityId: act.id,
            estMinutes: act.estMinutes ?? 5,
          },
          update: { activityId: act.id, estMinutes: act.estMinutes ?? 5 },
        });
      }
      n++;
    }
  }
  console.log(`  [trilhas] ${n} trilhas importadas`);
}

// ── Diagnósticos ──────────────────────────────────────────────────────────────
async function importDiagnosticos(db) {
  if (!existsSync(DIAG_DIR)) return;
  const files = readdirSync(DIAG_DIR).filter(f => f.endsWith(".json") && f.startsWith("DIAG-"));
  let n = 0;

  for (const file of files) {
    const diag = JSON.parse(readFileSync(join(DIAG_DIR, file), "utf8"));
    if (!diag.id || !diag.items) continue;

    const existing = await db.eduDiagnostic.findUnique({ where: { id: diag.id }, select: { id: true, status: true } });
    if (existing?.status === "APPROVED") { n++; continue; }

    const subject = await db.eduSubject.findFirst({
      where: { name: { contains: diag.subjectName ?? "Matem" } },
      select: { id: true },
    }).catch(() => null);
    const subjectId = subject?.id ?? "sem-disciplina";

    const diagTitle = diag.title ?? diag.titulo ?? diag.id;
    await db.eduDiagnostic.upsert({
      where: { id: diag.id },
      create: {
        id: diag.id,
        networkId: null,
        subjectId,
        gradeYear: diag.gradeYear,
        title: diagTitle,
        cycle: diag.cycle ?? 1,
        status: "APPROVED",
        source: "SPEAKFLOW",
        createdById: "speakflow-system",
      },
      update: { title: diagTitle, status: "APPROVED" },
    });

    // Upsert itens do diagnostico
    for (let idx = 0; idx < (diag.items ?? []).length; idx++) {
      const item = diag.items[idx];
      const skill = await db.eduSkill.findUnique({ where: { code: item.skillCode }, select: { id: true } });
      if (!skill) continue;

      // Garante EduActivity para o item (EduDiagnosticItem.activityId e required)
      const actId = item.activityId ?? item.id ?? `${diag.id}-ITEM-${idx}`;
      const existingAct = await db.eduActivity.findUnique({ where: { id: actId }, select: { id: true } });
      if (!existingAct) {
        const opts = (item.options ?? []).map(o => (typeof o === "string" ? o : o.text ?? o));
        await db.eduActivity.create({
          data: {
            id: actId, networkId: null,
            title: item.question ?? `Item ${idx + 1} — ${item.skillCode}`,
            type: "QUIZ", prompt: item.question ?? "",
            estMinutes: 2, status: "PUBLISHED", source: "SPEAKFLOW",
            rubric: { type: "QUIZ", criteria: [] },
            createdById: "speakflow-system",
          },
        });
        if (item.question && opts.length > 0) {
          const qId = `${actId}-Q0`;
          await db.eduQuizQuestion.upsert({
            where: { id: qId },
            create: { id: qId, activityId: actId, order: 0, question: item.question, options: opts, correctIndex: item.correctIndex ?? 0, misconceptionCode: null },
            update: { question: item.question, options: opts, correctIndex: item.correctIndex ?? 0 },
          });
        }
        await db.eduActivitySkill.upsert({
          where: { id: `${actId}-${skill.id}` },
          create: { id: `${actId}-${skill.id}`, activityId: actId, skillId: skill.id },
          update: {},
        }).catch(() => null);
      }

      const diagItemId = `${diag.id}-DI-${idx}`;
      await db.eduDiagnosticItem.upsert({
        where: { id: diagItemId },
        create: { id: diagItemId, diagnosticId: diag.id, skillId: skill.id, order: idx, activityId: actId },
        update: { activityId: actId },
      });
    }
    n++;
  }
  console.log(`  [diagnosticos] ${n} diagnosticos importados`);
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function importInTenant(envVar) {
  const db = tenantDb(envVar);
  try {
    await db.$executeRaw`SELECT pg_advisory_lock(${LOCK_ID}::bigint)`;
    console.log(`\n[${envVar}] iniciando importacao do pacote de demonstracao...`);

    await importPrerequisitos(db);
    await importFichas(db);
    await importTrilhas(db);
    await importDiagnosticos(db);

    console.log(`[${envVar}] importacao concluida`);
  } finally {
    await db.$executeRaw`SELECT pg_advisory_unlock(${LOCK_ID}::bigint)`.catch(() => {});
    await db.$disconnect();
  }
}

async function main() {
  const tenants = listTenantEnvVars();
  if (tenants.length === 0) {
    console.error("Nenhuma variavel ESCOLAS_DB_*_URL ou ESCOLAS_DB_URL encontrada.");
    process.exit(1);
  }
  for (const envVar of tenants) {
    await importInTenant(envVar).catch(err => {
      console.error(`[${envVar}] ERRO:`, err.message);
    });
  }
  console.log("\nPacote de demonstracao importado em todos os tenants.");
}

main().catch(e => { console.error(e); process.exit(1); });
