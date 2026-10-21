/**
 * BNCC Curriculum Matrix Seed
 * Seeds default subject + curriculum items for Anos Iniciais, Anos Finais and EJA.
 * Runs as a standalone script or imported by seed-escolas.ts.
 * Safe to run multiple times (upsert).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedBnccMatrix(prisma: any, networkId: string) {
  // ── Subjects (BNCC areas) ─────────────────────────────────────────────────
  const subjectDefs = [
    { name: "Língua Portuguesa",         area: "Linguagens",                        color: "#2563EB" },
    { name: "Arte",                      area: "Linguagens",                        color: "#7C3AED" },
    { name: "Educação Física",           area: "Linguagens",                        color: "#059669" },
    { name: "Língua Inglesa",            area: "Linguagens",                        color: "#0891B2" },
    { name: "Matemática",                area: "Matemática",                        color: "#D97706" },
    { name: "Ciências",                  area: "Ciências da Natureza",              color: "#65A30D" },
    { name: "Biologia",                  area: "Ciências da Natureza",              color: "#16A34A" },
    { name: "Física",                    area: "Ciências da Natureza",              color: "#0D9488" },
    { name: "Química",                   area: "Ciências da Natureza",              color: "#0891B2" },
    { name: "História",                  area: "Ciências Humanas",                  color: "#DC2626" },
    { name: "Geografia",                 area: "Ciências Humanas",                  color: "#EA580C" },
    { name: "Ensino Religioso",          area: "Ciências Humanas",                  color: "#9333EA" },
    { name: "Filosofia",                 area: "Ciências Humanas",                  color: "#6366F1" },
    { name: "Sociologia",                area: "Ciências Humanas",                  color: "#8B5CF6" },
    { name: "Educação Financeira",       area: "Itinerário Formativo",              color: "#F59E0B" },
    { name: "Projeto de Vida",           area: "Itinerário Formativo",              color: "#EC4899" },
  ];

  const subjectMap: Record<string, string> = {};
  for (const s of subjectDefs) {
    const subject = await prisma.eduSubject.upsert({
      where: { networkId_name: { networkId, name: s.name } },
      create: { networkId, ...s },
      update: { area: s.area, color: s.color },
    });
    subjectMap[s.name] = subject.id;
  }

  // ── Helper: upsert curriculum item ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function ci(subjectName: string, stage: string, gradeYear: number, weeklyHours: number, shift: any = null) {
    const subjectId = subjectMap[subjectName];
    if (!subjectId) return;
    await prisma.eduCurriculumItem.upsert({
      where: { networkId_subjectId_stage_gradeYear_shift: { networkId, subjectId, stage, gradeYear, shift } },
      create: { networkId, subjectId, stage, gradeYear, shift, weeklyHours },
      update: { weeklyHours },
    });
  }

  // ── Anos Iniciais (ELEMENTARY_EARLY) — 1º ao 5º ano ─────────────────────
  // 1º e 2º ano — Alfabetização
  for (const y of [1, 2]) {
    await ci("Língua Portuguesa",  "ELEMENTARY_EARLY", y, 8);
    await ci("Matemática",         "ELEMENTARY_EARLY", y, 6);
    await ci("Ciências",           "ELEMENTARY_EARLY", y, 2);
    await ci("História",           "ELEMENTARY_EARLY", y, 2);
    await ci("Geografia",          "ELEMENTARY_EARLY", y, 2);
    await ci("Arte",               "ELEMENTARY_EARLY", y, 2);
    await ci("Educação Física",    "ELEMENTARY_EARLY", y, 3);
    await ci("Ensino Religioso",   "ELEMENTARY_EARLY", y, 1);
  }
  // 3º ao 5º ano
  for (const y of [3, 4, 5]) {
    await ci("Língua Portuguesa",  "ELEMENTARY_EARLY", y, 7);
    await ci("Matemática",         "ELEMENTARY_EARLY", y, 6);
    await ci("Ciências",           "ELEMENTARY_EARLY", y, 3);
    await ci("História",           "ELEMENTARY_EARLY", y, 2);
    await ci("Geografia",          "ELEMENTARY_EARLY", y, 2);
    await ci("Arte",               "ELEMENTARY_EARLY", y, 2);
    await ci("Educação Física",    "ELEMENTARY_EARLY", y, 3);
    await ci("Ensino Religioso",   "ELEMENTARY_EARLY", y, 1);
  }

  // ── Anos Finais (ELEMENTARY_LATE) — 6º ao 9º ano ────────────────────────
  for (const y of [6, 7, 8, 9]) {
    await ci("Língua Portuguesa",  "ELEMENTARY_LATE", y, 5);
    await ci("Língua Inglesa",     "ELEMENTARY_LATE", y, 2);
    await ci("Matemática",         "ELEMENTARY_LATE", y, 5);
    await ci("Ciências",           "ELEMENTARY_LATE", y, 3);
    await ci("História",           "ELEMENTARY_LATE", y, 3);
    await ci("Geografia",          "ELEMENTARY_LATE", y, 3);
    await ci("Arte",               "ELEMENTARY_LATE", y, 2);
    await ci("Educação Física",    "ELEMENTARY_LATE", y, 2);
    await ci("Ensino Religioso",   "ELEMENTARY_LATE", y, 1);
  }

  // ── Ensino Médio (HIGH_SCHOOL) — 1º ao 3º ano ───────────────────────────
  for (const y of [1, 2, 3]) {
    await ci("Língua Portuguesa",  "HIGH_SCHOOL", y, 4);
    await ci("Língua Inglesa",     "HIGH_SCHOOL", y, 2);
    await ci("Arte",               "HIGH_SCHOOL", y, 1);
    await ci("Educação Física",    "HIGH_SCHOOL", y, 2);
    await ci("Matemática",         "HIGH_SCHOOL", y, 4);
    await ci("Física",             "HIGH_SCHOOL", y, 2);
    await ci("Química",            "HIGH_SCHOOL", y, 2);
    await ci("Biologia",           "HIGH_SCHOOL", y, 2);
    await ci("História",           "HIGH_SCHOOL", y, 2);
    await ci("Geografia",          "HIGH_SCHOOL", y, 2);
    await ci("Filosofia",          "HIGH_SCHOOL", y, 1);
    await ci("Sociologia",         "HIGH_SCHOOL", y, 1);
    await ci("Projeto de Vida",    "HIGH_SCHOOL", y, 1);
  }

  // ── EJA — segmentos I (1-4) e II (5-8) ──────────────────────────────────
  for (const y of [1, 2, 3, 4]) {
    await ci("Língua Portuguesa",  "EJA", y, 6);
    await ci("Matemática",         "EJA", y, 5);
    await ci("Ciências",           "EJA", y, 2);
    await ci("História",           "EJA", y, 2);
    await ci("Geografia",          "EJA", y, 2);
    await ci("Arte",               "EJA", y, 1);
    await ci("Educação Física",    "EJA", y, 2);
  }
  for (const y of [5, 6, 7, 8]) {
    await ci("Língua Portuguesa",  "EJA", y, 4);
    await ci("Língua Inglesa",     "EJA", y, 2);
    await ci("Matemática",         "EJA", y, 4);
    await ci("Ciências",           "EJA", y, 3);
    await ci("História",           "EJA", y, 2);
    await ci("Geografia",          "EJA", y, 2);
    await ci("Arte",               "EJA", y, 1);
    await ci("Educação Física",    "EJA", y, 2);
  }
}
