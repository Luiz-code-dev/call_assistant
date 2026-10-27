import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from "react-native";
import { FileText, ShieldCheck, Trash2, ChevronRight, Bot } from "lucide-react-native";
import { colors, radius } from "@/lib/theme";
import { fetchConfig, EscolaConfig } from "@/lib/api";

export default function Configuracoes() {
  const [cfg, setCfg] = useState<EscolaConfig | null>(null);
  useEffect(() => { fetchConfig().then(setCfg); }, []);

  const base = "https://www.speakflow.ia.br";
  const rows = [
    { icon: FileText, label: "Termos de Uso", url: cfg?.termsUrl ?? `${base}/escola/termos` },
    { icon: ShieldCheck, label: "Aviso de Privacidade", url: cfg?.privacyUrl ?? `${base}/escola/privacidade` },
    { icon: Trash2, label: "Excluir minha conta", url: cfg?.deleteAccountUrl ?? `${base}/escola/excluir-conta`, danger: true },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={styles.aiNote}>
        <View style={styles.aiIcon}><Bot size={18} color={colors.action} /></View>
        <Text style={styles.aiText}>
          Suas respostas (texto ou áudio) são enviadas a um serviço de inteligência artificial
          ({cfg?.aiProvider ?? "OpenAI"}) para gerar o retorno. Seu nome e sua matrícula não são enviados.
        </Text>
      </View>

      <View style={styles.group}>
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <Pressable key={r.label} onPress={() => Linking.openURL(r.url)} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Icon size={18} color={r.danger ? colors.danger : colors.action} />
              <Text style={[styles.rowLabel, r.danger && { color: colors.danger }]}>{r.label}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.footer}>SpeakFlow Escolas · versão 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  aiNote: { flexDirection: "row", gap: 10, backgroundColor: colors.actionSoft, borderRadius: radius.card, padding: 14 },
  aiIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  aiText: { flex: 1, color: colors.actionTint, fontSize: 13, lineHeight: 19 },
  group: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 16, minHeight: 52 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: "500" },
  footer: { textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: 8 },
});
