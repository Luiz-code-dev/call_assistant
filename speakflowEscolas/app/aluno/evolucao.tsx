import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { colors, radius, fonts, subjectColors } from "@/lib/theme";
import { apiGet } from "@/lib/api";

interface Activity { id: string; title: string; subject: { id: string; name: string; color?: string } | null }

export default function AlunoEvolucao() {
  const insets = useSafeAreaInsets();
  const [feitas, setFeitas] = useState<Activity[] | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    const d = await apiGet<{ atividades: Activity[] }>("/aluno/atividades?filter=feito");
    if (!d) { setErro(true); setFeitas([]); return; }
    setFeitas(d.atividades ?? []);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const porComp = new Map<string, Activity[]>();
  (feitas ?? []).forEach((a) => {
    const k = a.subject?.name ?? "Outros";
    porComp.set(k, [...(porComp.get(k) ?? []), a]);
  });
  const cor = (a: Activity) => a.subject?.color || (a.subject ? subjectColors[a.subject.id] : undefined) || colors.action;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.replace("/aluno/trilha")} hitSlop={10}><ArrowLeft size={22} color={colors.text} /></Pressable>
        <Text style={styles.headTitle}>Minha evolução</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        {feitas === null && !erro ? (
          <View style={styles.skeleton}><ActivityIndicator color={colors.action} /></View>
        ) : erro ? (
          <View style={styles.card}><Text style={styles.text}>Não foi possível carregar. Tente de novo.</Text>
            <Pressable onPress={carregar} style={styles.retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable></View>
        ) : (feitas?.length ?? 0) === 0 ? (
          <View style={styles.card}><Text style={styles.cardTitle}>Sua evolução aparece aqui</Text><Text style={styles.text}>Conforme você pratica e recebe retornos, suas conquistas por componente aparecem nesta tela.</Text></View>
        ) : (
          Array.from(porComp.entries()).map(([comp, list]) => (
            <View key={comp} style={styles.card}>
              <Text style={[styles.comp, { color: cor(list[0]) }]}>{comp}</Text>
              {list.map((a) => (
                <View key={a.id} style={styles.row}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{a.title}</Text>
                  <View style={[styles.badge, { backgroundColor: colors.successSoft }]}><Text style={[styles.badgeText, { color: colors.success }]}>Praticado</Text></View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle: { fontSize: 16, fontWeight: "800", color: colors.text, fontFamily: fonts.bold },
  skeleton: { height: 120, borderRadius: radius.cardLg, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, padding: 18, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  comp: { fontSize: 15, fontWeight: "800", fontFamily: fonts.extrabold },
  text: { fontSize: 14, color: colors.textMuted, lineHeight: 20, fontFamily: fonts.regular },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowTitle: { flex: 1, fontSize: 14, color: colors.text, fontFamily: fonts.regular },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700", fontFamily: fonts.bold },
  retry: { alignSelf: "flex-start", backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  retryText: { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
});
