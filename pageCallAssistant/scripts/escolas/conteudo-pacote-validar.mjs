#!/usr/bin/env node
/**
 * conteudo-pacote-validar.mjs
 * Valida os pacotes de conteúdo da demonstração antes do import.
 * Uso: node scripts/escolas/conteudo-pacote-validar.mjs
 * Retorna exit code 0 se tudo ok, 1 se há erros.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Fraction from 'fraction.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const TRILHAS_DIR = join(ROOT, 'prisma/data/conteudo/trilhas');
const DIAG_DIR = join(ROOT, 'prisma/data/conteudo/diagnosticos');
const BNCC_FILE = join(ROOT, 'prisma/data/bncc-ef.csv');

let errors = 0;
let warnings = 0;
function err(msg) { console.error(`  [ERRO] ${msg}`); errors++; }
function warn(msg) { console.warn(`  [AVISO] ${msg}`); warnings++; }
function ok(msg) { console.log(`  [ok] ${msg}`); }

// Carregar códigos BNCC válidos
let bnccCodes = new Set();
if (existsSync(BNCC_FILE)) {
  const lines = readFileSync(BNCC_FILE, 'utf8').split('\n').slice(1);
  for (const line of lines) {
    const code = line.split(',')[0]?.trim().replace(/"/g, '');
    if (code) bnccCodes.add(code);
  }
}

const FORBIDDEN = /demonstra[cç][aã]o|aguarda revis[aã]o|lorem ipsum/i;
// Palavras comuns que, sem acento, denunciam texto mal escrito (títulos e descrições)
const SEM_ACENTO = /\b(nao|sao|voce|tambem|entao|informacao|informacoes|questao|fracao|fracoes|agua|historia|ciencias|portugues|matematica|numero|numeros|avaliacao|diagnostica|diagnostico|evolucao|explicita|implicita|unitarias|representacao|comparacao|adicao|subtracao|multiplicacao|divisao|equivalencia)\b/i;
function semAcento(texto, onde) {
  const m = typeof texto === 'string' ? texto.match(SEM_ACENTO) : null;
  if (m) err(`${onde} sem acento: "${m[0]}" em "${texto.slice(0, 80)}"`);
}
const STEPS_ORDER = ['relembrar','exemplo_guiado','praticar','aplicar','explicar'];

// Calculadora de frações para verificar `check`
function checkFrac(check) {
  if (!check) return true;
  try {
    const a = new Fraction(check.a);
    const b = new Fraction(check.b);
    const expected = new Fraction(check.answer);
    let result;
    if (check.op === 'add') result = a.add(b);
    else if (check.op === 'sub') result = a.sub(b);
    else if (check.op === 'mul') result = a.mul(b);
    else if (check.op === 'div') result = a.div(b);
    else return true;
    return result.equals(expected);
  } catch { return false; }
}

function validateTrilha(t, file) {
  const prefix = `[${file}][${t.skillCode}]`;
  semAcento(t.title, `${prefix} título`);
  for (const a of t.activities ?? []) semAcento(a.title, `${prefix}[${a.id}] título`);
  if (bnccCodes.size > 0 && !bnccCodes.has(t.skillCode)) {
    err(`${prefix} skillCode não existe no bncc-ef.csv`);
  }
  const acts = t.activities ?? [];
  if (acts.length !== 5) {
    err(`${prefix} esperado 5 atividades, encontrado ${acts.length}`);
  }
  const steps = acts.map(a => a.step);
  for (let i = 0; i < STEPS_ORDER.length; i++) {
    if (steps[i] !== STEPS_ORDER[i]) {
      err(`${prefix} etapa ${i+1} esperada "${STEPS_ORDER[i]}", encontrada "${steps[i]}"`);
    }
  }
  const allEnunciados = new Set();
  for (const act of acts) {
    if (!act.audioScript) err(`${prefix}[${act.id}] falta audioScript`);
    if (FORBIDDEN.test(act.prompt ?? '')) err(`${prefix}[${act.id}] prompt contém texto proibido`);
    if (act.type === 'SPOKEN' || act.type === 'WRITTEN') {
      if (!act.rubric) err(`${prefix}[${act.id}] atividade explicar sem rubric`);
      continue;
    }
    const qs = act.questions ?? [];
    if (qs.length < 3) err(`${prefix}[${act.id}] quiz com menos de 3 questões (${qs.length})`);
    // Verificar distribuição de posição da correta (máx 40% na mesma posição)
    const positions = qs.map(q => q.correctIndex);
    const counts = [0,0,0,0];
    for (const p of positions) if (p >= 0 && p < 4) counts[p]++;
    const maxPct = Math.max(...counts) / qs.length;
    if (maxPct > 0.4) warn(`${prefix}[${act.id}] mais de 40% das corretas na mesma posição`);
    for (let qi = 0; qi < qs.length; qi++) {
      const q = qs[qi];
      if (!q.question) err(`${prefix}[${act.id}][Q${qi}] sem enunciado`);
      if (FORBIDDEN.test(q.question ?? '')) err(`${prefix}[${act.id}][Q${qi}] enunciado contém texto proibido`);
      if (allEnunciados.has(q.question)) err(`${prefix}[${act.id}][Q${qi}] enunciado repetido na mesma habilidade`);
      allEnunciados.add(q.question);
      if (!q.options || q.options.length < 4) err(`${prefix}[${act.id}][Q${qi}] menos de 4 alternativas`);
      if (q.correctIndex === undefined || q.correctIndex === null) err(`${prefix}[${act.id}][Q${qi}] sem correctIndex`);
      if (q.correctIndex < 0 || q.correctIndex >= (q.options?.length ?? 0)) err(`${prefix}[${act.id}][Q${qi}] correctIndex fora do intervalo`);
      for (let oi = 0; oi < (q.options?.length ?? 0); oi++) {
        if (oi !== q.correctIndex && !q.options[oi].misconceptionCode) {
          err(`${prefix}[${act.id}][Q${qi}][opção ${oi}] alternativa errada sem misconceptionCode`);
        }
      }
      if (!q.variants || q.variants.length < 2) err(`${prefix}[${act.id}][Q${qi}] menos de 2 variantes`);
      if (q.check && !checkFrac(q.check)) err(`${prefix}[${act.id}][Q${qi}] check falhou: ${JSON.stringify(q.check)}`);
    }
  }
}

function validateDiag(d, file) {
  const prefix = `[${file}][${d.id}]`;
  semAcento(d.titulo ?? d.title, `${prefix} título`);
  semAcento(d.descricao, `${prefix} descrição`);
  const items = d.items ?? [];
  if (items.length === 0) err(`${prefix} sem itens`);
  for (const item of items) {
    if (bnccCodes.size > 0 && !bnccCodes.has(item.skillCode)) {
      err(`${prefix}[${item.id}] skillCode inválido: ${item.skillCode}`);
    }
    if (!item.options || item.options.length < 4) err(`${prefix}[${item.id}] menos de 4 alternativas`);
    if (item.correctIndex === undefined || item.correctIndex < 0 || item.correctIndex >= (item.options?.length ?? 0)) {
      err(`${prefix}[${item.id}] correctIndex inválido`);
    }
    if (FORBIDDEN.test(item.question ?? '')) err(`${prefix}[${item.id}] enunciado contém texto proibido`);
    for (let oi = 0; oi < (item.options?.length ?? 0); oi++) {
      if (oi !== item.correctIndex && !item.options[oi].misconceptionCode) {
        err(`${prefix}[${item.id}][opção ${oi}] alternativa errada sem misconceptionCode`);
      }
    }
  }
}

// ── Main ──
console.log('\n=== Validador de pacotes de conteudo ===\n');

// Trilhas
const trilhaFiles = existsSync(TRILHAS_DIR) ? readdirSync(TRILHAS_DIR).filter(f => f.endsWith('.json') && f !== 'MA-06.json') : [];
let totalTrilhas = 0;
for (const file of trilhaFiles) {
  console.log(`Validando trilhas: ${file}`);
  const data = JSON.parse(readFileSync(join(TRILHAS_DIR, file), 'utf8'));
  const arr = Array.isArray(data) ? data : (data.trilhas ?? []);
  for (const t of arr) {
    validateTrilha(t, file);
    totalTrilhas++;
  }
  ok(`${arr.length} trilha(s) em ${file}`);
}

// Diagnósticos
const diagFiles = existsSync(DIAG_DIR) ? readdirSync(DIAG_DIR).filter(f => f.endsWith('.json')) : [];
let totalDiag = 0;
for (const file of diagFiles) {
  console.log(`Validando diagnostico: ${file}`);
  const d = JSON.parse(readFileSync(join(DIAG_DIR, file), 'utf8'));
  validateDiag(d, file);
  totalDiag++;
  ok(`${(d.items ?? []).length} item(s) em ${file}`);
}

console.log(`\nTotal: ${totalTrilhas} trilhas, ${totalDiag} diagnosticos`);
console.log(`Erros: ${errors} | Avisos: ${warnings}`);

if (errors > 0) {
  console.error('\n[FALHOU] Corrija os erros antes de importar.');
  process.exit(1);
} else {
  console.log('\n[PASSOU] Pacotes validos.');
  process.exit(0);
}
