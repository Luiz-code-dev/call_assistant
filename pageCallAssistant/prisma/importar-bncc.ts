/**
 * Script de importação de habilidades BNCC a partir de CSV.
 * Uso: npx ts-node prisma/importar-bncc.ts <caminho-do-csv>
 *
 * Formato esperado do CSV (separador vírgula, cabeçalho obrigatório):
 *   code,subjectCode,stage,gradeYears,description,shortLabel
 *   EF01LP01,LP,EF,1,Reconhecer que palavras são...,Reconhecimento de palavras
 *   EF35LP07,LP,EF,3;4;5,Selecionar informações relevantes...,Seleção de informações
 *
 * gradeYears: anos separados por ponto-e-vírgula (ex: 3;4;5)
 * stage: EF (fundamental), EM (médio), EI (infantil), EJA
 */

import { PrismaClient } from "@prisma/client";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";

const db = new PrismaClient();

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Uso: npx ts-node prisma/importar-bncc.ts <caminho.csv>");
    process.exit(1);
  }

  const fullPath = path.resolve(csvPath);
  const rl = createInterface({ input: createReadStream(fullPath), crlfDelay: Infinity });

  let header: string[] | null = null;
  let created = 0;
  let updated = 0;
  let errors = 0;
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    if (!line.trim()) continue;
    const fields = line.split(",").map(f => f.trim().replace(/^"|"$/g, ""));

    if (!header) {
      header = fields;
      console.log("Cabeçalhos:", header.join(" | "));
      continue;
    }

    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = fields[i] ?? ""; });

    const { code, subjectCode, stage, gradeYears, description, shortLabel } = row;

    if (!code || !subjectCode || !stage || !gradeYears || !description) {
      console.warn(`Linha ${lineNum}: campos obrigatórios ausentes — ignorada`);
      errors++;
      continue;
    }

    const gradeYearsArr = gradeYears.split(";").map(Number).filter(n => !isNaN(n) && n > 0);

    try {
      const existing = await (db as any).eduSkill.findUnique({ where: { code } });
      if (existing) {
        await (db as any).eduSkill.update({
          where: { code },
          data: { subjectCode, stage, gradeYears: gradeYearsArr, description, shortLabel: shortLabel || null },
        });
        updated++;
      } else {
        await (db as any).eduSkill.create({
          data: { code, subjectCode, stage, gradeYears: gradeYearsArr, description, shortLabel: shortLabel || null },
        });
        created++;
      }
    } catch (e: any) {
      console.error(`Linha ${lineNum} (${code}): ${e.message?.slice(0, 80)}`);
      errors++;
    }
  }

  console.log(`\n✓ Concluído: ${created} criadas, ${updated} atualizadas, ${errors} erros.`);
  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
