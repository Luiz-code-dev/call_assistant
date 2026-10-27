import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import { colors, radius, masteryColor } from "@/lib/theme";

// Retornos para revisar (professor). Lista das ultimas entregas com o nivel
// sugerido pela IA; o professor pode abrir e, se preciso, corrigir o nivel.
const RETORNOS = [
  { id: "1", aluno: "Ana Souza", hab: "Frações: parte de um todo", nivel: "MASTERED", quando: "há 2h" },
  { id: "2", aluno: "Pedro Alves", hab: "Frações: parte de um todo", nivel: "NOT_YET", quando: "há 5h", travado: true },
  { id: "3", aluno: "Bruno Lima", hab: "Números decimais", nivel: "ALMOST", quando: "ontem" },
];

export default function Retornos() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 10 }}>
      <Text style={styles.title}>Retornos para revisar</Text>
      {RETORNOS.map((r) => {
        const m = masteryColor[r.nivel as keyof typeof masteryColor];
        return (
          <Pressable key={r.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={styles.aluno}>{r.aluno}</Text>
                {r.travado && <Text style={styles.travado}>travado</Text>}
              </View>
              <Text style={styles.hab}>{r.hab}</Text>
              <Text style={styles.quando}>{r.quando}</Text>
            </View>
            <View style={[styles.nivel, { backgroundColor: m.bg }]}><Text style={[styles.nivelText, { color: m.fg }]}>{m.label}</Text></View>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 4 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  aluno: { fontSize: 15, fontWeight: "700", color: colors.text },
  travado: { fontSize: 11, fontWeight: "700", color: colors.danger, backgroundColor: colors.dangerSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  hab: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  quando: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  nivel: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  nivelText: { fontSize: 12, fontWeight: "700" },
});
