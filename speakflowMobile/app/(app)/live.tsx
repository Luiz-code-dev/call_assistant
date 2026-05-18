import { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, TextInput, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import { useAuthStore } from "@presentation/stores/authStore";
import { LiveApi, type LiveSuggestionResult } from "@infrastructure/api/LiveApi";

type Phase = "setup" | "live";
type RecordState = "idle" | "recording" | "processing";

const LANGUAGES = [
  { code: "pt", label: "🇧🇷 Português" },
  { code: "en-US", label: "🇺🇸 Inglês" },
  { code: "es-ES", label: "🇪🇸 Espanhol" },
  { code: "fr-FR", label: "🇫🇷 Francês" },
  { code: "de-DE", label: "🇩🇪 Alemão" },
];

const AUTO_STOP_SECONDS = 30;
const MIN_RECORD_MS = 800;

export default function LiveScreen() {
  const { user, refreshUser } = useAuthStore();

  const [phase, setPhase] = useState<Phase>("setup");
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [turns, setTurns] = useState<LiveSuggestionResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Setup config
  const [context, setContext] = useState("");
  const [sourceLang, setSourceLang] = useState("en-US");
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Phrase helper ("Como falo?")
  const [showPhrase, setShowPhrase] = useState(false);
  const [phraseText, setPhraseText] = useState("");
  const [phraseResult, setPhraseResult] = useState<string | null>(null);
  const [phraseLoading, setPhraseLoading] = useState(false);

  const [countdown, setCountdown] = useState(AUTO_STOP_SECONDS);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const sessionIdRef = useRef<string>(`live_${Date.now()}`);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartRef = useRef<number>(0);
  const scrollRef = useRef<ScrollView>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const processAudio = useCallback(async () => {
    clearCountdown();

    // Guard: minimum recording duration
    if (Date.now() - recordStartRef.current < MIN_RECORD_MS) {
      setError("Gravação muito curta. Segure o botão por pelo menos 1 segundo.");
      setRecordState("idle");
      return;
    }

    setRecordState("processing");

    // Stop recording and wait for file to be flushed to disk
    await audioRecorder.stop();
    await new Promise((r) => setTimeout(r, 500));

    const uri = audioRecorder.uri;
    if (!uri) {
      setError("Arquivo de áudio não encontrado. Tente novamente.");
      setRecordState("idle");
      return;
    }

    const selectedLang = LANGUAGES.find((l) => l.code === sourceLang);
    const result = await LiveApi.processAudio(uri, sessionIdRef.current, {
      sourceLang,
      customContext: context,
    });

    if (!result.ok) {
      setError(result.error.message);
      setRecordState("idle");
      return;
    }

    setTurns((prev) => [...prev, result.data].slice(-20));
    refreshUser();
    setRecordState("idle");
    setError(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

    // suppress linter: selectedLang used for display only
    void selectedLang;
  }, [audioRecorder, clearCountdown, context, refreshUser, sourceLang]);

  const startRecording = useCallback(async () => {
    if (recordState !== "idle") return;
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      Alert.alert("Permissão necessária", "O SpeakFlow precisa do microfone para o Live Assist.");
      return;
    }
    await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await audioRecorder.prepareToRecordAsync();

    setError(null);
    setCountdown(AUTO_STOP_SECONDS);
    recordStartRef.current = Date.now();
    setRecordState("recording");
    audioRecorder.record();

    let remaining = AUTO_STOP_SECONDS;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) processAudio();
    }, 1000);
  }, [audioRecorder, processAudio, recordState]);

  const handleEnd = useCallback(async () => {
    clearCountdown();
    if (recordState === "recording") await audioRecorder.stop().catch(() => {});
    await LiveApi.endSession(sessionIdRef.current);
    setPhase("setup");
    setTurns([]);
    setRecordState("idle");
    setError(null);
    setShowPhrase(false);
    sessionIdRef.current = `live_${Date.now()}`;
  }, [audioRecorder, clearCountdown, recordState]);

  const handleTranslatePhrase = useCallback(async () => {
    if (!phraseText.trim() || phraseLoading) return;
    setPhraseLoading(true);
    setPhraseResult(null);
    const r = await LiveApi.translatePhrase(phraseText.trim());
    setPhraseLoading(false);
    if (r.ok) setPhraseResult(r.data.english);
    else setError(r.error.message);
  }, [phraseText, phraseLoading]);

  useEffect(() => () => clearCountdown(), [clearCountdown]);

  const selectedLang = LANGUAGES.find((l) => l.code === sourceLang) ?? LANGUAGES[0];
  const isRecording = recordState === "recording";
  const isProcessing = recordState === "processing";
  const progressPct = isRecording ? ((AUTO_STOP_SECONDS - countdown) / AUTO_STOP_SECONDS) * 100 : 0;

  // ── SETUP PHASE ──
  if (phase === "setup") {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="pt-6 pb-4 items-center">
            <View className="bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1 mb-3">
              <Text className="text-red-400 text-[10px] font-bold tracking-widest">● LIVE</Text>
            </View>
            <Text className="text-2xl font-bold text-white">Copiloto em Tempo Real</Text>
            <Text className="text-zinc-500 text-sm text-center mt-1">
              Grave o áudio da conversa · IA gera sugestões + tradução
            </Text>
          </View>

          <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
            <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Idioma captado
            </Text>
            <TouchableOpacity
              onPress={() => setShowLangPicker(true)}
              className="flex-row items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 mb-4"
            >
              <Text className="text-white text-sm">{selectedLang.label}</Text>
              <Text className="text-zinc-400 text-xs">▼</Text>
            </TouchableOpacity>

            <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Contexto (opcional)
            </Text>
            <TextInput
              value={context} onChangeText={setContext}
              placeholder="Ex: reunião de vendas, entrevista técnica, call com cliente..."
              placeholderTextColor="#52525b" multiline numberOfLines={3} maxLength={500}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm"
              style={{ textAlignVertical: "top", minHeight: 64 }}
            />
          </View>

          <View className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 mb-6">
            <Text className="text-amber-300 text-xs font-semibold mb-1">💡 Dica</Text>
            <Text className="text-amber-300/70 text-xs leading-relaxed">
              Mantenha o celular próximo ao áudio. Em chamadas, use o viva-voz.
              A IA acumula o contexto da sessão enquanto estiver ativa.
            </Text>
          </View>

          <View className="flex-row items-center gap-2 mb-4">
            <View className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <Text className="text-amber-400 text-xs">Modo gravação (iOS) · ⚡ 2 créditos por sugestão</Text>
          </View>

          <TouchableOpacity
            onPress={() => setPhase("live")}
            className="bg-primary rounded-xl py-4 items-center"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base">🎙️ Iniciar Sessão Live</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={showLangPicker} transparent animationType="slide">
          <TouchableOpacity className="flex-1 bg-black/60" activeOpacity={1} onPress={() => setShowLangPicker(false)} />
          <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-10">
            <Text className="text-white font-bold text-base mb-4">Idioma captado</Text>
            {LANGUAGES.map((l) => (
              <TouchableOpacity key={l.code} onPress={() => { setSourceLang(l.code); setShowLangPicker(false); }}
                className="flex-row items-center py-3 border-b border-zinc-800">
                <Text className="text-white text-sm flex-1">{l.label}</Text>
                {sourceLang === l.code && <Text className="text-primary text-sm">✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── LIVE PHASE ──
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-zinc-800">
        <View className="flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-red-500" />
          <Text className="text-red-400 text-xs font-bold tracking-widest">LIVE</Text>
          <Text className="text-zinc-600 text-xs">· {selectedLang.label.split(" ")[1]}</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Text className="text-violet-400 text-xs">⚡</Text>
            <Text className="text-white text-xs font-bold">{user?.credits ?? 0}</Text>
          </View>
          <TouchableOpacity onPress={handleEnd} className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
            <Text className="text-red-400 text-xs font-semibold">■ Encerrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Turns */}
      <ScrollView ref={scrollRef} className="flex-1 px-4 pt-3" contentContainerStyle={{ paddingBottom: 160, gap: 12 }}>
        {turns.length === 0 && !isProcessing && (
          <View className="py-16 items-center">
            <View className="bg-violet-500/10 border border-violet-500/20 rounded-full p-8 mb-4">
              <Text style={{ fontSize: 40 }}>🎙️</Text>
            </View>
            <Text className="text-white font-semibold text-base mb-1">Sessão iniciada</Text>
            <Text className="text-zinc-500 text-sm text-center mb-3">
              Pressione o microfone para capturar o áudio
            </Text>
            <View className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
              <Text className="text-zinc-500 text-xs">🧠 Contexto acumulado via IA · Memória ativa por toda a sessão</Text>
            </View>
          </View>
        )}

        {turns.map((s, i) => (
          <View key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <View className="mb-3 pb-3 border-b border-zinc-800">
              <Text className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-1">Transcrição</Text>
              <Text className="text-zinc-200 text-sm leading-relaxed">{s.transcript}</Text>
              {s.translation ? <Text className="text-zinc-500 text-xs mt-1 italic">🇧🇷 {s.translation}</Text> : null}
            </View>
            <Text className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Sugestões</Text>
            {s.suggestions.map((sug, j) => (
              <View key={j} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2.5 mb-2">
                <Text className="text-white text-sm leading-relaxed">{sug}</Text>
                {s.suggestionTranslations[j] && (
                  <Text className="text-zinc-500 text-xs mt-1">{s.suggestionTranslations[j]}</Text>
                )}
              </View>
            ))}
            <Text className="text-zinc-600 text-[10px] text-right mt-1">⚡ {s.creditsUsed} créditos</Text>
          </View>
        ))}

        {isProcessing && (
          <View className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 flex-row items-center gap-3">
            <ActivityIndicator color="#7c3aed" />
            <View>
              <Text className="text-violet-300 text-sm font-semibold">Processando com IA...</Text>
              <Text className="text-violet-400/50 text-xs">Transcrevendo + gerando sugestões</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Error */}
        {error && (
          <View className="mx-4 mb-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 flex-row items-center justify-between">
            <Text className="text-red-400 text-xs flex-1">{error}</Text>
            <TouchableOpacity onPress={() => setError(null)} className="ml-2">
              <Text className="text-red-400 text-sm">✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Phrase panel */}
        {showPhrase && (
          <View className="mx-4 mb-2 bg-zinc-900 border border-zinc-700 rounded-2xl p-3">
            <Text className="text-zinc-400 text-xs font-semibold mb-2">🌐 Como falo em inglês?</Text>
            <View className="flex-row items-center gap-2 mb-2">
              <TextInput
                value={phraseText} onChangeText={(v) => { setPhraseText(v); setPhraseResult(null); }}
                placeholder="Escreva em português..."
                placeholderTextColor="#52525b" returnKeyType="send"
                onSubmitEditing={handleTranslatePhrase}
                autoFocus
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm"
              />
              <TouchableOpacity onPress={handleTranslatePhrase} disabled={!phraseText.trim() || phraseLoading}
                className="w-10 h-10 bg-primary rounded-xl items-center justify-center">
                {phraseLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white">▶</Text>}
              </TouchableOpacity>
            </View>
            {phraseResult && (
              <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                <Text className="text-emerald-300 text-sm font-semibold leading-relaxed">{phraseResult}</Text>
              </View>
            )}
          </View>
        )}

        {/* Bottom dock */}
        <View className="px-6 pb-6 pt-2">
          {isRecording && (
            <View className="w-full bg-zinc-800 rounded-full h-1.5 mb-4 overflow-hidden">
              <View className="bg-red-500 h-full rounded-full" style={{ width: `${progressPct}%` }} />
            </View>
          )}

          <View className="flex-row items-end justify-center gap-5">
            {/* Phrase helper */}
            <TouchableOpacity
              onPress={() => {
                setShowPhrase(!showPhrase);
                setPhraseResult(null);
                setPhraseText("");
                if (!showPhrase) setError(null);
              }}
              className="items-center gap-1"
            >
              <View className={`w-12 h-12 rounded-full border items-center justify-center ${
                showPhrase ? "bg-primary/20 border-primary/40" : "bg-zinc-800 border-zinc-700"
              }`}>
                <Text style={{ fontSize: 20 }}>🌐</Text>
              </View>
              <Text className={`text-[10px] ${showPhrase ? "text-primary" : "text-zinc-500"}`}>Como falo?</Text>
            </TouchableOpacity>

            {/* Main mic button */}
            <TouchableOpacity
              onPress={isRecording ? processAudio : startRecording}
              disabled={isProcessing}
              activeOpacity={0.85}
              className="items-center gap-1"
            >
              <View className={`rounded-full w-20 h-20 items-center justify-center ${
                isRecording ? "bg-red-500" : isProcessing ? "bg-zinc-700" : "bg-primary"
              }`}>
                {isRecording ? (
                  <View className="items-center">
                    <Text className="text-white text-lg font-bold">⏹</Text>
                    <Text className="text-white text-[11px] font-bold">{countdown}s</Text>
                  </View>
                ) : isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 28 }}>🎙️</Text>
                )}
              </View>
              <Text className="text-zinc-400 text-[10px]">
                {isRecording ? "Toque para parar" : isProcessing ? "Processando..." : "Gravar"}
              </Text>
            </TouchableOpacity>

            {/* Clear */}
            <TouchableOpacity onPress={() => setTurns([])} className="items-center gap-1">
              <View className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 items-center justify-center">
                <Text style={{ fontSize: 20 }}>🗑️</Text>
              </View>
              <Text className="text-zinc-500 text-[10px]">Limpar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showLangPicker} transparent animationType="slide">
        <TouchableOpacity className="flex-1 bg-black/60" activeOpacity={1} onPress={() => setShowLangPicker(false)} />
        <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-10">
          <Text className="text-white font-bold text-base mb-4">Idioma captado</Text>
          {LANGUAGES.map((l) => (
            <TouchableOpacity key={l.code} onPress={() => { setSourceLang(l.code); setShowLangPicker(false); }}
              className="flex-row items-center py-3 border-b border-zinc-800">
              <Text className="text-white text-sm flex-1">{l.label}</Text>
              {sourceLang === l.code && <Text className="text-primary text-sm">✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
