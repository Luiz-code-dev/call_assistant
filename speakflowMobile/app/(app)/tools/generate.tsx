import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ToolsApi } from "@infrastructure/api/ToolsApi";
import { useAuthStore } from "@presentation/stores/authStore";
import type { GenerateResult } from "@domain/entities/Tool";

const TABS = ["short", "professional", "detailed"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  short: "Curta",
  professional: "Profissional",
  detailed: "Detalhada",
};

export default function GenerateScreen() {
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [context, setContext] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!context.trim() || loading) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await ToolsApi.generateResponse(context.trim());
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

  const responseMap: Record<Tab, string> = {
    short: result?.short ?? "",
    professional: result?.professional ?? "",
    detailed: result?.detailed ?? "",
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center"
          >
            <Text className="text-white">←</Text>
          </TouchableOpacity>
          <View>
            <Text className="text-white font-bold text-lg">💬 Gerar resposta</Text>
            <Text className="text-zinc-500 text-xs">⚡ 2 créditos por uso</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Context input */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
              Contexto da situação
            </Text>
            <TextInput
              value={context}
              onChangeText={setContext}
              placeholder={"Ex: My manager asked me to explain why the project is delayed and what I'm doing to fix it."}
              placeholderTextColor="#52525b"
              multiline
              numberOfLines={5}
              maxLength={1000}
              className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm leading-relaxed"
              style={{ minHeight: 120, textAlignVertical: "top" }}
            />
            <Text className="text-right text-xs text-zinc-600 mt-1">{context.length}/1000</Text>
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
            disabled={loading || !context.trim()}
            className="bg-primary rounded-xl py-4 items-center mb-6 disabled:opacity-50"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Gerar com IA ✨</Text>
            )}
          </TouchableOpacity>

          {/* Result */}
          {result && (
            <View className="gap-4">
              {/* Tabs */}
              <View className="flex-row bg-zinc-800/50 rounded-xl p-1 gap-1">
                {TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    className={`flex-1 rounded-lg py-2 items-center ${
                      activeTab === tab ? "bg-primary" : "bg-transparent"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        activeTab === tab ? "text-white" : "text-zinc-500"
                      }`}
                    >
                      {TAB_LABELS[tab]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Response card */}
              <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <Text className="text-white text-sm leading-relaxed">
                  {responseMap[activeTab]}
                </Text>
              </View>

              {/* Translation */}
              {result.translation && (
                <View className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <Text className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
                    Tradução
                  </Text>
                  <Text className="text-zinc-400 text-sm leading-relaxed">
                    {result.translation}
                  </Text>
                </View>
              )}

              {/* Usage tip */}
              {result.usageTip && (
                <View className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <Text className="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wider">
                    💡 Dica de uso
                  </Text>
                  <Text className="text-zinc-300 text-xs leading-relaxed">
                    {result.usageTip}
                  </Text>
                </View>
              )}

              <Text className="text-xs text-zinc-600 text-right">
                ⚡ {result.creditsUsed} créditos usados
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
