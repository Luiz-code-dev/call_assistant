import { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@infrastructure/http/ApiClient";

type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  status: LeadStatus;
  source?: string | null;
  notes?: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; viewClass: string; textClass: string }> = {
  new:       { label: "Novo",        viewClass: "bg-blue-500/20 border-blue-500/30",     textClass: "text-blue-400" },
  contacted: { label: "Contatado",   viewClass: "bg-yellow-500/20 border-yellow-500/30", textClass: "text-yellow-400" },
  qualified: { label: "Qualificado", viewClass: "bg-violet-500/20 border-violet-500/30", textClass: "text-violet-400" },
  proposal:  { label: "Proposta",    viewClass: "bg-orange-500/20 border-orange-500/30", textClass: "text-orange-400" },
  won:       { label: "Ganho",       viewClass: "bg-green-500/20 border-green-500/30",   textClass: "text-green-400" },
  lost:      { label: "Perdido",     viewClass: "bg-red-500/20 border-red-500/30",       textClass: "text-red-400" },
};

async function fetchLeads(): Promise<Lead[]> {
  const result = await ApiClient.get<{ leads: Lead[] }>("/api/crm/leads");
  if (!result.ok) throw new Error(result.error.message);
  return result.data.leads ?? [];
}

export default function CrmScreen() {
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: fetchLeads,
  });

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      (l.company ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const counts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-1">
          <Text className="text-zinc-400 text-lg">‹</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white">📋 CRM</Text>
          <Text className="text-zinc-500 text-xs">{leads.length} leads no total</Text>
        </View>
      </View>

      {/* Stats strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 mb-3" style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
        {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => (
          <View key={s} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 items-center min-w-[72px]">
            <Text className="text-white font-bold text-lg">{counts[s] ?? 0}</Text>
            <Text className="text-zinc-500 text-[10px]">{STATUS_CONFIG[s].label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Search */}
      <View className="px-5 mb-3">
        <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-3 gap-2">
          <Text className="text-zinc-500">🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar lead..."
            placeholderTextColor="#52525b"
            className="flex-1 py-3 text-white text-sm"
          />
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#7c3aed" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 40, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#7c3aed" />}
        >
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <Text style={{ fontSize: 40 }} className="mb-3">📭</Text>
              <Text className="text-zinc-400 text-sm">Nenhum lead encontrado</Text>
            </View>
          ) : (
            filtered.map((lead) => {
              const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;
              return (
                <View key={lead.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="text-white font-semibold text-base">{lead.name}</Text>
                      <Text className="text-zinc-500 text-xs mt-0.5">{lead.email}</Text>
                      {lead.company && (
                        <Text className="text-zinc-600 text-xs">🏢 {lead.company}</Text>
                      )}
                    </View>
                    <View className={`border rounded-full px-2.5 py-0.5 ${cfg.viewClass}`}>
                      <Text className={`text-[11px] font-semibold ${cfg.textClass}`}>
                        {cfg.label}
                      </Text>
                    </View>
                  </View>
                  {lead.phone && (
                    <Text className="text-zinc-600 text-xs">📞 {lead.phone}</Text>
                  )}
                  {lead.notes && (
                    <Text className="text-zinc-600 text-xs mt-1 leading-relaxed" numberOfLines={2}>
                      {lead.notes}
                    </Text>
                  )}
                  <Text className="text-zinc-700 text-[10px] mt-2">
                    {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                    {lead.source ? ` · ${lead.source}` : ""}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
