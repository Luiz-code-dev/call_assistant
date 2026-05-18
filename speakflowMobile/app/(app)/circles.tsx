import { useState } from "react";
import {
  View, Text, ScrollView,
  TextInput, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@infrastructure/http/ApiClient";

interface Circle {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number };
  visibility: "public" | "private" | "invite";
  isMember: boolean;
  focus: string | null;
  level: string | null;
  avatarUrl: string | null;
}

export default function CirclesScreen() {
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["circles"],
    queryFn: async () => {
      const result = await ApiClient.get<Circle[]>("/api/network/circles");
      if (!result.ok) return [];
      return result.data;
    },
  });

  const circles = (data ?? []).filter((c) =>
    search.trim()
      ? c.name.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-white mb-3">👥 Circles</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar circles..."
          placeholderTextColor="#52525b"
          className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm"
        />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 20, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7c3aed" />
        }
      >
        {isLoading && (
          <View className="py-8 items-center">
            <Text className="text-zinc-500 text-sm">Carregando circles...</Text>
          </View>
        )}

        {!isLoading && circles.length === 0 && (
          <View className="py-16 items-center px-4">
            <Text style={{ fontSize: 48 }} className="mb-4">🔍</Text>
            <Text className="text-white font-semibold text-base text-center mb-2">
              {search ? "Nenhum resultado" : "Sem circles ainda"}
            </Text>
            <Text className="text-zinc-500 text-sm text-center">
              {search
                ? `Nenhum circle encontrado para "${search}"`
                : "Seja o primeiro a criar um grupo de prática."}
            </Text>
          </View>
        )}

        {circles.map((circle) => (
          <View
            key={circle.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex-row items-center gap-4"
          >
            {/* Avatar */}
            <View className="w-14 h-14 rounded-full bg-primary/20 border border-primary/30 items-center justify-center flex-shrink-0">
              {circle.avatarUrl ? (
                <Text className="text-2xl">👥</Text>
              ) : (
                <Text className="text-white font-bold text-lg">
                  {circle.name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            {/* Info */}
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-0.5">
                <Text className="text-white font-semibold text-sm flex-1" numberOfLines={1}>
                  {circle.name}
                </Text>
                {circle.visibility !== "public" && (
                  <Text className="text-xs text-zinc-500">🔒</Text>
                )}
              </View>

              {circle.description ? (
                <Text className="text-zinc-500 text-xs leading-relaxed mb-1.5" numberOfLines={2}>
                  {circle.description}
                </Text>
              ) : null}

              <View className="flex-row items-center gap-3">
                <Text className="text-zinc-600 text-xs">
                  👤 {circle._count.members} membros
                </Text>
                {circle.focus && (
                  <Text className="text-zinc-600 text-xs"># {circle.focus}</Text>
                )}
              </View>
            </View>

            {/* Join/Member badge */}
            <View
              className={`rounded-lg px-3 py-1.5 ${
                circle.isMember
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-primary/10 border border-primary/20"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  circle.isMember ? "text-green-400" : "text-primary"
                }`}
              >
                {circle.isMember ? "Membro" : "Entrar"}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
