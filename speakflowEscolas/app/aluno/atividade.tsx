import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mic, Square, Play, Send, Bot } from "lucide-react-native";
import { Audio } from "expo-av";
import { router } from "expo-router";
import { colors, radius, subjectColors, touch } from "@/lib/theme";

type Tipo = "fala" | "escrita" | "quiz";
const QUIZ = { pergunta: "Quanto é 3/4 de uma pizza de 4 fatias?", ops: ["1 fatia", "2 fatias", "3 fatias", "4 fatias"], correta: 2 };

export default function Atividade() {
  const insets = useSafeAreaInsets();
  const [tipo, setTipo] = useState<Tipo>("fala");
  const [aiOk, setAiOk] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [texto, setTexto] = useState("");
  const [sel, setSel] = useState<number | null>(null);

  const ma = subjectColors.MA;
  const words = texto.trim() ? texto.trim().split(/\s+/).length : 0;

  async function toggleRecord() {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null); setRecorded(true);
        return;
      }
      // Permissão pedida só no uso (ao tocar em gravar).
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert("Microfone", "Para gravar sua resposta, libere o microfone nas configurações do aparelho."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
    } catch {
      Alert.alert("Erro", "Não foi possível acessar o microfone.");
    }
  }

  function enviar() {
    // Mostra o aviso de IA antes do primeiro envio (Apple 5.1.2(i)).
    if (!aiOk) { setShowAi(true); return; }
    router.push("/aluno/retorno" as never);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <View style={[styles.chip, { backgroundColor: ma + "1A", alignSelf: "flex-start" }]}>
        <Text style={[styles.chipText, { color: ma }]}>Matemática · 6º ano</Text>
      </View>
      <Text style={styles.enunciado}>Explique, do seu jeito, o que significa 3/4 de um todo.</Text>

      <View style={styles.tabs}>
        {(["fala", "escrita", "quiz"] as Tipo[]).map((t) => (
          <Pressable key={t} onPress={() => setTipo(t)} style={[styles.tab, tipo === t && { backgroundColor: colors.action }]}>
            <Text style={[styles.tabText, { color: tipo === t ? "#FFFFFF" : colors.textMuted }]}>{t === "fala" ? "Fala" : t === "escrita" ? "Escrita" : "Quiz"}</Text>
          </Pressable>
        ))}
      </View>

      {tipo === "fala" && (
        <View style={styles.card}>
          <Pressable onPress={toggleRecord} style={[styles.micBig, recording && { backgroundColor: colors.danger }]}>
            {recording ? <Square size={28} color="#FFFFFF" /> : <Mic size={28} color="#FFFFFF" />}
          </Pressable>
          <Text style={styles.micHint}>{recording ? "Gravando… toque para parar" : recorded ? "Resposta gravada" : "Toque para gravar sua resposta"}</Text>
          {recorded && !recording && (
            <Pressable style={styles.ghost}><Play size={14} color={colors.action} /><Text style={styles.ghostText}>Ouvir</Text></Pressable>
          )}
        </View>
      )}

      {tipo === "escrita" && (
        <View style={styles.card}>
          <TextInput value={texto} onChangeText={setTexto} multiline placeholder="Escreva sua resposta…" placeholderTextColor={colors.textMuted} style={styles.textarea} />
          <Text style={styles.counter}>{words} palavra{words !== 1 ? "s" : ""} · rascunho salvo</Text>
        </View>
      )}

      {tipo === "quiz" && (
        <View style={styles.card}>
          <Text style={styles.quizQ}>{QUIZ.pergunta}</Text>
          {QUIZ.ops.map((o, i) => (
            <Pressable key={i} onPress={() => setSel(i)} style={[styles.quizOp, sel === i && { borderColor: colors.action, backgroundColor: colors.actionSoft }]}>
              <Text style={[styles.quizOpText, sel === i && { color: colors.actionTint, fontWeight: "700" }]}>{o}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable onPress={enviar} style={styles.enviar}>
        <Send size={18} color="#FFFFFF" /><Text style={styles.enviarText}>Enviar</Text>
      </Pressable>

      {showAi && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.aiIcon}><Bot size={22} color={colors.action} /></View>
            <Text style={styles.modalTitle}>Antes de enviar</Text>
            <Text style={styles.modalText}>Suas respostas (texto ou áudio) são enviadas a um serviço de inteligência artificial (OpenAI) para gerar o retorno. Seu nome e sua matrícula não são enviados.</Text>
            <Pressable onPress={() => { setAiOk(true); setShowAi(false); router.push("/aluno/retorno" as never); }} style={styles.enviar}>
              <Text style={styles.enviarText}>Entendi</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: "700" },
  enunciado: { fontSize: 18, fontWeight: "700", color: colors.text, lineHeight: 25 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabText: { fontSize: 14, fontWeight: "700" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 20, alignItems: "center", gap: 12 },
  micBig: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brandPink, alignItems: "center", justifyContent: "center" },
  micHint: { fontSize: 14, color: colors.textMuted },
  ghost: { flexDirection: "row", alignItems: "center", gap: 6 },
  ghostText: { color: colors.action, fontWeight: "700", fontSize: 14 },
  textarea: { width: "100%", minHeight: 140, fontSize: 15, color: colors.text, textAlignVertical: "top" },
  counter: { alignSelf: "flex-start", fontSize: 12, color: colors.textMuted },
  quizQ: { fontSize: 16, fontWeight: "700", color: colors.text, alignSelf: "flex-start", marginBottom: 6 },
  quizOp: { width: "100%", borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: radius.input, padding: 16, marginTop: 8 },
  quizOpText: { fontSize: 15, color: colors.text },
  enviar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 16, minHeight: touch.aluno, width: "100%" },
  enviarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#1F1A2E66", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 24, gap: 10, width: "100%", maxWidth: 360 },
  aiIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  modalText: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 6 },
});
