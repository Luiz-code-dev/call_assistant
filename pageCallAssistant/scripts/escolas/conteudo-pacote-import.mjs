#!/usr/bin/env node
/**
 * scripts/escolas/conteudo-pacote-import.mjs
 *
 * Importa os pacotes de conteúdo SpeakFlow (Frações, Leitura e todas as matérias
 * do 5º e 6º ano) em todas as bases tenant ativas.
 *
 * Regras:
 * - networkId = null, source = SPEAKFLOW, status APPROVED, reviewNote do pacote.
 * - Idempotente. Um registro já existente só é atualizado quando:
 *     (a) ainda é do pacote (reviewNote do pacote) e o arquivo tem version maior; ou
 *     (b) não está APPROVED.
 *   Assim, nada que alguém editou e aprovou no Estúdio é sobrescrito.
 * - As alternativas são gravadas como objetos { text, misconceptionCode } em
 *   EduQuizQuestion.options. As rotas que mandam questões ao navegador devem
 *   devolver só { text } (ver o prompt da rodada de conteúdo).
 * - Erros não são engolidos: cada falha é logada com o arquivo e o código.
 *   O start.sh continua com "|| echo AVISO" para nunca derrubar o servidor.
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
const FICHAS_DIR = join(DATA_DIR, "fichas");

const REVIEW_NOTE = "pacote de demonstração, revisão pedagógica pendente";
const PACOTE_NOTES = new Set([REVIEW_NOTE, "pacote de demonstracao, revisao pedagogica pendente", "pacote de demonstração"]);
const LOCK_ID = 2003;
const SYSTEM = "speakflow-system";

// Arquivos antigos que não fazem parte dos pacotes (fichas com descrição trocada)
const FICHAS_IGNORAR = new Set(["MA-06.json"]);
const TRILHAS_IGNORAR = new Set(["MA-06.json"]);
// Diagnósticos gerados automaticamente na rodada anterior e substituídos por DIAG2-*
const DIAG_ARQUIVAR = /^DIAG-(AR|CI|EF|ER|GE|HI|LI|LP)-[56]A$/;
const DIAG_MANTER = new Set(["DIAG-LP-5A"]);
// Trilhas geradas pelo gerar-pacote-todas-materias.mjs (removido) que o pacote não substitui.
// Ficaram APPROVED na main com questões genéricas; são arquivadas se ainda são do pacote (version 1).
const TRILHAS_ARQUIVAR = new Set([
  "EF15AR01", "EF15AR13", "EF15AR08", "EF15AR18", "EF69AR01", "EF69AR16", "EF69AR09", "EF69AR24",
  "EF05CI02", "EF05CI07", "EF05CI09", "EF06CI03", "EF06CI06", "EF06CI10",
  "EF35EF01", "EF35EF04", "EF35EF12", "EF67EF01", "EF67EF04", "EF67EF07", "EF67EF10",
  "EF05ER01", "EF05ER05", "EF06ER02", "EF06ER04",
  "EF05GE01", "EF05GE06", "EF05GE11", "EF06GE01", "EF06GE03", "EF06GE06", "EF06GE10",
  "EF05HI01", "EF05HI02", "EF05HI06", "EF06HI02", "EF06HI06", "EF06HI13",
  "EF06LI01", "EF06LI02", "EF06LI13", "EF06LP01", "EF06LP04", "EF06LP07", "EF06LP12",
]);

let falhas = 0;
// Ids das atividades do gerador removido: PK-<habilidade>-A<n>, DI-<habilidade>-<nn>, DG-<habilidade>-<nn>
const ATIVIDADE_GERADA = /^(PK|DI|DG)-EF\d\d[A-Z]{2}\d\d-(A\d|\d\d)$/;
function falha(ctx, e) {
  falhas++;
  console.error(`  [ERRO] ${ctx}: ${e?.message ?? e}`);
}

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

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const asOptions = (opts) => (opts ?? []).map((o) =>
  typeof o === "string" ? { text: o } : { text: o.text, ...(o.misconceptionCode ? { misconceptionCode: o.misconceptionCode } : {}) });

/** Pode sobrescrever? Só se não existe, não está aprovado, ou é do pacote com versão menor. */
function podeAtualizar(existing, versaoArquivo) {
  if (!existing) return true;
  if (existing.status !== "APPROVED" && existing.status !== "PUBLISHED") return true;
  const doPacote = existing.reviewNote == null || PACOTE_NOTES.has(existing.reviewNote) || existing.createdById === SYSTEM;
  return doPacote && (existing.version ?? 1) < (versaoArquivo ?? 1);
}

const skillCache = new Map();
async function skillId(db, code) {
  if (skillCache.has(code)) return skillCache.get(code);
  const s = await db.eduSkill.findUnique({ where: { code }, select: { id: true } });
  skillCache.set(code, s?.id ?? null);
  return s?.id ?? null;
}

// ── Pré-requisitos (todos os prerequisitos-pacote-*.json) ────────────────────
async function importPrerequisitos(db) {
  const files = readdirSync(DATA_DIR).filter((f) => /^prerequisitos-pacote-.*\.json$/.test(f));
  let n = 0;
  for (const file of files) {
    const raw = readJson(join(DATA_DIR, file));
    const criar = Array.isArray(raw) ? raw : raw.criar ?? [];
    const rejeitar = Array.isArray(raw) ? [] : raw.rejeitar ?? [];
    for (const rej of rejeitar) {
      try {
        const sid = await skillId(db, rej.skillCode);
        const pid = await skillId(db, rej.prerequisiteCode);
        if (!sid || !pid) continue;
        await db.eduSkillPrerequisite.updateMany({
          where: { skillId: sid, prerequisiteSkillId: pid, networkId: null, status: { not: "REJECTED" } },
          data: { status: "REJECTED", reviewNote: rej.reviewNote ?? "substituído pelo pacote" },
        });
      } catch (e) { falha(`${file} rejeitar ${rej.skillCode}->${rej.prerequisiteCode}`, e); }
    }
    for (const item of criar) {
      try {
        const sid = await skillId(db, item.skillCode);
        const pid = await skillId(db, item.prerequisiteCode);
        if (!sid || !pid) { falha(`${file}`, `habilidade não encontrada ${item.skillCode} -> ${item.prerequisiteCode}`); continue; }
        const existing = await db.eduSkillPrerequisite.findFirst({ where: { skillId: sid, prerequisiteSkillId: pid, networkId: null } });
        if (existing) {
          // Atualiza se não está aprovado, ou se ainda é do pacote (peso pode ter mudado).
          // Pré-requisito aprovado à mão no Estúdio (reviewNote própria) não é tocado.
          const doPacote = existing.reviewNote == null || PACOTE_NOTES.has(existing.reviewNote);
          const mudou = existing.status !== "APPROVED" || existing.weight !== (item.weight ?? 1);
          if (mudou && (existing.status !== "APPROVED" || doPacote)) {
            await db.eduSkillPrerequisite.update({ where: { id: existing.id }, data: { status: "APPROVED", weight: item.weight ?? 1, reviewNote: item.reviewNote ?? REVIEW_NOTE } });
          }
        } else {
          await db.eduSkillPrerequisite.create({
            data: { id: `SF-PREREQ-${item.skillCode}-${item.prerequisiteCode}`, skillId: sid, prerequisiteSkillId: pid, weight: item.weight ?? 1,
                    networkId: null, source: "SPEAKFLOW", status: "APPROVED", reviewNote: item.reviewNote ?? REVIEW_NOTE },
          });
        }
        n++;
      } catch (e) { falha(`${file} ${item.skillCode}->${item.prerequisiteCode}`, e); }
    }
  }
  console.log(`  [prereq] ${n} pré-requisitos aprovados`);
}

// ── Fichas (fichas/*.json) ────────────────────────────────────────────────────
async function importFichas(db) {
  if (!existsSync(FICHAS_DIR)) return;
  let n = 0;
  for (const file of readdirSync(FICHAS_DIR).filter((f) => f.endsWith(".json") && !FICHAS_IGNORAR.has(f))) {
    for (const ficha of readJson(join(FICHAS_DIR, file))) {
      try {
        const sid = await skillId(db, ficha.skillCode);
        if (!sid) { falha(`${file}`, `habilidade não encontrada ${ficha.skillCode}`); continue; }
        const id = `SF-GUIDE-${ficha.skillCode}`;
        const existing = await db.eduSkillGuide.findUnique({ where: { id } });
        const data = {
          whatStudentDoes: ficha.whatStudentDoes,
          commonErrors: ficha.commonErrors ?? [],
          recommendedTypes: ficha.recommendedTypes ?? ["QUIZ"],
          ageNotes: ficha.ageNotes ?? "",
          version: ficha.version ?? 1,
          status: "APPROVED",
          reviewNote: REVIEW_NOTE,
        };
        if (!existing) {
          await db.eduSkillGuide.create({ data: { id, skillId: sid, networkId: null, source: "SPEAKFLOW", ...data } });
        } else if (podeAtualizar(existing, ficha.version)) {
          await db.eduSkillGuide.update({ where: { id }, data });
        }
        // Outras fichas SpeakFlow da mesma habilidade, ainda em rascunho, ficam fora da fila
        await db.eduSkillGuide.updateMany({
          where: { skillId: sid, networkId: null, id: { not: id }, status: "DRAFT" },
          data: { status: "REJECTED", reviewNote: `substituída por ${id}` },
        });
        n++;
      } catch (e) { falha(`${file} ${ficha.skillCode}`, e); }
    }
  }
  console.log(`  [fichas] ${n} fichas importadas`);
}

// ── Atividades e questões ─────────────────────────────────────────────────────
async function upsertActivity(db, act, meta) {
  const existing = await db.eduActivity.findUnique({ where: { id: act.id } });
  if (existing && !podeAtualizar({ ...existing, status: existing.reviewStatus === "APPROVED" ? existing.status : "DRAFT" }, meta.version)) return;
  const data = {
    networkId: null, classSubjectId: null,
    type: act.type ?? "QUIZ",
    title: act.title,
    prompt: act.prompt ?? "",
    estMinutes: act.estMinutes ?? 5,
    rubric: act.rubric ?? { type: act.type ?? "QUIZ", criteria: [] },
    audioScript: act.audioScript ?? null,
    subjectCode: meta.subjectCode ?? null,
    gradeYears: meta.gradeYear ? [meta.gradeYear] : [],
    skillIds: [meta.skillId],
    version: meta.version ?? 1,
    maxAttempts: 2,
    status: "PUBLISHED",
    source: "SPEAKFLOW",
    reviewStatus: "APPROVED",
    createdById: SYSTEM,
  };
  if (existing) await db.eduActivity.update({ where: { id: act.id }, data });
  else await db.eduActivity.create({ data: { id: act.id, ...data } });

  const qs = act.questions ?? [];
  for (let qi = 0; qi < qs.length; qi++) {
    const q = qs[qi];
    const qid = `${act.id}-Q${qi}`;
    const qdata = {
      activityId: act.id, order: qi, question: q.question,
      options: asOptions(q.options), correctIndex: q.correctIndex,
      explanation: q.explanation ?? "", skillId: meta.skillId,
      misconceptionCode: null,
      variants: (q.variants ?? []).map((v) => ({ question: v.question, options: asOptions(v.options), correctIndex: v.correctIndex })),
    };
    await db.eduQuizQuestion.upsert({ where: { id: qid }, create: { id: qid, ...qdata }, update: qdata });
  }
  await db.eduQuizQuestion.deleteMany({ where: { activityId: act.id, order: { gte: qs.length } } });
}

// ── Trilhas ───────────────────────────────────────────────────────────────────
async function importTrilhas(db) {
  const files = readdirSync(TRILHAS_DIR).filter((f) =>
    f.endsWith(".json") && !TRILHAS_IGNORAR.has(f) && (f === "FRAC.json" || /^[A-Z]{2,3}-\d{2}\.json$/.test(f)));
  let n = 0;
  const codigosDoPacote = new Set();
  for (const file of files) {
    for (const trilha of readJson(join(TRILHAS_DIR, file))) {
      codigosDoPacote.add(trilha.skillCode);
      try {
        const sid = await skillId(db, trilha.skillCode);
        if (!sid) { falha(`${file}`, `habilidade não encontrada ${trilha.skillCode}`); continue; }
        const trackId = `SF-TRACK-${trilha.skillCode}`;
        const existing = await db.eduTrack.findUnique({ where: { id: trackId } });
        const version = trilha.version ?? 1;
        // Itens que não são deste pacote saem da trilha (ex.: os "-I0..-I4" que o
        // conteudo-import antigo criou para a mesma trilha): o aluno via 10 etapas e
        // a primeira apontava para uma atividade em rascunho ("Atividade não encontrada").
        const esperados = (trilha.activities ?? []).map((_, i) => `SF-ITEM-${trilha.skillCode}-${i}`);
        if (existing) {
          const extras = await db.eduTrackItem.deleteMany({ where: { trackId, id: { notIn: esperados } } });
          if (extras.count) console.log(`  [trilhas] ${trackId}: ${extras.count} item(ns) de fora do pacote removido(s)`);
        }
        if (!podeAtualizar(existing, version)) { n++; continue; }
        const gradeYear = trilha.gradeYear ?? (Number(trilha.skillCode.slice(2, 4)) >= 10 ? Number(trilha.skillCode[3]) : Number(trilha.skillCode.slice(2, 4)));
        const meta = { skillId: sid, subjectCode: trilha.subjectCode, gradeYear, version };
        for (const act of trilha.activities ?? []) await upsertActivity(db, act, meta);
        const tdata = {
          networkId: null, subjectId: null, subjectCode: trilha.subjectCode ?? null, gradeYear,
          title: trilha.title ?? `Trilha ${trilha.skillCode}`, skillIds: [sid], status: "APPROVED",
          reviewNote: REVIEW_NOTE, createdById: SYSTEM, source: "SPEAKFLOW", version,
        };
        if (existing) await db.eduTrack.update({ where: { id: trackId }, data: tdata });
        else await db.eduTrack.create({ data: { id: trackId, ...tdata } });
        const acts = trilha.activities ?? [];
        for (let i = 0; i < acts.length; i++) {
          const itemId = `SF-ITEM-${trilha.skillCode}-${i}`;
          const idata = { trackId, order: i, activityId: acts[i].id, estMinutes: acts[i].estMinutes ?? 5 };
          await db.eduTrackItem.upsert({ where: { id: itemId }, create: { id: itemId, ...idata }, update: idata });
        }
        await db.eduTrackItem.deleteMany({ where: { trackId, order: { gte: acts.length } } });
        n++;
      } catch (e) { falha(`${file} ${trilha.skillCode}`, e); }
    }
  }
  // Arquiva as trilhas da rodada anterior que o pacote não substitui
  for (const code of TRILHAS_ARQUIVAR) {
    if (codigosDoPacote.has(code)) continue;
    const id = `SF-TRACK-${code}`;
    try {
      const t = await db.eduTrack.findUnique({ where: { id }, select: { status: true, reviewNote: true, version: true, networkId: true, createdById: true } });
      // Mesma regra do podeAtualizar: é do pacote se não tem nota, tem a nota do pacote ou foi criada pelo sistema
      const doPacote = t && (t.reviewNote == null || PACOTE_NOTES.has(t.reviewNote) || t.createdById === SYSTEM);
      if (!t || !doPacote || t.networkId !== null || t.status === "ARCHIVED" || (t.version ?? 1) >= 2) continue;
      await db.eduTrack.update({ where: { id }, data: { status: "ARCHIVED", reviewNote: "conteúdo gerado automaticamente na rodada anterior; substituído pelo pacote de matérias" } });
      console.log(`  [trilhas] arquivada ${id} (gerada na rodada anterior)`);
    } catch (e) { falha(`arquivar ${id}`, e); }
  }
  console.log(`  [trilhas] ${n} trilhas importadas`);
}

// ── Diagnósticos ──────────────────────────────────────────────────────────────
async function importDiagnosticos(db) {
  if (!existsSync(DIAG_DIR)) return;
  let n = 0;
  const idsDoPacote = new Set();
  for (const file of readdirSync(DIAG_DIR).filter((f) => f.endsWith(".json") && f.startsWith("DIAG-"))) {
    const diag = readJson(join(DIAG_DIR, file));
    if (!diag.id || !diag.items) continue;
    idsDoPacote.add(diag.id);
    try {
      const existing = await db.eduDiagnostic.findUnique({ where: { id: diag.id } });
      const version = diag.version ?? 1;
      if (existing && existing.status === "APPROVED" && (existing.version ?? 1) >= version) { n++; continue; }
      const ddata = {
        networkId: null, subjectId: null, subjectCode: diag.subjectCode ?? null, gradeYear: diag.gradeYear,
        title: diag.titulo ?? diag.title ?? diag.id, cycle: diag.cycle ?? 1, status: "APPROVED",
        source: "SPEAKFLOW", createdById: SYSTEM, version, adaptive: diag.adaptive ?? true,
      };
      if (existing) await db.eduDiagnostic.update({ where: { id: diag.id }, data: ddata });
      else await db.eduDiagnostic.create({ data: { id: diag.id, ...ddata } });

      const keep = [];
      for (let idx = 0; idx < diag.items.length; idx++) {
        const item = diag.items[idx];
        const sid = await skillId(db, item.skillCode);
        if (!sid) { falha(`${file}`, `habilidade não encontrada ${item.skillCode}`); continue; }
        const actId = item.activityId ?? item.id ?? `${diag.id}-ITEM-${idx}`;
        await upsertActivity(db, {
          id: actId, type: "QUIZ", title: item.question?.slice(0, 120) ?? `Item ${idx + 1}`,
          prompt: item.question ?? "", estMinutes: 2, audioScript: item.audioScript ?? null,
          questions: [{ question: item.question, options: item.options, correctIndex: item.correctIndex ?? 0, explanation: item.explanation ?? "", variants: item.variants ?? [] }],
        }, { skillId: sid, subjectCode: diag.subjectCode, gradeYear: diag.gradeYear, version });
        const diId = `${diag.id}-DI-${idx}`;
        keep.push(diId);
        const didata = { diagnosticId: diag.id, skillId: sid, order: idx, activityId: actId, role: item.role ?? "NORMAL", isDegrauLegacy: false };
        await db.eduDiagnosticItem.upsert({ where: { id: diId }, create: { id: diId, ...didata }, update: didata });
      }
      await db.eduDiagnosticItem.deleteMany({ where: { diagnosticId: diag.id, id: { startsWith: `${diag.id}-DI-`, notIn: keep } } });
      // Itens deste diagnóstico gravados por outro importador (ex.: "<id>-ITEM-<n>", sem role)
      // ficam fora da sequência: senão as questões aparecem em dobro e o banco do degrau vira NORMAL
      await db.eduDiagnosticItem.updateMany({ where: { diagnosticId: diag.id, id: { notIn: keep }, isDegrauLegacy: false }, data: { isDegrauLegacy: true } });
      n++;
    } catch (e) { falha(`${file} ${diag.id}`, e); }
  }
  // Arquiva os diagnósticos gerados na rodada anterior que não estão mais nos arquivos
  const antigos = await db.eduDiagnostic.findMany({ where: { networkId: null, source: "SPEAKFLOW", status: { not: "ARCHIVED" } }, select: { id: true } });
  for (const d of antigos) {
    if (DIAG_ARQUIVAR.test(d.id) && !DIAG_MANTER.has(d.id) && !idsDoPacote.has(d.id)) {
      await db.eduDiagnostic.update({ where: { id: d.id }, data: { status: "ARCHIVED" } });
      console.log(`  [diagnosticos] arquivado ${d.id} (substituído pelo pacote de matérias)`);
    }
  }
  // Diagnósticos de teste antigos (de qualquer rede) com o enunciado genérico
  // "Resolva o problema relacionado a EF..." saem de circulação: o aluno via o código BNCC
  const genericos = await db.eduDiagnostic.findMany({
    where: { status: { not: "ARCHIVED" }, items: { some: { activity: { prompt: { contains: "relacionado a EF" } } } } },
    select: { id: true, title: true },
  });
  for (const d of genericos) {
    if (idsDoPacote.has(d.id)) continue;
    await db.eduDiagnostic.update({ where: { id: d.id }, data: { status: "ARCHIVED" } });
    console.log(`  [diagnosticos] arquivado ${d.id} ("${d.title}"): enunciado genérico com código BNCC`);
  }
  console.log(`  [diagnosticos] ${n} diagnósticos importados`);
}

// ── Atividades da rodada anterior ─────────────────────────────────────────────
// O pacote novo usa PK2-/DI2-. As atividades publicadas pelo gerador removido que não
// estão nos arquivos ficam CLOSED: senão o degrau ainda as usaria como reserva.
/** Ids de todas as atividades que estão nos arquivos do pacote (trilhas e itens de diagnóstico) */
function atividadesDosArquivos() {
  const ids = new Set();
  for (const f of readdirSync(TRILHAS_DIR).filter((f) => f.endsWith(".json") && !TRILHAS_IGNORAR.has(f))) {
    for (const t of readJson(join(TRILHAS_DIR, f))) for (const a of t.activities ?? []) ids.add(a.id);
  }
  for (const f of readdirSync(DIAG_DIR).filter((f) => f.endsWith(".json") && f.startsWith("DIAG-"))) {
    const d = readJson(join(DIAG_DIR, f));
    (d.items ?? []).forEach((item, idx) => ids.add(item.activityId ?? item.id ?? `${d.id}-ITEM-${idx}`));
  }
  return ids;
}

async function fecharAtividadesAntigas(db) {
  const atividadesDoPacote = atividadesDosArquivos();
  const candidatas = await db.eduActivity.findMany({
    where: { networkId: null, status: "PUBLISHED", OR: ["PK-EF", "DI-EF", "DG-EF"].map((pre) => ({ id: { startsWith: pre } })) },
    select: { id: true, version: true },
  });
  const fechar = candidatas
    .filter((a) => ATIVIDADE_GERADA.test(a.id) && !atividadesDoPacote.has(a.id) && (a.version ?? 1) < 2)
    .map((a) => a.id);
  if (fechar.length) {
    await db.eduActivity.updateMany({ where: { id: { in: fechar } }, data: { status: "CLOSED" } });
    console.log(`  [atividades] ${fechar.length} atividades da rodada anterior fechadas (CLOSED)`);
  }
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function importInTenant(envVar) {
  const db = tenantDb(envVar);
  skillCache.clear();
  try {
    await db.$executeRaw`SELECT pg_advisory_lock(${LOCK_ID}::bigint)`;
    console.log(`\n[${envVar}] importando pacotes de conteúdo...`);
    await importPrerequisitos(db);
    await importFichas(db);
    await importTrilhas(db);
    await importDiagnosticos(db);
    await fecharAtividadesAntigas(db);
    console.log(`[${envVar}] concluído`);
  } finally {
    await db.$executeRaw`SELECT pg_advisory_unlock(${LOCK_ID}::bigint)`.catch((e) => console.error(`[${envVar}] unlock: ${e.message}`));
    await db.$disconnect();
  }
}

async function main() {
  const tenants = listTenantEnvVars();
  if (tenants.length === 0) {
    console.error("Nenhuma variável ESCOLAS_DB_*_URL ou ESCOLAS_DB_URL encontrada.");
    process.exit(1);
  }
  for (const envVar of tenants) {
    await importInTenant(envVar).catch((e) => falha(envVar, e));
  }
  if (falhas > 0) {
    console.error(`\nImportação terminou com ${falhas} falha(s). Veja as linhas [ERRO] acima.`);
    process.exit(1);
  }
  console.log("\nPacotes de conteúdo importados em todas as bases.");
}

main().catch((e) => { console.error(e); process.exit(1); });
