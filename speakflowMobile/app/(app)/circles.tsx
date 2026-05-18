import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Modal, Alert, ActivityIndicator, Switch, Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "@infrastructure/http/ApiClient";

type ChallengeType = "written" | "spoken" | "quiz";
type StartOffset = "now" | "1h" | "tomorrow";
type Duration = "1d" | "3d" | "7d" | "14d";

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

function computeDates(start: StartOffset, duration: Duration): { startsAt: Date; endsAt: Date } {
  const now = new Date();
  let startsAt: Date;
  if (start === "1h") {
    startsAt = new Date(now.getTime() + 60 * 60 * 1000);
  } else if (start === "tomorrow") {
    startsAt = new Date(now);
    startsAt.setDate(startsAt.getDate() + 1);
    startsAt.setHours(9, 0, 0, 0);
  } else {
    startsAt = now;
  }
  const days = parseInt(duration);
  const endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);
  return { startsAt, endsAt };
}

const BLANK_QUESTION = (): QuizQuestion => ({
  question: "", options: ["", "", "", ""], correctIndex: 0,
});

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
  members: { id: string; userId: string; role: string; user: { id: string; name: string; avatarUrl: string | null } }[];
  challenges: { id: string; title: string; type: string; startsAt: string; endsAt: string; _count: { submissions: number } }[];
}

const FOCUS_OPTIONS = [
  "Vendas & Negociação", "Reuniões Internacionais", "Apresentações", "Entrevistas de Emprego",
  "Customer Success", "Backend & Arquitetura", "Frontend & Design", "DevOps & Cloud",
  "Conversas do Dia a Dia", "Inglês para Viagens",
];

const BLANK_CHALLENGE = () => ({
  title: "", type: "written" as ChallengeType, prompt: "",
  startOffset: "now" as StartOffset, duration: "7d" as Duration,
  isRecurring: false, questions: [] as QuizQuestion[],
});

export default function CirclesScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CircleDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detailView, setDetailView] = useState<"main" | "challenge" | "quiz">("main");
  const [quizChallenge, setQuizChallenge] = useState<{ id: string; title: string; circleId: string } | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<{ id: string; question: string; options: string[] }[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; correct: number; total: number; results: { question: string; correct: boolean; correctText: string; selectedText: string }[] } | null>(null);
  const [form, setForm] = useState({ name: "", description: "", focus: "", level: "Todos os níveis", visibility: "public" });
  const [cf, setCf] = useState(BLANK_CHALLENGE());
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  async function handleInvite(circleId: string) {
    setInviteLoading(true);
    const r = await ApiClient.post<{ url: string; circleName: string }>(
      `/api/network/circles/${circleId}/invite`, {}
    );
    setInviteLoading(false);
    if (r.ok) {
      await Share.share({
        message: `Entra no circle "${r.data.circleName}" no SpeakFlow! 👉 ${r.data.url}`,
        url: r.data.url,
      });
    } else {
      Alert.alert("Erro", "Não foi possível gerar o link de convite.");
    }
  }

  async function handleRemoveMember(circleId: string, membershipId: string, memberName: string) {
    Alert.alert("Remover membro", `Remover ${memberName} do circle?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => {
        const r = await ApiClient.patch(`/api/network/circles/${circleId}/members/${membershipId}`, { action: "remove" });
        if (r.ok) { openDetail(selected!); }
        else Alert.alert("Erro", "Não foi possível remover o membro.");
      }},
    ]);
  }

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

  const createChallengeMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Nenhum circle selecionado.");
      if (!cf.title.trim()) throw new Error("Título obrigatório.");
      if (cf.type !== "quiz" && !cf.prompt.trim()) throw new Error("Prompt obrigatório para desafios escritos/voz.");
      if (cf.type === "quiz" && cf.questions.length < 1) throw new Error("Adicione ao menos 1 pergunta ao quiz.");
      for (const q of cf.questions) {
        if (!q.question.trim()) throw new Error("Todas as perguntas precisam de texto.");
        if (q.options.some((o) => !o.trim())) throw new Error("Todas as opções precisam ser preenchidas.");
      }
      const { startsAt, endsAt } = computeDates(cf.startOffset, cf.duration);
      const r = await ApiClient.post("/api/network/challenges", {
        circleId: selected.id, title: cf.title.trim(), prompt: cf.prompt.trim() || undefined,
        type: cf.type, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(),
        isRecurring: cf.isRecurring, questions: cf.type === "quiz" ? cf.questions : undefined,
      });
      if (!r.ok) throw new Error((r as any).error?.message ?? "Erro ao criar desafio.");
      return r.data;
    },
    onSuccess: () => {
      setDetailView("main");
      setCf(BLANK_CHALLENGE());
      openDetail(selected!);
      Alert.alert("Desafio criado!", "Os membros foram notificados.");
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
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setSelected(null); setDetailView("main"); }}>
        {selected && (
          <SafeAreaView className="flex-1 bg-background">
            <View className="flex-row items-center gap-3 px-5 pt-4 pb-3 border-b border-zinc-800">
              <TouchableOpacity onPress={() => (detailView === "challenge" || detailView === "quiz") ? setDetailView("main") : setSelected(null)}>
                <Text className="text-zinc-400 text-lg">‹</Text>
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-white font-bold text-base" numberOfLines={1}>{selected.name}</Text>
                <Text className="text-zinc-500 text-xs">{selected.focus} · {selected.level}</Text>
              </View>
              {selected.myRole && ["owner", "moderator"].includes(selected.myRole) && detailView === "main" && (
                <>
                  <TouchableOpacity
                    onPress={() => handleInvite(selected.id)}
                    disabled={inviteLoading}
                    className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-1.5"
                  >
                    {inviteLoading
                      ? <ActivityIndicator size="small" color="#60a5fa" />
                      : <Text className="text-blue-400 text-xs font-semibold">🔗 Convidar</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setCf(BLANK_CHALLENGE()); setDetailView("challenge"); }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5"
                  >
                    <Text className="text-emerald-400 text-xs font-semibold">⚡ Desafio</Text>
                  </TouchableOpacity>
                </>
              )}
              {detailView === "challenge" && (
                <TouchableOpacity onPress={() => setDetailView("main")} className="border border-zinc-700 rounded-xl px-3 py-1.5">
                  <Text className="text-zinc-400 text-xs font-semibold">✕ Cancelar</Text>
                </TouchableOpacity>
              )}
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
            {/* ── Challenge creation form (inline, no nested modal) ── */}
            {detailView === "challenge" && (
              <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40, gap: 16 }}>
                <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 mb-2">
                  <Text className="text-emerald-400 text-xs font-semibold">⚡ Novo desafio para: {selected.name}</Text>
                </View>

                <View>
                  <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Título *</Text>
                  <TextInput
                    value={cf.title} onChangeText={(v) => setCf(f => ({ ...f, title: v }))}
                    placeholder="Ex: Pitch de 60 segundos em inglês" placeholderTextColor="#52525b" maxLength={120}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white text-sm"
                  />
                </View>

                <View>
                  <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Tipo</Text>
                  <View className="flex-row gap-2">
                    {(["written", "spoken", "quiz"] as ChallengeType[]).map((t) => (
                      <TouchableOpacity key={t} onPress={() => setCf(f => ({ ...f, type: t }))}
                        className={`flex-1 py-2.5 rounded-xl border items-center ${cf.type === t ? "bg-primary/20 border-primary/40" : "bg-zinc-900 border-zinc-800"}`}>
                        <Text className={`text-xs font-semibold ${cf.type === t ? "text-primary" : "text-zinc-400"}`}>
                          {t === "written" ? "✍️ Escrito" : t === "spoken" ? "🎙️ Voz" : "📊 Quiz"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {cf.type !== "quiz" && (
                  <View>
                    <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Prompt / instrução *</Text>
                    <TextInput
                      value={cf.prompt} onChangeText={(v) => setCf(f => ({ ...f, prompt: v }))}
                      placeholder="Descreva o que os membros devem fazer..." placeholderTextColor="#52525b"
                      multiline numberOfLines={3} textAlignVertical="top" maxLength={2000}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm"
                      style={{ minHeight: 80 }}
                    />
                  </View>
                )}

                {cf.type === "quiz" && (
                  <View>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-zinc-400 text-xs uppercase tracking-wider">Perguntas ({cf.questions.length}/10)</Text>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={async () => {
                            if (!cf.title.trim()) { Alert.alert("Atenção", "Preencha o título antes de gerar."); return; }
                            setGeneratingQuiz(true);
                            const r = await ApiClient.post<{ questions: QuizQuestion[] }>(
                              "/api/network/challenges/generate-quiz",
                              { title: cf.title, focus: selected?.focus ?? "Business English", level: selected?.level ?? "Todos", count: 5 }
                            );
                            setGeneratingQuiz(false);
                            if (r.ok) setCf(f => ({ ...f, questions: r.data.questions }));
                            else Alert.alert("Erro", r.error?.message ?? "Erro ao gerar quiz.");
                          }}
                          disabled={generatingQuiz || !cf.title.trim()}
                          className="bg-violet-500/10 border border-violet-500/30 rounded-lg px-3 py-1 flex-row items-center gap-1"
                        >
                          {generatingQuiz
                            ? <ActivityIndicator size="small" color="#7c3aed" />
                            : <Text className="text-violet-400 text-xs font-semibold">✨ Gerar com IA</Text>
                          }
                        </TouchableOpacity>
                        {cf.questions.length < 10 && (
                          <TouchableOpacity onPress={() => setCf(f => ({ ...f, questions: [...f.questions, BLANK_QUESTION()] }))}
                            className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-1">
                            <Text className="text-primary text-xs font-semibold">+ Pergunta</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {cf.questions.map((q, qi) => (
                      <View key={qi} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-3">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-zinc-400 text-xs font-semibold">Pergunta {qi + 1}</Text>
                          <TouchableOpacity onPress={() => setCf(f => ({ ...f, questions: f.questions.filter((_, i) => i !== qi) }))}>
                            <Text className="text-red-400 text-xs">remover</Text>
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          value={q.question}
                          onChangeText={(v) => setCf(f => { const qs = [...f.questions]; qs[qi] = { ...qs[qi], question: v }; return { ...f, questions: qs }; })}
                          placeholder="Texto da pergunta..." placeholderTextColor="#52525b"
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs mb-2"
                        />
                        {q.options.map((opt, oi) => (
                          <TouchableOpacity key={oi}
                            onPress={() => setCf(f => { const qs = [...f.questions]; qs[qi] = { ...qs[qi], correctIndex: oi }; return { ...f, questions: qs }; })}
                            className={`flex-row items-center gap-2 mb-1.5 rounded-lg px-2 py-1 border ${q.correctIndex === oi ? "bg-emerald-500/10 border-emerald-500/30" : "bg-zinc-800 border-zinc-700"}`}
                          >
                            <View className={`w-4 h-4 rounded-full border items-center justify-center ${q.correctIndex === oi ? "border-emerald-400 bg-emerald-400" : "border-zinc-600"}`}>
                              {q.correctIndex === oi && <Text className="text-white text-[8px] font-bold">✓</Text>}
                            </View>
                            <TextInput
                              value={opt}
                              onChangeText={(v) => setCf(f => { const qs = [...f.questions]; const opts = [...qs[qi].options] as [string,string,string,string]; opts[oi] = v; qs[qi] = { ...qs[qi], options: opts }; return { ...f, questions: qs }; })}
                              placeholder={`Opção ${oi + 1}${q.correctIndex === oi ? " (correta)" : ""}`} placeholderTextColor="#52525b"
                              className="flex-1 text-white text-xs"
                            />
                          </TouchableOpacity>
                        ))}
                        <Text className="text-zinc-600 text-[10px] mt-1">Toque no círculo para marcar a opção correta</Text>
                      </View>
                    ))}
                    {cf.questions.length === 0 && (
                      <TouchableOpacity onPress={() => setCf(f => ({ ...f, questions: [BLANK_QUESTION()] }))}
                        className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-4 items-center">
                        <Text className="text-zinc-500 text-sm">Toque para adicionar a primeira pergunta</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View>
                  <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Início</Text>
                  <View className="flex-row gap-2">
                    {(["now", "1h", "tomorrow"] as StartOffset[]).map((s) => (
                      <TouchableOpacity key={s} onPress={() => setCf(f => ({ ...f, startOffset: s }))}
                        className={`flex-1 py-2.5 rounded-xl border items-center ${cf.startOffset === s ? "bg-primary/20 border-primary/40" : "bg-zinc-900 border-zinc-800"}`}>
                        <Text className={`text-xs font-semibold ${cf.startOffset === s ? "text-primary" : "text-zinc-400"}`}>
                          {s === "now" ? "Agora" : s === "1h" ? "Em 1h" : "Amanhã"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Duração</Text>
                  <View className="flex-row gap-2">
                    {(["1d", "3d", "7d", "14d"] as Duration[]).map((d) => (
                      <TouchableOpacity key={d} onPress={() => setCf(f => ({ ...f, duration: d }))}
                        className={`flex-1 py-2.5 rounded-xl border items-center ${cf.duration === d ? "bg-primary/20 border-primary/40" : "bg-zinc-900 border-zinc-800"}`}>
                        <Text className={`text-xs font-semibold ${cf.duration === d ? "text-primary" : "text-zinc-400"}`}>
                          {d === "1d" ? "1 dia" : d === "3d" ? "3 dias" : d === "7d" ? "7 dias" : "14 dias"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="flex-row items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                  <View>
                    <Text className="text-white text-sm font-medium">Recorrente</Text>
                    <Text className="text-zinc-500 text-xs">Renova automaticamente ao expirar</Text>
                  </View>
                  <Switch
                    value={cf.isRecurring}
                    onValueChange={(v) => setCf(f => ({ ...f, isRecurring: v }))}
                    trackColor={{ false: "#3f3f46", true: "#7c3aed" }}
                    thumbColor="#ffffff"
                  />
                </View>

                <TouchableOpacity
                  onPress={() => createChallengeMutation.mutate()}
                  disabled={createChallengeMutation.isPending}
                  className="bg-primary rounded-xl py-4 items-center disabled:opacity-50 mt-2"
                  activeOpacity={0.8}
                >
                  {createChallengeMutation.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <Text className="text-white font-bold text-base">Criar Desafio ⚡</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* ── Quiz taking view ── */}
            {detailView === "quiz" && (
              <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40, gap: 16 }}>
                {quizLoading && (
                  <View className="items-center py-12">
                    <ActivityIndicator color="#7c3aed" size="large" />
                    <Text className="text-zinc-400 text-sm mt-3">Carregando perguntas...</Text>
                  </View>
                )}

                {!quizLoading && quizResult && (
                  <View>
                    <View className={`rounded-2xl p-5 mb-4 items-center border ${
                      quizResult.correct === quizResult.total ? "bg-emerald-500/10 border-emerald-500/20" : "bg-primary/10 border-primary/20"
                    }`}>
                      <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Resultado</Text>
                      <Text className={`text-4xl font-bold mb-1 ${
                        quizResult.correct === quizResult.total ? "text-emerald-400" : "text-primary"
                      }`}>{quizResult.correct}/{quizResult.total}</Text>
                      <Text className="text-zinc-300 text-sm">{quizResult.score.toFixed(1)} pontos</Text>
                      {quizResult.correct === quizResult.total
                        ? <Text className="text-emerald-400 text-sm mt-2">🎉 Perfeito!</Text>
                        : <Text className="text-zinc-400 text-xs mt-2">Revise as questões erradas para melhorar</Text>
                      }
                    </View>
                    {quizResult.results.map((r, i) => (
                      <View key={i} className={`rounded-xl p-3 mb-2 border ${
                        r.correct ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
                      }`}>
                        <Text className="text-white text-xs font-semibold mb-1">{i + 1}. {r.question}</Text>
                        {!r.correct && <Text className="text-red-400 text-xs">Sua resposta: {r.selectedText || "(sem resposta)"}</Text>}
                        <Text className="text-emerald-400 text-xs">Correta: {r.correctText}</Text>
                      </View>
                    ))}
                    <TouchableOpacity onPress={() => setDetailView("main")} className="bg-zinc-800 rounded-xl py-3 items-center mt-2">
                      <Text className="text-white font-semibold">Voltar ao circle</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!quizLoading && !quizResult && quizQuestions.length > 0 && (
                  <View>
                    <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 mb-2">
                      <Text className="text-emerald-400 text-xs font-semibold">📊 {quizChallenge?.title} · {quizQuestions.length} perguntas</Text>
                    </View>
                    {quizQuestions.map((q, qi) => (
                      <View key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-3">
                        <Text className="text-white text-sm font-semibold mb-3">{qi + 1}. {q.question}</Text>
                        {q.options.map((opt, oi) => {
                          const selected2 = quizAnswers[q.id] === opt;
                          return (
                            <TouchableOpacity key={oi} onPress={() => setQuizAnswers(a => ({ ...a, [q.id]: opt }))}
                              className={`flex-row items-center gap-3 rounded-lg px-3 py-2.5 mb-1.5 border ${
                                selected2 ? "bg-primary/20 border-primary/40" : "bg-zinc-800 border-zinc-700"
                              }`}
                            >
                              <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                                selected2 ? "border-primary bg-primary" : "border-zinc-600"
                              }`}>
                                {selected2 && <Text className="text-white text-[10px] font-bold">✓</Text>}
                              </View>
                              <Text className={`text-sm flex-1 ${ selected2 ? "text-white font-medium" : "text-zinc-300" }`}>{opt}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                    <TouchableOpacity
                      onPress={async () => {
                        if (Object.keys(quizAnswers).length < quizQuestions.length) {
                          Alert.alert("Atenção", "Responda todas as perguntas antes de enviar.");
                          return;
                        }
                        setQuizSubmitting(true);
                        const answers = quizQuestions.map(q => ({ questionId: q.id, selectedText: quizAnswers[q.id] ?? "" }));
                        const r = await ApiClient.post<{ score: number; correct: number; total: number; results: { question: string; correct: boolean; correctText: string; selectedText: string }[] }>(
                          `/api/network/challenges/${quizChallenge!.id}/quiz`,
                          { answers, circleId: quizChallenge!.circleId }
                        );
                        setQuizSubmitting(false);
                        if (r.ok) setQuizResult(r.data);
                        else Alert.alert("Erro", r.error?.message ?? "Erro ao enviar respostas.");
                      }}
                      disabled={quizSubmitting}
                      className="bg-primary rounded-xl py-4 items-center disabled:opacity-50 mt-2"
                      activeOpacity={0.8}
                    >
                      {quizSubmitting
                        ? <ActivityIndicator color="#fff" />
                        : <Text className="text-white font-bold text-base">Enviar respostas</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}

            {/* ── Main detail view ── */}
            {detailView === "main" && (
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

              {/* Challenges */}
              {selected.challenges.length > 0 && (
                <View>
                  <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">⚡ Desafios</Text>
                  {selected.challenges.map(ch => {
                    const now = Date.now();
                    const starts = new Date(ch.startsAt).getTime();
                    const ends = new Date(ch.endsAt).getTime();
                    const isActive = starts <= now && ends >= now;
                    const isUpcoming = starts > now;
                    const canEnter = isActive && ch.type === "quiz";
                    return (
                      <TouchableOpacity
                        key={ch.id}
                        activeOpacity={canEnter ? 0.7 : 1}
                        onPress={canEnter ? async () => {
                          setQuizChallenge({ id: ch.id, title: ch.title, circleId: selected.id });
                          setQuizAnswers({});
                          setQuizResult(null);
                          setQuizLoading(true);
                          setDetailView("quiz");
                          const r = await ApiClient.get<{ questions: { id: string; question: string; options: string[] }[]; total: number }>(`/api/network/challenges/${ch.id}/quiz`);
                          setQuizLoading(false);
                          if (r.ok) setQuizQuestions(r.data.questions);
                          else { Alert.alert("Erro", r.error?.message ?? "Erro ao carregar quiz."); setDetailView("main"); }
                        } : undefined}
                        className={`rounded-2xl p-4 mb-2 border ${
                          isActive ? "bg-emerald-500/10 border-emerald-500/20"
                          : isUpcoming ? "bg-blue-500/10 border-blue-500/20"
                          : "bg-zinc-900 border-zinc-800"
                        }`}
                      >
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className={`text-xs font-semibold uppercase tracking-wider ${
                            isActive ? "text-emerald-400" : isUpcoming ? "text-blue-400" : "text-zinc-600"
                          }`}>
                            {isActive ? "⚡ Ativo" : isUpcoming ? "🗓 Em breve" : "✓ Encerrado"}
                          </Text>
                          <Text className="text-zinc-600 text-[10px]">
                            {ch.type === "quiz" ? "📊 Quiz" : ch.type === "spoken" ? "🎙️ Voz" : "✍️ Escrito"}
                          </Text>
                        </View>
                        <Text className="text-white font-semibold text-sm">{ch.title}</Text>
                        <View className="flex-row items-center justify-between mt-1">
                          <Text className="text-zinc-500 text-xs">{ch._count.submissions} submissões</Text>
                          {canEnter && <Text className="text-emerald-400 text-xs font-semibold">Fazer quiz ›</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Members */}
              {selected.members.length > 0 && (
                <View>
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                      {selected.members.length} Membros
                    </Text>
                  </View>
                  {selected.members.slice(0, 20).map((m) => (
                    <View key={m.userId} className="flex-row items-center gap-3 mb-2.5">
                      <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center">
                        <Text className="text-white text-xs font-bold">{m.user.name.charAt(0)}</Text>
                      </View>
                      <Text className="text-white text-sm flex-1">{m.user.name}</Text>
                      {m.role !== "member" && (
                        <Text className="text-xs text-amber-400 capitalize mr-2">{m.role}</Text>
                      )}
                      {selected.myRole && ["owner", "moderator"].includes(selected.myRole) && m.role !== "owner" && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(selected.id, m.id, m.user.name)}
                          className="bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1"
                        >
                          <Text className="text-red-400 text-[10px]">🗑</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {selected.members.length > 20 && (
                    <Text className="text-zinc-600 text-xs text-center mt-1">+{selected.members.length - 20} membros</Text>
                  )}
                </View>
              )}
            </ScrollView>
            )}
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
