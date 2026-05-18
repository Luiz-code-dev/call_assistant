import { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@presentation/stores/authStore";

const QUICK_ACTIONS: { emoji: string; label: string; route: string }[] = [
  { emoji: "✍️", label: "Melhorar texto",  route: "/(app)/tools/improve"   },
  { emoji: "💬", label: "Gerar resposta",  route: "/(app)/tools/generate"  },
  { emoji: "🎯", label: "Entrevista",      route: "/(app)/tools/interview" },
  { emoji: "🎙️", label: "Live Assist",    route: "/(app)/live"            },
  { emoji: "📨", label: "Mensagens",       route: "/(app)/chat"            },
];

export default function HomeScreen() {
  const { user, refreshUser, isLoading } = useAuthStore();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const firstName = user?.name?.split(" ")[0] ?? "Usuário";
  const creditPct = Math.min(100, ((user?.credits ?? 0) / 200) * 100);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshUser}
            tintColor="#7c3aed"
          />
        }
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-zinc-500 text-sm">Olá 👋</Text>
            <Text className="text-white text-2xl font-bold">{firstName}</Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-zinc-500 mb-1">Créditos</Text>
            <View className="flex-row items-center gap-2">
              <View className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${creditPct}%` }}
                />
              </View>
              <Text className="text-white font-bold text-sm">{user?.credits ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* Plan badge */}
        {user && (
          <View className="px-5 mb-5">
            <View className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-zinc-500">Plano atual</Text>
                <Text className="text-white font-semibold capitalize mt-0.5">
                  {user.plan === "free" ? "Gratuito" : user.plan === "basic" ? "Básico" : "Premium"}
                </Text>
              </View>
              {user.plan !== "premium" && (
                <TouchableOpacity className="bg-primary/20 border border-primary/30 rounded-lg px-3 py-1.5">
                  <Text className="text-primary text-xs font-semibold">Fazer upgrade</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View className="px-5 mb-6">
          <Text className="text-white font-bold text-base mb-3">Acesso rápido</Text>
          <View className="flex-row flex-wrap gap-3">
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.route}
                onPress={() => router.push(action.route as never)}
                className="flex-1 min-w-[140px] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 items-center gap-2"
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 28 }}>{action.emoji}</Text>
                <Text className="text-white text-xs font-semibold text-center">
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Live CTA */}
        <View className="px-5 mb-6">
          <TouchableOpacity
            onPress={() => router.push("/(app)/live")}
            className="rounded-2xl overflow-hidden"
            activeOpacity={0.85}
          >
            <View className="bg-gradient-to-br from-violet-900/60 to-violet-950/80 border border-violet-500/30 rounded-2xl p-5">
              <View className="flex-row items-center gap-3 mb-2">
                <Text style={{ fontSize: 24 }}>🎙️</Text>
                <Text className="text-white font-bold text-base">SpeakFlow Live</Text>
                <View className="bg-violet-500/20 border border-violet-400/30 rounded-full px-2 py-0.5">
                  <Text className="text-violet-300 text-[10px] font-bold">NOVO</Text>
                </View>
              </View>
              <Text className="text-zinc-400 text-sm">
                Copiloto de reuniões em tempo real. Transcrição + sugestões com IA.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Credits info */}
        <View className="px-5">
          <View className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <Text className="text-zinc-400 text-xs text-center">
              Cada uso de ferramenta consome{" "}
              <Text className="text-white font-semibold">2 créditos</Text>.{" "}
              {user?.b2bAccess
                ? "Sua empresa te dá acesso ilimitado 🏢"
                : "Recarregue créditos no seu perfil."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
