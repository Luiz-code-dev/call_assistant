import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ToolsApi } from "@infrastructure/api/ToolsApi";
import { useAuthStore } from "@presentation/stores/authStore";
import type { ImproveResult } from "@domain/entities/Tool";

export default function ImproveScreen() {
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImproveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!text.trim() || loading) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await ToolsApi.improveText(text.trim());
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setResult(res.data);
      refreshUser();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center">
            <Text className="text-white">←</Text>
          </TouchableOpacity>
          <View>
            <Text className="text-white font-bold text-lg">✍️ Melhorar texto</Text>
            <Text className="text-zinc-500 text-xs">⚡ 2 créditos por uso</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Input */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
              Seu texto em inglês
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Paste your English text here to improve it..."
              placeholderTextColor="#52525b"
              multiline
              numberOfLines={6}
              maxLength={2000}
              className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm leading-relaxed"
              style={{ minHeight: 140, textAlignVertical: "top" }}
            />
            <Text className="text-right text-xs text-zinc-600 mt-1">{text.length}/2000</Text>
          </View>

          {/* Error */}
          {error && (
            <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !text.trim()}
            className="bg-primary rounded-xl py-4 items-center mb-6 disabled:opacity-50"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Melhorar com IA ✨</Text>
            )}
          </TouchableOpacity>

          {/* Result */}
          {result && (
            <View className="gap-4">
              {/* Score */}
              <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-row items-center gap-4">
                <View className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                  <Text className="text-primary font-bold text-xl">{result.score}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold mb-1">Score de clareza</Text>
                  <Text className="text-zinc-400 text-xs leading-relaxed">{result.explanation}</Text>
                </View>
              </View>

              {/* Improved */}
              <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                  Texto melhorado
                </Text>
                <Text className="text-white text-sm leading-relaxed">{result.improved}</Text>
              </View>

              {/* Tips */}
              {result.tips.length > 0 && (
                <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <Text className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                    Dicas
                  </Text>
                  {result.tips.map((tip, i) => (
                    <View key={i} className="flex-row gap-2 mb-2">
                      <Text className="text-primary text-xs mt-0.5">•</Text>
                      <Text className="text-zinc-300 text-xs flex-1 leading-relaxed">{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
