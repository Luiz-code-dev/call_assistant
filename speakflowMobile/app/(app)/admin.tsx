import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@infrastructure/http/ApiClient";

interface AdminStats {
  totalUsers: number;
  totalCreditsIssued: number;
  activeSubscriptions: number;
  newUsersToday: number;
  freeUsers: number;
  basicUsers: number;
  premiumUsers: number;
}

async function fetchAdminStats(): Promise<AdminStats> {
  const result = await ApiClient.get<AdminStats>("/api/admin/stats");
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  credits: number;
  createdAt: string;
}

async function fetchRecentUsers(): Promise<AdminUser[]> {
  const result = await ApiClient.get<{ users: AdminUser[] }>("/api/admin/users?limit=20");
  if (!result.ok) throw new Error(result.error.message);
  return result.data.users ?? [];
}

const PLAN_LABEL: Record<string, string> = {
  free: "Gratuito",
  basic: "Básico",
  premium: "Premium",
};

const PLAN_COLOR: Record<string, string> = {
  free: "text-zinc-400",
  basic: "text-blue-400",
  premium: "text-violet-400",
};

export default function AdminScreen() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchRecentUsers,
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.back()} className="mr-1">
            <Text className="text-zinc-400 text-lg">‹</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">⚙️ Painel Admin</Text>
        </View>

        {/* Stats grid */}
        <View className="px-5 mb-5">
          <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Visão Geral
          </Text>
          {loadingStats ? (
            <ActivityIndicator color="#7c3aed" />
          ) : stats ? (
            <View className="gap-3">
              <View className="flex-row gap-3">
                <StatCard label="Usuários totais" value={stats.totalUsers} emoji="👥" />
                <StatCard label="Novos hoje" value={stats.newUsersToday} emoji="🆕" />
              </View>
              <View className="flex-row gap-3">
                <StatCard label="Assinaturas ativas" value={stats.activeSubscriptions} emoji="💳" />
                <StatCard label="Créditos emitidos" value={stats.totalCreditsIssued} emoji="⚡" />
              </View>
              <View className="flex-row gap-3">
                <StatCard label="Gratuitos" value={stats.freeUsers} emoji="🆓" />
                <StatCard label="Premium" value={stats.premiumUsers} emoji="⭐" />
              </View>
            </View>
          ) : null}
        </View>

        {/* Reset user password */}
        <ResetPasswordPanel />

        {/* Quick actions */}
        <View className="px-5 mb-5">
          <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Ações Rápidas
          </Text>
          <View className="gap-2">
            <TouchableOpacity
              onPress={() => router.push("/(app)/crm")}
              className="flex-row items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5"
            >
              <Text>📋</Text>
              <Text className="text-white flex-1 text-sm">Gerenciar Leads (CRM)</Text>
              <Text className="text-zinc-600">›</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5">
              <Text>📊</Text>
              <Text className="text-white flex-1 text-sm">Relatório completo (web)</Text>
              <Text className="text-zinc-600">›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent users */}
        <View className="px-5">
          <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Usuários Recentes
          </Text>
          {loadingUsers ? (
            <ActivityIndicator color="#7c3aed" />
          ) : (
            <View className="gap-2">
              {users.map((u) => (
                <View key={u.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-white text-sm font-medium">{u.name}</Text>
                    <Text className="text-zinc-500 text-xs">{u.email}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`text-xs font-semibold ${PLAN_COLOR[u.plan] ?? "text-zinc-400"}`}>
                      {PLAN_LABEL[u.plan] ?? u.plan}
                    </Text>
                    <Text className="text-zinc-600 text-[10px]">{u.credits} cr.</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ResetPasswordPanel() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    try {
      const result = await ApiClient.post<{ message: string }>(
        "/api/admin/reset-user-password",
        { email: trimmed }
      );
      if (result.ok) {
        Alert.alert("Enviado!", result.data.message);
        setEmail("");
      } else {
        Alert.alert("Erro", result.error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="px-5 mb-5">
      <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">
        🔑 Resetar Senha de Usuário
      </Text>
      <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 gap-3">
        <Text className="text-zinc-400 text-xs">
          Digite o e-mail do usuário para enviar um link de redefinição de senha.
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="email@usuario.com"
          placeholderTextColor="#52525b"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm"
        />
        <TouchableOpacity
          onPress={handleReset}
          disabled={loading || !email.trim()}
          className="bg-violet-600 rounded-xl py-3 items-center disabled:opacity-50"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white font-semibold text-sm">Enviar link de redefinição</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <View className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <Text style={{ fontSize: 22 }} className="mb-1">{emoji}</Text>
      <Text className="text-white text-2xl font-bold">{value.toLocaleString("pt-BR")}</Text>
      <Text className="text-zinc-500 text-xs mt-0.5">{label}</Text>
    </View>
  );
}
