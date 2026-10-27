import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, subjectColors, masteryColor } from "@/lib/theme";

// Minha evolução — habilidades por componente, com o nível e o que mudou
// desde o diagnóstico. Sem comparação com colegas.
const COMPONENTES = [
  {
    code: "MA", nome: "Matemática",
    habilidades: [
      { label: "Frações: parte de um todo", nivel: "MASTERED", mudou: "de Ainda não → Domina" },
      { label: "Números decimais", nivel: "ALMOST", mudou: "de Ainda não → Quase lá" },
      { label: "Porcentagem", nivel: "NOT_YET", mudou: null },
    ],
  },
  {
    code: "LP", nome: "Língua Portuguesa",
    habilidades: [
      { label: "Interpretação de texto", nivel: "MASTERED", mudou: null },
      { label: "Pontuação", nivel: "ALMOST", mudou: "de Ainda não → Quase lá" },
    ],
  },
];

export default function Evolucao() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 16 }}>
      <Text style={styles.title}>Minha evolução</Text>
      {COMPONENTES.map((c) => {
        const cor = subjectColors[c.code] ?? colors.action;
        return (
          <View key={c.code} style={styles.card}>
            <View style={[styles.chip, { backgroundColor: cor + "1A", alignSelf: "flex-start" }]}>
              <Text style={[styles.chipText, { color: cor }]}>{c.nome}</Text>
            </View>
            {c.habilidades.map((h, i) => {
              const m = masteryColor[h.nivel as keyof typeof masteryColor];
              return (
                <View key={i} style={styles.hab}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.habLabel}>{h.label}</Text>
                    {h.mudou && <Text style={styles.mudou}>{h.mudou}</Text>}
                  </View>
                  <View style={[styles.nivel, { backgroundColor: m.bg }]}>
                    <Text style={[styles.nivelText, { color: m.fg }]}>{m.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, gap: 10 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: "700" },
  hab: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  habLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  mudou: { fontSize: 12, color: colors.success, marginTop: 2 },
  nivel: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  nivelText: { fontSize: 12, fontWeight: "700" },
});
