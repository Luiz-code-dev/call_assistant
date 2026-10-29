#!/usr/bin/env node
/**
 * scripts/escolas/comparar-schemas.mjs
 *
 * Compara modelos Edu* do schema antigo (prisma/schema.prisma)
 * com o schema novo (prisma/escolas/schema.prisma).
 *
 * Saída vazia = nenhuma tabela, coluna ou enum renomeado/removido.
 * Saída não vazia = regressão detectada, não pode fazer merge.
 *
 * Uso: node scripts/escolas/comparar-schemas.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const OLD_SCHEMA = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
const NEW_SCHEMA = readFileSync(join(ROOT, "prisma/escolas/schema.prisma"), "utf8");

function parseModels(schema) {
  const models = {};
  const modelRegex = /^model\s+(Edu\w+)\s*\{([^}]+)\}/gm;
  let m;
  while ((m = modelRegex.exec(schema)) !== null) {
    const name = m[1];
    const body = m[2];
    const fields = {};
    for (const line of body.split("\n")) {
      const trim = line.trim();
      if (!trim || trim.startsWith("//") || trim.startsWith("@@") || trim.startsWith("@")) continue;
      const parts = trim.split(/\s+/);
      if (parts.length >= 2 && !["relation", "index", "unique"].includes(parts[0])) {
        const fieldName = parts[0];
        const fieldType = parts[1].replace("?", "").replace("[]", "");
        if (!fieldName.startsWith("@")) fields[fieldName] = fieldType;
      }
    }
    models[name] = fields;
  }
  return models;
}

function parseEnums(schema) {
  const enums = {};
  const enumRegex = /^enum\s+(\w+)\s*\{([^}]+)\}/gm;
  let m;
  while ((m = enumRegex.exec(schema)) !== null) {
    const name = m[1];
    const values = m[2].split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("//") && !l.startsWith("@"));
    enums[name] = values;
  }
  return enums;
}

const oldModels = parseModels(OLD_SCHEMA);
const newModels = parseModels(NEW_SCHEMA);
const oldEnums = parseEnums(OLD_SCHEMA);
const newEnums = parseEnums(NEW_SCHEMA);

const issues = [];

// Check: every old Edu* model must exist in new schema
for (const [modelName, oldFields] of Object.entries(oldModels)) {
  if (!newModels[modelName]) {
    issues.push(`MODELO REMOVIDO: ${modelName}`);
    continue;
  }
  const newFields = newModels[modelName];
  for (const [fieldName, oldType] of Object.entries(oldFields)) {
    if (!newFields[fieldName]) {
      issues.push(`CAMPO REMOVIDO: ${modelName}.${fieldName} (era ${oldType})`);
    }
  }
}

// Check: every enum used by Edu* models must still exist with all values
for (const [enumName, oldValues] of Object.entries(oldEnums)) {
  // Only check enums referenced by Edu* models
  const usedByEdu = Object.entries(oldModels).some(([, fields]) =>
    Object.values(fields).includes(enumName)
  );
  if (!usedByEdu) continue;
  if (!newEnums[enumName]) {
    issues.push(`ENUM REMOVIDO: ${enumName}`);
    continue;
  }
  for (const v of oldValues) {
    if (!newEnums[enumName].includes(v)) {
      issues.push(`VALOR DE ENUM REMOVIDO: ${enumName}.${v}`);
    }
  }
}

if (issues.length === 0) {
  console.log("OK — nenhuma tabela, coluna ou enum Edu* renomeado/removido.");
  process.exit(0);
} else {
  console.error(`FALHOU — ${issues.length} regressão(ões) detectada(s):`);
  for (const i of issues) console.error(" ", i);
  process.exit(1);
}
