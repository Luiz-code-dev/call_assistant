import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

const TOOLS = [
  {
    emoji: "✍️",
    title: "Melhorar texto",
    description: "Corrija e aprimore sua escrita em inglês com IA",
    route: "/(app)/tools/improve" as const,
    credits: 2,
  },
  {
    emoji: "💬",
    title: "Gerar resposta",
    description: "Gere respostas profissionais para e-mails e reuniões",
    route: "/(app)/tools/generate" as const,
    credits: 2,
  },
  {
    emoji: "🎯",
    title: "Simulador de entrevista",
    description: "Perguntas personalizadas para sua vaga e nível",
    route: "/(app)/tools/interview" as const,
    credits: 2,
  },
];

export default function ToolsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-white">Ferramentas IA</Text>
        <Text className="text-zinc-500 text-sm mt-1">Cada uso consome 2 créditos</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 20, gap: 12 }}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.route}
            onPress={() => router.push(tool.route)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex-row items-center gap-4"
            activeOpacity={0.75}
          >
            <View className="w-14 h-14 rounded-xl bg-zinc-800 items-center justify-center">
              <Text style={{ fontSize: 26 }}>{tool.emoji}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-base mb-0.5">{tool.title}</Text>
              <Text className="text-zinc-500 text-xs leading-relaxed">{tool.description}</Text>
              <View className="flex-row items-center gap-1 mt-2">
                <Text className="text-[10px] text-violet-400 font-semibold">
                  ⚡ {tool.credits} créditos
                </Text>
              </View>
            </View>
            <Text className="text-zinc-600 text-lg">›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
