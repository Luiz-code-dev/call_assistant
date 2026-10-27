import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Grid3x3, MessageSquare, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";
import { colors, radius } from "@/lib/theme";

// Minhas turmas (professor). As telas de gestao (gestor/coordenacao/direcao)
// ficam na web.
const TURMAS = [
  { id: "6b", nome: "6º B", escola: "EMEF Professor Demo Silva", alunos: 15, ajuda: 3 },
  { id: "7a", nome: "7º A", escola: "EMEF Professor Demo Silva", alunos: 14, ajuda: 1 },
];

export default function ProfessorHome() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <Text style={styles.title}>Minhas turmas</Text>
      {TURMAS.map((t) => (
        <View key={t.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.turma}>{t.nome}</Text>
              <Text style={styles.escola}>{t.escola}</Text>
            </View>
            <Text style={styles.alunos}>{t.alunos} alunos</Text>
          </View>
          {t.ajuda > 0 && <Text style={styles.ajuda}>{t.ajuda} aluno{t.ajuda !== 1 ? "s" : ""} precisa{t.ajuda === 1 ? "" : "m"} de ajuda</Text>}
          <View style={styles.actions}>
            <Pressable onPress={() => router.push("/professor/mapa" as never)} style={styles.action}>
              <Grid3x3 size={16} color={colors.action} /><Text style={styles.actionText}>Mapa da turma</Text><ChevronRight size={14} color={colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => router.push("/professor/retornos" as never)} style={styles.action}>
              <MessageSquare size={16} color={colors.action} /><Text style={styles.actionText}>Retornos para revisar</Text><ChevronRight size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, gap: 10 },
  rowBetween: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  turma: { fontSize: 18, fontWeight: "800", color: colors.text },
  escola: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  alunos: { fontSize: 12, color: colors.textMuted, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  ajuda: { fontSize: 13, color: colors.warn, fontWeight: "600" },
  actions: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  action: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  actionText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: "600" },
});
