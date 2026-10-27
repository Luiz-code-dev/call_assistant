import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, masteryColor } from "@/lib/theme";

// Mapa da turma: alunos × habilidades em verde/amarelo/vermelho/cinza.
const HABS = ["EF06MA07", "EF06MA08", "EF06MA09"];
const ALUNOS = [
  { nome: "Ana Souza", niveis: ["MASTERED", "ALMOST", "NOT_YET"] },
  { nome: "Bruno Lima", niveis: ["ALMOST", "ALMOST", "NONE"] },
  { nome: "Carla Dias", niveis: ["MASTERED", "MASTERED", "ALMOST"] },
  { nome: "Pedro Alves", niveis: ["NOT_YET", "NOT_YET", "NONE"] },
];
const cellColor = (n: string) => n === "NONE" ? "#EDEAF4" : masteryColor[n as keyof typeof masteryColor].bg;
const cellFg = (n: string) => n === "NONE" ? colors.textMuted : masteryColor[n as keyof typeof masteryColor].fg;

export default function MapaTurma() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}>
      <Text style={styles.title}>Mapa da turma · 6º B</Text>
      <Text style={styles.legend}>Verde Domina · Amarelo Quase lá · Vermelho Ainda não · Cinza não praticou</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <View style={[styles.nameCell, styles.headCell]}><Text style={styles.headText}>Aluno</Text></View>
            {HABS.map((h) => <View key={h} style={[styles.cell, styles.headCell]}><Text style={styles.headText}>{h}</Text></View>)}
          </View>
          {ALUNOS.map((a) => (
            <View key={a.nome} style={styles.bodyRow}>
              <View style={styles.nameCell}><Text style={styles.nameText}>{a.nome}</Text></View>
              {a.niveis.map((n, i) => (
                <View key={i} style={[styles.cell, { backgroundColor: cellColor(n) }]}>
                  <Text style={[styles.cellText, { color: cellFg(n) }]}>{n === "NONE" ? "—" : masteryColor[n as keyof typeof masteryColor].label}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  legend: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, overflow: "hidden", backgroundColor: colors.surface },
  headerRow: { flexDirection: "row", backgroundColor: colors.bg },
  bodyRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border },
  headCell: { backgroundColor: colors.bg },
  headText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  nameCell: { width: 130, padding: 10, justifyContent: "center", borderRightWidth: 1, borderRightColor: colors.border },
  nameText: { fontSize: 13, fontWeight: "600", color: colors.text },
  cell: { width: 92, padding: 10, alignItems: "center", justifyContent: "center" },
  cellText: { fontSize: 11, fontWeight: "700" },
});
