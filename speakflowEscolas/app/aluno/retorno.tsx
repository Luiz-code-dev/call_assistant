import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check, ArrowUpRight, Mic, Flag } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiGet, apiSend } from "@/lib/api";

interface AiFeedback { acertos?: string[]; melhorar?: string[]; exemplo?: string; porCriterio?: { criterio: string; comentario?: string }[] }
interface Retorno {
  submissionId: string; status: string; aiStatus?: string | null;
  aiFeedback: AiFeedback | null; transcript?: string | null;
  activity?: { title?: string; type?: string } | null;
}

const MOTIVOS = [
  { v: "RETORNO_ERRADO", l: "Retorno errado" },
  { v: "CONTEUDO_INADEQUADO", l: "Conteúdo inadequado" },
  { v: "OUTRO", l: "Outro" },
];

export default function AlunoRetorno() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Retorno | null>(null);
  const [erro, setErro] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [motivo, setMotivo] = useState("RETORNO_ERRADO");
  const [detalhe, setDetalhe] = useState("");
  const [enviandoReport, setEnviandoReport] = useState(false);
  const [reportOk, setReportOk] = useState(false);
  const tentativas = useRef(0);

  const carregar = useCallback(async () => {
    setErro(false);
    const d = await apiGet<Retorno>(`/aluno/atividades/${id}/retorno`);
    if (!d) { setErro(true); return; }
    setData(d);
    // "Analisando..." enquanto a IA processa: tenta de novo a cada 3s (ate ~60s).
    if ((d.aiStatus === "PENDING" || d.aiStatus === "RUNNING") && tentativas.current < 20) {
      tentativas.current += 1;
      setTimeout(carregar, 3000);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function reportar() {
    setEnviandoReport(true);
    const r = await apiSend(`/aluno/retornos/${data?.submissionId}/reportar`, "POST", { reason: motivo, detail: detalhe || undefined });
    setEnviandoReport(false);
    if (r.ok) { setReportOk(true); setSheet(false); }
  }

  const processando = data && (data.aiStatus === "PENDING" || data.aiStatus === "RUNNING");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.replace("/aluno/trilha")} hitSlop={10}><ArrowLeft size={22} color={colors.text} /></Pressable>
        <Text style={styles.headTitle} numberOfLines={1}>{data?.activity?.title ?? "Retorno"}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        {!data && !erro ? (
          <View style={styles.skeleton}><ActivityIndicator color={colors.action} /></View>
        ) : erro ? (
          <View style={styles.card}><Text style={styles.text}>Não foi possível carregar. Tente de novo.</Text>
            <Pressable onPress={carregar} style={styles.retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable></View>
        ) : processando ? (
          <View style={[styles.card, { alignItems: "center", gap: 12 }]}>
            <ActivityIndicator color={colors.action} />
            <Text style={styles.cardTitle}>Analisando sua resposta…</Text>
            <Text style={styles.text}>Aguarde alguns segundos.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Retorno pronto</Text>
              <Text style={styles.text}>O professor acompanha este retorno no painel da turma.</Text>
            </View>

            {data?.aiFeedback?.acertos && data.aiFeedback.acertos.length > 0 && (
              <View style={[styles.block, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                <View style={styles.blockHead}><Check size={16} color={colors.success} /><Text style={[styles.blockTitle, { color: colors.success }]}>O que você acertou</Text></View>
                {data.aiFeedback.acertos.map((t, i) => <Text key={i} style={styles.item}>• {t}</Text>)}
              </View>
            )}

            {data?.aiFeedback?.melhorar && data.aiFeedback.melhorar.length > 0 && (
              <View style={[styles.block, { backgroundColor: "#F5F3FF", borderColor: colors.border }]}>
                <View style={styles.blockHead}><ArrowUpRight size={16} color={colors.action} /><Text style={[styles.blockTitle, { color: colors.action }]}>Como melhorar</Text></View>
                {data.aiFeedback.melhorar.map((t, i) => <Text key={i} style={styles.item}>• {t}</Text>)}
              </View>
            )}

            {data?.aiFeedback?.exemplo ? (
              <View style={styles.block}><Text style={styles.blockTitle}>Exemplo de resposta</Text><Text style={styles.exemplo}>{data.aiFeedback.exemplo}</Text></View>
            ) : null}

            {data?.transcript ? (
              <View style={styles.block}><View style={styles.blockHead}><Mic size={16} color={colors.action} /><Text style={styles.blockTitle}>Sua fala</Text></View><Text style={styles.exemplo}>“{data.transcript}”</Text></View>
            ) : null}

            <Pressable onPress={() => router.replace("/aluno/trilha")} style={styles.primary}><Text style={styles.primaryText}>Voltar para a trilha</Text></Pressable>

            {reportOk ? (
              <Text style={styles.reportOk}>Obrigado. Seu professor vai olhar.</Text>
            ) : (
              <Pressable onPress={() => setSheet(true)} style={styles.report}><Flag size={15} color={colors.textMuted} /><Text style={styles.reportText}>Reportar este retorno</Text></Pressable>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.cardTitle}>Reportar este retorno</Text>
          {MOTIVOS.map((m) => (
            <Pressable key={m.v} onPress={() => setMotivo(m.v)} style={[styles.motivo, motivo === m.v && { borderColor: colors.action, backgroundColor: colors.actionSoft }]}>
              <Text style={[styles.motivoText, motivo === m.v && { color: colors.action }]}>{m.l}</Text>
            </Pressable>
          ))}
          <TextInput value={detalhe} onChangeText={setDetalhe} placeholder="Conte o que aconteceu (opcional)" placeholderTextColor={colors.textMuted} multiline style={styles.detalhe} />
          <Pressable onPress={reportar} disabled={enviandoReport} style={[styles.primary, enviandoReport && { opacity: 0.6 }]}>
            <Text style={styles.primaryText}>{enviandoReport ? "Enviando…" : "Enviar"}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text, fontFamily: fonts.bold },
  skeleton: { height: 140, borderRadius: radius.cardLg, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, padding: 18, gap: 6 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  text: { fontSize: 14, color: colors.textMuted, lineHeight: 20, fontFamily: fonts.regular },
  block: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, gap: 6 },
  blockHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  blockTitle: { fontSize: 14, fontWeight: "700", color: colors.text, fontFamily: fonts.bold },
  item: { fontSize: 14, color: colors.text, lineHeight: 20, fontFamily: fonts.regular },
  exemplo: { fontSize: 14, color: colors.textMuted, fontStyle: "italic", lineHeight: 20, fontFamily: fonts.regular },
  primary: { backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 15, alignItems: "center", minHeight: touch.aluno },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "800", fontFamily: fonts.extrabold },
  report: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  reportText: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.regular },
  reportOk: { textAlign: "center", color: colors.success, fontSize: 14, fontWeight: "700", paddingVertical: 12, fontFamily: fonts.bold },
  retry: { alignSelf: "flex-start", backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10, marginTop: 6 },
  retryText: { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
  backdrop: { flex: 1, backgroundColor: "rgba(31,26,46,0.4)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  motivo: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.input, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.surface },
  motivoText: { fontSize: 15, fontWeight: "600", color: colors.text, fontFamily: fonts.semibold },
  detalhe: { borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: radius.input, padding: 12, minHeight: 72, textAlignVertical: "top", color: colors.text, backgroundColor: colors.surface, fontFamily: fonts.regular },
});
