import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, touch } from "@/lib/theme";

// Equipe escolar: e-mail/celular + senha (sem "Entrar com Google" para não
// obrigar "Entrar com Apple"). Consome /api/escola/auth/staff/login na web.
export default function EquipeEntrar() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24, gap: 16 }}>
      <Text style={styles.title}>Equipe escolar</Text>
      <Text style={styles.sub}>Use o e-mail cadastrado pela escola.</Text>
      <View style={{ gap: 12, marginTop: 8 }}>
        <View>
          <Text style={styles.label}>E-mail ou celular</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="voce@escola.gov.br" placeholderTextColor={colors.textMuted} style={styles.input} />
        </View>
        <View>
          <Text style={styles.label}>Senha</Text>
          <TextInput value={senha} onChangeText={setSenha} secureTextEntry placeholder="Sua senha" placeholderTextColor={colors.textMuted} style={styles.input} />
        </View>
      </View>
      <Pressable style={styles.entrar}><Text style={styles.entrarText}>Entrar</Text></Pressable>
      <Text style={styles.hint}>Primeiro acesso? Abra o convite que chegou no seu e-mail e crie sua senha.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: radius.input, paddingHorizontal: 14, height: 52, fontSize: 16, color: colors.text },
  entrar: { backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 16, alignItems: "center", minHeight: touch.default, marginTop: 4 },
  entrarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  hint: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 19 },
});
