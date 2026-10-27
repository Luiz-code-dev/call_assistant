import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiSend } from "@/lib/api";

function brParaISO(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
function mascaraData(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export default function AdicionarFilho() {
  const insets = useSafeAreaInsets();
  const [familyCode, setFamilyCode] = useState("");
  const [birth, setBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [okName, setOkName] = useState<string | null>(null);

  async function adicionar() {
    const iso = brParaISO(birth);
    if (!familyCode || !iso) { setError("Preencha o código e a data (dd/mm/aaaa)."); return; }
    setLoading(true); setError("");
    const r = await apiSend<{ ok?: boolean; studentName?: string; error?: string }>("/familia/adicionar-filho", "POST", { familyCode: familyCode.trim(), birthDate: iso });
    setLoading(false);
    if (!r.ok) { setError(r.error ?? "Código ou data não conferem."); return; }
    setOkName(r.data?.studentName ?? "o aluno");
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, gap: 14 }}>
      <Pressable onPress={() => router.back()} style={styles.back}><ArrowLeft size={20} color={colors.action} /><Text style={styles.backText}>Voltar</Text></Pressable>
      <Text style={styles.title}>Adicionar filho</Text>

      {okName ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vinculado!</Text>
          <Text style={styles.text}>Agora você acompanha {okName}.</Text>
          <Pressable onPress={() => router.replace("/familia/painel")} style={styles.primary}><Text style={styles.primaryText}>Ver no painel</Text></Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.sub}>Use o código do cartão do aluno e a data de nascimento dele.</Text>
          <View><Text style={styles.label}>Código de família</Text>
            <TextInput value={familyCode} onChangeText={(v) => setFamilyCode(v.toUpperCase())} placeholder="Do cartão do aluno" placeholderTextColor={colors.textMuted} autoCapitalize="characters" style={styles.input} /></View>
          <View><Text style={styles.label}>Data de nascimento do aluno</Text>
            <TextInput value={birth} onChangeText={(v) => setBirth(mascaraData(v))} placeholder="dd/mm/aaaa" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={styles.input} /></View>
          {error ? <Text style={styles.err}>{error}</Text> : null}
          <Pressable onPress={adicionar} disabled={loading} style={[styles.primary, loading && { opacity: 0.6 }]}><Text style={styles.primaryText}>{loading ? "Vinculando…" : "Adicionar"}</Text></Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  backText: { color: colors.action, fontSize: 15, fontWeight: "600", fontFamily: fonts.semibold },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  sub: { fontSize: 14, color: colors.textMuted, fontFamily: fonts.regular },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4, fontFamily: fonts.semibold },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: radius.input, paddingHorizontal: 14, height: 52, fontSize: 16, color: colors.text, fontFamily: fonts.regular },
  err: { color: colors.danger, fontSize: 14, textAlign: "center", fontFamily: fonts.regular },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 18, gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  text: { fontSize: 14, color: colors.textMuted, fontFamily: fonts.regular },
  primary: { backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 15, alignItems: "center", minHeight: touch.default, marginTop: 4 },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "800", fontFamily: fonts.extrabold },
});
