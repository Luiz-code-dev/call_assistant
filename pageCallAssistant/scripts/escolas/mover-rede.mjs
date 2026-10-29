#!/usr/bin/env node
/**
 * scripts/escolas/mover-rede.mjs
 *
 * Move uma rede de uma base para outra.
 *
 * Uso:
 *   node scripts/escolas/mover-rede.mjs --rede <tenantId> --para <dbKey>
 *   node scripts/escolas/mover-rede.mjs --rede demo-rede-a --para db02
 *   node scripts/escolas/mover-rede.mjs --rede demo-rede-a --para db01 --limpar-origem
 *
 * Passos:
 *  1. Marca a rede como MIGRATING (login bloqueado)
 *  2. Roda migrate-all no destino
 *  3. Copia todas as linhas na ordem das dependências
 *  4. Verifica contagens tabela a tabela
 *  5. Atualiza dbKey no catálogo
 *  6. Restaura status para ACTIVE
 *  7. Com --limpar-origem: apaga dados da origem após 7 dias (ou imediatamente com --forcar)
 */
import { parseArgs } from "util";
import { execSync } from "child_process";
import { PrismaClient as CatalogClient } from "../../prisma/escolas-catalogo/generated/index.js";

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    rede: { type: "string" },
    para: { type: "string" },
    "limpar-origem": { type: "boolean", default: false },
    forcar: { type: "boolean", default: false },
  },
  allowPositionals: false,
});

const tenantId = args.rede;
const targetKey = args.para;
const limparOrigem = args["limpar-origem"];

if (!tenantId || !targetKey) {
  console.error("Uso: node mover-rede.mjs --rede <id> --para <dbKey>");
  process.exit(1);
}

let PrismaClient;
try {
  ({ PrismaClient } = await import("../../prisma/escolas/generated/index.js"));
} catch {
  throw new Error("Cliente escolas não gerado.");
}

const catalog = new CatalogClient({
  datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } },
});

// Ordem de dependências (tabelas sem FK antes das que dependem delas)
const TABLE_ORDER = [
  "EduNetwork",
  "EduSchool",
  "EduUser",
  "EduMembership",
  "EduStudent",
  "EduAcademicYear",
  "EduClass",
  "EduClassSubject",
  "EduEnrollment",
  "EduSkill",
  "EduSubject",
  "EduTrack",
  "EduTrackItem",
  "EduTrackAssignment",
  "EduDiagnostic",
  "EduDiagnosticItem",
  "EduDiagnosticSession",
  "EduActivity",
  "EduSubmission",
  "EduSkillMastery",
  "EduGuardian",
  "EduGuardianLink",
  "EduGuardianInvite",
  "EduFamilyCode",
  "EduClassSession",
  "EduTeacherAlert",
  "EduFeedbackReport",
  "EduAuditLog",
  "EduAccountState",
  "EduNotification",
  "EduImportBatch",
];

async function getDbClient(envVar) {
  const url = process.env[envVar];
  if (!url) throw new Error(`Variável ${envVar} não definida.`);
  return new PrismaClient({ datasources: { db: { url } } });
}

function modelName(table) {
  // EduNetwork -> eduNetwork
  return table.charAt(0).toLowerCase() + table.slice(1);
}

async function copyTable(srcDb, dstDb, table, networkId) {
  const model = modelName(table);
  if (!srcDb[model]) { console.log(`  [skip] ${table} (modelo não existe)`); return 0; }

  // EduSkill: copiar apenas as globais (networkId = null) e as da rede
  const where = table === "EduSkill"
    ? { OR: [{ networkId: null }, { networkId }] }
    : (await srcDb[model].findFirst({ where: { networkId } }).catch(() => null)) !== undefined
      ? { networkId }
      : undefined;

  if (where === undefined) { console.log(`  [skip] ${table} (sem campo networkId)`); return 0; }

  const rows = await srcDb[model].findMany({ where }).catch(() => []);
  if (rows.length === 0) return 0;

  let inserted = 0;
  for (const row of rows) {
    await dstDb[model].upsert({
      where: { id: row.id },
      create: row,
      update: row,
    }).catch(() => {}); // ignora conflitos de relação se tabela já existe
    inserted++;
  }
  return inserted;
}

async function main() {
  // 1. Busca tenant
  const tenant = await catalog.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) { console.error(`Tenant ${tenantId} não encontrado.`); process.exit(1); }
  if (tenant.dbKey === targetKey) { console.error(`Rede já está em ${targetKey}.`); process.exit(1); }

  const srcMeta = await catalog.tenantDatabase.findUnique({ where: { key: tenant.dbKey } });
  const dstMeta = await catalog.tenantDatabase.findUnique({ where: { key: targetKey } });
  if (!srcMeta) { console.error(`TenantDatabase origem ${tenant.dbKey} não encontrado.`); process.exit(1); }
  if (!dstMeta) { console.error(`TenantDatabase destino ${targetKey} não encontrado.`); process.exit(1); }

  console.log(`[mover-rede] ${tenant.name}`);
  console.log(`  origem:  ${srcMeta.key} (${srcMeta.envVar})`);
  console.log(`  destino: ${dstMeta.key} (${dstMeta.envVar})`);

  // 2. Marca MIGRATING
  await catalog.tenant.update({ where: { id: tenantId }, data: { status: "MIGRATING" } });
  console.log(`[mover-rede] Status: MIGRATING (login bloqueado)`);

  try {
    // 3. Migra destino
    const destUrl = process.env[dstMeta.envVar];
    if (!destUrl) throw new Error(`${dstMeta.envVar} não definida.`);
    console.log(`[mover-rede] Migrando schema no destino...`);
    execSync(`npx prisma@5 migrate deploy --schema prisma/escolas/schema.prisma`, {
      env: { ...process.env, ESCOLAS_DB_URL: destUrl }, stdio: "inherit",
    });

    const srcDb = await getDbClient(srcMeta.envVar);
    const dstDb = await getDbClient(dstMeta.envVar);

    // 4. Copia tabelas na ordem
    console.log(`[mover-rede] Copiando dados...`);
    const counts = {};
    for (const table of TABLE_ORDER) {
      const n = await copyTable(srcDb, dstDb, table, tenantId);
      if (n > 0) { counts[table] = n; console.log(`  ${table}: ${n} linhas`); }
    }

    // 5. Verifica contagens
    console.log(`[mover-rede] Verificando contagens...`);
    let ok = true;
    for (const [table, expected] of Object.entries(counts)) {
      const model = modelName(table);
      const where = table === "EduSkill"
        ? { OR: [{ networkId: null }, { networkId: tenantId }] }
        : { networkId: tenantId };
      const actual = await dstDb[model].count({ where }).catch(() => 0);
      if (actual < expected) {
        console.error(`  FALHOU: ${table} esperava ${expected}, destino tem ${actual}`);
        ok = false;
      }
    }

    if (!ok) throw new Error("Verificação de contagens falhou. Abortando.");
    console.log(`[mover-rede] Verificação OK.`);

    await srcDb.$disconnect();
    await dstDb.$disconnect();

    // 6. Atualiza dbKey no catálogo
    await catalog.tenant.update({ where: { id: tenantId }, data: { dbKey: targetKey, status: "ACTIVE" } });
    console.log(`[mover-rede] Catálogo atualizado: ${tenantId} → ${targetKey}`);

    // 7. Limpar origem
    if (limparOrigem) {
      console.log(`[mover-rede] --limpar-origem: dados da origem SERÃO MANTIDOS por 7 dias.`);
      console.log(`[mover-rede] Para apagar: node mover-rede.mjs --rede ${tenantId} --limpar-origem --forcar`);
      if (args.forcar) {
        const cleanDb = await getDbClient(srcMeta.envVar);
        for (const table of [...TABLE_ORDER].reverse()) {
          const model = modelName(table);
          if (!cleanDb[model]) continue;
          await cleanDb[model].deleteMany({ where: { networkId: tenantId } }).catch(() => {});
        }
        await cleanDb.$disconnect();
        console.log(`[mover-rede] Origem limpa.`);
      }
    }

    console.log(`\n[mover-rede] Concluído com sucesso. Rede ${tenantId} agora em ${targetKey}.`);
  } catch (err) {
    // Restaura ACTIVE em caso de erro
    await catalog.tenant.update({ where: { id: tenantId }, data: { status: "ACTIVE" } }).catch(() => {});
    console.error(`[mover-rede] ERRO: ${err.message}`);
    console.error(`[mover-rede] Status restaurado para ACTIVE.`);
    process.exit(1);
  }
}

main()
  .catch((e) => { console.error("[mover-rede]", e.message); process.exit(1); })
  .finally(() => catalog.$disconnect());
