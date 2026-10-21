/**
 * Deriva o idioma de transcrição (Whisper) e o ageGroup pedagógico
 * a partir do nome do componente curricular e do ano/etapa da turma.
 * Nunca aceita esses dados do navegador — tudo vem do banco.
 */

/** Mapa de palavras-chave no nome do componente → código ISO de idioma */
const LANG_KEYWORDS: [RegExp, string][] = [
  [/ingl[eê]s|inglesa|english/i, "en"],
  [/espanhol|espa[ñn]a|castellano/i, "es"],
  [/franc[eê]s|francesa|français/i, "fr"],
  [/alem[aã]o|deutsch/i, "de"],
];

export function subjectToWhisperLang(subjectName: string): string {
  for (const [re, lang] of LANG_KEYWORDS) {
    if (re.test(subjectName)) return lang;
  }
  return "pt";
}

export type AgeGroup = "ANOS_INICIAIS" | "ANOS_FINAIS" | "MEDIO";

export type EduStageName =
  | "EARLY_CHILDHOOD"
  | "ELEMENTARY_EARLY"
  | "ELEMENTARY_LATE"
  | "HIGH_SCHOOL"
  | "EJA";

export function stageToAgeGroup(stage: EduStageName, gradeYear: number): AgeGroup {
  if (stage === "HIGH_SCHOOL" || stage === "EJA") return "MEDIO";
  if (stage === "ELEMENTARY_LATE" || gradeYear >= 6) return "ANOS_FINAIS";
  return "ANOS_INICIAIS";
}
