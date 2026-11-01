import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { BarChart2, AlertCircle, RefreshCw, RotateCcw, Award, Send } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiGet, apiPost } from "@/lib/api";

interface ObjetivoStat { code: string; description: string; pctCorreto: number; totalRespostas: number; }
interface PerguntaMaisErrada { question: string; wrongCount: number; misconceptionCode: string | null; commonError: string | null; }
interface AlunoNaoFez { enrollmentId: string; studentName: string; }

interface PainelData {
  aulaId: string;
  title: string;
  offeringName: string;
  totalAlunos: number;
  totalResponderam: number;
  objetivos: ObjetivoStat[];
  perguntaMaisErrada: PerguntaMaisErrada | null;
  naoFizeram: AlunoNaoFez[];
}

function PctBar({ pct }: { pct: number }) {
  const cor = pct >= 70 ? colors.success : pct >= 40 ? "#92400E" : colors.error;
  return (
    <View style={s.barBg}>
      <View style={[s.barFill, { width: `${pct}%` as `${number}%`, backgroundColor: cor }]} />
    </View>
  );
}

export default function ProfessorPainelAula() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<PainelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [acao, setAcao] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!id) return;
    setErro(false); setLoading(true);
    const d = await apiGet<PainelData>(`/professor/aulas/${id}`);
    setLoading(false);
    if (!d) { setErro(true); return; }
    setData(d);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const executarAcao = async (tipo: "retomar-em-sala" | "segunda-chance" | "enviar-reforco") => {
    if (!id || acao) return;
    setAcao(tipo);
    await apiPost(`/professor/aulas/${id}/${tipo}`, {});
    setAcao(null);
    carregar();
  };

  if (loading) return (
    <View style={[s.center, { paddingTop: insets.top + 16 }]}>
      <ActivityIndicator color={colors.action} size="large" />
    </View>
  );

  if (erro || !data) return (
    <View style={[s.center, { paddingTop: insets.top + 16 }]}>
      <AlertCircle size={40} color={colors.error} />
      <Text style={s.erroText}>Não foi possível carregar o painel da aula.</Text>
      <Pressable style={s.btn} onPress={carregar}>
        <RefreshCw size={16} color="#fff" />
        <Text style={s.btnText}>Tentar de novo</Text>
      </Pressable>
    </View>
  );

  const pctParticipacao = data.totalAlunos > 0 ? Math.round((data.totalResponderam / data.totalAlunos) * 100) : 0;
  const corPart = pctParticipacao >= 70 ? colors.success : pctParticipacao >= 40 ? "#92400E" : colors.error;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.aulaHeader}>
        <BarChart2 size={20} color={colors.action} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.aulaTitle}>{data.title}</Text>
          <Text style={s.aulaSub}>{data.offeringName}</Text>
        </View>
      </View>

      {/* Participação geral */}
      <View style={s.kpiCard}>
        <Text style={s.kpiLabel}>Participação</Text>
        <Text style={[s.kpiVal, { color: corPart }]}>{pctParticipacao}%</Text>
        <Text style={s.kpiSub}>{data.totalResponderam} de {data.totalAlunos} alunos</Text>
      </View>

      {/* % por objetivo */}
      {data.objetivos.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Por objetivo</Text>
          {data.objetivos.map(o => (
            <View key={o.code} style={s.objCard}>
              <Text style={s.objCode}>{o.code}</Text>
              <Text style={s.objDesc} numberOfLines={2}>{o.description}</Text>
              <PctBar pct={o.pctCorreto} />
              <Text style={s.objPct}>{o.pctCorreto}% acertos · {o.totalRespostas} respostas</Text>
            </View>
          ))}
        </>
      )}

      {/* Pergunta mais errada */}
      {data.perguntaMaisErrada && (
        <>
          <Text style={s.sectionTitle}>Pergunta mais errada</Text>
          <View style={s.erroCard}>
            <Text style={s.erroPergunta}>{data.perguntaMaisErrada.question}</Text>
            <Text style={s.erroCount}>{data.perguntaMaisErrada.wrongCount} alunos erraram</Text>
            {data.perguntaMaisErrada.commonError && (
              <View style={s.erroComumBox}>
                <Text style={s.erroComumLabel}>Erro frequente</Text>
                <Text style={s.erroComumText}>{data.perguntaMaisErrada.commonError}</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Alunos que não fizeram */}
      {data.naoFizeram.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Não fizeram ({data.naoFizeram.length})</Text>
          <View style={s.naoFizeramCard}>
            {data.naoFizeram.slice(0, 5).map(a => (
              <Text key={a.enrollmentId} style={s.alunoNome}>· {a.studentName}</Text>
            ))}
            {data.naoFizeram.length > 5 && (
              <Text style={s.maisAlunos}>+ {data.naoFizeram.length - 5} outros</Text>
            )}
          </View>
        </>
      )}

      {/* 3 botões de ação */}
      <Text style={s.sectionTitle}>Ações</Text>
      <Pressable style={[s.actionBtn, acao === "retomar-em-sala" && s.btnLoading]} onPress={() => executarAcao("retomar-em-sala")}>
        {acao === "retomar-em-sala" ? <ActivityIndicator color="#fff" /> : <RotateCcw size={18} color="#fff" />}
        <Text style={s.actionBtnText}>Retomar em sala</Text>
      </Pressable>
      <Pressable style={[s.actionBtn, s.actionBtnSecundario, acao === "segunda-chance" && s.btnLoading]} onPress={() => executarAcao("segunda-chance")}>
        {acao === "segunda-chance" ? <ActivityIndicator color={colors.action} /> : <Award size={18} color={colors.action} />}
        <Text style={[s.actionBtnText, { color: colors.action }]}>Segunda chance</Text>
      </Pressable>
      <Pressable style={[s.actionBtn, s.actionBtnSecundario, acao === "enviar-reforco" && s.btnLoading]} onPress={() => executarAcao("enviar-reforco")}>
        {acao === "enviar-reforco" ? <ActivityIndicator color={colors.action} /> : <Send size={18} color={colors.action} />}
        <Text style={[s.actionBtnText, { color: colors.action }]}>Enviar reforço</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F8F7FC" },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F7FC", padding: 24 },
  erroText: { color: "#B91C1C", fontFamily: fonts.medium, fontSize: 15, marginTop: 12, marginBottom: 16, textAlign: "center" },
  btn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.action, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 12, minHeight: touch },
  btnText: { color: "#fff", fontFamily: fonts.semibold, fontSize: 14 },
  aulaHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  aulaTitle: { fontFamily: fonts.bold, fontSize: 18, color: "#1F1A2E" },
  aulaSub: { fontFamily: fonts.regular, fontSize: 13, color: "#5B5470" },
  kpiCard: { backgroundColor: "#fff", borderRadius: radius.xl, padding: 20, borderWidth: 1, borderColor: "#E9E5F5", alignItems: "center", marginBottom: 20 },
  kpiLabel: { fontFamily: fonts.medium, fontSize: 13, color: "#5B5470" },
  kpiVal: { fontFamily: fonts.bold, fontSize: 48, lineHeight: 56 },
  kpiSub: { fontFamily: fonts.regular, fontSize: 13, color: "#5B5470", marginTop: 4 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: "#1F1A2E", marginBottom: 10, marginTop: 20 },
  objCard: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: "#E9E5F5", marginBottom: 8 },
  objCode: { fontFamily: fonts.mono ?? fonts.medium, fontSize: 11, color: "#5B5470", marginBottom: 2 },
  objDesc: { fontFamily: fonts.medium, fontSize: 13, color: "#1F1A2E", marginBottom: 8 },
  barBg: { height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  barFill: { height: 8, borderRadius: 4 },
  objPct: { fontFamily: fonts.regular, fontSize: 12, color: "#5B5470" },
  erroCard: { backgroundColor: "#FEF3C7", borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: "#FDE68A", marginBottom: 8 },
  erroPergunta: { fontFamily: fonts.semibold, fontSize: 14, color: "#1F1A2E", marginBottom: 6 },
  erroCount: { fontFamily: fonts.regular, fontSize: 12, color: "#92400E" },
  erroComumBox: { marginTop: 8, backgroundColor: "#FFFBEB", borderRadius: radius.sm, padding: 8 },
  erroComumLabel: { fontFamily: fonts.semibold, fontSize: 11, color: "#92400E", marginBottom: 2 },
  erroComumText: { fontFamily: fonts.regular, fontSize: 13, color: "#1F1A2E" },
  naoFizeramCard: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: "#E9E5F5" },
  alunoNome: { fontFamily: fonts.regular, fontSize: 13, color: "#5B5470", paddingVertical: 2 },
  maisAlunos: { fontFamily: fonts.medium, fontSize: 12, color: "#8B7FA8", marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.action, borderRadius: radius.md, paddingVertical: 14, minHeight: touch, marginBottom: 10 },
  actionBtnSecundario: { backgroundColor: "#EDE9FE" },
  actionBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: "#fff" },
  btnLoading: { opacity: 0.7 },
});
