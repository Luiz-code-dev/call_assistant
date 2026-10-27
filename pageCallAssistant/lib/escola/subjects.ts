// Mapa do codigo do componente -> nome em portugues + cor (tokens do site).
// Aceita as duas formas do projeto: codigo de 3 letras (ex.: "MAT") e as
// letras do codigo BNCC (ex.: "MA" em EF06MA07).
export interface SubjectInfo { name: string; color: string }

const BY_CODE: Record<string, SubjectInfo> = {
  POR: { name: "Língua Portuguesa", color: "#BE185D" }, LP: { name: "Língua Portuguesa", color: "#BE185D" }, PT: { name: "Língua Portuguesa", color: "#BE185D" },
  MAT: { name: "Matemática", color: "#1D4ED8" }, MA: { name: "Matemática", color: "#1D4ED8" },
  ING: { name: "Inglês", color: "#6D28D9" }, LI: { name: "Inglês", color: "#6D28D9" }, EN: { name: "Inglês", color: "#6D28D9" },
  CIE: { name: "Ciências", color: "#0F766E" }, CI: { name: "Ciências", color: "#0F766E" },
  HIS: { name: "História", color: "#C2410C" }, HI: { name: "História", color: "#C2410C" },
  GEO: { name: "Geografia", color: "#15803D" }, GE: { name: "Geografia", color: "#15803D" },
  ESP: { name: "Espanhol", color: "#A16207" }, ES: { name: "Espanhol", color: "#A16207" },
  ART: { name: "Arte", color: "#9333EA" }, AR: { name: "Arte", color: "#9333EA" },
  EDF: { name: "Educação Física", color: "#0369A1" }, EF: { name: "Educação Física", color: "#0369A1" },
  ENR: { name: "Ensino Religioso", color: "#64748B" }, ER: { name: "Ensino Religioso", color: "#64748B" },
};

export function subjectInfo(rawCode: string | null | undefined): SubjectInfo {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (BY_CODE[code]) return BY_CODE[code];
  // BNCC embutido (ex.: EF06MA07 -> "MA"); tenta extrair as 2 letras do meio.
  const bncc = code.match(/^EF\d{2}([A-Z]{2})/);
  if (bncc && BY_CODE[bncc[1]]) return BY_CODE[bncc[1]];
  // Primeiras 2-3 letras
  if (BY_CODE[code.slice(0, 3)]) return BY_CODE[code.slice(0, 3)];
  if (BY_CODE[code.slice(0, 2)]) return BY_CODE[code.slice(0, 2)];
  console.warn(`[subjects] código de componente desconhecido: "${rawCode}"`);
  return { name: rawCode || "Componente", color: "#5B5470" };
}
