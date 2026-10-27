import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeartHandshake } from "lucide-react-native";
import { router } from "expo-router";
import { colors, radius, touch } from "@/lib/theme";
import { API_BASE } from "@/lib/api";

const RELATIONS = [
  { v: "MAE", l: "Mãe" }, { v: "PAI", l: "Pai" }, { v: "AVO_AVO", l: "Avó/Avô" },
  { v: "TIO_TIA", l: "Tio/Tia" }, { v: "TUTOR_LEGAL", l: "Tutor(a) legal" }, { v: "OUTRO", l: "Outro" },
];

// Família: primeiro acesso com código do cartão + data de nascimento do aluno.
// Mesma lógica da web (POST /api/escola/familia/ativar).
export default function FamiliaEntrar() {
  const insets = useSafeAreaInsets();
  const [familyCode, setFamilyCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("MAE");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function entrar() {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/escola/familia/ativar`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ familyCode, birthDate, guardianName: name, guardianPhone: phone || undefined, relation, termsVersion: "v1.0" }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Código ou data não conferem"); setLoading(false); return; }
      router.replace("/familia/painel" as never);
    } catch { setError("Erro de conexão."); setLoading(false); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <View style={styles.iconBox}><HeartHandshake size={26} color={colors.action} /></View>
      <Text style={styles.title}>Primeiro acesso da família</Text>
      <Text style={styles.sub}>Use o código do cartão do aluno e a data de nascimento dele.</Text>

      <Campo label="Código de família" value={familyCode} onChange={setFamilyCode} placeholder="Do cartão do aluno" mono />
      <View>
        <Text style={styles.label}>Data de nascimento do aluno</Text>
        <TextInput value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} />
      </View>
      <Campo label="Seu nome completo" value={name} onChange={setName} placeholder="Nome do responsável" />
      <View>
        <Text style={styles.label}>Parentesco</Text>
        <View style={styles.rels}>
          {RELATIONS.map((r) => (
            <Pressable key={r.v} onPress={() => setRelation(r.v)} style={[styles.rel, relation === r.v && { backgroundColor: colors.action }]}>
              <Text style={[styles.relText, { color: relation === r.v ? "#FFFFFF" : colors.textMuted }]}>{r.l}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Campo label="Celular (opcional)" value={phone} onChange={setPhone} placeholder="(opcional)" />

      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Pressable onPress={entrar} disabled={loading} style={[styles.entrar, loading && { opacity: 0.6 }]}>
        <Text style={styles.entrarText}>{loading ? "Entrando…" : "Acessar portal"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Campo({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; mono?: boolean }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted} style={[styles.input, mono && { letterSpacing: 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center" },
  sub: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: radius.input, paddingHorizontal: 14, height: 52, fontSize: 16, color: colors.text },
  rels: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rel: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  relText: { fontSize: 13, fontWeight: "700" },
  err: { color: colors.danger, fontSize: 14, textAlign: "center" },
  entrar: { backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 16, alignItems: "center", minHeight: touch.default },
  entrarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
