import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "@presentation/stores/authStore";

const STORAGE_KEY = "sf_quick_actions_v1";

const ALL_ACTIONS: { id: string; emoji: string; label: string; route: string }[] = [
  { id: "improve",   emoji: "✍️",  label: "Melhorar texto",  route: "/(app)/tools/improve"   },
  { id: "generate",  emoji: "💬",  label: "Gerar resposta",  route: "/(app)/tools/generate"  },
  { id: "interview", emoji: "🎯",  label: "Entrevista",      route: "/(app)/tools/interview" },
  { id: "live",      emoji: "🎙️", label: "Live Assist",     route: "/(app)/live"            },
  { id: "messages",  emoji: "📨",  label: "Mensagens",       route: "/(app)/chat"            },
  { id: "circles",   emoji: "⭕",  label: "Circles",         route: "/(app)/circles"         },
  { id: "profile",   emoji: "👤",  label: "Perfil",          route: "/(app)/profile"         },
];

const DEFAULT_IDS = ["improve", "generate", "interview", "live", "messages"];

export default function HomeScreen() {
  const { user, refreshUser, isLoading } = useAuthStore();
  const [visibleIds, setVisibleIds] = useState<string[]>(DEFAULT_IDS);
  const [showEdit, setShowEdit] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>(DEFAULT_IDS);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((v) => {
      if (v) {
        try { const ids = JSON.parse(v) as string[]; setVisibleIds(ids); setDraftIds(ids); } catch { /* ignore */ }
      }
    });
  }, []);

  const openEdit = useCallback(() => { setDraftIds(visibleIds); setShowEdit(true); }, [visibleIds]);

  const toggleDraft = useCallback((id: string) => {
    setDraftIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const saveEdit = useCallback(async () => {
    const ids = draftIds.length === 0 ? DEFAULT_IDS : draftIds;
    setVisibleIds(ids);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(ids));
    setShowEdit(false);
  }, [draftIds]);

  const visibleActions = ALL_ACTIONS.filter((a) => visibleIds.includes(a.id));

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
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-bold text-base">Acesso rápido</Text>
            <TouchableOpacity onPress={openEdit}
              className="flex-row items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1">
              <Text className="text-zinc-400 text-[11px]">✏️ Editar</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap gap-3">
            {visibleActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                onPress={() => router.push(action.route as never)}
                className="flex-1 min-w-[140px] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 items-center gap-2"
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 28 }}>{action.emoji}</Text>
                <Text className="text-white text-xs font-semibold text-center">{action.label}</Text>
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

      {/* Edit Quick Actions Modal */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <TouchableOpacity className="flex-1 bg-black/60" activeOpacity={1} onPress={() => setShowEdit(false)} />
        <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white font-bold text-base">Personalizar atalhos</Text>
            <TouchableOpacity onPress={() => setShowEdit(false)}>
              <Text className="text-zinc-500">✕</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-zinc-500 text-xs mb-4">Selecione quais atalhos aparecem na tela inicial.</Text>

          {ALL_ACTIONS.map((a) => {
            const active = draftIds.includes(a.id);
            return (
              <TouchableOpacity key={a.id} onPress={() => toggleDraft(a.id)}
                className={`flex-row items-center gap-3 py-3 px-3 rounded-xl mb-2 border ${
                  active ? "bg-primary/10 border-primary/30" : "bg-zinc-800/50 border-zinc-700/50"
                }`}>
                <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
                <Text className={`flex-1 text-sm font-medium ${active ? "text-white" : "text-zinc-500"}`}>{a.label}</Text>
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                  active ? "bg-primary border-primary" : "border-zinc-600"
                }`}>
                  {active && <Text className="text-white text-[10px] font-bold">✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity onPress={saveEdit}
            className="bg-primary rounded-2xl py-3.5 items-center mt-2">
            <Text className="text-white font-semibold">Salvar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
