import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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
  const planLabel = user?.plan === "free" ? "Gratuito" : user?.plan === "basic" ? "Básico" : "Premium";
  const planColors: Record<string, [string, string]> = {
    free:    ["#27272a", "#18181b"],
    basic:   ["#1e3a5f", "#0f2137"],
    premium: ["#3b1f6e", "#1e0f3d"],
  };
  const planGradient = planColors[user?.plan ?? "free"];

  return (
    <View style={{ flex: 1, backgroundColor: "#09090b" }}>
      {/* Background glow */}
      <LinearGradient
        colors={["rgba(124,58,237,0.18)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 280 }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshUser} tintColor="#7c3aed" />
          }
        >
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: "#a1a1aa", fontSize: 13 }}>Olá 👋</Text>
              <Text style={{ color: "#ffffff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>{firstName}</Text>
            </View>
            {/* Credits pill */}
            <LinearGradient
              colors={["rgba(124,58,237,0.3)", "rgba(79,70,229,0.2)"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(124,58,237,0.4)", paddingHorizontal: 14, paddingVertical: 8, alignItems: "center", minWidth: 72 }}
            >
              <Text style={{ color: "#a78bfa", fontSize: 10, marginBottom: 2 }}>⚡ créditos</Text>
              <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 18 }}>{user?.credits ?? 0}</Text>
            </LinearGradient>
          </View>

          {/* Plan card */}
          {user && (
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <LinearGradient
                colors={planGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, borderWidth: 1, borderColor: user.plan === "premium" ? "rgba(167,139,250,0.25)" : "rgba(63,63,70,0.8)", paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <View>
                  <Text style={{ color: "#71717a", fontSize: 11 }}>Plano atual</Text>
                  <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15, marginTop: 2 }}>{planLabel}</Text>
                </View>
                {user.plan !== "premium" && (
                  <TouchableOpacity style={{ backgroundColor: "rgba(124,58,237,0.25)", borderWidth: 1, borderColor: "rgba(124,58,237,0.4)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: "#a78bfa", fontSize: 12, fontWeight: "600" }}>Upgrade ✦</Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>
          )}

          {/* Quick Actions */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>Acesso rápido</Text>
              <TouchableOpacity onPress={openEdit} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#27272a", borderWidth: 1, borderColor: "#3f3f46", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: "#a1a1aa", fontSize: 11 }}>✏️ Editar</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {visibleActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  onPress={() => router.push(action.route as never)}
                  activeOpacity={0.7}
                  style={{ flex: 1, minWidth: 140, borderRadius: 18, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={["#1c1c1e", "#141416"]}
                    style={{ borderRadius: 18, borderWidth: 1, borderColor: "#2d2d30", padding: 16, alignItems: "center", gap: 8 }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(124,58,237,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(124,58,237,0.15)" }}>
                      <Text style={{ fontSize: 24 }}>{action.emoji}</Text>
                    </View>
                    <Text style={{ color: "#e4e4e7", fontSize: 12, fontWeight: "600", textAlign: "center" }}>{action.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Live CTA */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <TouchableOpacity onPress={() => router.push("/(app)/live")} activeOpacity={0.85} style={{ borderRadius: 20, overflow: "hidden" }}>
              <LinearGradient
                colors={["#2d1060", "#1a0845", "#0f0630"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: 20, borderWidth: 1, borderColor: "rgba(139,92,246,0.4)", padding: 20 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(124,58,237,0.3)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 18 }}>🎙️</Text>
                  </View>
                  <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 16, flex: 1 }}>SpeakFlow Live</Text>
                  <View style={{ backgroundColor: "rgba(139,92,246,0.25)", borderWidth: 1, borderColor: "rgba(167,139,250,0.4)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: "#c4b5fd", fontSize: 9, fontWeight: "800" }}>TEMPO REAL</Text>
                  </View>
                </View>
                <Text style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 19 }}>
                  Copiloto de IA para reuniões e calls em inglês. Transcrição + sugestões instantâneas.
                </Text>
                <Text style={{ color: "#7c3aed", fontSize: 12, fontWeight: "600", marginTop: 10 }}>Iniciar sessão →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Credits info */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ backgroundColor: "rgba(24,24,27,0.6)", borderWidth: 1, borderColor: "#27272a", borderRadius: 16, padding: 14 }}>
              <Text style={{ color: "#71717a", fontSize: 12, textAlign: "center" }}>
                Cada uso consome{" "}
                <Text style={{ color: "#d4d4d8", fontWeight: "700" }}>2 créditos</Text>.{" "}
                {user?.b2bAccess ? "Sua empresa te dá acesso ilimitado 🏢" : "Recarregue no seu perfil."}
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
    </View>
  );
}
