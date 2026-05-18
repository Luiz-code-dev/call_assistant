import { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ToolsApi } from "@infrastructure/api/ToolsApi";
import { useAuthStore } from "@presentation/stores/authStore";
import type { InterviewResult } from "@domain/entities/Tool";

const LEVELS = ["Junior", "Pleno", "Senior", "Lead"] as const;
type Level = typeof LEVELS[number];

export default function InterviewScreen() {
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [role, setRole] = useState("");
  const [level, setLevel] = useState<Level>("Pleno");
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!role.trim() || loading) return;
    setError(null);
    setResult(null);
    setExpanded(null);
    setLoading(true);
    try {
      const res = await ToolsApi.generateInterview(role.trim(), level);
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
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center"
        >
          <Text className="text-white">←</Text>
        </TouchableOpacity>
        <View>
          <Text className="text-white font-bold text-lg">🎯 Simulador de Entrevista</Text>
          <Text className="text-zinc-500 text-xs">⚡ 2 créditos por uso</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Role input */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
            Cargo / função
          </Text>
          <TextInput
            value={role}
            onChangeText={setRole}
            placeholder="Ex: Software Engineer, Product Manager, Data Scientist..."
            placeholderTextColor="#52525b"
            returnKeyType="done"
            className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3.5 text-white text-sm"
          />
        </View>

        {/* Level selector */}
        <View className="mb-6">
          <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
            Nível
          </Text>
          <View className="flex-row gap-2">
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => setLevel(l)}
                className={`flex-1 rounded-xl py-2.5 items-center border ${
                  level === l
                    ? "bg-primary border-primary"
                    : "bg-zinc-800/50 border-zinc-700"
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-xs font-semibold ${
                    level === l ? "text-white" : "text-zinc-500"
                  }`}
                >
                  {l}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
          disabled={loading || !role.trim()}
          className="bg-primary rounded-xl py-4 items-center mb-6 disabled:opacity-50"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Gerar perguntas ✨</Text>
          )}
        </TouchableOpacity>

        {/* Questions */}
        {result && (
          <View className="gap-3">
            <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              {result.questions.length} perguntas para {role} {level}
            </Text>

            {result.questions.map((q, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setExpanded(expanded === i ? null : i)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
                activeOpacity={0.8}
              >
                {/* Question header */}
                <View className="flex-row items-center gap-3 px-4 py-3.5">
                  <View className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 items-center justify-center">
                    <Text className="text-primary text-xs font-bold">{i + 1}</Text>
                  </View>
                  <Text className="text-white text-sm font-medium flex-1 leading-relaxed">
                    {q.question}
                  </Text>
                  <Text className="text-zinc-600 text-sm">
                    {expanded === i ? "▲" : "▼"}
                  </Text>
                </View>

                {/* Context (expanded) */}
                {expanded === i && q.context && (
                  <View className="px-4 pb-4 border-t border-zinc-800">
                    <Text className="text-xs font-semibold text-zinc-500 mt-3 mb-2 uppercase tracking-wider">
                      💡 Dica para responder
                    </Text>
                    <Text className="text-zinc-400 text-xs leading-relaxed">
                      {q.context}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <Text className="text-xs text-zinc-600 text-right mt-1">
              ⚡ {result.creditsUsed} créditos usados
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
