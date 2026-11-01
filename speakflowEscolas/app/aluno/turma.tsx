import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Users, ClipboardCheck, AlertCircle, ArrowRight, RefreshCw } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiGet } from "@/lib/api";

interface AtividadeTurma {
  id: string;
  title: string;
  teacherName: string;
  dueAt: string | null;
  offeringName: string;
  type: string;
  done: boolean;
  estMinutes: number;
}

export default function AlunoTurma() {
  const insets = useSafeAreaInsets();
  const [atividades, setAtividades] = useState<AtividadeTurma[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false); setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await apiGet<any>("/aluno/atividades-turma");
    setLoading(false);
    if (!d) { setErro(true); return; }
    setAtividades(d.atividades ?? []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const pendentes = atividades.filter(a => !a.done);
  const concluidas = atividades.filter(a => a.done);

  if (loading) return (
    <View style={[s.center, { paddingTop: insets.top + 16 }]}>
      <ActivityIndicator color={colors.action} size="large" />
    </View>
  );

  if (erro) return (
    <View style={[s.center, { paddingTop: insets.top + 16 }]}>
      <AlertCircle size={40} color={colors.error} />
      <Text style={s.erroText}>Não foi possível carregar as atividades da turma.</Text>
      <Pressable style={s.btn} onPress={carregar}>
        <RefreshCw size={16} color="#fff" />
        <Text style={s.btnText}>Tentar de novo</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Users size={22} color={colors.action} />
        <Text style={s.headerTitle}>Atividades da Turma</Text>
      </View>

      {pendentes.length === 0 && concluidas.length === 0 ? (
        <View style={s.emptyCard}>
          <ClipboardCheck size={40} color="#C4B5FD" />
          <Text style={s.emptyTitle}>Nenhuma atividade atribuída</Text>
          <Text style={s.emptyHint}>Seu professor ainda não atribuiu atividades de turma.</Text>
        </View>
      ) : null}

      {pendentes.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Para fazer</Text>
          {pendentes.map(a => (
            <Pressable key={a.id} style={s.card} onPress={() => router.push(`/aluno/atividades/${a.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{a.title}</Text>
                <Text style={s.cardSub}>{a.offeringName} · Prof. {a.teacherName}</Text>
                {a.dueAt && (
                  <Text style={s.cardDate}>
                    Prazo: {new Date(a.dueAt).toLocaleDateString("pt-BR")} · ~{a.estMinutes} min
                  </Text>
                )}
              </View>
              <ArrowRight size={16} color={colors.textSecondary} />
            </Pressable>
          ))}
        </>
      )}

      {concluidas.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Concluídas</Text>
          {concluidas.map(a => (
            <View key={a.id} style={[s.card, s.done]}>
              <ClipboardCheck size={18} color={colors.success} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: "#5B5470" }]}>{a.title}</Text>
                <Text style={s.cardSub}>{a.offeringName}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F8F7FC" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F7FC", paddingHorizontal: 24 },
  erroText: { color: "#B91C1C", fontFamily: fonts.medium, fontSize: 15, marginTop: 12, marginBottom: 16, textAlign: "center" },
  btn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.action, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 12, minHeight: touch },
  btnText: { color: "#fff", fontFamily: fonts.semibold, fontSize: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 20, color: "#1F1A2E" },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: "#1F1A2E", marginBottom: 10 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: "#E9E5F5", marginBottom: 8, minHeight: touch },
  done: { opacity: 0.7, borderColor: "#DCFCE7", backgroundColor: "#F0FDF4" },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 14, color: "#1F1A2E" },
  cardSub: { fontFamily: fonts.regular, fontSize: 12, color: "#5B5470", marginTop: 2 },
  cardDate: { fontFamily: fonts.regular, fontSize: 11, color: "#92400E", marginTop: 2 },
  emptyCard: { alignItems: "center", backgroundColor: "#fff", borderRadius: radius.xl, padding: 32, borderWidth: 1, borderColor: "#E9E5F5", marginTop: 16 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: "#1F1A2E", marginTop: 12, marginBottom: 6 },
  emptyHint: { fontFamily: fonts.regular, fontSize: 13, color: "#8B7FA8", textAlign: "center" },
});
