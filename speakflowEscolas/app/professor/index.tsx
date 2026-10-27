import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Settings, ChevronRight, ClipboardList, LayoutGrid } from "lucide-react-native";
import { colors, radius, fonts } from "@/lib/theme";
import { apiGet } from "@/lib/api";

interface Turma { id: string; name: string; gradeYear?: number | null; stage?: string | null }

export default function ProfessorHome() {
  const insets = useSafeAreaInsets();
  const [turmas, setTurmas] = useState<Turma[] | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    const d = await apiGet<{ classes: Turma[] }>("/professor/turmas");
    if (!d) { setErro(true); setTurmas([]); return; }
    setTurmas(d.classes ?? []);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <View style={styles.header}>
        <Text style={styles.hi}>Minhas turmas</Text>
        <Pressable onPress={() => router.push("/configuracoes")} hitSlop={10}><Settings size={22} color={colors.textMuted} /></Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => router.push("/professor/retornos")} style={styles.action}><ClipboardList size={20} color={colors.action} /><Text style={styles.actionText}>Retornos para revisar</Text></Pressable>
        <Pressable onPress={() => router.push("/professor/atribuir")} style={styles.action}><LayoutGrid size={20} color={colors.action} /><Text style={styles.actionText}>Atribuir trilha</Text></Pressable>
      </View>

      {turmas === null && !erro ? <View style={styles.sk}><ActivityIndicator color={colors.action} /></View>
        : erro ? <View style={styles.card}><Text style={styles.text}>Não foi possível carregar. Tente de novo.</Text><Pressable onPress={carregar} style={styles.retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable></View>
        : (turmas?.length ?? 0) === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Sem turmas atribuídas</Text><Text style={styles.text}>Quando a escola atribuir suas turmas, elas aparecem aqui.</Text></View>
        : turmas!.map((t) => (
          <Pressable key={t.id} onPress={() => router.push(`/professor/mapa?classId=${t.id}&nome=${encodeURIComponent(t.name)}` as never)} style={styles.rowCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t.name}</Text>
              {t.gradeYear ? <Text style={styles.rowSub}>{t.gradeYear}º ano</Text> : null}
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hi: { fontSize: 24, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 14, gap: 6, alignItems: "flex-start" },
  actionText: { fontSize: 13, fontWeight: "700", color: colors.text, fontFamily: fonts.semibold },
  sk: { height: 100, borderRadius: radius.cardLg, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, padding: 18, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  text: { fontSize: 14, color: colors.textMuted, lineHeight: 20, fontFamily: fonts.regular },
  rowCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, minHeight: 64 },
  rowTitle: { fontSize: 16, fontWeight: "700", color: colors.text, fontFamily: fonts.bold },
  rowSub: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.regular },
  retry: { alignSelf: "flex-start", backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
});
