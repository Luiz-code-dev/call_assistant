import { useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import { useAuthStore } from "@presentation/stores/authStore";
import { LiveApi, type LiveSuggestionResult } from "@infrastructure/api/LiveApi";

type SessionState = "idle" | "recording" | "processing";

export default function LiveScreen() {
  const { user, refreshUser } = useAuthStore();
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [suggestions, setSuggestions] = useState<LiveSuggestionResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const sessionIdRef = useRef<string>(`live_${Date.now()}`);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      Alert.alert(
        "Permissão necessária",
        "O SpeakFlow precisa de acesso ao microfone para o Live Assist.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  }, []);

  const startRecording = useCallback(async () => {
    const hasPermission = await requestMicPermission();
    if (!hasPermission) return;

    setError(null);
    setSessionState("recording");

    await audioRecorder.record();
  }, [requestMicPermission]);

  const stopAndProcess = useCallback(async () => {
    if (!audioRecorder.isRecording) return;

    setSessionState("processing");

    await audioRecorder.stop();
    const uri = audioRecorder.uri;

    if (!uri) {
      setError("Erro ao obter áudio gravado.");
      setSessionState("idle");
      return;
    }

    const result = await LiveApi.processAudio(uri, sessionIdRef.current);

    if (!result.ok) {
      setError(result.error.message);
      setSessionState("idle");
      return;
    }

    setSuggestions((prev) => [result.data, ...prev].slice(0, 10));
    refreshUser();
    setSessionState("idle");
  }, [refreshUser]);

  const isRecording = sessionState === "recording";
  const isProcessing = sessionState === "processing";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-white">🎙️ Live Assist</Text>
            <Text className="text-zinc-500 text-xs mt-0.5">
              Copiloto de reuniões em tempo real
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-zinc-500">Créditos</Text>
            <Text className="text-white font-bold">{user?.credits ?? 0}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 200 }}>
        {/* Error */}
        {error && (
          <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        )}

        {/* Empty state */}
        {suggestions.length === 0 && !isProcessing && (
          <View className="items-center py-16 px-4">
            <Text style={{ fontSize: 56 }} className="mb-4">🎧</Text>
            <Text className="text-white font-semibold text-lg text-center mb-2">
              Pronto para começar
            </Text>
            <Text className="text-zinc-500 text-sm text-center leading-relaxed">
              Pressione o botão abaixo, fale por alguns segundos, e a IA vai transcrever e sugerir respostas em tempo real.
            </Text>
          </View>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <View className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-4 flex-row items-center gap-3">
            <Text className="text-violet-400">⏳</Text>
            <Text className="text-violet-300 text-sm">Processando com IA...</Text>
          </View>
        )}

        {/* Suggestion cards */}
        {suggestions.map((s, i) => (
          <View key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-3">
            {/* Transcript */}
            <View className="mb-3 pb-3 border-b border-zinc-800">
              <Text className="text-xs text-zinc-500 font-semibold mb-1 uppercase tracking-wider">
                Transcrição
              </Text>
              <Text className="text-zinc-300 text-sm leading-relaxed">{s.transcript}</Text>
              {s.translation ? (
                <Text className="text-zinc-500 text-xs mt-1 italic">{s.translation}</Text>
              ) : null}
            </View>

            {/* Suggestions */}
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

            <Text className="text-xs text-zinc-600 text-right mt-1">⚡ {s.creditsUsed} créditos usados</Text>
          </View>
        ))}
      </ScrollView>

      {/* Record button — fixed at bottom */}
      <View className="absolute bottom-8 left-0 right-0 items-center px-5">
        <TouchableOpacity
          onPress={isRecording ? stopAndProcess : startRecording}
          disabled={isProcessing}
          activeOpacity={0.85}
          className={`rounded-full w-20 h-20 items-center justify-center shadow-2xl ${
            isRecording
              ? "bg-red-500"
              : isProcessing
              ? "bg-zinc-700"
              : "bg-primary"
          }`}
        >
          <Text style={{ fontSize: 28 }}>
            {isRecording ? "⏹" : isProcessing ? "⏳" : "🎙️"}
          </Text>
        </TouchableOpacity>
        <Text className="text-xs text-zinc-500 mt-2">
          {isRecording
            ? "Gravando... toque para parar"
            : isProcessing
            ? "Processando..."
            : "Toque para gravar"}
        </Text>
      </View>
    </SafeAreaView>
  );
}
