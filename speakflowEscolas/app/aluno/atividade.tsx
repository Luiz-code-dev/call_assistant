import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, ActivityIndicator, Modal, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";
import * as SecureStore from "expo-secure-store";
import { ArrowLeft, Mic, Square, Send, Bot } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiGet, apiSend, API_BASE, APP_CLIENT } from "@/lib/api";
import { authHeaders } from "@/lib/session";

interface Question { id: string; question: string; options: string[] }
interface Activity {
  id: string; title: string; type: string; prompt?: string; maxAudioSec?: number;
  subject: { name: string } | null; questions: Question[];
}

const IA_ACK = "sf_edu_ia_ack";

export default function AlunoAtividade() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [act, setAct] = useState<Activity | null>(null);
  const [erro, setErro] = useState(false);
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [iaModal, setIaModal] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const recording = useRef<Audio.Recording | null>(null);

  const carregar = useCallback(async () => {
    setErro(false);
    // filter=todos inclui atividades ja entregues (SUBMITTED/EVALUATED),
    // necessario para que "Tentar de novo" consiga reabrir a atividade.
    const d = await apiGet<{ atividades: Activity[] }>("/aluno/atividades?filter=todos");
    const a = d?.atividades?.find((x) => x.id === id) ?? null;
    if (!a) { setErro(true); return; }
    setAct(a);
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  async function garantirCienciaIA(): Promise<boolean> {
    const ack = await SecureStore.getItemAsync(IA_ACK);
    if (ack === "1") return true;
    setIaModal(true);
    return false;
  }

  async function iniciarGravacao() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert("Microfone", "Para gravar sua resposta, permita o microfone nos ajustes."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recording.current = rec;
      setGravando(true);
    } catch { Alert.alert("Microfone", "Não foi possível iniciar a gravação."); }
  }

  async function pararGravacao() {
    try {
      await recording.current?.stopAndUnloadAsync();
      setAudioUri(recording.current?.getURI() ?? null);
    } catch { /* noop */ }
    setGravando(false);
  }

  async function enviar() {
    if (!(await garantirCienciaIA())) return;
    if (!act) return;
    setEnviando(true);
    try {
      if (act.type === "SPOKEN") {
        // O servidor exige multipart para fala: ele mesmo transcreve e guarda o audio.
        if (!audioUri) { setEnviando(false); Alert.alert("Fala", "Grave sua resposta antes de enviar."); return; }
        const fd = new FormData();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fd.append("audio", { uri: audioUri, name: "audio.m4a", type: "audio/m4a" } as any);
        const res = await fetch(`${API_BASE}/api/escola/aluno/atividades/${act.id}/enviar`, { method: "POST", headers: { ...(await authHeaders()) }, body: fd });
        const d = await res.json().catch(() => ({}));
        setEnviando(false);
        if (!res.ok) { Alert.alert("Enviar", d.error ?? "Não foi possível enviar."); return; }
        router.replace(`/aluno/retorno?id=${act.id}` as never);
        return;
      }
      const body: Record<string, unknown> = act.type === "QUIZ"
        ? { quizAnswers: act.questions.map((q) => ({ questionId: q.id, selectedIndex: answers[q.id] ?? -1 })) }
        : { text };
      const r = await apiSend(`/aluno/atividades/${act.id}/enviar`, "POST", body);
      setEnviando(false);
      if (!r.ok) { Alert.alert("Enviar", r.error ?? "Não foi possível enviar."); return; }
      router.replace(`/aluno/retorno?id=${act.id}` as never);
    } catch {
      setEnviando(false);
      Alert.alert("Sem internet", "Sua resposta não foi enviada. Verifique a conexão e tente de novo.");
    }
  }

  async function confirmarCiencia() {
    await SecureStore.setItemAsync(IA_ACK, "1");
    setIaModal(false);
    enviar();
  }

  if (!act && !erro) return <View style={styles.center}><ActivityIndicator color={colors.action} /></View>;
  if (erro) return (
    <View style={styles.center}>
      <Text style={styles.text}>Não foi possível carregar a atividade.</Text>
      <Pressable onPress={carregar} style={styles.retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable>
    </View>
  );

  const a = act!;
  const podeEnviar = a.type === "QUIZ" ? a.questions.every((q) => answers[q.id] != null) : a.type === "SPOKEN" ? !!audioUri : text.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.replace("/aluno/trilha")} hitSlop={10}><ArrowLeft size={22} color={colors.text} /></Pressable>
        <Text style={styles.headTitle} numberOfLines={1}>{a.title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        {a.prompt ? (
          <View style={styles.card}><Text style={styles.enunLabel}>ENUNCIADO</Text><Text style={styles.enun}>{a.prompt}</Text></View>
        ) : null}

        {a.type === "QUIZ" ? (
          a.questions.map((q, qi) => (
            <View key={q.id} style={styles.card}>
              <Text style={styles.qTitle}>{qi + 1}. {q.question}</Text>
              {q.options.map((op, oi) => (
                <Pressable key={oi} onPress={() => setAnswers((s) => ({ ...s, [q.id]: oi }))} style={[styles.opt, answers[q.id] === oi && { borderColor: colors.action, backgroundColor: colors.actionSoft }]}>
                  <Text style={[styles.optText, answers[q.id] === oi && { color: colors.action }]}>{op}</Text>
                </Pressable>
              ))}
            </View>
          ))
        ) : a.type === "SPOKEN" ? (
          <View style={[styles.card, { alignItems: "center", gap: 14 }]}>
            <Text style={styles.text}>{gravando ? "Gravando… toque para parar" : audioUri ? "Gravado! Você pode enviar ou gravar de novo." : "Toque para gravar sua resposta"}</Text>
            <Pressable onPress={gravando ? pararGravacao : iniciarGravacao} style={[styles.micBtn, gravando && { backgroundColor: "#DB2777" }]}>
              {gravando ? <Square size={32} color="#FFF" /> : <Mic size={34} color="#FFF" />}
            </Pressable>
            {audioUri && !gravando ? <Pressable onPress={() => { setAudioUri(null); iniciarGravacao(); }}><Text style={styles.link}>Gravar de novo</Text></Pressable> : null}
          </View>
        ) : (
          <View style={styles.card}>
            <TextInput value={text} onChangeText={setText} multiline placeholder="Escreva sua resposta…" placeholderTextColor={colors.textMuted} style={styles.textarea} />
            <Text style={styles.count}>{text.trim() ? text.trim().split(/\s+/).length : 0} palavras</Text>
          </View>
        )}

        <Pressable onPress={enviar} disabled={!podeEnviar || enviando} style={[styles.enviar, (!podeEnviar || enviando) && { opacity: 0.5 }]}>
          <Send size={18} color="#FFF" />
          <Text style={styles.enviarText}>{enviando ? "Enviando…" : "Enviar resposta"}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={iaModal} transparent animationType="fade" onRequestClose={() => setIaModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.iaBox}>
            <View style={styles.iaIcon}><Bot size={24} color={colors.action} /></View>
            <Text style={styles.cardTitle}>Sobre o retorno</Text>
            <Text style={styles.text}>Suas respostas (texto ou áudio) são enviadas a um serviço de inteligência artificial para gerar o retorno. Seu nome e sua matrícula não são enviados.</Text>
            <Pressable onPress={confirmarCiencia} style={styles.enviar}><Text style={styles.enviarText}>Entendi</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text, fontFamily: fonts.bold },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  enunLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "700", letterSpacing: 0.5, fontFamily: fonts.semibold },
  enun: { fontSize: 16, color: colors.text, lineHeight: 23, fontFamily: fonts.regular },
  qTitle: { fontSize: 16, fontWeight: "700", color: colors.text, fontFamily: fonts.bold },
  opt: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.input, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, justifyContent: "center" },
  optText: { fontSize: 15, color: colors.text, fontFamily: fonts.regular },
  textarea: { minHeight: 160, textAlignVertical: "top", fontSize: 16, color: colors.text, fontFamily: fonts.regular },
  count: { fontSize: 12, color: colors.textMuted, textAlign: "right", fontFamily: fonts.regular },
  micBtn: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.action, alignItems: "center", justifyContent: "center" },
  link: { color: colors.action, fontSize: 14, fontWeight: "700", fontFamily: fonts.bold },
  text: { fontSize: 14, color: colors.textMuted, lineHeight: 20, textAlign: "center", fontFamily: fonts.regular },
  enviar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 15, minHeight: touch.aluno },
  enviarText: { color: "#FFF", fontSize: 16, fontWeight: "800", fontFamily: fonts.extrabold },
  retry: { backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
  backdrop: { flex: 1, backgroundColor: "rgba(31,26,46,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  iaBox: { backgroundColor: colors.bg, borderRadius: radius.cardLg, padding: 20, gap: 12, width: "100%", maxWidth: 400 },
  iaIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
});
