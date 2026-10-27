import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GraduationCap, Users, HeartHandshake, Settings } from "lucide-react-native";
import { router } from "expo-router";
import { colors, radius, touch } from "@/lib/theme";
import { fetchConfig } from "@/lib/api";
import { lerSessao, rotaInicial } from "@/lib/session";

export default function Entrada() {
  const insets = useSafeAreaInsets();
  const [familyEnabled, setFamilyEnabled] = useState(false);
  const [checando, setChecando] = useState(true);

  // Ja logado? Abre direto na tela do perfil. Senao, mostra a selecao.
  useEffect(() => {
    let ativo = true;
    lerSessao().then((s) => {
      if (!ativo) return;
      if (s) router.replace(rotaInicial(s) as never);
      else setChecando(false);
    });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    fetchConfig().then((c) => setFamilyEnabled(!!c?.familyEnabled));
  }, []);

  if (checando) return null;

  const options = [
    { key: "aluno", label: "Sou aluno", hint: "Cartão QR, código da turma + matrícula + PIN", icon: GraduationCap, to: "/aluno/entrar" },
    { key: "equipe", label: "Equipe escolar", hint: "E-mail e senha", icon: Users, to: "/equipe/entrar" },
    ...(familyEnabled ? [{ key: "familia", label: "Sou pai, mãe ou responsável", hint: "Código do cartão + data de nascimento", icon: HeartHandshake, to: "/familia/entrar" }] : []),
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.logoRow}>
        <Text style={styles.logoSpeak}>SpeakFlow</Text>
        <Text style={styles.logoEscolas}> Escolas</Text>
      </View>
      <Text style={styles.subtitle}>Reforço escolar em casa, com retorno na hora.</Text>

      <View style={{ gap: 12, marginTop: 28 }}>
        {options.map((o) => {
          const Icon = o.icon;
          return (
            <Pressable
              key={o.key}
              onPress={() => router.push(o.to as never)}
              style={({ pressed }) => [styles.card, pressed && { borderColor: colors.action }]}
            >
              <View style={styles.iconBox}><Icon size={24} color={colors.action} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>{o.label}</Text>
                <Text style={styles.cardHint}>{o.hint}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => router.push("/configuracoes")} style={styles.settingsRow}>
        <Settings size={16} color={colors.textMuted} />
        <Text style={styles.settingsText}>Configurações, termos e privacidade</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  logoRow: { flexDirection: "row", justifyContent: "center" },
  logoSpeak: { fontSize: 24, fontWeight: "800", color: colors.text },
  logoEscolas: { fontSize: 24, fontWeight: "800", color: colors.brandPink },
  subtitle: { textAlign: "center", color: colors.textMuted, marginTop: 6, fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, padding: 18, minHeight: touch.aluno + 20 },
  iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  cardLabel: { fontSize: 17, fontWeight: "700", color: colors.text },
  cardHint: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  settingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 28 },
  settingsText: { color: colors.textMuted, fontSize: 13 },
});
