#!/usr/bin/env node
/**
 * scripts/escolas/relatorio-rastreabilidade.mjs
 *
 * Relatório de rastreabilidade do conteúdo do reforço (somente leitura).
 * Para cada ano e habilidade da BNCC: diagnóstico, pré-requisitos, trilha, questões,
 * revisão pedagógica e publicação. Também testa os caminhos regressivos (degrau do
 * diagnóstico e trilha de base) com as mesmas regras do sistema, e aponta os que
 * caem em habilidades sem questões ou sem trilha publicada.
 *
 * Uso:
 *   node scripts/escolas/relatorio-rastreabilidade.mjs --fonte banco      (produção: railway ssh)
 *   node scripts/escolas/relatorio-rastreabilidade.mjs --fonte arquivos   (o que os arquivos do repositório publicam)
 * Opções: --saida <pasta> (padrão: ./rastreabilidade)  --db <VARIAVEL_DE_AMBIENTE> (padrão: primeira ESCOLAS_DB_nn_URL)
 *
 * Gera rastreabilidade.xlsx, um CSV por aba e dados.json. Não grava nada no banco
 * e não lê dados de alunos: só o conteúdo global (networkId nulo).
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA_DIR = join(ROOT, "prisma", "data", "conteudo");
const NOTA_PACOTE = "conteúdo SpeakFlow, em revisão pela equipe pedagógica";
const MATERIAS = { LP: "Língua Portuguesa", MA: "Matemática", CI: "Ciências", HI: "História", GE: "Geografia", AR: "Arte", EF: "Educação Física", LI: "Língua Inglesa", ER: "Ensino Religioso" };

function arg(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
}

// ── BNCC (CSV com aspas) ─────────────────────────────────────────────────────
export function lerBncc() {
  const linhas = readFileSync(join(ROOT, "prisma", "data", "bncc-ef.csv"), "utf8").split("\n").filter(Boolean).slice(1);
  return linhas.map((linha) => {
    const cols = []; let cur = ""; let aspas = false;
    for (const ch of linha) {
      if (ch === '"') { aspas = !aspas; continue; }
      if (ch === "," && !aspas) { cols.push(cur); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur);
    const [code, subjectCode, , anos, description] = cols;
    return { code: code.trim(), subjectCode: subjectCode.trim(), gradeYears: (anos ?? "").split(";").map(Number).filter((n) => n > 0), description: (description ?? "").trim() };
  }).filter((s) => s.code);
}

// ── Fonte: arquivos do repositório (mesmas regras do conteudo-pacote-import) ──
export function carregarDosArquivos() {
  const json = (p) => JSON.parse(readFileSync(p, "utf8"));
  const skills = lerBncc();
  const prereqs = [];
  const chave = (a, b) => `${a}>${b}`;
  const mapa = new Map();
  const base = join(DATA_DIR, "prerequisitos.json");
  if (existsSync(base)) for (const i of json(base)) mapa.set(chave(i.skillCode, i.prerequisiteCode), { skill: i.skillCode, prereq: i.prerequisiteCode, weight: i.weight ?? 1, status: "DRAFT", reviewNote: null });
  for (const f of readdirSync(DATA_DIR).filter((x) => /^prerequisitos-pacote-.*\.json$/.test(x)).sort()) {
    const raw = json(join(DATA_DIR, f));
    for (const r of raw.rejeitar ?? []) {
      const k = chave(r.skillCode, r.prerequisiteCode);
      if (mapa.has(k)) mapa.set(k, { ...mapa.get(k), status: "REJECTED", reviewNote: r.reviewNote ?? null });
    }
    for (const c of Array.isArray(raw) ? raw : raw.criar ?? []) {
      mapa.set(chave(c.skillCode, c.prerequisiteCode), { skill: c.skillCode, prereq: c.prerequisiteCode, weight: c.weight ?? 1, status: "APPROVED", reviewNote: c.reviewNote ?? NOTA_PACOTE });
    }
  }
  prereqs.push(...mapa.values());

  const tracks = [];
  const dirT = join(DATA_DIR, "trilhas");
  for (const f of readdirSync(dirT).filter((x) => x.endsWith(".json") && x !== "MA-06.json" && (x === "FRAC.json" || /^[A-Z]{2,3}-\d{2}\.json$/.test(x))).sort()) {
    for (const t of json(join(dirT, f))) {
      const gradeYear = t.gradeYear ?? (Number(t.skillCode.slice(2, 4)) >= 10 ? Number(t.skillCode[3]) : Number(t.skillCode.slice(2, 4)));
      tracks.push({
        id: `SF-TRACK-${t.skillCode}`, title: t.title ?? "", skillCodes: [t.skillCode], gradeYear, subjectCode: t.subjectCode ?? null,
        status: "APPROVED", reviewNote: NOTA_PACOTE, version: t.version ?? 1,
        activities: (t.activities ?? []).map((a) => ({
          id: a.id, type: a.type ?? "QUIZ", title: a.title ?? "", status: "PUBLISHED", reviewStatus: "APPROVED", skillCodes: [t.skillCode],
          questions: (a.questions ?? []).map((q) => ({ question: q.question, options: (q.options ?? []).map((o) => (typeof o === "string" ? o : o.text)), correctIndex: q.correctIndex, explanation: q.explanation ?? "" })),
        })),
      });
    }
  }

  const diags = [];
  const dirD = join(DATA_DIR, "diagnosticos");
  for (const f of readdirSync(dirD).filter((x) => x.endsWith(".json") && x.startsWith("DIAG-")).sort()) {
    const d = json(join(dirD, f));
    if (!d.id || !d.items) continue;
    diags.push({
      id: d.id, title: d.titulo ?? d.title ?? d.id, gradeYear: d.gradeYear, subjectCode: d.subjectCode ?? null, status: "APPROVED", version: d.version ?? 1,
      items: d.items.map((it, idx) => ({ skillCode: it.skillCode, role: it.role ?? "NORMAL", activityId: it.activityId ?? it.id ?? `${d.id}-ITEM-${idx}`, activityStatus: "PUBLISHED", question: it.question })),
    });
  }
  return { fonte: "arquivos do repositório", skills, prereqs, tracks, diags };
}

// ── Fonte: banco (produção) ──────────────────────────────────────────────────
export async function carregarDoBanco(url) {
  const pg = (await import("pg")).default;
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  const q = async (sql) => (await c.query(sql)).rows;
  try {
    const skills = (await q(`SELECT id, code, "subjectCode", "gradeYears", description FROM "EduSkill" WHERE "networkId" IS NULL ORDER BY code`));
    const codeDe = new Map(skills.map((s) => [s.id, s.code]));
    const prereqs = (await q(`SELECT "skillId", "prerequisiteSkillId", weight, status, "reviewNote" FROM "EduSkillPrerequisite" WHERE "networkId" IS NULL`))
      .map((r) => ({ skill: codeDe.get(r.skillId), prereq: codeDe.get(r.prerequisiteSkillId), weight: r.weight, status: r.status, reviewNote: r.reviewNote }))
      .filter((r) => r.skill && r.prereq);

    const acts = new Map();
    for (const a of await q(`SELECT id, type::text AS type, title, status::text AS status, "reviewStatus", "skillIds" FROM "EduActivity" WHERE "networkId" IS NULL AND source = 'SPEAKFLOW'`)) {
      acts.set(a.id, { id: a.id, type: a.type, title: a.title, status: a.status, reviewStatus: a.reviewStatus, skillCodes: (a.skillIds ?? []).map((i) => codeDe.get(i)).filter(Boolean), questions: [] });
    }
    for (const qq of await q(`SELECT qq."activityId", qq.question, qq.options, qq."correctIndex", qq.explanation FROM "EduQuizQuestion" qq JOIN "EduActivity" a ON a.id = qq."activityId" WHERE a."networkId" IS NULL AND a.source = 'SPEAKFLOW' ORDER BY qq."activityId", qq."order"`)) {
      const a = acts.get(qq.activityId);
      if (a) a.questions.push({ question: qq.question, options: (Array.isArray(qq.options) ? qq.options : []).map((o) => (typeof o === "string" ? o : o?.text ?? "")), correctIndex: qq.correctIndex, explanation: qq.explanation ?? "" });
    }

    const tracks = [];
    const itensDe = new Map();
    for (const it of await q(`SELECT ti."trackId", ti."activityId" FROM "EduTrackItem" ti JOIN "EduTrack" t ON t.id = ti."trackId" WHERE t."networkId" IS NULL ORDER BY ti."trackId", ti."order"`)) {
      if (!itensDe.has(it.trackId)) itensDe.set(it.trackId, []);
      itensDe.get(it.trackId).push(it.activityId);
    }
    for (const t of await q(`SELECT id, title, "skillIds", "gradeYear", "subjectCode", status, "reviewNote", version FROM "EduTrack" WHERE "networkId" IS NULL AND status <> 'ARCHIVED' ORDER BY id`)) {
      tracks.push({
        id: t.id, title: t.title, skillCodes: (t.skillIds ?? []).map((i) => codeDe.get(i)).filter(Boolean), gradeYear: t.gradeYear, subjectCode: t.subjectCode,
        status: t.status, reviewNote: t.reviewNote, version: t.version,
        activities: (itensDe.get(t.id) ?? []).map((id) => acts.get(id) ?? { id, type: "?", title: "", status: "AUSENTE", reviewStatus: "", skillCodes: [], questions: [] }),
      });
    }

    const diags = [];
    const diDe = new Map();
    for (const it of await q(`SELECT di."diagnosticId", di."skillId", di.role, di."activityId", a.status::text AS "activityStatus", a.prompt FROM "EduDiagnosticItem" di JOIN "EduDiagnostic" d ON d.id = di."diagnosticId" LEFT JOIN "EduActivity" a ON a.id = di."activityId" WHERE d."networkId" IS NULL AND di."isDegrauLegacy" = false AND di.id NOT LIKE 'DEGRAU-%' ORDER BY di."diagnosticId", di."order"`)) {
      if (!diDe.has(it.diagnosticId)) diDe.set(it.diagnosticId, []);
      diDe.get(it.diagnosticId).push({ skillCode: codeDe.get(it.skillId), role: it.role, activityId: it.activityId, activityStatus: it.activityStatus ?? "AUSENTE", question: it.prompt });
    }
    for (const d of await q(`SELECT id, title, "gradeYear", "subjectCode", status, version FROM "EduDiagnostic" WHERE "networkId" IS NULL AND status <> 'ARCHIVED' ORDER BY id`)) {
      diags.push({ id: d.id, title: d.title, gradeYear: d.gradeYear, subjectCode: d.subjectCode, status: d.status, version: d.version, items: (diDe.get(d.id) ?? []).filter((i) => i.skillCode) });
    }
    // Atividades de quiz publicadas fora de trilhas e diagnósticos também servem ao degrau
    const avulsas = [...acts.values()];
    return { fonte: "banco de dados", skills: skills.map((s) => ({ code: s.code, subjectCode: s.subjectCode, gradeYears: s.gradeYears ?? [], description: s.description })), prereqs, tracks, diags, avulsas };
  } finally { await c.end(); }
}

// ── Análise ──────────────────────────────────────────────────────────────────
const pendente = (nota) => !nota || /pendente|demonstra/i.test(nota);
const emRevisao = (nota) => /em revis/i.test(nota ?? "");
const anosTxt = (s) => (s?.gradeYears?.length ? (s.gradeYears.length > 1 ? `${Math.min(...s.gradeYears)}º ao ${Math.max(...s.gradeYears)}º` : `${s.gradeYears[0]}º`) : "");

export function analisar(d) {
  // Ordem fixa, igual nas duas fontes
  const ord = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  d = { ...d, skills: [...d.skills].sort((x, y) => ord(x.code, y.code)), tracks: [...d.tracks].sort((x, y) => ord(x.id, y.id)), diags: [...d.diags].sort((x, y) => ord(x.id, y.id)) };
  const skill = new Map(d.skills.map((s) => [s.code, s]));
  const trilhasDe = new Map();   // habilidade -> trilhas publicadas (APPROVED)
  const trilhasRascunho = new Map();
  for (const t of d.tracks) for (const c of t.skillCodes) {
    const alvo = t.status === "APPROVED" ? trilhasDe : trilhasRascunho;
    if (!alvo.has(c)) alvo.set(c, []);
    alvo.get(c).push(t);
  }
  // Quiz publicado por habilidade (2ª busca do degrau)
  const quizDe = new Map();
  const somaQuiz = (a) => { if (a.type === "QUIZ" && a.status === "PUBLISHED") for (const c of a.skillCodes) quizDe.set(c, (quizDe.get(c) ?? 0) + 1); };
  const vistos = new Set();
  for (const a of [...(d.avulsas ?? []), ...d.tracks.flatMap((t) => t.activities)]) { if (!vistos.has(a.id)) { vistos.add(a.id); somaQuiz(a); } }
  for (const dg of d.diags) for (const it of dg.items) if (!vistos.has(it.activityId) && it.activityStatus === "PUBLISHED") { vistos.add(it.activityId); quizDe.set(it.skillCode, (quizDe.get(it.skillCode) ?? 0) + 1); }

  const aprovadosDe = new Map();
  for (const p of d.prereqs.filter((x) => x.status === "APPROVED").sort((a, b) => b.weight - a.weight)) {
    if (!aprovadosDe.has(p.skill)) aprovadosDe.set(p.skill, []);
    aprovadosDe.get(p.skill).push(p);
  }
  const diagsAprov = d.diags.filter((x) => x.status === "APPROVED");

  // 1) Rastreabilidade: uma linha por ano e habilidade
  const rastreio = [];
  for (const s of d.skills) {
    for (const ano of s.gradeYears) {
      const dgs = diagsAprov.filter((x) => x.gradeYear === ano && x.items.some((i) => i.skillCode === s.code && i.role === "NORMAL"));
      const degrauEm = diagsAprov.filter((x) => x.items.some((i) => i.skillCode === s.code && i.role === "DEGRAU_BANK"));
      const itensDiag = dgs.reduce((n, x) => n + x.items.filter((i) => i.skillCode === s.code && i.role === "NORMAL").length, 0);
      const tr = (trilhasDe.get(s.code) ?? []).filter((t) => t.gradeYear === ano || (t.gradeYear == null));
      const trOutroAno = (trilhasDe.get(s.code) ?? []).filter((t) => t.gradeYear != null && t.gradeYear !== ano);
      const rasc = (trilhasRascunho.get(s.code) ?? []).length;
      const etapas = tr.reduce((n, t) => n + t.activities.length, 0);
      const questoes = tr.reduce((n, t) => n + t.activities.reduce((m, a) => m + a.questions.length, 0), 0);
      const pre = (aprovadosDe.get(s.code) ?? []).map((p) => p.prereq);
      const temConteudo = dgs.length || tr.length;
      const publicado = tr.length && tr.every((t) => t.activities.length && t.activities.every((a) => a.status === "PUBLISHED"));
      rastreio.push({
        "Ano": ano,
        "Componente": MATERIAS[s.subjectCode] ?? s.subjectCode,
        "Código BNCC": s.code,
        "Habilidade": s.description,
        "Diagnóstico": dgs.map((x) => x.id).join(", ") || (degrauEm.length ? `Só como degrau em ${degrauEm.map((x) => x.id).join(", ")}` : "Não"),
        "Itens de diagnóstico": itensDiag,
        "Pré-requisitos": pre.join(", ") || "Nenhum aprovado",
        "Trilha": tr.map((t) => t.id).join(", ") || (trOutroAno.length ? `Não (há trilha escrita para o ${trOutroAno[0].gradeYear}º ano)` : rasc ? "Não (rascunho)" : "Não"),
        "Etapas": etapas,
        "Questões": questoes + itensDiag,
        "Revisão pedagógica": !temConteudo ? "Sem conteúdo" : tr.some((t) => emRevisao(t.reviewNote)) ? "Em revisão" : tr.some((t) => pendente(t.reviewNote)) || !tr.length ? "Pendente" : "Aprovada",
        "Publicado": publicado ? "Sim" : "Não",
        "Testado": "",
      });
    }
  }

  rastreio.sort((x, y) => x["Ano"] - y["Ano"] || ord(x["Componente"], y["Componente"]) || ord(x["Código BNCC"], y["Código BNCC"]));

  // 2) Caminhos regressivos: mesmas regras de lib/escola/diagnostico-degrau.ts e trilha-progresso.ts
  const degrau = (dg, code) => {
    const pres = aprovadosDe.get(code) ?? [];
    if (!pres.length) return { motivo: "sem pré-requisito aprovado" };
    for (const p of pres) { const n = dg.items.filter((i) => i.skillCode === p.prereq && i.role === "DEGRAU_BANK").length; if (n) return { prereq: p.prereq, origem: `banco do diagnóstico (${n} ${n === 1 ? "questão" : "questões"})` }; }
    for (const p of pres) { const n = quizDe.get(p.prereq) ?? 0; if (n) return { prereq: p.prereq, origem: `outras questões publicadas (${n})` }; }
    return { motivo: `pré-requisito sem questões publicadas (${pres.map((p) => p.prereq).join(", ")})` };
  };
  const base = (code) => {
    const pres = aprovadosDe.get(code) ?? [];
    for (const p of pres) { const t = (trilhasDe.get(p.prereq) ?? [])[0]; if (t) return { prereq: p.prereq, trilha: t.id }; }
    return null;
  };
  const caminhos = [];
  for (const dg of diagsAprov) {
    const normais = [...new Set(dg.items.filter((i) => i.role === "NORMAL").map((i) => i.skillCode))];
    for (const code of normais) {
      const d1 = degrau(dg, code);
      const d2 = d1.prereq ? degrau(dg, d1.prereq) : null;
      const b = base(code);
      const p1 = d1.prereq ? skill.get(d1.prereq) : null;
      const p2 = d2?.prereq ? skill.get(d2.prereq) : null;
      const problemas = [];
      if (!d1.prereq) problemas.push(`Degrau 1: ${d1.motivo}`);
      else {
        if (!(trilhasDe.get(d1.prereq) ?? []).length) problemas.push(`${d1.prereq} não tem trilha publicada para recuperar`);
        if (!d2?.prereq) problemas.push(`Degrau 2: ${d2?.motivo}`);
        else if (!(trilhasDe.get(d2.prereq) ?? []).length) problemas.push(`${d2.prereq} não tem trilha publicada para recuperar`);
      }
      if (!(trilhasDe.get(code) ?? []).length) problemas.push("habilidade do ano sem trilha publicada");
      if (!b) problemas.push("trilha de base não abre (nenhum pré-requisito aprovado com trilha publicada)");
      caminhos.push({
        "Diagnóstico": dg.id,
        "Ano": dg.gradeYear,
        "Componente": MATERIAS[dg.subjectCode] ?? dg.subjectCode ?? "",
        "Habilidade avaliada": code,
        "Degrau 1 (desce para)": d1.prereq ?? "Não desce",
        "Ano do degrau 1": anosTxt(p1),
        "Questões do degrau 1": d1.origem ?? "",
        "Degrau 2 (desce para)": d1.prereq ? d2?.prereq ?? "Não desce" : "",
        "Ano do degrau 2": anosTxt(p2),
        "Questões do degrau 2": d2?.origem ?? "",
        "Trilha de base após erros": b ? `${b.trilha}` : "Não abre",
        "Resultado": !d1.prereq ? "Sem regressão" : problemas.length ? "Regressão parcial" : "Completo",
        "Lacunas": problemas.join("; "),
      });
    }
  }

  // 3) Pré-requisitos, com a situação do conteúdo do destino
  const ligacoes = d.prereqs.map((p) => ({
    "Habilidade": p.skill, "Ano": anosTxt(skill.get(p.skill)),
    "Pré-requisito": p.prereq, "Ano do pré-requisito": anosTxt(skill.get(p.prereq)),
    "Peso": p.weight, "Situação": p.status === "APPROVED" ? "Aprovado (em uso)" : p.status === "REJECTED" ? "Rejeitado" : "Rascunho (não usado)",
    "Pré-requisito tem questões": (quizDe.get(p.prereq) ?? 0) > 0 ? "Sim" : "Não",
    "Pré-requisito tem trilha publicada": (trilhasDe.get(p.prereq) ?? []).length ? "Sim" : "Não",
    "Observação": p.reviewNote ?? "",
  })).sort((a, b) => ord(a["Habilidade"], b["Habilidade"]) || b["Peso"] - a["Peso"] || ord(a["Pré-requisito"], b["Pré-requisito"]));

  // 4) Amostras: a primeira questão de cada trilha publicada
  const amostras = [];
  for (const t of d.tracks.filter((x) => x.status === "APPROVED")) {
    const a = t.activities.find((x) => x.questions.length);
    const q = a?.questions[0];
    if (!q) continue;
    amostras.push({
      "Trilha": t.id, "Ano": t.gradeYear ?? "", "Código BNCC": t.skillCodes.join(", "), "Título": t.title, "Atividade": a.id,
      "Pergunta": q.question, "Alternativas": q.options.map((o, i) => `${"ABCDE"[i]}) ${o}`).join(" | "), "Resposta certa": "ABCDE"[q.correctIndex] ?? "", "Explicação ao aluno": q.explanation,
      "Parecer do revisor": "", "Revisor": "", "Data": "",
    });
  }

  const resumo = {
    fonte: d.fonte, geradoEm: new Date().toISOString(),
    habilidadesBncc: d.skills.length,
    habilidadesComTrilhaPublicada: [...trilhasDe.keys()].length,
    trilhasPublicadas: d.tracks.filter((t) => t.status === "APPROVED").length,
    trilhasEmRascunho: d.tracks.filter((t) => t.status !== "APPROVED").length,
    diagnosticosPublicados: diagsAprov.length,
    preRequisitos: { aprovados: d.prereqs.filter((p) => p.status === "APPROVED").length, rascunho: d.prereqs.filter((p) => p.status === "DRAFT").length, rejeitados: d.prereqs.filter((p) => p.status === "REJECTED").length },
    caminhos: { total: caminhos.length, completos: caminhos.filter((c) => c.Resultado === "Completo").length, parciais: caminhos.filter((c) => c.Resultado === "Regressão parcial").length, semRegressao: caminhos.filter((c) => c.Resultado === "Sem regressão").length },
  };
  return { resumo, rastreio, caminhos, ligacoes, amostras };
}

// ── Saída ────────────────────────────────────────────────────────────────────
function csv(linhas) {
  if (!linhas.length) return "";
  const cols = Object.keys(linhas[0]);
  const cel = (v) => { const s = String(v ?? ""); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [cols.join(";"), ...linhas.map((l) => cols.map((c) => cel(l[c])).join(";"))].join("\n") + "\n";
}

async function main() {
  const fonte = arg("fonte", "banco");
  const saida = arg("saida", join(process.cwd(), "rastreabilidade"));
  let dados;
  if (fonte === "arquivos") dados = carregarDosArquivos();
  else {
    const varDb = arg("db", Object.keys(process.env).filter((k) => /^ESCOLAS_DB_\d+_URL$/.test(k) && process.env[k]).sort()[0] ?? "ESCOLAS_DB_URL");
    if (!process.env[varDb]) { console.error(`Variável ${varDb} não definida. Use --db <VARIAVEL> ou --fonte arquivos.`); process.exit(1); }
    console.log(`Lendo o conteúdo global de ${varDb} (somente leitura)...`);
    dados = await carregarDoBanco(process.env[varDb]);
  }
  const r = analisar(dados);
  mkdirSync(saida, { recursive: true });
  const abas = { "Rastreabilidade": r.rastreio, "Caminhos regressivos": r.caminhos, "Pré-requisitos": r.ligacoes, "Amostras": r.amostras };
  for (const [nome, linhas] of Object.entries(abas)) writeFileSync(join(saida, `${nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-")}.csv`), csv(linhas));
  writeFileSync(join(saida, "dados.json"), JSON.stringify(r, null, 1));
  try {
    const XLSX = (await import("xlsx")).default;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Relatório de rastreabilidade — SpeakFlow Escolas"], ["Fonte", r.resumo.fonte], ["Gerado em", r.resumo.geradoEm], ...Object.entries(r.resumo).filter(([k]) => !["fonte", "geradoEm"].includes(k)).map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : v])]), "Resumo");
    for (const [nome, linhas] of Object.entries(abas)) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), nome);
    XLSX.writeFile(wb, join(saida, "rastreabilidade.xlsx"));
  } catch (e) { console.warn(`Planilha .xlsx não gerada (${e.message}); os CSV e o dados.json foram gravados.`); }
  console.log(JSON.stringify(r.resumo, null, 1));
  console.log(`Arquivos em ${saida}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error("Erro:", e.message); process.exit(1); });
}
