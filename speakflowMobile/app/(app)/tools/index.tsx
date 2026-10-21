import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@presentation/stores/authStore";

const TOOLS = [
  {
    emoji: "🎙️",
    title: "Live Assist",
    description: "Copiloto de IA em tempo real para reuniões e calls em inglês",
    route: "/(app)/live" as const,
    credits: 2,
    badge: "TEMPO REAL",
    badgeColor: "bg-emerald-500/20 border-emerald-500/30",
    badgeText: "text-emerald-400",
    accent: "border-emerald-500/20 bg-emerald-500/5",
  },
  {
    emoji: "🎯",
    title: "Simulador de entrevista",
    description: "Entrevista real em inglês com feedback por resposta e avaliação final",
    route: "/(app)/tools/interview" as const,
    credits: 2,
    badge: "POPULAR",
    badgeColor: "bg-violet-500/20 border-violet-500/30",
    badgeText: "text-violet-400",
    accent: "border-violet-500/20 bg-violet-500/5",
  },
  {
    emoji: "✍️",
    title: "Melhorar texto",
    description: "Corrija e aprimore sua escrita em inglês — e-mails, mensagens, relatórios",
    route: "/(app)/tools/improve" as const,
    credits: 2,
    badge: null,
    badgeColor: "",
    badgeText: "",
    accent: "border-zinc-800 bg-zinc-900",
  },
  {
    emoji: "💬",
    title: "Gerar resposta",
    description: "Gere respostas profissionais para qualquer situação de trabalho",
    route: "/(app)/tools/generate" as const,
    credits: 2,
    badge: null,
    badgeColor: "",
    badgeText: "",
    accent: "border-zinc-800 bg-zinc-900",
  },
];

export default function ToolsScreen() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-white">🔧 Ferramentas IA</Text>
          <Text className="text-zinc-500 text-xs mt-0.5">Pratique e melhore seu inglês profissional</Text>
        </View>
        <View className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 items-center">
          <Text className="text-primary font-bold text-base">{user?.credits ?? 0}</Text>
          <Text className="text-zinc-500 text-[10px]">⚡ créditos</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 20, gap: 12 }}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.route}
            onPress={() => router.push(tool.route)}
            className={`border rounded-2xl p-5 flex-row items-center gap-4 ${tool.accent}`}
            activeOpacity={0.75}
          >
            <View className="w-14 h-14 rounded-xl bg-zinc-800/80 items-center justify-center flex-shrink-0">
              <Text style={{ fontSize: 28 }}>{tool.emoji}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-0.5">
                <Text className="text-white font-bold text-sm">{tool.title}</Text>
                {tool.badge && (
                  <View className={`px-1.5 py-0.5 rounded border ${tool.badgeColor}`}>
                    <Text className={`text-[9px] font-bold ${tool.badgeText}`}>{tool.badge}</Text>
                  </View>
                )}
              </View>
              <Text className="text-zinc-500 text-xs leading-relaxed">{tool.description}</Text>
              <Text className="text-[10px] text-zinc-600 mt-1.5">⚡ {tool.credits} créditos por uso</Text>
            </View>
            <Text className="text-zinc-600 text-lg">›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
