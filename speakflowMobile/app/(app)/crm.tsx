import { useState, useMemo, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, RefreshControl, ActivityIndicator, Modal, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "@infrastructure/http/ApiClient";

type CrmTab = "overview" | "leads" | "pipeline" | "users";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  teamSize?: string | null;
  origin: string;
  status: string;
  score: number;
  notes?: string | null;
  lastContact?: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: { activities: number };
  activities?: { id: string; type: string; content: string; createdAt: string }[];
}

interface Stats {
  totalUsers: number; newUsersThisWeek: number; premiumUsers: number;
  freeUsers: number; b2bUsers: number; totalOrgs: number; activeOrgs: number;
  mrrEstimate: number; totalLeads: number; newLeadsThisWeek: number;
  convertedLeads: number; activeTrials: number;
  leadsByStatus: Record<string, number>; planMap: Record<string, number>;
}

interface PlatformUser {
  id: string; name: string; email: string; plan: string; credits: number;
  b2bAccess: boolean; createdAt: string; avatarUrl?: string | null;
  _count: { orgMemberships: number };
}

interface StatusConfig {
  value: string; label: string; dot: string; chip: string; text: string;
}

const STATUSES: StatusConfig[] = [
  { value: "novo",             label: "Novo",        dot: "bg-zinc-400",    chip: "bg-zinc-700/40 border-zinc-600/40",    text: "text-zinc-300" },
  { value: "contato_iniciado", label: "Contato",     dot: "bg-sky-400",     chip: "bg-sky-500/15 border-sky-500/30",      text: "text-sky-300" },
  { value: "qualificado",      label: "Qualificado", dot: "bg-violet-400",  chip: "bg-violet-500/15 border-violet-500/30", text: "text-violet-300" },
  { value: "trial",            label: "Trial",       dot: "bg-amber-400",   chip: "bg-amber-500/15 border-amber-500/30",  text: "text-amber-300" },
  { value: "negociacao",       label: "Negociação",  dot: "bg-orange-400",  chip: "bg-orange-500/15 border-orange-500/30", text: "text-orange-300" },
  { value: "convertido",       label: "Convertido",  dot: "bg-emerald-400", chip: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-300" },
  { value: "perdido",          label: "Perdido",     dot: "bg-rose-400",    chip: "bg-rose-500/15 border-rose-500/30",    text: "text-rose-300" },
];

const STATUS_MAP: Record<string, StatusConfig> = Object.fromEntries(STATUSES.map((s) => [s.value, s]));
function statusCfg(v: string): StatusConfig {
  return STATUS_MAP[v] ?? { value: v, label: v, dot: "bg-zinc-400", chip: "bg-zinc-700/40 border-zinc-600/40", text: "text-zinc-300" };
}

const PLAN_LABEL: Record<string, string> = { free: "Free", basic: "Basic", premium: "Premium" };
const PLANS = ["all", "free", "basic", "premium"];

const EMPTY_FORM = {
  name: "", email: "", phone: "", company: "", role: "", teamSize: "",
  origin: "manual", status: "novo", score: 0, notes: "",
};

function fmtMoney(n: number): string {
  return `R$ ${n.toLocaleString("pt-BR")}`;
}
function fmtDate(d?: string | null): string {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "—";
}

function StatusBadge({ status }: { status: string }) {
  const c = statusCfg(status);
  return (
    <View className={`flex-row items-center gap-1 border rounded-full px-2.5 py-0.5 ${c.chip}`}>
      <View className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <Text className={`text-[11px] font-semibold ${c.text}`}>{c.label}</Text>
    </View>
  );
}

function ScoreDots({ score }: { score: number }) {
  return (
    <View className="flex-row items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className={`w-1.5 h-1.5 rounded-full ${i <= Math.ceil(score / 20) ? "bg-violet-400" : "bg-zinc-700"}`} />
      ))}
    </View>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  const map: Record<string, string> = {
    violet: "border-violet-500/20 bg-violet-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    sky: "border-sky-500/20 bg-sky-500/5",
  };
  return (
    <View className={`flex-1 rounded-2xl border p-3.5 ${map[accent] ?? map.violet}`}>
      <Text className="text-white text-2xl font-black">{value}</Text>
      <Text className="text-zinc-300 text-xs font-medium mt-0.5">{label}</Text>
      {sub ? <Text className="text-zinc-600 text-[10px] mt-0.5">{sub}</Text> : null}
    </View>
  );
}

export default function CrmScreen() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<CrmTab>("overview");
  const [searchLead, setSearchLead] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchUser, setSearchUser] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  const statsQ = useQuery<Stats>({
    queryKey: ["crm-stats"],
    queryFn: async () => {
      const r = await ApiClient.get<Stats>("/api/crm/stats");
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  const leadsQ = useQuery<Lead[]>({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      const r = await ApiClient.get<{ leads: Lead[] }>("/api/crm/leads?limit=200");
      if (!r.ok) throw new Error(r.error.message);
      return r.data.leads ?? [];
    },
  });

  const usersQ = useQuery<PlatformUser[]>({
    queryKey: ["crm-users"],
    enabled: tab === "users",
    queryFn: async () => {
      const r = await ApiClient.get<{ users: PlatformUser[] }>("/api/crm/users?limit=200");
      if (!r.ok) throw new Error(r.error.message);
      return r.data.users ?? [];
    },
  });

  const leads = leadsQ.data ?? [];
  const users = usersQ.data ?? [];

  const refreshAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["crm-stats"] });
    qc.invalidateQueries({ queryKey: ["crm-leads"] });
    qc.invalidateQueries({ queryKey: ["crm-users"] });
  }, [qc]);

  const filteredLeads = useMemo(() => {
    const q = searchLead.toLowerCase();
    return leads.filter((l) => {
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.company ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, searchLead, filterStatus]);

  const filteredUsers = useMemo(() => {
    const q = searchUser.toLowerCase();
    return users.filter((u) => {
      if (filterPlan !== "all" && u.plan !== filterPlan) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, searchUser, filterPlan]);

  async function openLead(id: string) {
    setLoadingDetail(true);
    setSelectedLead({ id } as Lead);
    const r = await ApiClient.get<Lead>(`/api/crm/leads/${id}`);
    setLoadingDetail(false);
    if (r.ok) setSelectedLead(r.data);
    else { setSelectedLead(null); Alert.alert("Erro", "Não foi possível abrir o lead."); }
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function startEdit(lead: Lead) {
    setEditingId(lead.id);
    setForm({
      name: lead.name, email: lead.email, phone: lead.phone ?? "", company: lead.company ?? "",
      role: lead.role ?? "", teamSize: lead.teamSize ?? "", origin: lead.origin ?? "manual",
      status: lead.status, score: lead.score ?? 0, notes: lead.notes ?? "",
    });
    setShowForm(true);
  }

  async function saveLead() {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert("Campos obrigatórios", "Nome e e-mail são obrigatórios.");
      return;
    }
    setSaving(true);
    const r = editingId
      ? await ApiClient.patch<Lead>(`/api/crm/leads/${editingId}`, form)
      : await ApiClient.post<Lead>("/api/crm/leads", form);
    setSaving(false);
    if (r.ok) {
      setShowForm(false);
      refreshAll();
    } else {
      Alert.alert("Erro", (r as any).error?.message ?? "Não foi possível salvar.");
    }
  }

  async function changeStatus(status: string) {
    if (!selectedLead) return;
    setChangingStatus(true);
    const r = await ApiClient.patch<Lead>(`/api/crm/leads/${selectedLead.id}`, { status });
    setChangingStatus(false);
    if (r.ok) {
      await openLead(selectedLead.id);
      refreshAll();
    }
  }

  async function addNote() {
    if (!selectedLead || !noteText.trim()) return;
    setSavingNote(true);
    const r = await ApiClient.patch<Lead>(`/api/crm/leads/${selectedLead.id}`, {
      addNote: noteText.trim(),
      lastContact: new Date().toISOString(),
    });
    setSavingNote(false);
    if (r.ok) {
      setNoteText("");
      await openLead(selectedLead.id);
      refreshAll();
    }
  }

  async function markContactNow() {
    if (!selectedLead) return;
    const r = await ApiClient.patch<Lead>(`/api/crm/leads/${selectedLead.id}`, {
      addNote: "Contato realizado.",
      lastContact: new Date().toISOString(),
    });
    if (r.ok) { await openLead(selectedLead.id); refreshAll(); }
  }

  function confirmDelete() {
    if (!selectedLead) return;
    Alert.alert("Deletar lead", `Remover "${selectedLead.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Deletar", style: "destructive",
        onPress: async () => {
          const r = await ApiClient.delete(`/api/crm/leads/${selectedLead!.id}`);
          if (r.ok) { setSelectedLead(null); refreshAll(); }
          else Alert.alert("Erro", "Não foi possível deletar.");
        },
      },
    ]);
  }

  async function createLeadFromUser(u: PlatformUser) {
    const r = await ApiClient.post("/api/crm/leads", {
      name: u.name, email: u.email, origin: "platform_user", status: "qualificado",
      score: u.plan === "premium" ? 80 : u.plan === "basic" ? 50 : 20,
    });
    if (r.ok) { Alert.alert("Pronto", `Lead criado para ${u.name}`); refreshAll(); }
    else Alert.alert("Erro", (r as any).error?.message ?? "Não foi possível criar o lead.");
  }

  async function importCSV() {
    const lines = importText.trim().split("\n").filter(Boolean);
    if (lines.length === 0) { Alert.alert("Vazio", "Nenhuma linha para importar."); return; }
    setImporting(true);
    let ok = 0, fail = 0;
    for (const line of lines) {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const [name, email, phone, company, role] = cols;
      if (!name || !email) { fail++; continue; }
      const r = await ApiClient.post("/api/crm/leads", { name, email, phone, company, role, origin: "import" });
      if (r.ok) ok++; else fail++;
    }
    setImporting(false);
    setImportText("");
    setShowImport(false);
    refreshAll();
    Alert.alert("Importação concluída", `${ok} importados${fail > 0 ? ` · ${fail} com erro` : ""}.`);
  }

  const stats = statsQ.data;
  const refreshing = leadsQ.isRefetching || statsQ.isRefetching || usersQ.isRefetching;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-1">
          <Text className="text-zinc-400 text-lg">‹</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white">📋 CRM</Text>
          <Text className="text-zinc-500 text-xs">{stats?.totalLeads ?? leads.length} leads · {stats?.totalUsers ?? 0} usuários</Text>
        </View>
        <TouchableOpacity onPress={refreshAll} className="border border-zinc-700 rounded-xl px-3 py-1.5">
          <Text className="text-zinc-400 text-xs font-semibold">↻</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row border-b border-zinc-800 px-5">
        {([
          { key: "overview", label: "Visão geral" },
          { key: "leads", label: "Leads" },
          { key: "pipeline", label: "Pipeline" },
          { key: "users", label: "Usuários" },
        ] as const).map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            className={`mr-5 pb-2.5 border-b-2 ${tab === t.key ? "border-primary" : "border-transparent"}`}
          >
            <Text className={`text-xs font-semibold ${tab === t.key ? "text-primary" : "text-zinc-500"}`}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===== OVERVIEW ===== */}
      {tab === "overview" && (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#7c3aed" />}
        >
          {statsQ.isLoading || !stats ? (
            <View className="items-center py-20"><ActivityIndicator color="#7c3aed" size="large" /></View>
          ) : (
            <>
              <View className="flex-row gap-3">
                <Kpi label="Usuários" value={stats.totalUsers} sub={`+${stats.newUsersThisWeek} esta semana`} accent="sky" />
                <Kpi label="MRR estimado" value={fmtMoney(stats.mrrEstimate)} sub={`${stats.activeOrgs} orgs ativas`} accent="emerald" />
              </View>
              <View className="flex-row gap-3">
                <Kpi label="Leads" value={stats.totalLeads} sub={`+${stats.newLeadsThisWeek} esta semana`} accent="violet" />
                <Kpi label="Convertidos" value={stats.convertedLeads} sub={`${stats.activeTrials} em trial`} accent="amber" />
              </View>
              <View className="flex-row gap-3">
                <Kpi label="Premium" value={stats.premiumUsers} accent="violet" />
                <Kpi label="Free" value={stats.freeUsers} accent="sky" />
                <Kpi label="B2B" value={stats.b2bUsers} accent="emerald" />
              </View>

              <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mt-2">Leads por status</Text>
              <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 gap-2.5">
                {STATUSES.map((s) => {
                  const count = stats.leadsByStatus[s.value] ?? 0;
                  const pct = stats.totalLeads > 0 ? Math.round((count / stats.totalLeads) * 100) : 0;
                  return (
                    <View key={s.value}>
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center gap-1.5">
                          <View className={`w-2 h-2 rounded-full ${s.dot}`} />
                          <Text className="text-zinc-300 text-xs">{s.label}</Text>
                        </View>
                        <Text className="text-zinc-500 text-xs">{count} · {pct}%</Text>
                      </View>
                      <View className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <View className={`h-full rounded-full ${s.dot}`} style={{ width: `${pct}%` }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ===== LEADS ===== */}
      {tab === "leads" && (
        <View className="flex-1">
          <View className="px-5 pt-3 gap-2">
            <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-3 gap-2">
              <Text className="text-zinc-500">🔍</Text>
              <TextInput
                value={searchLead} onChangeText={setSearchLead}
                placeholder="Buscar lead..." placeholderTextColor="#52525b"
                className="flex-1 py-3 text-white text-sm"
              />
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={startCreate} className="flex-1 bg-primary rounded-xl py-2.5 items-center">
                <Text className="text-white font-bold text-xs">+ Novo lead</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowImport(true)} className="flex-1 border border-zinc-700 rounded-xl py-2.5 items-center">
                <Text className="text-zinc-300 font-semibold text-xs">⬆ Importar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 pt-2.5" style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingRight: 20 }}>
            {["all", ...STATUSES.map((s) => s.value)].map((v) => {
              const active = filterStatus === v;
              const label = v === "all" ? "Todos" : statusCfg(v).label;
              return (
                <TouchableOpacity key={v} onPress={() => setFilterStatus(v)}
                  className={`rounded-full border px-3 py-1.5 ${active ? "bg-primary/20 border-primary/40" : "bg-zinc-900 border-zinc-800"}`}>
                  <Text className={`text-xs font-semibold ${active ? "text-primary" : "text-zinc-400"}`}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {leadsQ.isLoading ? (
            <View className="flex-1 items-center justify-center"><ActivityIndicator color="#7c3aed" /></View>
          ) : (
            <ScrollView
              className="flex-1 px-5 pt-3"
              contentContainerStyle={{ paddingBottom: 40, gap: 10 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#7c3aed" />}
            >
              {filteredLeads.length === 0 ? (
                <View className="items-center py-16">
                  <Text style={{ fontSize: 40 }} className="mb-3">📭</Text>
                  <Text className="text-zinc-400 text-sm">Nenhum lead encontrado</Text>
                </View>
              ) : (
                filteredLeads.map((lead) => (
                  <TouchableOpacity key={lead.id} onPress={() => openLead(lead.id)} activeOpacity={0.8}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1 mr-3">
                        <Text className="text-white font-semibold text-base">{lead.name}</Text>
                        <Text className="text-zinc-500 text-xs mt-0.5">{lead.email}</Text>
                        {lead.company ? <Text className="text-zinc-600 text-xs">🏢 {lead.company}{lead.role ? ` · ${lead.role}` : ""}</Text> : null}
                      </View>
                      <StatusBadge status={lead.status} />
                    </View>
                    <View className="flex-row items-center justify-between mt-1">
                      <ScoreDots score={lead.score ?? 0} />
                      <Text className="text-zinc-700 text-[10px]">
                        {fmtDate(lead.createdAt)}{lead.origin ? ` · ${lead.origin}` : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* ===== PIPELINE ===== */}
      {tab === "pipeline" && (
        leadsQ.isLoading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color="#7c3aed" /></View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 pt-3" contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {STATUSES.map((s) => {
              const colLeads = leads.filter((l) => l.status === s.value);
              return (
                <View key={s.value} className="w-64">
                  <View className="flex-row items-center justify-between mb-2 px-1">
                    <View className="flex-row items-center gap-1.5">
                      <View className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <Text className="text-white text-xs font-bold">{s.label}</Text>
                    </View>
                    <Text className="text-zinc-500 text-xs">{colLeads.length}</Text>
                  </View>
                  <ScrollView className="flex-1" contentContainerStyle={{ gap: 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                    {colLeads.length === 0 ? (
                      <View className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl py-6 items-center">
                        <Text className="text-zinc-700 text-xs">vazio</Text>
                      </View>
                    ) : colLeads.map((lead) => (
                      <TouchableOpacity key={lead.id} onPress={() => openLead(lead.id)} activeOpacity={0.8}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                        <Text className="text-white text-sm font-semibold" numberOfLines={1}>{lead.name}</Text>
                        {lead.company ? <Text className="text-zinc-500 text-[11px]" numberOfLines={1}>🏢 {lead.company}</Text> : null}
                        <View className="flex-row items-center justify-between mt-2">
                          <ScoreDots score={lead.score ?? 0} />
                          <Text className="text-zinc-700 text-[10px]">{fmtDate(lead.lastContact)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        )
      )}

      {/* ===== USERS ===== */}
      {tab === "users" && (
        <View className="flex-1">
          <View className="px-5 pt-3 gap-2">
            <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-3 gap-2">
              <Text className="text-zinc-500">🔍</Text>
              <TextInput
                value={searchUser} onChangeText={setSearchUser}
                placeholder="Buscar usuário..." placeholderTextColor="#52525b"
                className="flex-1 py-3 text-white text-sm"
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingRight: 20 }}>
              {PLANS.map((p) => {
                const active = filterPlan === p;
                return (
                  <TouchableOpacity key={p} onPress={() => setFilterPlan(p)}
                    className={`rounded-full border px-3 py-1.5 ${active ? "bg-primary/20 border-primary/40" : "bg-zinc-900 border-zinc-800"}`}>
                    <Text className={`text-xs font-semibold ${active ? "text-primary" : "text-zinc-400"}`}>{p === "all" ? "Todos" : PLAN_LABEL[p] ?? p}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {usersQ.isLoading ? (
            <View className="flex-1 items-center justify-center"><ActivityIndicator color="#7c3aed" /></View>
          ) : (
            <ScrollView
              className="flex-1 px-5 pt-3"
              contentContainerStyle={{ paddingBottom: 40, gap: 10 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#7c3aed" />}
            >
              {filteredUsers.length === 0 ? (
                <View className="items-center py-16"><Text className="text-zinc-400 text-sm">Nenhum usuário</Text></View>
              ) : filteredUsers.map((u) => (
                <View key={u.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex-row items-center gap-3">
                  <View className="w-9 h-9 rounded-full bg-primary/20 items-center justify-center">
                    <Text className="text-white text-sm font-bold">{u.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-sm" numberOfLines={1}>{u.name}</Text>
                    <Text className="text-zinc-500 text-xs" numberOfLines={1}>{u.email}</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <View className={`rounded-full px-2 py-0.5 ${u.plan === "premium" ? "bg-violet-500/15" : u.plan === "basic" ? "bg-sky-500/15" : "bg-zinc-700/40"}`}>
                        <Text className={`text-[10px] font-semibold ${u.plan === "premium" ? "text-violet-300" : u.plan === "basic" ? "text-sky-300" : "text-zinc-400"}`}>{PLAN_LABEL[u.plan] ?? u.plan}</Text>
                      </View>
                      {u.b2bAccess ? <Text className="text-emerald-400 text-[10px] font-semibold">B2B</Text> : null}
                      <Text className="text-zinc-600 text-[10px]">{u.credits} créditos</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => createLeadFromUser(u)} className="border border-primary/30 bg-primary/10 rounded-xl px-3 py-2">
                    <Text className="text-primary text-[11px] font-semibold">+ Lead</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* ===== LEAD DETAIL MODAL ===== */}
      <Modal visible={!!selectedLead} animationType="slide" transparent onRequestClose={() => setSelectedLead(null)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-background rounded-t-3xl max-h-[88%] border-t border-zinc-800">
            <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
              <Text className="text-white font-bold text-base">Detalhes do lead</Text>
              <TouchableOpacity onPress={() => setSelectedLead(null)} className="border border-zinc-700 rounded-xl px-3 py-1.5">
                <Text className="text-zinc-400 text-xs font-semibold">✕ Fechar</Text>
              </TouchableOpacity>
            </View>

            {loadingDetail || !selectedLead?.email ? (
              <View className="items-center py-16"><ActivityIndicator color="#7c3aed" /></View>
            ) : selectedLead ? (
              <ScrollView className="px-5 pt-4" contentContainerStyle={{ paddingBottom: 40, gap: 14 }}>
                <View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white text-xl font-bold flex-1 mr-3">{selectedLead.name}</Text>
                    <StatusBadge status={selectedLead.status} />
                  </View>
                  <Text className="text-zinc-400 text-sm mt-1">{selectedLead.email}</Text>
                  {selectedLead.phone ? <Text className="text-zinc-500 text-xs mt-0.5">📞 {selectedLead.phone}</Text> : null}
                  {selectedLead.company ? <Text className="text-zinc-500 text-xs">🏢 {selectedLead.company}{selectedLead.role ? ` · ${selectedLead.role}` : ""}</Text> : null}
                  <View className="flex-row items-center gap-3 mt-2">
                    <ScoreDots score={selectedLead.score ?? 0} />
                    <Text className="text-zinc-600 text-[11px]">Score {selectedLead.score ?? 0}</Text>
                    <Text className="text-zinc-600 text-[11px]">· Origem {selectedLead.origin}</Text>
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={markContactNow} className="flex-1 border border-emerald-700/50 bg-emerald-900/20 rounded-xl py-2.5 items-center">
                    <Text className="text-emerald-400 text-xs font-semibold">✓ Marcar contato</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { const l = selectedLead; setSelectedLead(null); if (l) startEdit(l); }} className="flex-1 border border-zinc-700 rounded-xl py-2.5 items-center">
                    <Text className="text-zinc-300 text-xs font-semibold">✎ Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={confirmDelete} className="border border-rose-700/50 bg-rose-900/20 rounded-xl py-2.5 px-3 items-center">
                    <Text className="text-rose-400 text-xs font-semibold">🗑</Text>
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Mudar status</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {STATUSES.map((s) => {
                      const active = selectedLead.status === s.value;
                      return (
                        <TouchableOpacity key={s.value} disabled={changingStatus} onPress={() => changeStatus(s.value)}
                          className={`flex-row items-center gap-1 border rounded-full px-2.5 py-1 ${active ? s.chip : "bg-zinc-900 border-zinc-800"}`}>
                          <View className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          <Text className={`text-[11px] font-semibold ${active ? s.text : "text-zinc-400"}`}>{s.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Adicionar nota</Text>
                  <TextInput
                    value={noteText} onChangeText={setNoteText}
                    placeholder="Escreva uma nota / interação..." placeholderTextColor="#52525b"
                    multiline className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm" style={{ minHeight: 56 }}
                  />
                  <TouchableOpacity onPress={addNote} disabled={savingNote || !noteText.trim()}
                    className="bg-primary rounded-xl py-2.5 items-center mt-2 disabled:opacity-50">
                    {savingNote ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-bold text-xs">Salvar nota</Text>}
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Histórico</Text>
                  {(selectedLead.activities ?? []).length === 0 ? (
                    <Text className="text-zinc-600 text-xs">Sem atividades ainda.</Text>
                  ) : (selectedLead.activities ?? []).map((a) => (
                    <View key={a.id} className="border-l-2 border-zinc-800 pl-3 pb-3">
                      <Text className="text-zinc-300 text-xs leading-relaxed">{a.content}</Text>
                      <Text className="text-zinc-600 text-[10px] mt-0.5">{new Date(a.createdAt).toLocaleString("pt-BR")}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ===== LEAD FORM MODAL ===== */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-background rounded-t-3xl max-h-[90%] border-t border-zinc-800">
            <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
              <Text className="text-white font-bold text-base">{editingId ? "Editar lead" : "Novo lead"}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} className="border border-zinc-700 rounded-xl px-3 py-1.5">
                <Text className="text-zinc-400 text-xs font-semibold">✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="px-5 pt-4" contentContainerStyle={{ paddingBottom: 40, gap: 12 }} keyboardShouldPersistTaps="handled">
              {([
                { key: "name", label: "Nome *", kbd: "default" },
                { key: "email", label: "E-mail *", kbd: "email-address" },
                { key: "phone", label: "Telefone", kbd: "phone-pad" },
                { key: "company", label: "Empresa", kbd: "default" },
                { key: "role", label: "Cargo", kbd: "default" },
                { key: "teamSize", label: "Tamanho do time", kbd: "default" },
                { key: "origin", label: "Origem", kbd: "default" },
              ] as const).map((f) => (
                <View key={f.key}>
                  <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5">{f.label}</Text>
                  <TextInput
                    value={(form as any)[f.key]} onChangeText={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
                    placeholderTextColor="#52525b" keyboardType={f.kbd as any}
                    autoCapitalize={f.key === "email" ? "none" : "sentences"}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm"
                  />
                </View>
              ))}

              <View>
                <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5">Status</Text>
                <View className="flex-row flex-wrap gap-2">
                  {STATUSES.map((s) => {
                    const active = form.status === s.value;
                    return (
                      <TouchableOpacity key={s.value} onPress={() => setForm((st) => ({ ...st, status: s.value }))}
                        className={`flex-row items-center gap-1 border rounded-full px-2.5 py-1 ${active ? s.chip : "bg-zinc-900 border-zinc-800"}`}>
                        <View className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        <Text className={`text-[11px] font-semibold ${active ? s.text : "text-zinc-400"}`}>{s.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5">Score (0-100)</Text>
                <TextInput
                  value={String(form.score)} onChangeText={(v) => setForm((s) => ({ ...s, score: Math.min(100, Math.max(0, parseInt(v.replace(/\D/g, "")) || 0)) }))}
                  keyboardType="number-pad" placeholderTextColor="#52525b"
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm"
                />
              </View>

              <View>
                <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5">Notas</Text>
                <TextInput
                  value={form.notes} onChangeText={(v) => setForm((s) => ({ ...s, notes: v }))}
                  multiline placeholderTextColor="#52525b"
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm" style={{ minHeight: 60 }}
                />
              </View>

              <TouchableOpacity onPress={saveLead} disabled={saving} className="bg-primary rounded-xl py-3 items-center disabled:opacity-50">
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-bold text-sm">{editingId ? "Salvar alterações" : "Criar lead"}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== IMPORT MODAL ===== */}
      <Modal visible={showImport} animationType="slide" transparent onRequestClose={() => setShowImport(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-background rounded-t-3xl border-t border-zinc-800">
            <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
              <Text className="text-white font-bold text-base">Importar leads (CSV)</Text>
              <TouchableOpacity onPress={() => setShowImport(false)} className="border border-zinc-700 rounded-xl px-3 py-1.5">
                <Text className="text-zinc-400 text-xs font-semibold">✕</Text>
              </TouchableOpacity>
            </View>
            <View className="px-5 pt-4 pb-8 gap-3">
              <Text className="text-zinc-400 text-xs">Uma linha por lead: nome, email, telefone, empresa, cargo</Text>
              <TextInput
                value={importText} onChangeText={setImportText}
                placeholder={"João Silva, joao@empresa.com, 11999990000, Acme, CEO"}
                placeholderTextColor="#52525b" multiline
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-xs"
                style={{ minHeight: 140, fontFamily: "monospace" }}
              />
              <Text className="text-zinc-600 text-[11px]">{importText.trim().split("\n").filter(Boolean).length} linhas detectadas</Text>
              <TouchableOpacity onPress={importCSV} disabled={importing || !importText.trim()} className="bg-primary rounded-xl py-3 items-center disabled:opacity-50">
                {importing ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-bold text-sm">Importar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
