import { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, TextInput, Alert, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "@infrastructure/http/ApiClient";

interface OrgInfo {
  id: string; name: string; slug: string; logoUrl: string | null;
  industry: string | null; plan: string; seatLimit: number;
  _count: { members: number }; role: "owner" | "admin" | "member";
}

interface OrgMember {
  id: string; role: "owner" | "admin" | "member";
  jobTitle: string | null; department: string | null; commScore: number;
  user: { id: string; name: string; email: string; avatarUrl: string | null; credits: number };
}

interface Analytics {
  totalMembers: number; activeThisWeek: number; totalLiveSessions: number;
  liveSessionsThisWeek: number; totalChallenges: number; totalSubmissions: number;
  submissionsThisWeek: number; totalCertifications: number; avgCommunicationScore: number;
  topMembers: { id: string; name: string; avatarUrl: string | null; role: string; commScore: number; department: string | null; jobTitle: string | null }[];
  categoryBreakdown: { category: string; _count: { id: number } }[];
  departmentBreakdown: { department: string; count: number; avgScore: number }[];
}

interface OrgInvite { id: string; email: string; role: string; expiresAt: string; }

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Membro" };
const ROLE_BG: Record<string, string> = {
  owner: "bg-amber-500/10 border-amber-500/20", admin: "bg-violet-500/10 border-violet-500/20", member: "bg-zinc-700/50 border-zinc-600/20",
};
const ROLE_TEXT: Record<string, string> = { owner: "text-amber-400", admin: "text-violet-400", member: "text-zinc-400" };
const MEDAL = ["🥇", "🥈", "🥉"];
const CATEGORY_LABELS: Record<string, string> = {
  meetings: "Reuniões", sales: "Vendas", support: "Suporte", onboarding: "Onboarding",
  presentations: "Apresentações", interviews: "Entrevistas", general: "Geral", calls: "Calls",
};
const DEPARTMENTS = [
  "Comercial / Vendas", "Customer Success", "Suporte ao Cliente", "Marketing",
  "Produto", "Tecnologia / TI", "RH / Pessoas", "Financeiro", "Operações",
  "Jurídico", "Diretoria / C-Level", "Outro",
];

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  const colors: Record<string, { bg: string; val: string }> = {
    violet: { bg: "border-violet-500/20 bg-violet-500/5", val: "text-violet-300" },
    indigo: { bg: "border-indigo-500/20 bg-indigo-500/5", val: "text-indigo-300" },
    emerald: { bg: "border-emerald-500/20 bg-emerald-500/5", val: "text-emerald-300" },
    amber: { bg: "border-amber-500/20 bg-amber-500/5", val: "text-amber-300" },
    sky: { bg: "border-sky-500/20 bg-sky-500/5", val: "text-sky-300" },
  };
  const c = colors[color] ?? colors.violet;
  return (
    <View className={`flex-1 rounded-2xl border p-3.5 ${c.bg}`}>
      <Text className={`text-2xl font-black mb-0.5 ${c.val}`}>{value}</Text>
      <Text className="text-white text-xs font-medium leading-tight">{label}</Text>
      {sub ? <Text className="text-zinc-600 text-[10px] mt-0.5">{sub}</Text> : null}
    </View>
  );
}

export default function EmpresaScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"dashboard" | "membros">("dashboard");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  const [editMember, setEditMember] = useState<OrgMember | null>(null);
  const [editDept, setEditDept] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [showDeptPicker, setShowDeptPicker] = useState(false);

  const { data: orgs = [], isLoading: loadingOrgs, refetch: refetchOrgs } = useQuery<OrgInfo[]>({
    queryKey: ["mobile-orgs"],
    queryFn: async () => {
      const r = await ApiClient.get<OrgInfo[]>("/api/mobile/org");
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  const org = orgs[0] ?? null;

  const { data: membersData, isLoading: loadingMembers, refetch: refetchMembers } = useQuery<{ members: OrgMember[]; myRole: string }>({
    queryKey: ["mobile-org-members", org?.id],
    queryFn: async () => {
      const r = await ApiClient.get<{ members: OrgMember[]; myRole: string }>(`/api/mobile/org/${org!.id}/members`);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
    enabled: !!org,
  });

  const { data: analytics, isLoading: loadingAnalytics, refetch: refetchAnalytics } = useQuery<Analytics>({
    queryKey: ["mobile-org-analytics", org?.id],
    queryFn: async () => {
      const r = await ApiClient.get<Analytics>(`/api/mobile/org/${org!.id}/analytics`);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
    enabled: !!org,
  });

  const { data: invites = [], refetch: refetchInvites } = useQuery<OrgInvite[]>({
    queryKey: ["mobile-org-invites", org?.id],
    queryFn: async () => {
      const r = await ApiClient.get<OrgInvite[]>(`/api/mobile/org/${org!.id}/invites`);
      if (!r.ok) return [];
      return r.data;
    },
    enabled: !!org && (membersData?.myRole === "owner" || membersData?.myRole === "admin"),
  });

  const members = membersData?.members ?? [];
  const myRole = membersData?.myRole ?? "member";
  const canManage = myRole === "owner" || myRole === "admin";

  const refetchAll = () => { refetchOrgs(); refetchMembers(); refetchAnalytics(); refetchInvites(); };

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const r = await ApiClient.post(`/api/mobile/org/${org!.id}/members`, { email: inviteEmail.trim(), role: inviteRole });
      if (!r.ok) throw new Error((r as any).error.message);
    },
    onSuccess: () => {
      setInviteEmail(""); setShowInviteModal(false);
      queryClient.invalidateQueries({ queryKey: ["mobile-org-members", org?.id] });
      queryClient.invalidateQueries({ queryKey: ["mobile-org-invites", org?.id] });
      Alert.alert("✅ Convite enviado!", "O usuário receberá um e-mail.");
    },
    onError: (e: Error) => Alert.alert("Erro", e.message),
  });

  const saveMemberMutation = useMutation({
    mutationFn: async () => {
      if (!editMember) return;
      const r = await ApiClient.put(`/api/mobile/org/${org!.id}/members/${editMember.id}`, {
        jobTitle: editTitle || null,
        department: editDept || null,
      });
      if (!r.ok) throw new Error((r as any).error.message);
    },
    onSuccess: () => {
      setEditMember(null);
      queryClient.invalidateQueries({ queryKey: ["mobile-org-members", org?.id] });
      queryClient.invalidateQueries({ queryKey: ["mobile-org-analytics", org?.id] });
    },
    onError: (e: Error) => Alert.alert("Erro", e.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const r = await ApiClient.delete(`/api/mobile/org/${org!.id}/members/${memberId}`);
      if (!r.ok) throw new Error((r as any).error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-org-members", org?.id] });
      queryClient.invalidateQueries({ queryKey: ["mobile-org-analytics", org?.id] });
    },
    onError: (e: Error) => Alert.alert("Erro", e.message),
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const r = await ApiClient.put(`/api/mobile/org/${org!.id}/members/${memberId}`, { role });
      if (!r.ok) throw new Error((r as any).error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mobile-org-members", org?.id] }),
    onError: (e: Error) => Alert.alert("Erro", e.message),
  });

  if (loadingOrgs) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={["top"]}>
        <ActivityIndicator color="#7c3aed" />
      </SafeAreaView>
    );
  }

  if (!org) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-zinc-400 text-2xl">‹</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">🏢 Minha Empresa</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 48 }}>🏢</Text>
          <Text className="text-white font-semibold text-base text-center mt-4 mb-2">Nenhuma organização</Text>
          <Text className="text-zinc-500 text-sm text-center">Você ainda não pertence a nenhuma organização.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const engRate = analytics && analytics.totalMembers > 0
    ? Math.round((analytics.activeThisWeek / analytics.totalMembers) * 100)
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>

      {/* Header */}
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center mb-3">
          <TouchableOpacity onPress={() => router.back()} className="mr-2">
            <Text className="text-zinc-400 text-2xl">‹</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white font-bold text-base">{org.name}</Text>
            <Text className="text-zinc-500 text-xs">{org.industry ?? "Organização"} · {ROLE_LABEL[myRole]}</Text>
          </View>
          <View className="bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">
            <Text className="text-violet-400 text-xs font-semibold capitalize">{org.plan}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row bg-zinc-900 rounded-xl p-1">
          {(["dashboard", "membros"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg items-center ${activeTab === tab ? "bg-primary" : ""}`}
            >
              <Text className={`text-xs font-semibold ${activeTab === tab ? "text-white" : "text-zinc-500"}`}>
                {tab === "dashboard" ? "📊 Dashboard" : "👥 Membros"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── DASHBOARD TAB ── */}
      {activeTab === "dashboard" && (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetchAll} tintColor="#7c3aed" />}
        >
          {loadingAnalytics ? (
            <View className="py-16 items-center"><ActivityIndicator color="#7c3aed" /></View>
          ) : analytics ? (
            <>
              {/* KPIs row 1 */}
              <View className="flex-row gap-3 mb-3 mt-2">
                <KpiCard label="Membros" value={analytics.totalMembers} sub={`${org.seatLimit} vagas`} color="violet" />
                <KpiCard label="Engajamento" value={`${engRate}%`} sub={`${analytics.activeThisWeek} ativos/sem`} color="emerald" />
              </View>
              <View className="flex-row gap-3 mb-3">
                <KpiCard label="Sessões Live" value={analytics.totalLiveSessions} sub={`+${analytics.liveSessionsThisWeek} esta sem.`} color="indigo" />
                <KpiCard label="Score médio" value={analytics.avgCommunicationScore} sub="comunicação" color="sky" />
              </View>
              {/* KPIs row 2 */}
              <View className="flex-row gap-3 mb-5">
                <KpiCard label="Desafios" value={analytics.totalChallenges} color="amber" />
                <KpiCard label="Submissões" value={analytics.totalSubmissions} sub={`+${analytics.submissionsThisWeek}/sem`} color="violet" />
                <KpiCard label="Certificações" value={analytics.totalCertifications} color="emerald" />
              </View>

              {/* Ranking */}
              {analytics.topMembers.length > 0 && (
                <View className="bg-zinc-900 border border-zinc-800 rounded-2xl mb-4 overflow-hidden">
                  <View className="px-4 py-3 border-b border-zinc-800">
                    <Text className="text-white font-bold text-sm">🏆 Ranking de Comunicação</Text>
                  </View>
                  <View className="p-3 gap-1">
                    {analytics.topMembers.slice(0, 8).map((m, i) => (
                      <View key={m.id} className="flex-row items-center py-2 px-1">
                        <Text className="w-7 text-center text-sm">{i < 3 ? MEDAL[i] : `${i + 1}`}</Text>
                        <View className="w-8 h-8 rounded-full bg-violet-500/20 items-center justify-center mx-2">
                          <Text className="text-violet-300 text-xs font-bold">{m.name.charAt(0)}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-white text-sm font-medium">{m.name}</Text>
                          <Text className="text-zinc-600 text-[10px]">{m.department ?? m.jobTitle ?? "Sem setor"}</Text>
                        </View>
                        <Text className="text-violet-400 font-black text-sm">{m.commScore}</Text>
                        <Text className="text-zinc-600 text-xs ml-0.5">pts</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Department performance */}
              {analytics.departmentBreakdown.filter(d => d.department !== "Sem setor").length > 0 && (
                <View className="bg-zinc-900 border border-zinc-800 rounded-2xl mb-4 overflow-hidden">
                  <View className="px-4 py-3 border-b border-zinc-800">
                    <Text className="text-white font-bold text-sm">📈 Performance por Setor</Text>
                  </View>
                  <View className="p-4 gap-4">
                    {analytics.departmentBreakdown.filter(d => d.department !== "Sem setor").map((d) => {
                      const maxScore = Math.max(...analytics.departmentBreakdown.filter(x => x.department !== "Sem setor").map(x => x.avgScore), 1);
                      const pct = Math.round((d.avgScore / maxScore) * 100);
                      return (
                        <View key={d.department}>
                          <View className="flex-row items-center justify-between mb-1.5">
                            <Text className="text-zinc-200 text-xs font-medium flex-1" numberOfLines={1}>{d.department}</Text>
                            <Text className="text-zinc-500 text-[10px] mx-2">{d.count}p</Text>
                            <Text className="text-emerald-400 text-xs font-bold">{d.avgScore} pts</Text>
                          </View>
                          <View className="h-1.5 rounded-full bg-zinc-800">
                            <View className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Category breakdown */}
              {analytics.categoryBreakdown.length > 0 && (
                <View className="bg-zinc-900 border border-zinc-800 rounded-2xl mb-4 overflow-hidden">
                  <View className="px-4 py-3 border-b border-zinc-800">
                    <Text className="text-white font-bold text-sm">🎙️ Live por Categoria</Text>
                  </View>
                  <View className="p-4 gap-3">
                    {analytics.categoryBreakdown.map((cat) => {
                      const total = analytics.categoryBreakdown.reduce((s, c) => s + (c._count?.id ?? 0), 0);
                      const pct = total > 0 ? Math.round(((cat._count?.id ?? 0) / total) * 100) : 0;
                      return (
                        <View key={cat.category}>
                          <View className="flex-row items-center justify-between mb-1">
                            <Text className="text-zinc-300 text-xs">{CATEGORY_LABELS[cat.category] ?? cat.category}</Text>
                            <Text className="text-indigo-400 text-xs font-bold">{pct}%</Text>
                          </View>
                          <View className="h-1.5 rounded-full bg-zinc-800">
                            <View className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Live CTA */}
              <View className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-4 mb-4">
                <Text className="text-emerald-300 font-bold text-sm mb-1">📡 Live Copilot — Reuniões Internacionais</Text>
                <Text className="text-zinc-400 text-xs leading-relaxed mb-3">
                  Abra o Live, selecione o idioma e o contexto. A IA transcreve e sugere respostas em tempo real enquanto você fala.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/live" as any)}
                  className="bg-emerald-600 rounded-xl py-2.5 items-center"
                >
                  <Text className="text-white text-sm font-semibold">Abrir Live Copilot</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </ScrollView>
      )}

      {/* ── MEMBERS TAB ── */}
      {activeTab === "membros" && (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetchAll} tintColor="#7c3aed" />}
        >
          <View className="flex-row items-center justify-between mt-3 mb-3">
            <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
              {members.length} membros
            </Text>
            {canManage && (
              <TouchableOpacity
                onPress={() => setShowInviteModal(true)}
                className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5"
              >
                <Text className="text-primary text-xs font-semibold">+ Convidar</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingMembers ? (
            <View className="py-8 items-center"><ActivityIndicator color="#7c3aed" /></View>
          ) : (
            <View className="gap-2">
              {members.map((m) => (
                <View key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                  <View className="flex-row items-center">
                    <View className="w-9 h-9 rounded-full bg-violet-500/20 items-center justify-center mr-3">
                      <Text className="text-violet-300 font-bold text-sm">{m.user.name.charAt(0)}</Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-white text-sm font-medium">{m.user.name}</Text>
                        <View className={`border rounded-full px-2 py-0.5 ${ROLE_BG[m.role]}`}>
                          <Text className={`text-[10px] font-semibold ${ROLE_TEXT[m.role]}`}>{ROLE_LABEL[m.role]}</Text>
                        </View>
                      </View>
                      <Text className="text-zinc-500 text-xs" numberOfLines={1}>{m.user.email}</Text>
                      {(m.department || m.jobTitle) ? (
                        <Text className="text-zinc-600 text-[10px] mt-0.5">{[m.department, m.jobTitle].filter(Boolean).join(" · ")}</Text>
                      ) : null}
                    </View>
                    <View className="items-end">
                      <Text className="text-violet-400 font-black text-sm">{m.commScore ?? 0}</Text>
                      <Text className="text-zinc-600 text-[10px]">pts</Text>
                    </View>
                  </View>

                  {canManage && m.role !== "owner" && (
                    <View className="flex-row gap-2 mt-2.5 pt-2.5 border-t border-zinc-800">
                      <TouchableOpacity
                        onPress={() => { setEditMember(m); setEditDept(m.department ?? ""); setEditTitle(m.jobTitle ?? ""); }}
                        className="flex-1 bg-zinc-800 rounded-lg py-1.5 items-center"
                      >
                        <Text className="text-zinc-400 text-xs">✏️ Editar</Text>
                      </TouchableOpacity>
                      {myRole === "owner" && (
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert("Alterar função", `${m.user.name}`, [
                              { text: "Cancelar", style: "cancel" },
                              { text: "Admin", onPress: () => changeRoleMutation.mutate({ memberId: m.id, role: "admin" }) },
                              { text: "Membro", onPress: () => changeRoleMutation.mutate({ memberId: m.id, role: "member" }) },
                            ]);
                          }}
                          className="flex-1 bg-zinc-800 rounded-lg py-1.5 items-center"
                        >
                          <Text className="text-zinc-400 text-xs">👤 Função</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => Alert.alert("Remover membro", `Remover ${m.user.name}?`, [
                          { text: "Cancelar", style: "cancel" },
                          { text: "Remover", style: "destructive", onPress: () => removeMemberMutation.mutate(m.id) },
                        ])}
                        className="bg-red-500/10 border border-red-500/20 rounded-lg py-1.5 px-3 items-center"
                      >
                        <Text className="text-red-400 text-xs">🗑</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Pending invites */}
          {invites.length > 0 && (
            <View className="mt-5">
              <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">
                Convites pendentes ({invites.length})
              </Text>
              <View className="gap-2">
                {invites.map((inv) => (
                  <View key={inv.id} className="flex-row items-center bg-zinc-900 border border-zinc-800 border-dashed rounded-xl px-4 py-3">
                    <Text className="text-zinc-500 mr-3">✉️</Text>
                    <View className="flex-1">
                      <Text className="text-zinc-300 text-sm" numberOfLines={1}>{inv.email}</Text>
                      <Text className="text-zinc-600 text-xs">Expira {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}</Text>
                    </View>
                    <View className="bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                      <Text className="text-amber-400 text-[10px] font-medium">Pendente</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── INVITE MODAL ── */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <TouchableOpacity className="flex-1 bg-black/60" activeOpacity={1} onPress={() => setShowInviteModal(false)} />
        <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl px-5 pt-6 pb-10">
          <Text className="text-white font-bold text-base mb-4">Convidar membro</Text>
          <TextInput
            value={inviteEmail} onChangeText={setInviteEmail}
            placeholder="colaborador@empresa.com" placeholderTextColor="#52525b"
            keyboardType="email-address" autoCapitalize="none"
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm mb-3"
          />
          <View className="flex-row gap-2 mb-4">
            {(["member", "admin"] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setInviteRole(r)}
                className={`flex-1 py-2.5 rounded-xl border items-center ${inviteRole === r ? "bg-primary border-primary" : "bg-zinc-800 border-zinc-700"}`}
              >
                <Text className={`text-sm font-medium ${inviteRole === r ? "text-white" : "text-zinc-400"}`}>
                  {r === "admin" ? "Admin" : "Membro"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => inviteMutation.mutate()}
            disabled={!inviteEmail.trim() || inviteMutation.isPending}
            className="bg-primary rounded-xl py-3.5 items-center disabled:opacity-50"
          >
            <Text className="text-white font-semibold text-sm">
              {inviteMutation.isPending ? "Enviando..." : "Enviar convite"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── EDIT MEMBER MODAL ── */}
      <Modal visible={!!editMember} transparent animationType="slide">
        <TouchableOpacity className="flex-1 bg-black/60" activeOpacity={1} onPress={() => setEditMember(null)} />
        <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl px-5 pt-6 pb-10">
          <Text className="text-white font-bold text-base mb-4">
            Editar {editMember?.user.name.split(" ")[0]}
          </Text>

          <Text className="text-zinc-500 text-xs font-semibold uppercase mb-2">Setor / Departamento</Text>
          <TouchableOpacity
            onPress={() => setShowDeptPicker(true)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between"
          >
            <Text className="text-white text-sm">{editDept || "Sem setor definido"}</Text>
            <Text className="text-zinc-400 text-xs">▼</Text>
          </TouchableOpacity>

          <Text className="text-zinc-500 text-xs font-semibold uppercase mb-2">Cargo / Título</Text>
          <TextInput
            value={editTitle} onChangeText={setEditTitle}
            placeholder="Ex: Gerente de Vendas" placeholderTextColor="#52525b"
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm mb-4"
          />

          <TouchableOpacity
            onPress={() => saveMemberMutation.mutate()}
            disabled={saveMemberMutation.isPending}
            className="bg-primary rounded-xl py-3.5 items-center"
          >
            <Text className="text-white font-semibold text-sm">
              {saveMemberMutation.isPending ? "Salvando..." : "Salvar"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── DEPT PICKER MODAL ── */}
      <Modal visible={showDeptPicker} transparent animationType="slide">
        <TouchableOpacity className="flex-1 bg-black/60" activeOpacity={1} onPress={() => setShowDeptPicker(false)} />
        <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-10">
          <Text className="text-white font-bold text-sm mb-4">Selecionar setor</Text>
          <TouchableOpacity
            onPress={() => { setEditDept(""); setShowDeptPicker(false); }}
            className="py-3 border-b border-zinc-800 flex-row items-center justify-between"
          >
            <Text className="text-zinc-400 text-sm">Sem setor definido</Text>
            {!editDept && <Text className="text-primary">✓</Text>}
          </TouchableOpacity>
          {DEPARTMENTS.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => { setEditDept(d); setShowDeptPicker(false); }}
              className="py-3 border-b border-zinc-800 flex-row items-center justify-between"
            >
              <Text className="text-white text-sm">{d}</Text>
              {editDept === d && <Text className="text-primary">✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
