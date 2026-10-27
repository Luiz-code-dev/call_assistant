import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lightbulb } from "lucide-react-native";
import { colors, radius, subjectColors } from "@/lib/theme";

// Painel da família — fiel à seção "A família acompanha cada passo" do site
// (components/site/family.tsx). Conteúdo ilustrativo; dados reais vêm de
// GET /api/escola/familia/filhos e /familia/evolucao/[studentId].
const CHILDREN = [
  { id: "ana", chip: "Ana · 6º B", days: 4, week: "Ana praticou 4 dias esta semana. Muito bem!", subject: "Matemática", skill: "Frações: parte de um todo", progress: [3, 5], mastery: [5, 2, 1], tip: "Peça para ela explicar o que é 3/4 usando uma pizza." },
  { id: "pedro", chip: "Pedro · 3º A", days: 2, week: "Pedro praticou 2 dias esta semana.", subject: "Língua Portuguesa", skill: "Leitura de palavras com sílabas complexas", progress: [1, 4], mastery: [3, 3, 2], tip: "Leia junto com ele uma história curta antes de dormir." },
];
const WEEK_DAYS = ["S", "T", "Q", "Q", "S", "S", "D"];
const MASTERY = [
  { label: "Domina", color: subjectColors.GE },
  { label: "Quase lá", color: subjectColors.ES },
  { label: "Ainda não", color: subjectColors.HI },
];

export default function FamiliaPainel() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(0);
  const child = CHILDREN[active];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 12 }}>
      <Text style={styles.ola}>Olá, Maria</Text>

      {/* seletor de filhos */}
      <View style={styles.chips}>
        {CHILDREN.map((c, i) => (
          <Pressable key={c.id} onPress={() => setActive(i)} style={[styles.chip, i === active ? { backgroundColor: colors.action } : { backgroundColor: "#EFEAF8" }]}>
            <Text style={[styles.chipText, { color: i === active ? "#FFFFFF" : colors.text }]}>{c.chip}</Text>
          </Pressable>
        ))}
      </View>

      {/* Esta semana */}
      <View style={styles.cardIn}>
        <Text style={styles.cardLabel}>Esta semana</Text>
        <View style={styles.week}>
          {WEEK_DAYS.map((d, i) => (
            <View key={i} style={{ alignItems: "center", gap: 4 }}>
              <View style={[styles.dot, i < child.days ? { backgroundColor: colors.action } : { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bg }]} />
              <Text style={styles.dayLabel}>{d}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.weekText}>{child.week}</Text>
      </View>

      {/* Trilha atual */}
      <View style={styles.cardIn}>
        <Text style={styles.cardLabel}>Trilha atual · {child.subject}</Text>
        <Text style={styles.skill}>{child.skill}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.track}><View style={[styles.trackFill, { width: `${(child.progress[0] / child.progress[1]) * 100}%` }]} /></View>
          <Text style={styles.progText}>{child.progress[0]} de {child.progress[1]}</Text>
        </View>
      </View>

      {/* Evolução */}
      <View style={styles.cardIn}>
        <Text style={styles.cardLabel}>Evolução</Text>
        <View style={styles.masteryRow}>
          {MASTERY.map((m, i) => (
            <View key={m.label} style={[styles.mChip, { backgroundColor: m.color + "1A" }]}>
              <Text style={[styles.mChipText, { color: m.color }]}>{m.label} {child.mastery[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Como ajudar */}
      <View style={styles.ajudar}>
        <Lightbulb size={16} color={subjectColors.ES} />
        <Text style={styles.ajudarText}><Text style={{ fontWeight: "700" }}>Como ajudar: </Text>{child.tip}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ola: { fontSize: 20, fontWeight: "800", color: colors.text },
  chips: { flexDirection: "row", gap: 8 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: "700" },
  cardIn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 14, gap: 8 },
  cardLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  week: { flexDirection: "row", justifyContent: "space-between" },
  dot: { width: 20, height: 20, borderRadius: 10 },
  dayLabel: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
  weekText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  skill: { fontSize: 14, fontWeight: "700", color: colors.text },
  track: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: "#EFEAF8", overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.action },
  progText: { fontSize: 12, fontWeight: "700", color: colors.text },
  masteryRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  mChip: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  mChipText: { fontSize: 12, fontWeight: "700" },
  ajudar: { flexDirection: "row", gap: 8, backgroundColor: subjectColors.ES + "14", borderRadius: radius.card, padding: 14 },
  ajudarText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
});
