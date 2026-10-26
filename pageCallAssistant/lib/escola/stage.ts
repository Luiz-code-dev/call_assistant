import type { EduStage } from "./types";

/** Anos/séries válidos por etapa (BNCC + EJA por segmento). */
export const STAGE_YEARS: Record<EduStage, number[]> = {
  EARLY_CHILDHOOD: [1, 2, 3],
  ELEMENTARY_EARLY: [1, 2, 3, 4, 5],
  ELEMENTARY_LATE: [6, 7, 8, 9],
  HIGH_SCHOOL: [1, 2, 3],
  EJA: [1, 2, 3, 4, 5, 6, 7, 8, 9],
};

export function yearsForStage(stage: EduStage): number[] {
  return STAGE_YEARS[stage] ?? [];
}

export function yearAllowedForStage(stage: EduStage, year: number): boolean {
  return yearsForStage(stage).includes(year);
}

/** Extrai o número do ano a partir do nome ("7º B" -> 7), ou null. */
export function yearFromName(name: string): number | null {
  const m = name.match(/(\d{1,2})\s*º?/);
  return m ? parseInt(m[1], 10) : null;
}

/** Normaliza o nome para compor o código de acesso: "6º A" -> "6A". */
export function classNameSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Código de acesso gerado pelo sistema: SF{ano}-{nome}. */
export function buildAccessCode(year: number, name: string): string {
  return `SF${year}-${classNameSlug(name)}`;
}

/** Sugere o próximo nome livre "{ano}º {letra}" dado os nomes já usados. */
export function suggestClassName(year: number, usedNames: string[]): string {
  const used = new Set(
    usedNames
      .map((n) => {
        const m = n.match(/([A-Za-z])\s*$/);
        return m ? m[1].toUpperCase() : "";
      })
      .filter(Boolean)
  );
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!used.has(letter)) return `${year}º ${letter}`;
  }
  return `${year}º A`;
}
