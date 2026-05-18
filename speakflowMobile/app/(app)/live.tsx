import { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, TextInput, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import { useAuthStore } from "@presentation/stores/authStore";
import { LiveApi, type LiveSuggestionResult } from "@infrastructure/api/LiveApi";

type SessionState = "setup" | "recording" | "processing" | "results";

const LANGUAGES = [
  { code: "pt", label: "🇧🇷 Português" },
  { code: "en", label: "🇺🇸 Inglês" },
  { code: "es", label: "🇪🇸 Espanhol" },
  { code: "fr", label: "🇫🇷 Francês" },
  { code: "de", label: "🇩🇪 Alemão" },
  { code: "it", label: "🇮🇹 Italiano" },
  { code: "zh", label: "🇨🇳 Chinês" },
  { code: "ja", label: "🇯🇵 Japonês" },
];

const AUTO_STOP_SECONDS = 8;

export default function LiveScreen() {
  const { user, refreshUser } = useAuthStore();

  const [sessionState, setSessionState] = useState<SessionState>("setup");
  const [suggestions, setSuggestions] = useState<LiveSuggestionResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [context, setContext] = useState("");
  const [sourceLang, setSourceLang] = useState("pt");
  const [showLangPicker, setShowLangPicker] = useState(false);

  const [countdown, setCountdown] = useState(AUTO_STOP_SECONDS);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const sessionIdRef = useRef<string>(`live_${Date.now()}`);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const processAudio = useCallback(async () => {
    clearCountdown();
    setSessionState("processing");

    await audioRecorder.stop();
    const uri = audioRecorder.uri;

    if (!uri) {
      setError("Erro ao obter áudio gravado.");
      setSessionState("setup");
      return;
    }

    const result = await LiveApi.processAudio(uri, sessionIdRef.current);

    if (!result.ok) {
      setError(result.error.message);
      setSessionState("setup");
      return;
    }

    setSuggestions((prev) => [result.data, ...prev].slice(0, 10));
    refreshUser();
    setSessionState("results");
  }, [audioRecorder, clearCountdown, refreshUser]);

  const startRecording = useCallback(async () => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      Alert.alert(
        "Permissão necessária",
        "O SpeakFlow precisa de acesso ao microfone para o Live Assist.",
        [{ text: "OK" }]
      );
      return;
    }

    await AudioModule.setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    setError(null);
    setCountdown(AUTO_STOP_SECONDS);
    setSessionState("recording");
    await audioRecorder.record();

    let remaining = AUTO_STOP_SECONDS;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        processAudio();
      }
    }, 1000);
  }, [audioRecorder, processAudio]);

  useEffect(() => () => clearCountdown(), [clearCountdown]);

  const selectedLang = LANGUAGES.find((l) => l.code === sourceLang) ?? LANGUAGES[0];
  const isRecording = sessionState === "recording";
  const isProcessing = sessionState === "processing";
  const progressPct = isRecording ? ((AUTO_STOP_SECONDS - countdown) / AUTO_STOP_SECONDS) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-white">🎙️ Live Assist</Text>
          <Text className="text-zinc-500 text-xs">Copiloto de reuniões em tempo real</Text>
        </View>
        <View className="items-end">
          <Text className="text-xs text-zinc-500">Créditos</Text>
          <Text className="text-white font-bold">{user?.credits ?? 0}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 220 }}>

        {/* Setup panel — always visible */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 mt-2">
          {/* Language */}
          <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">
            Como falo?
          </Text>
          <TouchableOpacity
            onPress={() => setShowLangPicker(true)}
            className="flex-row items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 mb-4"
          >
            <Text className="text-white text-sm">{selectedLang.label}</Text>
            <Text className="text-zinc-400 text-xs">▼</Text>
          </TouchableOpacity>

          {/* Context */}
          <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">
            Contexto da conversa (opcional)
          </Text>
          <TextInput
            value={context}
            onChangeText={setContext}
            placeholder="Ex: reunião de vendas, entrevista de emprego, aula de inglês..."
            placeholderTextColor="#52525b"
            multiline
            numberOfLines={2}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm"
            style={{ textAlignVertical: "top", minHeight: 56 }}
            editable={!isRecording && !isProcessing}
          />
        </View>

        {/* Error */}
        {error && (
          <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        )}

        {/* Processing */}
        {isProcessing && (
          <View className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-5 mb-4 items-center">
            <Text className="text-violet-400 text-2xl mb-2">⚡</Text>
            <Text className="text-violet-300 font-semibold text-sm mb-1">Processando com IA...</Text>
            <Text className="text-zinc-500 text-xs text-center">
              Transcrevendo + gerando sugestões de resposta
            </Text>
          </View>
        )}

        {/* Results */}
        {suggestions.map((s, i) => (
          <View key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-3">
            <View className="mb-3 pb-3 border-b border-zinc-800">
              <Text className="text-xs text-zinc-500 font-semibold mb-1 uppercase tracking-wider">
                Transcrição
              </Text>
              <Text className="text-zinc-300 text-sm leading-relaxed">{s.transcript}</Text>
              {s.translation ? (
                <Text className="text-zinc-500 text-xs mt-1 italic">{s.translation}</Text>
              ) : null}
            </View>

            <Text className="text-xs text-zinc-500 font-semibold mb-2 uppercase tracking-wider">
              Sugestões de resposta
            </Text>
            {s.suggestions.map((sug, j) => (
              <View key={j} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2.5 mb-2">
                <Text className="text-white text-sm leading-relaxed">{sug}</Text>
                {s.suggestionTranslations[j] && (
                  <Text className="text-zinc-500 text-xs mt-1">{s.suggestionTranslations[j]}</Text>
                )}
              </View>
            ))}
            <Text className="text-xs text-zinc-600 text-right mt-1">⚡ {s.creditsUsed} créditos</Text>
          </View>
        ))}
      </ScrollView>

      {/* Record button area */}
      <View className="absolute bottom-6 left-0 right-0 items-center px-8">
        {/* Timer arc / progress bar */}
        {isRecording && (
          <View className="w-full bg-zinc-800 rounded-full h-1.5 mb-4 overflow-hidden">
            <View
              className="bg-red-500 h-full rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </View>
        )}

        {/* Button row */}
        <View className="flex-row items-center gap-4">
          {sessionState === "results" && (
            <TouchableOpacity
              onPress={() => { setSuggestions([]); setSessionState("setup"); }}
              className="bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3.5"
            >
              <Text className="text-zinc-300 text-sm font-medium">🗑 Limpar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={isRecording ? processAudio : startRecording}
            disabled={isProcessing}
            activeOpacity={0.85}
            className={`rounded-full w-20 h-20 items-center justify-center shadow-2xl ${
              isRecording ? "bg-red-500" : isProcessing ? "bg-zinc-700" : "bg-primary"
            }`}
          >
            {isRecording ? (
              <View className="items-center">
                <Text style={{ fontSize: 22 }}>⏹</Text>
                <Text className="text-white text-[11px] font-bold">{countdown}s</Text>
              </View>
            ) : isProcessing ? (
              <Text style={{ fontSize: 26 }}>⏳</Text>
            ) : (
              <Text style={{ fontSize: 28 }}>🎙️</Text>
            )}
          </TouchableOpacity>

          {sessionState === "results" && (
            <TouchableOpacity
              onPress={startRecording}
              className="bg-primary/10 border border-primary/20 rounded-2xl px-5 py-3.5"
            >
              <Text className="text-primary text-sm font-medium">+ Gravar</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text className="text-xs text-zinc-500 mt-2 text-center">
          {isRecording
            ? `Para automático em ${countdown}s — toque para parar antes`
            : isProcessing
            ? "Aguarde..."
            : "Toque para gravar • Para automaticamente em 8s"}
        </Text>
      </View>

      {/* Language picker modal */}
      <Modal visible={showLangPicker} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/60"
          activeOpacity={1}
          onPress={() => setShowLangPicker(false)}
        />
        <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-10">
          <Text className="text-white font-bold text-base mb-4">Como falo?</Text>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l.code}
              onPress={() => { setSourceLang(l.code); setShowLangPicker(false); }}
              className={`flex-row items-center gap-3 py-3 border-b border-zinc-800 ${sourceLang === l.code ? "opacity-100" : "opacity-70"}`}
            >
              <Text className="text-white text-sm flex-1">{l.label}</Text>
              {sourceLang === l.code && <Text className="text-primary">✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
