import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Modal, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "@infrastructure/http/ApiClient";

interface Circle {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number };
  maxMembers: number;
  visibility: "public" | "private" | "invite";
  isMember: boolean;
  myRole: string | null;
  focus: string;
  level: string;
  avatarUrl: string | null;
}

interface CircleDetail extends Circle {
  members: { userId: string; role: string; user: { id: string; name: string; avatarUrl: string | null } }[];
  challenges: { id: string; title: string; isActive: boolean; _count: { submissions: number } }[];
}

const FOCUS_OPTIONS = [
  "Vendas & Negociação", "Reuniões Internacionais", "Apresentações", "Entrevistas de Emprego",
  "Customer Success", "Backend & Arquitetura", "Frontend & Design", "DevOps & Cloud",
  "Conversas do Dia a Dia", "Inglês para Viagens",
];

export default function CirclesScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CircleDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", focus: "", level: "Todos os níveis", visibility: "public" });
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["circles"],
    queryFn: async () => {
      const result = await ApiClient.get<Circle[]>("/api/network/circles?filter=discover");
      if (!result.ok) return [];
      return result.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.focus) throw new Error("Nome e foco são obrigatórios.");
      const r = await ApiClient.post<Circle>("/api/network/circles", {
        ...form, maxMembers: 30,
      });
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["circles"] });
      setShowCreate(false);
      setForm({ name: "", description: "", focus: "", level: "Todos os níveis", visibility: "public" });
      Alert.alert("Circle criado!", "Seu grupo de prática foi criado.");
    },
    onError: (e: Error) => Alert.alert("Erro", e.message),
  });

  async function openDetail(circle: Circle) {
    setLoadingDetail(true);
    const r = await ApiClient.get<CircleDetail>(`/api/network/circles/${circle.id}`);
    setLoadingDetail(false);
    if (r.ok) setSelected(r.data);
    else setSelected({ ...circle, members: [], challenges: [] });
  }

  async function handleJoin(id: string) {
    setJoiningId(id);
    const r = await ApiClient.post(`/api/network/circles/${id}/join`, {});
    setJoiningId(null);
    if (r.ok) {
      qc.invalidateQueries({ queryKey: ["circles"] });
      if (selected?.id === id) openDetail({ ...selected, id });
      Alert.alert("Bem-vindo!", "Você entrou no Circle.");
    } else {
      Alert.alert("Erro", (r as any).error?.message ?? "Não foi possível entrar.");
    }
  }

  async function handleLeave(id: string) {
    Alert.alert("Sair do Circle", "Deseja mesmo sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair", style: "destructive", onPress: async () => {
          const r = await ApiClient.post(`/api/network/circles/${id}/leave`, {});
          if (r.ok) {
            qc.invalidateQueries({ queryKey: ["circles"] });
            setSelected(null);
          } else {
            Alert.alert("Erro", "Não foi possível sair.");
          }
        },
      },
    ]);
  }

  const circles = (data ?? []).filter((c) =>
    search.trim() ? c.name.toLowerCase().includes(search.toLowerCase()) || c.focus.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white">👥 Circles</Text>
          <Text className="text-zinc-500 text-xs">Grupos de prática profissional</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2"
          activeOpacity={0.7}
        >
          <Text className="text-primary text-sm font-semibold">+ Criar</Text>
        </TouchableOpacity>
      </View>

      <View className="px-5 mb-3">
        <TextInput
          value={search} onChangeText={setSearch}
          placeholder="Buscar circles..." placeholderTextColor="#52525b"
          className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm"
        />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7c3aed" />}
      >
        {isLoading && (
          <View className="py-12 items-center"><ActivityIndicator color="#7c3aed" /></View>
        )}

        {!isLoading && circles.length === 0 && (
          <View className="py-16 items-center px-4">
            <Text style={{ fontSize: 48 }} className="mb-4">🔍</Text>
            <Text className="text-white font-semibold text-base text-center mb-2">
              {search ? "Nenhum resultado" : "Nenhum circle ainda"}
            </Text>
            <Text className="text-zinc-500 text-sm text-center mb-4">
              {search ? `Nenhum circle encontrado para "${search}"` : "Crie o primeiro grupo de prática!"}
            </Text>
            {!search && (
              <TouchableOpacity onPress={() => setShowCreate(true)} className="bg-primary rounded-xl px-6 py-3">
                <Text className="text-white font-semibold">Criar Circle</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {circles.map((circle) => (
          <TouchableOpacity
            key={circle.id}
            onPress={() => openDetail(circle)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex-row items-center gap-4"
            activeOpacity={0.75}
          >
            <View className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 items-center justify-center flex-shrink-0">
              <Text className="text-white font-bold text-lg">{circle.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Text className="text-white font-semibold text-sm flex-1" numberOfLines={1}>{circle.name}</Text>
                {circle.visibility !== "public" && <Text className="text-zinc-600 text-xs">🔒</Text>}
              </View>
              {circle.description && (
                <Text className="text-zinc-500 text-xs mb-1" numberOfLines={1}>{circle.description}</Text>
              )}
              <Text className="text-zinc-600 text-xs">👤 {circle._count.members} membros · # {circle.focus}</Text>
            </View>
            <View className={`rounded-lg px-2.5 py-1 ${circle.isMember ? "bg-green-500/10 border border-green-500/20" : "bg-primary/10 border border-primary/20"}`}>
              <Text className={`text-xs font-semibold ${circle.isMember ? "text-green-400" : "text-primary"}`}>
                {circle.isMember ? "Membro" : "Entrar"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Modal: Circle Detail ── */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <SafeAreaView className="flex-1 bg-background">
            <View className="flex-row items-center gap-3 px-5 pt-4 pb-3 border-b border-zinc-800">
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text className="text-zinc-400 text-lg">‹</Text>
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-white font-bold text-base" numberOfLines={1}>{selected.name}</Text>
                <Text className="text-zinc-500 text-xs">{selected.focus} · {selected.level}</Text>
              </View>
              {selected.myRole ? (
                selected.myRole !== "owner" && (
                  <TouchableOpacity onPress={() => handleLeave(selected.id)} className="border border-red-500/30 rounded-xl px-3 py-1.5">
                    <Text className="text-red-400 text-xs font-semibold">Sair</Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  onPress={() => handleJoin(selected.id)}
                  disabled={joiningId === selected.id}
                  className="bg-primary rounded-xl px-4 py-1.5"
                >
                  {joiningId === selected.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text className="text-white text-xs font-semibold">Entrar</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
            <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40, gap: 16 }}>
              {selected.description && (
                <Text className="text-zinc-400 text-sm leading-relaxed">{selected.description}</Text>
              )}

              {/* Stats */}
              <View className="flex-row gap-3">
                {[
                  { label: "Membros", value: `${selected._count.members}/${selected.maxMembers}` },
                  { label: "Visibilidade", value: selected.visibility === "public" ? "Público" : selected.visibility === "private" ? "Privado" : "Convite" },
                  { label: "Nível", value: selected.level },
                ].map((s) => (
                  <View key={s.label} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 items-center">
                    <Text className="text-white font-bold text-sm">{s.value}</Text>
                    <Text className="text-zinc-500 text-[10px] mt-0.5">{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Active challenge */}
              {selected.challenges.filter(c => c.isActive).map(ch => (
                <View key={ch.id} className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                  <Text className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">⚡ Desafio ativo</Text>
                  <Text className="text-white font-semibold text-sm">{ch.title}</Text>
                  <Text className="text-zinc-500 text-xs mt-1">{ch._count.submissions} submissões</Text>
                </View>
              ))}

              {/* Members */}
              {selected.members.length > 0 && (
                <View>
                  <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Membros</Text>
                  {selected.members.slice(0, 12).map((m) => (
                    <View key={m.userId} className="flex-row items-center gap-3 mb-2.5">
                      <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center">
                        <Text className="text-white text-xs font-bold">{m.user.name.charAt(0)}</Text>
                      </View>
                      <Text className="text-white text-sm flex-1">{m.user.name}</Text>
                      {m.role !== "member" && (
                        <Text className="text-xs text-amber-400 capitalize">{m.role}</Text>
                      )}
                    </View>
                  ))}
                  {selected.members.length > 12 && (
                    <Text className="text-zinc-600 text-xs text-center mt-1">+{selected.members.length - 12} membros</Text>
                  )}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ── Modal: Criar Circle ── */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
            <Text className="text-xl font-bold text-white">Criar Circle</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}><Text className="text-zinc-400 text-lg">✕</Text></TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40, gap: 16 }}>
            <View>
              <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Nome *</Text>
              <TextInput
                value={form.name} onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
                placeholder="Ex: Senior Devs BR" placeholderTextColor="#52525b" maxLength={80}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white text-sm"
              />
            </View>

            <View>
              <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Área de foco *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {FOCUS_OPTIONS.map((f) => (
                  <TouchableOpacity
                    key={f} onPress={() => setForm(fm => ({ ...fm, focus: f }))}
                    className={`px-3 py-2 rounded-xl border ${form.focus === f ? "bg-primary/20 border-primary/40" : "bg-zinc-900 border-zinc-800"}`}
                  >
                    <Text className={`text-xs font-medium ${form.focus === f ? "text-primary" : "text-zinc-400"}`}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View>
              <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Descrição</Text>
              <TextInput
                value={form.description} onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
                placeholder="Propósito do grupo..." placeholderTextColor="#52525b"
                multiline numberOfLines={3} textAlignVertical="top" maxLength={300}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm"
                style={{ minHeight: 80 }}
              />
            </View>

            <View>
              <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Visibilidade</Text>
              <View className="flex-row gap-2">
                {[["public", "Público"], ["private", "Privado"], ["invite", "Convite"]].map(([v, l]) => (
                  <TouchableOpacity
                    key={v} onPress={() => setForm(f => ({ ...f, visibility: v }))}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${form.visibility === v ? "bg-primary/20 border-primary/40" : "bg-zinc-900 border-zinc-800"}`}
                  >
                    <Text className={`text-xs font-semibold ${form.visibility === v ? "text-primary" : "text-zinc-400"}`}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.name.trim() || !form.focus}
              className="bg-primary rounded-xl py-4 items-center disabled:opacity-50 mt-2"
              activeOpacity={0.8}
            >
              {createMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white font-bold text-base">Criar Circle</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {loadingDetail && (
        <View className="absolute inset-0 bg-black/40 items-center justify-center">
          <ActivityIndicator color="#7c3aed" size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}
