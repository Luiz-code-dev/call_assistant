import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Clock } from "lucide-react-native";
import { colors, radius, fonts } from "@/lib/theme";
import { apiGet } from "@/lib/api";

interface Atividade { id: string; title?: string; nome?: string; subject?: { name?: string } | null; pendentes?: number; turma?: string | null }

export default function ProfessorRetornos() {
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState<Atividade[] | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await apiGet<any>("/professor/atividades?revisar=1");
    if (!d) { setErro(true); setLista([]); return; }
    setLista(d.atividades ?? d.items ?? d.activities ?? []);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={22} color={colors.text} /></Pressable>
        <Text style={styles.headTitle}>Retornos para revisar</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
        {lista === null && !erro ? <View style={styles.sk}><ActivityIndicator color={colors.action} /></View>
          : erro ? <View style={styles.card}><Text style={styles.text}>Não foi possível carregar. Tente de novo.</Text><Pressable onPress={carregar} style={styles.retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable></View>
          : (lista?.length ?? 0) === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Nada para revisar</Text><Text style={styles.text}>As entregas que precisam da sua revisão aparecem aqui.</Text></View>
          : lista!.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.title} numberOfLines={1}>{a.title ?? a.nome}</Text>
                {a.pendentes ? <View style={styles.badge}><Clock size={12} color={colors.warn} /><Text style={styles.badgeText}>{a.pendentes}</Text></View> : null}
              </View>
              <Text style={styles.textMuted}>{[a.subject?.name, a.turma].filter(Boolean).join(" · ")}</Text>
            </View>
          ))}
        <Text style={styles.foot}>A revisão detalhada (ouvir áudio, mudar o nível) está disponível no navegador.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle: { fontSize: 16, fontWeight: "800", color: colors.text, fontFamily: fonts.bold },
  sk: { height: 100, borderRadius: radius.cardLg, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  title: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text, fontFamily: fonts.bold },
  text: { fontSize: 14, color: colors.textMuted, lineHeight: 20, fontFamily: fonts.regular },
  textMuted: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.regular },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.warnSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: "700", color: colors.warn, fontFamily: fonts.bold },
  foot: { fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 8, fontFamily: fonts.regular },
  retry: { alignSelf: "flex-start", backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
});
