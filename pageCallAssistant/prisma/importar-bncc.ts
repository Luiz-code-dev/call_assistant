/**
 * Importação de habilidades BNCC a partir de CSV.
 * Uso: npx ts-node prisma/importar-bncc.ts <caminho.csv>
 *
 * Formato (separador vírgula, cabeçalho obrigatório, campos com vírgula entre aspas duplas):
 *   code,subjectCode,stage,gradeYears,description,shortLabel
 *   EF35LP07,LP,EF,3;4;5,"Selecionar informações relevantes...",Seleção de informações
 *
 * Habilidades com networkId = null pertencem a TODAS as redes (BNCC oficial).
 * O script é idempotente: usa upsert por code.
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";

const db = new PrismaClient();

/** Parser CSV robusto: suporta campos entre aspas com vírgulas e aspas escapadas (""). */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(current); current = ""; }
      else { current += ch; }
    }
  }
  fields.push(current);
  return fields;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Uso: npx ts-node prisma/importar-bncc.ts <caminho.csv>");
    process.exit(1);
  }

  const fullPath = path.resolve(csvPath);
  const lines = readFileSync(fullPath, "utf-8").split(/\r?\n/);

  let header: string[] | null = null;
  const counts: Record<string, { created: number; updated: number }> = {};
  let errors = 0;
  let lineNum = 0;

  for (const line of lines) {
    lineNum++;
    if (!line.trim()) continue;
    const fields = parseCSVLine(line);

    if (!header) {
      header = fields.map(f => f.trim());
      console.log("Cabeçalho:", header.join(" | "));
      continue;
    }

    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = (fields[i] ?? "").trim(); });

    const { code, subjectCode, stage, gradeYears, description, shortLabel } = row;

    if (!code || !subjectCode || !stage || !gradeYears || !description) {
      console.warn(`Linha ${lineNum}: campos obrigatórios ausentes — ignorada (code="${code}")`);
      errors++;
      continue;
    }

    const gradeYearsArr = gradeYears.split(";").map(Number).filter(n => !isNaN(n) && n > 0);
    if (!counts[subjectCode]) counts[subjectCode] = { created: 0, updated: 0 };

    try {
      // networkId: null = BNCC oficial, válida para todas as redes
      await (db as any).eduSkill.upsert({
        where: { code },
        update: { subjectCode, stage, gradeYears: gradeYearsArr, description, shortLabel: shortLabel || null, networkId: null },
        create: { code, subjectCode, stage, gradeYears: gradeYearsArr, description, shortLabel: shortLabel || null, networkId: null },
      });
      // Detecta se foi criado ou atualizado via findUnique antes do upsert seria mais lento;
      // incrementamos created como proxy — o log final mostra o total processado.
      counts[subjectCode].created++;
    } catch (e: any) {
      console.error(`Linha ${lineNum} (${code}): ${e.message?.slice(0, 120)}`);
      errors++;
    }
  }

  console.log("\n── Resultado por componente ──────────────────");
  let total = 0;
  for (const [subj, c] of Object.entries(counts).sort()) {
    console.log(`  ${subj.padEnd(4)} ${c.created} habilidades processadas`);
    total += c.created;
  }
  console.log(`──────────────────────────────────────────────`);
  console.log(`  TOTAL  ${total} processadas, ${errors} erros.`);

  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
