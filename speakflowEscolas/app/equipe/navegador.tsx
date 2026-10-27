import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Monitor, LogOut } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { lerSessao, sair } from "@/lib/session";

const GESTAO_URL = "https://www.speakflow.ia.br/escola/entrar";

export default function EquipeNavegador() {
  const insets = useSafeAreaInsets();

  async function handleSair() {
    const s = await lerSessao();
    if (s) await sair(s.perfil, s.token);
    router.replace("/");
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.iconBox}><Monitor size={30} color={colors.action} /></View>
      <Text style={styles.title}>A gestão é feita no computador</Text>
      <Text style={styles.sub}>A gestão da rede e da escola (turmas, alunos, trilhas, relatórios) é feita no navegador. No celular, o professor usa as telas do app.</Text>
      <Pressable onPress={() => Linking.openURL(GESTAO_URL)} style={styles.primary}>
        <Text style={styles.primaryText}>Abrir no navegador</Text>
      </Pressable>
      <Pressable onPress={handleSair} style={styles.sair}>
        <LogOut size={18} color={colors.danger} />
        <Text style={styles.sairText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 14 },
  iconBox: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center", fontFamily: fonts.extrabold },
  sub: { fontSize: 15, color: colors.textMuted, textAlign: "center", lineHeight: 22, fontFamily: fonts.regular },
  primary: { backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 16, paddingHorizontal: 32, alignItems: "center", minHeight: touch.default, marginTop: 8 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", fontFamily: fonts.bold },
  sair: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, marginTop: 4 },
  sairText: { color: colors.danger, fontSize: 15, fontWeight: "700", fontFamily: fonts.bold },
});
