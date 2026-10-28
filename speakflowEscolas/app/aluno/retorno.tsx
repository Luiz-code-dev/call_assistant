import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check, ArrowUpRight, Mic, Flag, RotateCcw, ChevronRight } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiGet, apiSend } from "@/lib/api";

type MasteryLevel = "NOT_YET" | "ALMOST" | "MASTERED" | null;

interface AiFeedback { acertos?: string[]; melhorar?: string[]; exemplo?: string; porCriterio?: { criterio: string; comentario?: string }[] }
interface Retorno {
  submissionId: string; status: string; aiStatus?: string | null;
  masteryLevel: MasteryLevel;
  aiFeedback: AiFeedback | null; transcript?: string | null;
  activity?: { title?: string; type?: string; maxAttempts?: number } | null;
  attempt?: number;
}

const LEVEL_CONFIG: Record<string, { label: string; heading: string; bg: string; border: string; text: string; badge: string }> = {
  MASTERED: { label: "Domina",   heading: "Você domina essa habilidade!",  bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", badge: "#DCFCE7" },
  ALMOST:   { label: "Quase lá", heading: "Você está quase lá!",           bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", badge: "#FEF3C7" },
  NOT_YET:  { label: "Ainda não", heading: "Continue praticando!",         bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C", badge: "#FEE2E2" },
};

const MOTIVOS = [
  { v: "RETORNO_ERRADO",     l: "Retorno errado" },
  { v: "CONTEUDO_INADEQUADO", l: "Conteúdo inadequado" },
  { v: "OUTRO",              l: "Outro" },
];

export default function AlunoRetorno() {
  const insets = useSafeAreaInsets();
  const { id, assignmentId, itemId } = useLocalSearchParams<{ id: string; assignmentId?: string; itemId?: string }>();
  const [data, setData]               = useState<Retorno | null>(null);
  const [erro, setErro]               = useState(false);
  const [sheet, setSheet]             = useState(false);
  const [motivo, setMotivo]           = useState("RETORNO_ERRADO");
  const [detalhe, setDetalhe]         = useState("");
  const [enviandoReport, setEnviandoReport] = useState(false);
  const [reportOk, setReportOk]       = useState(false);
  const tentativas = useRef(0);

  const carregar = useCallback(async () => {
    setErro(false);
    const d = await apiGet<Retorno>(`/aluno/atividades/${id}/retorno`);
    if (!d) { setErro(true); return; }
    setData(d);
    // Polling enquanto IA processa (até ~60 s)
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
  const levelCfg    = data?.masteryLevel ? LEVEL_CONFIG[data.masteryLevel] : null;
  const podeRetry   = data && (data.activity?.maxAttempts ?? 1) > (data.attempt ?? 1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[s.head, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.replace("/aluno/trilha")} hitSlop={10}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={s.headTitle} numberOfLines={1}>Retorno da atividade</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        {!data && !erro ? (
          <View style={s.skeleton}><ActivityIndicator color={colors.action} /></View>

        ) : erro ? (
          <View style={s.card}>
            <Text style={s.text}>Não foi possível carregar. Tente de novo.</Text>
            <Pressable onPress={carregar} style={s.retryBtn}><Text style={s.retryText}>Tentar de novo</Text></Pressable>
          </View>

        ) : processando ? (
          <View style={[s.card, { alignItems: "center", gap: 12 }]}>
            <ActivityIndicator color={colors.action} />
            <Text style={s.cardTitle}>Analisando sua resposta…</Text>
            <Text style={s.text}>Aguarde alguns segundos.</Text>
          </View>

        ) : (
          <>
            {/* Badge de nível */}
            {levelCfg && (
              <View style={[s.levelCard, { backgroundColor: levelCfg.bg, borderColor: levelCfg.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[s.levelBadge, { backgroundColor: levelCfg.badge }]}>
                    <Text style={[s.levelBadgeText, { color: levelCfg.text }]}>{levelCfg.label}</Text>
                  </View>
                </View>
                <Text style={[s.levelHeading, { color: levelCfg.text }]}>{levelCfg.heading}</Text>
                {data?.activity?.title && (
                  <Text style={[s.levelSub, { color: levelCfg.text }]}>{data.activity.title}</Text>
                )}
              </View>
            )}

            {/* O que você acertou */}
            {data?.aiFeedback?.acertos && data.aiFeedback.acertos.length > 0 && (
              <View style={[s.block, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                <View style={s.blockHead}>
                  <Check size={16} color={colors.success} />
                  <Text style={[s.blockTitle, { color: colors.success }]}>O que você acertou</Text>
                </View>
                {data.aiFeedback.acertos.map((t, i) => <Text key={i} style={s.item}>• {t}</Text>)}
              </View>
            )}

            {/* Como melhorar */}
            {data?.aiFeedback?.melhorar && data.aiFeedback.melhorar.length > 0 && (
              <View style={[s.block, { backgroundColor: "#F5F3FF", borderColor: colors.border }]}>
                <View style={s.blockHead}>
                  <ArrowUpRight size={16} color={colors.action} />
                  <Text style={[s.blockTitle, { color: colors.action }]}>Como melhorar</Text>
                </View>
                {data.aiFeedback.melhorar.map((t, i) => <Text key={i} style={s.item}>• {t}</Text>)}
              </View>
            )}

            {/* Exemplo de resposta */}
            {data?.aiFeedback?.exemplo ? (
              <View style={s.block}>
                <Text style={s.blockLabel}>EXEMPLO DE RESPOSTA</Text>
                <Text style={s.exemplo}>"{data.aiFeedback.exemplo}"</Text>
              </View>
            ) : null}

            {/* Sua fala (transcrição) */}
            {data?.transcript ? (
              <View style={s.block}>
                <View style={s.blockHead}>
                  <Mic size={16} color={colors.action} />
                  <Text style={s.blockTitle}>Sua fala</Text>
                </View>
                <Text style={s.exemplo}>"{data.transcript}"</Text>
              </View>
            ) : null}

            {/* Botões de ação */}
            <View style={s.btnRow}>
              {podeRetry && (
                <Pressable
                  onPress={() => router.back()}
                  style={s.outlineBtn}
                >
                  <RotateCcw size={16} color={colors.action} />
                  <Text style={s.outlineBtnText}>Tentar de novo</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => router.replace("/aluno/trilha")}
                style={[s.primary, podeRetry ? { flex: 1 } : { flex: 1 }]}
              >
                <Text style={s.primaryText}>Próxima atividade</Text>
                <ChevronRight size={18} color="#fff" />
              </Pressable>
            </View>

            {/* Reportar */}
            {reportOk ? (
              <Text style={s.reportOk}>Obrigado. Seu professor vai olhar.</Text>
            ) : (
              <Pressable onPress={() => setSheet(true)} style={s.report}>
                <Flag size={15} color={colors.textMuted} />
                <Text style={s.reportText}>Reportar este retorno</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal de report */}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={s.backdrop} onPress={() => setSheet(false)} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={s.cardTitle}>Reportar este retorno</Text>
          {MOTIVOS.map((m) => (
            <Pressable
              key={m.v}
              onPress={() => setMotivo(m.v)}
              style={[s.motivo, motivo === m.v && { borderColor: colors.action, backgroundColor: colors.actionSoft }]}
            >
              <Text style={[s.motivoText, motivo === m.v && { color: colors.action }]}>{m.l}</Text>
            </Pressable>
          ))}
          <TextInput
            value={detalhe} onChangeText={setDetalhe}
            placeholder="Conte o que aconteceu (opcional)"
            placeholderTextColor={colors.textMuted}
            multiline style={s.detalhe}
          />
          <Pressable onPress={reportar} disabled={enviandoReport} style={[s.primary, enviandoReport && { opacity: 0.6 }]}>
            <Text style={s.primaryText}>{enviandoReport ? "Enviando…" : "Enviar"}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  head:          { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle:     { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text, fontFamily: fonts.bold },
  skeleton:      { height: 140, borderRadius: radius.cardLg, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  card:          { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, padding: 18, gap: 6 },
  cardTitle:     { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  text:          { fontSize: 14, color: colors.textMuted, lineHeight: 20, fontFamily: fonts.regular },
  // Level card
  levelCard:     { borderWidth: 1.5, borderRadius: radius.cardLg, padding: 18, gap: 6 },
  levelBadge:    { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 },
  levelBadgeText:{ fontSize: 13, fontWeight: "700", fontFamily: fonts.bold },
  levelHeading:  { fontSize: 20, fontWeight: "800", fontFamily: fonts.extrabold, marginTop: 4 },
  levelSub:      { fontSize: 13, fontFamily: fonts.regular, opacity: 0.8 },
  // Feedback blocks
  block:         { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, gap: 6 },
  blockHead:     { flexDirection: "row", alignItems: "center", gap: 8 },
  blockTitle:    { fontSize: 14, fontWeight: "700", color: colors.text, fontFamily: fonts.bold },
  blockLabel:    { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.8, fontFamily: fonts.bold, textTransform: "uppercase" },
  item:          { fontSize: 14, color: colors.text, lineHeight: 20, fontFamily: fonts.regular },
  exemplo:       { fontSize: 14, color: colors.textMuted, fontStyle: "italic", lineHeight: 20, fontFamily: fonts.regular },
  // Buttons
  btnRow:        { flexDirection: "row", gap: 10 },
  outlineBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: colors.action, borderRadius: radius.input, paddingVertical: 14, minHeight: touch.aluno },
  outlineBtnText:{ color: colors.action, fontSize: 15, fontWeight: "700", fontFamily: fonts.bold },
  primary:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 15, minHeight: touch.aluno },
  primaryText:   { color: "#FFF", fontSize: 16, fontWeight: "800", fontFamily: fonts.extrabold },
  report:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  reportText:    { color: colors.textMuted, fontSize: 14, fontFamily: fonts.regular },
  reportOk:      { textAlign: "center", color: colors.success, fontSize: 14, fontWeight: "700", paddingVertical: 12, fontFamily: fonts.bold },
  retryBtn:      { alignSelf: "flex-start", backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10, marginTop: 6 },
  retryText:     { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
  backdrop:      { flex: 1, backgroundColor: "rgba(31,26,46,0.4)" },
  sheet:         { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  motivo:        { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.input, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.surface },
  motivoText:    { fontSize: 15, fontWeight: "600", color: colors.text, fontFamily: fonts.semibold },
  detalhe:       { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.input, padding: 12, minHeight: 72, textAlignVertical: "top", color: colors.text, backgroundColor: colors.surface, fontFamily: fonts.regular },
});
