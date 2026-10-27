import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ArrowRight, RotateCcw, Flag } from "lucide-react-native";
import { colors, radius, masteryColor, touch } from "@/lib/theme";

// Tela de Retorno — fiel à demonstração do site e ao PROMPT (secao 5).
// Conteudo ilustrativo; dados reais vem do processamento da IA.
const NIVEL: keyof typeof masteryColor = "ALMOST";
const ACERTOS = ["Você identificou que 3/4 é mais que a metade.", "Usou um exemplo do dia a dia (pizza)."];
const MELHORAR = ["Explique por que o numerador é 3 e o denominador é 4.", "Mostre as 4 partes iguais do todo."];
const EXEMPLO = "3/4 significa dividir um todo em 4 partes iguais e pegar 3 delas. Em uma pizza de 4 fatias, são 3 fatias.";

export default function Retorno() {
  const insets = useSafeAreaInsets();
  const m = masteryColor[NIVEL];

  function reportar() {
    Alert.alert(
      "Reportar este retorno",
      "O relato vai para o seu professor e para a Codevelop. Deseja reportar este retorno?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Reportar", style: "destructive", onPress: () => Alert.alert("Obrigado", "O professor vai analisar este retorno.") },
      ],
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 14 }}>
      {/* habilidade + anel de dominio */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.habLabel}>Habilidade trabalhada</Text>
          <Text style={styles.habTitle}>Frações: parte de um todo</Text>
        </View>
        <View style={[styles.ring, { borderColor: m.fg, backgroundColor: m.bg }]}>
          <Text style={[styles.ringText, { color: m.fg }]}>{m.label}</Text>
        </View>
      </View>

      <Bloco titulo="O que você acertou" cor={colors.success} itens={ACERTOS} />
      <Bloco titulo="Como melhorar" cor={colors.warn} itens={MELHORAR} />

      <View style={styles.card}>
        <Text style={styles.blocoTitle}>Exemplo de resposta</Text>
        <Text style={styles.exemplo}>{EXEMPLO}</Text>
      </View>

      <Text style={styles.profNote}>O professor acompanha este retorno no painel da turma.</Text>

      <Pressable onPress={() => {}} style={styles.primary}>
        <Text style={styles.primaryText}>Próxima atividade da trilha</Text>
        <ArrowRight size={18} color="#FFFFFF" />
      </Pressable>
      <Pressable onPress={() => {}} style={styles.secondary}>
        <RotateCcw size={16} color={colors.action} />
        <Text style={styles.secondaryText}>Tentar de novo</Text>
      </Pressable>
      <Pressable onPress={reportar} style={styles.report}>
        <Flag size={14} color={colors.textMuted} />
        <Text style={styles.reportText}>Reportar este retorno</Text>
      </Pressable>
    </ScrollView>
  );
}

function Bloco({ titulo, cor, itens }: { titulo: string; cor: string; itens: string[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.blocoTitle}>{titulo}</Text>
      {itens.map((t, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <Check size={16} color={cor} style={{ marginTop: 2 }} />
          <Text style={styles.item}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16 },
  habLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  habTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 2 },
  ring: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, alignItems: "center", justifyContent: "center" },
  ringText: { fontSize: 12, fontWeight: "800", textAlign: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16 },
  blocoTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  item: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  exemplo: { fontSize: 14, color: colors.textMuted, lineHeight: 21, marginTop: 6 },
  profNote: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 16, minHeight: touch.aluno },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.input, paddingVertical: 14, minHeight: touch.default },
  secondaryText: { color: colors.action, fontSize: 15, fontWeight: "700" },
  report: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  reportText: { color: colors.textMuted, fontSize: 13 },
});
