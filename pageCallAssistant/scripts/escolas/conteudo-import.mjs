#!/usr/bin/env node
/**
 * scripts/escolas/conteudo-import.mjs
 *
 * Importa dados de referência SpeakFlow (pré-requisitos, fichas pedagógicas,
 * trilhas e diagnósticos) em todas as bases tenant ativas.
 * Idempotente e com pg_advisory_lock para evitar importações simultâneas.
 *
 * Controle de idempotência: id estável por item (ex.: SF-PREREQ-EF06MA07-EF05MA07).
 * Nada passa a APPROVED sem aprovação humana no Estúdio.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/escolas";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(ROOT, "prisma", "data", "conteudo");
const LOCK_ID = 2002; // pg_advisory_lock id único

function tenantDb(envVar) {
  const url = process.env[envVar];
  if (!url) throw new Error(`Variável de ambiente ausente: ${envVar}`);
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

// ── Importar pré-requisitos ───────────────────────────────────────────────────
async function importPrerequisitos(db) {
  const file = join(DATA_DIR, "prerequisitos.json");
  if (!existsSync(file)) return;
  const items = JSON.parse(readFileSync(file, "utf8"));

  // Pré-carrega o mapa code → id das habilidades
  const codes = [...new Set([...items.map(i => i.skillCode), ...items.map(i => i.prerequisiteCode)])];
  const skills = await db.eduSkill.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  const codeMap = Object.fromEntries(skills.map(s => [s.code, s.id]));

  let n = 0;
  for (const item of items) {
    const skillId = codeMap[item.skillCode];
    const prereqId = codeMap[item.prerequisiteCode];
    if (!skillId) throw new Error(`Código de habilidade não encontrado no banco: ${item.skillCode}. Verifique o bncc-import.`);
    if (!prereqId) throw new Error(`Código de pré-requisito não encontrado no banco: ${item.prerequisiteCode}. Verifique o prerequisitos.json.`);

    // Upsert com id estável — nunca altera status de item aprovado
    const id = `SF-PREREQ-${item.skillCode}-${item.prerequisiteCode}`;
    const existing = await db.eduSkillPrerequisite.findUnique({ where: { id }, select: { id: true, status: true } });
    if (existing?.status === "APPROVED") { n++; continue; } // pedagogo aprovou — não tocar
    await db.eduSkillPrerequisite.upsert({
      where: { id },
      create: {
        id,
        skillId,
        prerequisiteSkillId: prereqId,
        weight: item.weight ?? 1,
        networkId: null,
        source: item.source ?? "SPEAKFLOW",
        status: "DRAFT",
      },
      update: { weight: item.weight ?? 1 }, // nunca mexe em status
    });
    n++;
  }
  console.log(`  [prereq] ${n} pré-requisitos importados.`);
}

// ── Importar fichas pedagógicas ───────────────────────────────────────────────
async function importFichas(db) {
  const fichasDir = join(DATA_DIR, "fichas");
  if (!existsSync(fichasDir)) return;

  const files = readdirSync(fichasDir).filter(f => f.endsWith(".json"));
  let n = 0;

  for (const file of files) {
    const fichas = JSON.parse(readFileSync(join(fichasDir, file), "utf8"));
    for (const ficha of fichas) {
      const skill = await db.eduSkill.findUnique({ where: { code: ficha.skillCode }, select: { id: true } });
      if (!skill) continue;

      const id = `SF-FICHA-${ficha.skillCode}`;
      // Nunca alterar item aprovado pelo pedagogo
      const existing = await db.eduSkillGuide.findUnique({ where: { id }, select: { id: true, status: true } });
      if (existing?.status === "APPROVED") { n++; continue; }
      await db.eduSkillGuide.upsert({
        where: { id },
        create: {
          id,
          skillId: skill.id,
          whatStudentDoes: ficha.whatStudentDoes,
          commonErrors: ficha.commonErrors ?? [],
          recommendedTypes: ficha.recommendedTypes ?? [],
          ageNotes: ficha.ageNotes ?? null,
          networkId: null,
          source: ficha.source ?? "SPEAKFLOW",
          status: "DRAFT",
        },
        update: {
          whatStudentDoes: ficha.whatStudentDoes,
          commonErrors: ficha.commonErrors ?? [],
          recommendedTypes: ficha.recommendedTypes ?? [],
          ageNotes: ficha.ageNotes ?? null,
          // nunca mexe em status
        },
      });
      n++;
    }
  }
  console.log(`  [fichas] ${n} fichas importadas.`);
}

// ── Importar trilhas (EduTrack + EduActivity + EduTrackItem) ─────────────────
async function importTrilhas(db) {
  const trilhasDir = join(DATA_DIR, "trilhas");
  if (!existsSync(trilhasDir)) return;
  const files = readdirSync(trilhasDir).filter(f => f.endsWith(".json"));
  let n = 0;
  for (const file of files) {
    const trilhas = JSON.parse(readFileSync(join(trilhasDir, file), "utf8"));
    for (const trilha of trilhas) {
      const skill = await db.eduSkill.findUnique({ where: { code: trilha.skillCode }, select: { id: true } });
      if (!skill) throw new Error(`Habilidade não encontrada: ${trilha.skillCode}`);

      const trackId = `SF-TRACK-${trilha.skillCode}`;
      const existingTrack = await db.eduTrack.findUnique({ where: { id: trackId }, select: { id: true, status: true } });
      if (existingTrack?.status === "APPROVED") { n++; continue; }

      // Upsert atividades antes da trilha
      for (const act of trilha.activities ?? []) {
        const existingAct = await db.eduActivity.findUnique({ where: { id: act.id }, select: { id: true, status: true } });
        if (existingAct?.status === "APPROVED") continue;

        const qs = act.questions ?? [];
        if (qs.length > 0 && qs.every(q => q.correctIndex === undefined))
          throw new Error(`Atividade ${act.id}: quiz sem gabarito`);

        await db.eduActivity.upsert({
          where: { id: act.id },
          create: {
            id: act.id, networkId: null, title: act.title, type: act.type,
            prompt: act.prompt, estMinutes: act.estMinutes ?? 5,
            status: "DRAFT", source: "SPEAKFLOW",
          },
          update: { title: act.title, prompt: act.prompt },
        });

        // Upsert questions
        for (let qi = 0; qi < qs.length; qi++) {
          const q = qs[qi];
          const qId = `${act.id}-Q${qi}`;
          await db.eduQuizQuestion.upsert({
            where: { id: qId },
            create: {
              id: qId, activityId: act.id, order: qi,
              question: q.question, options: q.options, correctIndex: q.correctIndex,
              misconceptionCode: q.options?.[qi]?.misconceptionCode ?? null,
            },
            update: { question: q.question, options: q.options, correctIndex: q.correctIndex },
          });
        }

        // Habilidade × atividade
        await db.eduActivitySkill.upsert({
          where: { id: `${act.id}-${skill.id}` },
          create: { id: `${act.id}-${skill.id}`, activityId: act.id, skillId: skill.id },
          update: {},
        }).catch(() => null);
      }

      // Upsert trilha
      await db.eduTrack.upsert({
        where: { id: trackId },
        create: { id: trackId, networkId: null, skillId: skill.id, title: trilha.title, source: "SPEAKFLOW", status: "DRAFT", derivedFromId: null },
        update: { title: trilha.title },
      });

      // Upsert itens da trilha
      for (let i = 0; i < (trilha.activities ?? []).length; i++) {
        const act = trilha.activities[i];
        const itemId = `${trackId}-I${i}`;
        await db.eduTrackItem.upsert({
          where: { id: itemId },
          create: { id: itemId, trackId, activityId: act.id, order: i },
          update: { order: i },
        });
      }
      n++;
    }
  }
  console.log(`  [trilhas] ${n} trilhas importadas.`);
}

// ── Importar diagnósticos ──────────────────────────────────────────────────
async function importDiagnosticos(db) {
  const diagDir = join(DATA_DIR, "diagnosticos");
  if (!existsSync(diagDir)) return;
  const files = readdirSync(diagDir).filter(f => f.endsWith(".json"));
  let n = 0;
  for (const file of files) {
    const diags = JSON.parse(readFileSync(join(diagDir, file), "utf8"));
    for (const diag of diags) {
      const existingDiag = await db.eduDiagnostic.findUnique({ where: { id: diag.id }, select: { id: true, status: true } });
      if (existingDiag?.status === "APPROVED") { n++; continue; }

      await db.eduDiagnostic.upsert({
        where: { id: diag.id },
        create: {
          id: diag.id, networkId: null, title: diag.title,
          subjectCode: diag.subjectCode, gradeYear: diag.gradeYear,
          source: diag.source ?? "SPEAKFLOW", status: "DRAFT",
        },
        update: { title: diag.title },
      });

      for (let i = 0; i < (diag.items ?? []).length; i++) {
        const item = diag.items[i];
        const skill = await db.eduSkill.findUnique({ where: { code: item.skillCode }, select: { id: true } });
        if (!skill) throw new Error(`Habilidade não encontrada: ${item.skillCode} (diagnóstico ${diag.id})`);

        const act = item.activity;
        if (act) {
          const existingAct = await db.eduActivity.findUnique({ where: { id: act.id }, select: { id: true, status: true } });
          if (!existingAct || existingAct.status !== "APPROVED") {
            await db.eduActivity.upsert({
              where: { id: act.id },
              create: { id: act.id, networkId: null, title: act.title, type: act.type, prompt: act.prompt, estMinutes: act.estMinutes ?? 5, status: "DRAFT", source: "SPEAKFLOW" },
              update: { title: act.title, prompt: act.prompt },
            });
            for (let qi = 0; qi < (act.questions ?? []).length; qi++) {
              const q = act.questions[qi];
              const qId = `${act.id}-Q${qi}`;
              await db.eduQuizQuestion.upsert({
                where: { id: qId },
                create: { id: qId, activityId: act.id, order: qi, question: q.question, options: q.options, correctIndex: q.correctIndex, misconceptionCode: null },
                update: { question: q.question, options: q.options, correctIndex: q.correctIndex },
              });
            }
            await db.eduActivitySkill.upsert({
              where: { id: `${act.id}-${skill.id}` },
              create: { id: `${act.id}-${skill.id}`, activityId: act.id, skillId: skill.id },
              update: {},
            }).catch(() => null);
          }
        }

        const diagItemId = `${diag.id}-ITEM-${i}`;
        await db.eduDiagnosticItem.upsert({
          where: { id: diagItemId },
          create: { id: diagItemId, diagnosticId: diag.id, activityId: item.activityId, skillId: skill.id, order: i },
          update: { order: i },
        });
      }
      n++;
    }
  }
  console.log(`  [diagnosticos] ${n} diagnósticos importados.`);
}

// ── Processar uma base ────────────────────────────────────────────────────────
async function processBase(envVar) {
  const db = tenantDb(envVar);
  try {
    await db.$executeRaw`SELECT pg_advisory_lock(${LOCK_ID})`;
    console.log(`  [conteudo] Processando ${envVar}...`);
    await importPrerequisitos(db);
    await importFichas(db);
    await importTrilhas(db);
    await importDiagnosticos(db);
    await db.$executeRaw`SELECT pg_advisory_unlock(${LOCK_ID})`;
  } catch (err) {
    console.error(`  [conteudo] Erro em ${envVar}:`, err.message);
    try { await db.$executeRaw`SELECT pg_advisory_unlock(${LOCK_ID})`; } catch {}
    throw err;
  } finally {
    await db.$disconnect();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const vars = listTenantEnvVars();
  if (vars.length === 0) {
    console.log("[conteudo] Nenhuma base tenant configurada. Pulando.");
    return;
  }
  console.log(`[conteudo] ${vars.length} base(s) encontrada(s).`);
  for (const v of vars) {
    await processBase(v);
  }
  console.log("[conteudo] Concluido.");
}

main().catch(err => { console.error(err); process.exit(1); });
