import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Mic, Sparkles, ArrowRight } from "lucide-react-native";
import { router } from "expo-router";
import { colors, radius, subjectColors, touch } from "@/lib/theme";

// "Minha trilha" — fiel ao cartão do topo do site (components/site/trail-mockup.tsx).
// Conteúdo ilustrativo por padrão; quando houver dados reais do aluno
// (GET /api/escola/aluno/trilhas) eles substituem os campos abaixo.
const STEPS = ["done", "done", "done", "current", "todo"] as const;

export default function MinhaTrilha() {
  const insets = useSafeAreaInsets();
  const ma = subjectColors.MA;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}>
      <View style={styles.card}>
        {/* topo: componente + "Minha trilha" */}
        <View style={styles.row}>
          <View style={[styles.chip, { backgroundColor: ma + "1A" }]}>
            <Text style={[styles.chipText, { color: ma }]}>Matemática · 6º ano</Text>
          </View>
          <Text style={styles.minhaTrilha}>Minha trilha</Text>
        </View>

        {/* habilidade */}
        <View style={{ marginTop: 16 }}>
          <Text style={styles.habLabel}>Habilidade</Text>
          <Text style={styles.habTitle}>Frações: parte de um todo</Text>
        </View>

        {/* progresso */}
        <View style={{ marginTop: 16, gap: 8 }}>
          <View style={styles.row}>
            <Text style={styles.progLabel}>3 de 5 atividades</Text>
            <Text style={[styles.progLabel, { color: colors.action }]}>60%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: "60%" }]} />
          </View>
          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <View
                key={i}
                style={[
                  styles.step,
                  s === "done" && { backgroundColor: colors.action },
                  s === "current" && { borderWidth: 2, borderColor: colors.brandPink, backgroundColor: "#FCE7F3" },
                  s === "todo" && { backgroundColor: "#EEE9F5" },
                ]}
              >
                {s === "done" ? <Check size={13} color="#FFFFFF" /> : <Text style={[styles.stepNum, s === "current" && { color: colors.brandPink }]}>{i + 1}</Text>}
              </View>
            ))}
          </View>
        </View>

        {/* onda de áudio: "Explique em áudio como pensou" */}
        <View style={styles.audioCard}>
          <View style={styles.micBtn}><Mic size={16} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.audioLabel}>Explique em áudio como pensou</Text>
            <View style={styles.wave}>
              {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 1, 0.7, 0.45, 0.85, 0.6, 0.95, 0.5].map((h, i) => (
                <View key={i} style={[styles.waveBar, { height: 6 + h * 16 }]} />
              ))}
            </View>
          </View>
        </View>

        {/* Retorno na hora */}
        <View style={styles.retorno}>
          <View style={styles.row}>
            <Sparkles size={15} color={colors.brandPink} />
            <Text style={styles.retornoTitle}>  Retorno na hora</Text>
          </View>
          <View style={[styles.line, { width: "92%", backgroundColor: colors.action + "40" }]} />
          <View style={[styles.line, { width: "66%", backgroundColor: colors.action + "40" }]} />
          <View style={[styles.line, { width: "75%", backgroundColor: colors.brandPink + "40" }]} />
        </View>
      </View>

      <Pressable onPress={() => router.push("/aluno/atividade" as never)} style={styles.continuar}>
        <Text style={styles.continuarText}>Continuar</Text>
        <ArrowRight size={18} color="#FFFFFF" />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, padding: 20 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chip: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: "700" },
  minhaTrilha: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  habLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  habTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 2 },
  progLabel: { fontSize: 12, fontWeight: "700", color: colors.text },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.actionSoft, overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.brandPink },
  steps: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  step: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 10, fontWeight: "800", color: colors.textMuted },
  audioCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F3F0FA", borderRadius: radius.card, padding: 12, marginTop: 16 },
  micBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandPink, alignItems: "center", justifyContent: "center" },
  audioLabel: { fontSize: 12, fontWeight: "700", color: colors.text },
  wave: { flexDirection: "row", alignItems: "center", gap: 3, height: 24, marginTop: 4 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: colors.action },
  retorno: { gap: 9, borderWidth: 1, borderColor: colors.action + "33", backgroundColor: colors.actionSoft, borderRadius: radius.card, padding: 16, marginTop: 16 },
  retornoTitle: { fontSize: 14, fontWeight: "700", color: colors.actionTint },
  line: { height: 8, borderRadius: radius.pill },
  continuar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 16, marginTop: 20, minHeight: touch.aluno },
  continuarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
