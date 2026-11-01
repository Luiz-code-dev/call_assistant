import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BookOpen, ClipboardList, AlertCircle, ArrowRight, RefreshCw } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiGet } from "@/lib/api";

interface ProximoPasso { assignmentId: string; title: string; subjectId: string; ordem: number; total: number; }
interface AtividadeTurma { id: string; title: string; teacherName: string; dueAt: string | null; offeringName: string; }
interface DiagnosticoPendente { id: string; title: string; }

interface HomeData {
  proximoPasso: ProximoPasso | null;
  atividadesTurma: AtividadeTurma[];
  diagnosticoPendente: DiagnosticoPendente | null;
}

export default function AlunoHome() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false); setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await apiGet<any>("/aluno/home");
    setLoading(false);
    if (!d) { setErro(true); return; }
    setData(d);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const pt = insets.top + 16;

  if (loading) return (
    <View style={[s.center, { paddingTop: pt }]}>
      <ActivityIndicator color={colors.action} size="large" />
    </View>
  );

  if (erro) return (
    <View style={[s.center, { paddingTop: pt }]}>
      <AlertCircle size={40} color={colors.error} />
      <Text style={s.erroText}>Não foi possível carregar.</Text>
      <Pressable style={s.btn} onPress={carregar}>
        <RefreshCw size={16} color="#fff" />
        <Text style={s.btnText}>Tentar de novo</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingTop: pt }]} showsVerticalScrollIndicator={false}>
      {/* Diagnóstico pendente */}
      {data?.diagnosticoPendente && (
        <Pressable style={s.diagCard} onPress={() => router.push(`/aluno/atividades/${data.diagnosticoPendente!.id}`)}>
          <ClipboardList size={20} color={colors.action} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.diagTitle}>Diagnóstico pendente</Text>
            <Text style={s.diagSub}>{data.diagnosticoPendente.title}</Text>
          </View>
          <ArrowRight size={18} color={colors.action} />
        </Pressable>
      )}

      {/* Minha Trilha */}
      <Text style={s.sectionTitle}>Minha Trilha</Text>
      {data?.proximoPasso ? (
        <Pressable style={s.trilhaCard} onPress={() => router.push("/aluno/trilha")}>
          <BookOpen size={20} color={colors.action} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.trilhaTitle}>{data.proximoPasso.title}</Text>
            <Text style={s.trilhaSub}>Passo {data.proximoPasso.ordem} de {data.proximoPasso.total}</Text>
          </View>
          <Pressable
            style={s.continuarBtn}
            onPress={() => router.push("/aluno/trilha")}
            accessibilityLabel="Continuar trilha"
          >
            <Text style={s.continuarText}>Continuar</Text>
          </Pressable>
        </Pressable>
      ) : (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>Nenhuma trilha ativa no momento.</Text>
          <Text style={s.emptyHint}>Seu professor atribuirá uma trilha em breve.</Text>
        </View>
      )}

      {/* Atividades da Turma */}
      <Text style={[s.sectionTitle, { marginTop: 24 }]}>Atividades da Turma</Text>
      {(data?.atividadesTurma ?? []).length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>Nenhuma atividade pendente.</Text>
        </View>
      ) : (
        <>
          {data!.atividadesTurma.slice(0, 3).map(a => (
            <Pressable key={a.id} style={s.atCard} onPress={() => router.push(`/aluno/atividades/${a.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={s.atTitle}>{a.title}</Text>
                <Text style={s.atSub}>{a.offeringName} · {a.teacherName}</Text>
                {a.dueAt && <Text style={s.atDate}>Prazo: {new Date(a.dueAt).toLocaleDateString("pt-BR")}</Text>}
              </View>
              <ArrowRight size={16} color={colors.textSecondary} />
            </Pressable>
          ))}
          {data!.atividadesTurma.length > 3 && (
            <Pressable style={s.verMais} onPress={() => router.push("/aluno/atividades-turma")}>
              <Text style={s.verMaisText}>Ver todas as atividades</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F8F7FC" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F7FC" },
  erroText: { color: "#B91C1C", fontFamily: fonts.medium, fontSize: 15, marginTop: 12, marginBottom: 16 },
  btn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.action, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 12, minHeight: touch },
  btnText: { color: "#fff", fontFamily: fonts.semibold, fontSize: 14 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 17, color: "#1F1A2E", marginTop: 16, marginBottom: 10 },
  diagCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#EDE9FE", borderRadius: radius.lg, padding: 14, marginBottom: 12, minHeight: touch },
  diagTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.action },
  diagSub: { fontFamily: fonts.regular, fontSize: 12, color: "#5B5470", marginTop: 2 },
  trilhaCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: "#E9E5F5", minHeight: touch },
  trilhaTitle: { fontFamily: fonts.semibold, fontSize: 14, color: "#1F1A2E" },
  trilhaSub: { fontFamily: fonts.regular, fontSize: 12, color: "#5B5470", marginTop: 2 },
  continuarBtn: { backgroundColor: colors.action, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8, minHeight: 36 },
  continuarText: { color: "#fff", fontFamily: fonts.semibold, fontSize: 13 },
  emptyCard: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: "#E9E5F5", alignItems: "center" },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: "#5B5470" },
  emptyHint: { fontFamily: fonts.regular, fontSize: 12, color: "#8B7FA8", marginTop: 4, textAlign: "center" },
  atCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: "#E9E5F5", marginBottom: 8, minHeight: touch },
  atTitle: { fontFamily: fonts.semibold, fontSize: 14, color: "#1F1A2E" },
  atSub: { fontFamily: fonts.regular, fontSize: 12, color: "#5B5470", marginTop: 2 },
  atDate: { fontFamily: fonts.regular, fontSize: 11, color: "#92400E", marginTop: 2 },
  verMais: { alignItems: "center", paddingVertical: 12 },
  verMaisText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.action },
});
