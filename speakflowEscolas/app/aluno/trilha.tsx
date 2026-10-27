import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Settings, ArrowRight, TrendingUp } from "lucide-react-native";
import { colors, radius, touch, fonts, subjectColors, masteryColor } from "@/lib/theme";
import { apiGet } from "@/lib/api";

interface Activity {
  id: string; title: string; type: string;
  subject: { id: string; name: string; color?: string } | null;
  submission: { status: string; aiScore?: number | null } | null;
  isDone: boolean;
}

export default function AlunoTrilha() {
  const insets = useSafeAreaInsets();
  const [todo, setTodo] = useState<Activity[] | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    const d = await apiGet<{ atividades: Activity[] }>("/aluno/atividades?filter=todo");
    if (!d) { setErro(true); setTodo([]); return; }
    setTodo(d.atividades ?? []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const corComp = (a: Activity) => a.subject?.color || (a.subject ? subjectColors[a.subject.id] : undefined) || colors.action;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <View style={styles.header}>
        <Text style={styles.hi}>Minha trilha</Text>
        <Pressable onPress={() => router.push("/configuracoes")} hitSlop={10}><Settings size={22} color={colors.textMuted} /></Pressable>
      </View>

      {todo === null ? (
        <View style={styles.skeleton}><ActivityIndicator color={colors.action} /></View>
      ) : erro ? (
        <View style={styles.card}>
          <Text style={styles.cardText}>Não foi possível carregar. Tente de novo.</Text>
          <Pressable onPress={carregar} style={styles.retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable>
        </View>
      ) : todo.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tudo em dia por aqui!</Text>
          <Text style={styles.cardText}>Quando o professor indicar uma nova atividade, ela aparece aqui.</Text>
        </View>
      ) : (
        <>
          {/* Próximo passo */}
          <View style={[styles.card, { borderColor: corComp(todo[0]) + "55" }]}>
            {todo[0].subject && (
              <View style={[styles.pill, { backgroundColor: corComp(todo[0]) + "22" }]}>
                <Text style={[styles.pillText, { color: corComp(todo[0]) }]}>{todo[0].subject.name}</Text>
              </View>
            )}
            <Text style={styles.next}>Próximo passo</Text>
            <Text style={styles.cardTitle}>{todo[0].title}</Text>
            <Pressable onPress={() => router.push(`/aluno/atividade?id=${todo[0].id}` as never)} style={styles.continuar}>
              <Text style={styles.continuarText}>Continuar</Text>
              <ArrowRight size={18} color="#FFF" />
            </Pressable>
          </View>

          {todo.length > 1 && (
            <>
              <Text style={styles.section}>Outras atividades</Text>
              {todo.slice(1).map((a) => (
                <Pressable key={a.id} onPress={() => router.push(`/aluno/atividade?id=${a.id}` as never)} style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    {a.subject && <Text style={[styles.rowSubject, { color: corComp(a) }]}>{a.subject.name}</Text>}
                    <Text style={styles.rowTitle}>{a.title}</Text>
                  </View>
                  <ArrowRight size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </>
          )}
        </>
      )}

      <Pressable onPress={() => router.push("/aluno/evolucao")} style={styles.evolucao}>
        <TrendingUp size={18} color={colors.action} />
        <Text style={styles.evolucaoText}>Minha evolução</Text>
      </Pressable>
    </ScrollView>
  );
}

// evita warning de import nao usado em masteryColor (reservado para proximos blocos)
void masteryColor;

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hi: { fontSize: 24, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  skeleton: { height: 160, borderRadius: radius.cardLg, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, padding: 18, gap: 8 },
  pill: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: "700", fontFamily: fonts.bold },
  next: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4, fontFamily: fonts.semibold },
  cardTitle: { fontSize: 19, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  cardText: { fontSize: 14, color: colors.textMuted, lineHeight: 20, fontFamily: fonts.regular },
  continuar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 14, minHeight: touch.aluno, marginTop: 8 },
  continuarText: { color: "#FFF", fontSize: 17, fontWeight: "800", fontFamily: fonts.extrabold },
  section: { fontSize: 13, color: colors.textMuted, fontWeight: "700", marginTop: 4, fontFamily: fonts.semibold },
  rowCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, minHeight: 64 },
  rowSubject: { fontSize: 12, fontWeight: "700", fontFamily: fonts.bold },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text, fontFamily: fonts.semibold },
  retry: { alignSelf: "flex-start", backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  retryText: { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
  evolucao: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, marginTop: 4 },
  evolucaoText: { color: colors.action, fontSize: 15, fontWeight: "700", fontFamily: fonts.bold },
});
