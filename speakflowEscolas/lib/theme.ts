// Tokens visuais — iguais ao site speakflowescola.com.br e ao tema claro da web.
export const colors = {
  bg: "#F8F7FC",
  surface: "#FFFFFF",
  border: "#E9E5F5",
  borderStrong: "#DDD6EE",
  text: "#1F1A2E",
  textMuted: "#5B5470",
  action: "#6D28D9",
  actionHover: "#5B21B6",
  actionTint: "#4C1D95",
  actionSoft: "#EDE9FE",
  brandPink: "#BE185D",
  success: "#166534",
  successSoft: "#DCFCE7",
  warn: "#92400E",
  warnSoft: "#FEF3C7",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
};

// Cores por componente curricular (BNCC).
export const subjectColors: Record<string, string> = {
  EN: "#6D28D9", // Inglês
  LP: "#BE185D", PT: "#BE185D", // Português
  MA: "#1D4ED8", // Matemática
  CI: "#0F766E", // Ciências
  HI: "#C2410C", // História
  GE: "#15803D", // Geografia
  ES: "#A16207", // Espanhol
};

// Nível de domínio da habilidade.
export const masteryColor = {
  NOT_YET: { label: "Ainda não", fg: "#B91C1C", bg: "#FEE2E2" },
  ALMOST: { label: "Quase lá", fg: "#92400E", bg: "#FEF3C7" },
  MASTERED: { label: "Domina", fg: "#166534", bg: "#DCFCE7" },
};

export const radius = { card: 16, cardLg: 24, pill: 999, input: 12, btn: 12, sm: 8 };
// Botões do aluno: 52px.
export const touch = { aluno: 52, default: 44 };

// Fonte Inter (carregada no _layout via expo-font). Use nos estilos de texto.
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
  // Presets que podem ser espalhados em StyleSheet
  title:    { fontFamily: "Inter_700Bold",      fontWeight: "700" as const },
  subtitle: { fontFamily: "Inter_600SemiBold",  fontWeight: "600" as const },
  body:     { fontFamily: "Inter_400Regular",   fontWeight: "400" as const },
};
