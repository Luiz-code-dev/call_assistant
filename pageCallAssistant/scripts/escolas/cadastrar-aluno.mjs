#!/usr/bin/env node
/**
 * Cadastra um aluno real numa rede, com os códigos de acesso, sem gravar dados pessoais no Git.
 * O nome e a data de nascimento chegam só pelos argumentos, na hora de rodar.
 *
 * Uso (no console do Railway, onde as URLs dos bancos já estão nas variáveis):
 *   node scripts/escolas/cadastrar-aluno.mjs --rede B --ano 7 \
 *     --nome "Nome Completo do Aluno" --nascimento 2011-12-11 [--turma "7º Ano A"] [--turno MORNING]
 *     [--matricula 2026-0001] [--dry-run]
 *
 * O que faz (idempotente: rodar de novo para o mesmo aluno não duplica):
 *  1. acha a rede no catálogo e o banco dela;
 *  2. usa a escola e o ano letivo atual da rede; acha ou cria a turma do ano pedido;
 *  3. cria o aluno (ou reaproveita, se já houver mesmo nome e nascimento) e matricula na turma;
 *  4. gera o código do aluno (ABCD-2345) e registra no catálogo;
 *  5. gera um PIN novo de 4 dígitos;
 *  6. gera o código da família (QR da ficha): 3 cadastros, vale 120 dias, registra no catálogo;
 *  7. mostra os códigos na tela. Nada é enviado para fora.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomInt } from "node:crypto";

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

// ── Mesmas regras de lib/escola/codigo-aluno.ts e lib/escola/familia.ts ─────────
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TAMANHO = 8;
const FAMILIA_DIAS = 120;
const FAMILIA_CADASTROS = 3;
const PINS_FRACOS = new Set(["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "4321", "1212", "0123", "9876"]);

const gerar = (n = TAMANHO) => Array.from({ length: n }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
const comTraco = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;
const hashFamilia = (c) => createHash("sha256").update(c.replace(/[\s-]/g, "").toUpperCase()).digest("hex");
const chaveFamilia = (h) => `FAM${h.toUpperCase()}`;
function gerarPin() { let p; do { p = String(randomInt(10000)).padStart(4, "0"); } while (PINS_FRACOS.has(p)); return p; }

// ── Argumentos ───────────────────────────────────────────────────────────────
function args() {
  const a = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) continue;
    const k = a[i].slice(2);
    if (k === "dry-run" || k === "help") { o[k] = true; continue; }
    o[k] = a[i + 1]; i++;
  }
  return o;
}
const REDES = { A: "demo-rede-a", B: "demo-rede-b" };

function validar(o) {
  const erros = [];
  if (!o.nome || o.nome.trim().split(/\s+/).length < 2) erros.push("--nome com nome e sobrenome");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.nascimento ?? "") || isNaN(new Date(`${o.nascimento}T12:00:00Z`).getTime())) erros.push("--nascimento no formato AAAA-MM-DD");
  const ano = Number(o.ano);
  if (!Number.isInteger(ano) || ano < 1 || ano > 9) erros.push("--ano de 1 a 9 (Ensino Fundamental)");
  if (!o.rede) erros.push("--rede (A, B ou o id da rede)");
  if (o.turno && !["MORNING", "AFTERNOON", "EVENING", "FULL_TIME"].includes(o.turno)) erros.push("--turno MORNING, AFTERNOON, EVENING ou FULL_TIME");
  return erros;
}

async function main() {
  const o = args();
  if (o.help) { console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]); return; }
  const erros = validar(o);
  if (erros.length) { console.error(`Faltou: ${erros.join("; ")}.\nUse --help para ver o exemplo.`); process.exit(1); }

  const networkId = REDES[o.rede] ?? o.rede;
  const nome = o.nome.trim().replace(/\s+/g, " ");
  const nascimento = new Date(`${o.nascimento}T12:00:00Z`);
  const ano = Number(o.ano);
  const turmaNome = (o.turma ?? `${ano}º Ano A`).trim();
  const etapa = ano <= 5 ? "ELEMENTARY_EARLY" : "ELEMENTARY_LATE";
  const seco = !!o["dry-run"];

  if (!process.env.ESCOLAS_CATALOG_URL) { console.error("ESCOLAS_CATALOG_URL não está definida. Rode no console do Railway."); process.exit(1); }
  const { PrismaClient: CatalogClient } = await import("@prisma/escolas-catalogo");
  const { PrismaClient: TenantClient } = await import("@prisma/escolas");
  const catalog = new CatalogClient({ datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } } });

  try {
    const tenant = await catalog.tenant.findUnique({ where: { id: networkId } });
    if (!tenant) throw new Error(`Rede "${networkId}" não existe no catálogo.`);
    const banco = await catalog.tenantDatabase.findUnique({ where: { key: tenant.dbKey } });
    const url = banco?.envVar ? process.env[banco.envVar] : null;
    if (!url) throw new Error(`Variável do banco da rede (${banco?.envVar ?? tenant.dbKey}) não definida.`);
    const db = new TenantClient({ datasources: { db: { url } } });

    try {
      const escola = await db.eduSchool.findFirst({ where: { networkId, isActive: true } });
      if (!escola) throw new Error("A rede não tem escola ativa.");
      const anoLetivo = await db.eduSchoolYear.findFirst({ where: { networkId, isCurrent: true } });
      if (!anoLetivo) throw new Error("A rede não tem ano letivo atual.");

      console.log(`\nRede: ${tenant.name}\nEscola: ${escola.name}\nAno letivo: ${anoLetivo.year}`);
      if (seco) console.log("(simulação: nada será gravado)");

      // Turma
      let turma = await db.eduClass.findFirst({ where: { networkId, schoolYearId: anoLetivo.id, gradeYear: ano, name: turmaNome } });
      if (!turma) {
        let codigoTurma;
        do { codigoTurma = gerar(6); } while (await catalog.codeIndex.findUnique({ where: { code: codigoTurma } }) || await db.eduClass.findFirst({ where: { accessCode: codigoTurma } }));
        console.log(`Turma "${turmaNome}" não existe: ${seco ? "seria criada" : "criando"}.`);
        if (!seco) {
          turma = await db.eduClass.create({
            data: {
              networkId, name: turmaNome, gradeYear: ano, stage: etapa, shift: o.turno ?? "MORNING", isActive: true, accessCode: codigoTurma,
              school: { connect: { id: escola.id } }, schoolYear: { connect: { id: anoLetivo.id } },
            },
          });
          await catalog.codeIndex.upsert({ where: { code: codigoTurma }, create: { code: codigoTurma, kind: "CLASS_ACCESS", tenantId: networkId }, update: { tenantId: networkId } });
        }
      } else {
        console.log(`Turma: ${turma.name} (já existe)`);
      }

      // Aluno (reaproveita se já houver mesmo nome e nascimento)
      const iguais = await db.eduStudent.findMany({ where: { networkId, fullName: nome } });
      let aluno = iguais.find((s) => s.birthDate && new Date(s.birthDate).toISOString().slice(0, 10) === o.nascimento) ?? null;
      const pin = gerarPin();
      const { default: bcrypt } = await import("bcryptjs");
      let codigoAluno = aluno?.accessCode ?? null;
      if (!codigoAluno) {
        do { codigoAluno = gerar(); } while (await catalog.codeIndex.findUnique({ where: { code: codigoAluno } }) || await db.eduStudent.findFirst({ where: { accessCode: codigoAluno } }));
      }
      if (seco) {
        console.log(aluno ? "Aluno já existe: geraria PIN e código da família novos." : "Aluno seria criado.");
        return;
      }
      if (!aluno) {
        const matricula = (o.matricula ?? `R${anoLetivo.year}${gerar(5)}`).trim();
        aluno = await db.eduStudent.create({
          data: { networkId, fullName: nome, enrollmentCode: matricula, birthDate: nascimento, pinHash: bcrypt.hashSync(pin, 10), isActive: true, accessCode: codigoAluno },
        });
        console.log("Aluno criado.");
      } else {
        aluno = await db.eduStudent.update({ where: { id: aluno.id }, data: { pinHash: bcrypt.hashSync(pin, 10), isActive: true, accessCode: codigoAluno } });
        console.log("Aluno já existia: PIN novo gerado.");
      }
      await catalog.codeIndex.upsert({ where: { code: codigoAluno }, create: { code: codigoAluno, kind: "STUDENT_ACCESS", tenantId: networkId }, update: { kind: "STUDENT_ACCESS", tenantId: networkId } });

      // Matrícula ativa na turma
      const ativa = await db.eduEnrollment.findFirst({ where: { networkId, studentId: aluno.id, classId: turma.id, status: "ACTIVE" } });
      if (!ativa) {
        await db.eduEnrollment.create({ data: { networkId, studentId: aluno.id, classId: turma.id, schoolYearId: anoLetivo.id, status: "ACTIVE" } });
        console.log(`Matriculado em ${turma.name}.`);
      }

      // Código da família (QR da ficha)
      let codigoFamilia, hash;
      do { codigoFamilia = gerar(); hash = hashFamilia(codigoFamilia); } while (await catalog.codeIndex.findUnique({ where: { code: chaveFamilia(hash) } }));
      const expira = new Date(Date.now() + FAMILIA_DIAS * 86_400_000);
      const antigo = await db.eduFamilyCode.findUnique({ where: { studentId: aluno.id } });
      await db.eduFamilyCode.upsert({
        where: { studentId: aluno.id },
        create: { networkId, studentId: aluno.id, codeHash: hash, activationsLeft: FAMILIA_CADASTROS, expiresAt: expira },
        update: { codeHash: hash, activationsLeft: FAMILIA_CADASTROS, expiresAt: expira, failedCount: 0, lockedUntil: null },
      });
      if (antigo?.codeHash) await catalog.codeIndex.delete({ where: { code: chaveFamilia(antigo.codeHash) } }).catch(() => null);
      await catalog.codeIndex.upsert({ where: { code: chaveFamilia(hash) }, create: { code: chaveFamilia(hash), kind: "FAMILY_CODE", tenantId: networkId, expiresAt: expira }, update: { tenantId: networkId, expiresAt: expira } });

      const base = "https://www.speakflow.ia.br";
      console.log(`
──────────────────────────────────────────────
 ${nome}
 Turma: ${turma.name} · nascimento ${o.nascimento.split("-").reverse().join("/")}
──────────────────────────────────────────────
 Código do aluno:   ${comTraco(codigoAluno)}
 PIN do aluno:      ${pin}
 Código da família: ${comTraco(codigoFamilia)}  (${FAMILIA_CADASTROS} cadastros, vale até ${expira.toLocaleDateString("pt-BR")})

 Entrada do aluno:  ${base}/escola/aluno/entrar?codigo=${codigoAluno}
 Ficha da família:  ${base}/escola/familia/primeiro-acesso?codigo=${codigoFamilia}
──────────────────────────────────────────────
Guarde estes códigos: o PIN e o código da família não ficam visíveis depois.
`);
    } finally {
      await db.$disconnect();
    }
  } finally {
    await catalog.$disconnect();
  }
}

main().catch((e) => { console.error(`\nErro: ${e.message}`); process.exit(1); });
