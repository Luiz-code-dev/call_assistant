import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@presentation/stores/authStore";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  function handleLogout() {
    Alert.alert("Sair", "Deseja encerrar sua sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
    ]);
  }

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar + name */}
        <View className="items-center px-5 pt-8 pb-6">
          <View className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/30 items-center justify-center mb-3">
            <Text style={{ fontSize: 32 }}>👤</Text>
          </View>
          <Text className="text-white text-xl font-bold">{user.name}</Text>
          <Text className="text-zinc-500 text-sm mt-0.5">{user.email}</Text>
          <View className="flex-row items-center gap-2 mt-2">
            <View className="bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
              <Text className="text-primary text-xs font-semibold capitalize">
                {user.plan === "free" ? "Gratuito" : user.plan === "basic" ? "Básico" : "Premium"}
              </Text>
            </View>
            {user.b2bAccess && (
              <View className="bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
                <Text className="text-amber-400 text-xs font-semibold">🏢 Corporativo</Text>
              </View>
            )}
          </View>
        </View>

        {/* Credits card */}
        <View className="px-5 mb-4">
          <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Créditos disponíveis
            </Text>
            <Text className="text-4xl font-bold text-white">{user.credits}</Text>
            <Text className="text-zinc-500 text-xs mt-1">
              {user.b2bAccess ? "Uso ilimitado pela empresa" : "2 créditos por uso de ferramenta"}
            </Text>
            {!user.b2bAccess && (
              <TouchableOpacity className="mt-3 bg-primary/10 border border-primary/20 rounded-xl py-2 items-center">
                <Text className="text-primary text-sm font-semibold">Recarregar créditos →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Settings */}
        <View className="px-5 gap-2">
          {[
            { emoji: "🔔", label: "Notificações" },
            { emoji: "🔒", label: "Privacidade e segurança" },
            { emoji: "💳", label: "Plano e cobrança" },
            { emoji: "💡", label: "Sugerir melhoria" },
            { emoji: "📋", label: "Termos de uso" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              className="flex-row items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5"
              activeOpacity={0.7}
            >
              <Text>{item.emoji}</Text>
              <Text className="text-white flex-1 text-sm">{item.label}</Text>
              <Text className="text-zinc-600">›</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center gap-3 border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-3.5 mt-2"
            activeOpacity={0.7}
          >
            <Text>🚪</Text>
            <Text className="text-red-400 flex-1 text-sm font-medium">Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
