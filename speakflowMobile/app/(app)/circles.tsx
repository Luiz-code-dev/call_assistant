import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Modal, Alert, ActivityIndicator, Switch, Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets } from "expo-audio";
import { ApiClient } from "@infrastructure/http/ApiClient";
import { API_BASE_URL } from "@shared/constants/config";
import { TokenStorage } from "@infrastructure/storage/TokenStorage";
import { useAuthStore } from "@presentation/stores/authStore";

type ChallengeType = "written" | "spoken" | "quiz";
type StartOffset = "now" | "1h" | "tomorrow";
type Duration = "1d" | "3d" | "7d" | "14d";

interface ProficiencyResult {
  id: string; level: string; levelLabel: string; confidence: string;
  overallFeedback: string; strengths: string[]; improvements: string[];
  totalAvg: number; isEligible: boolean; submissionsUsed: number; createdAt: string;
  fluencyCredits?: number;
}

interface MySubmission {
  id: string; content: string; createdAt: string;
  evaluation: { totalScore: number; fluencyScore: number; contentScore: number; clarityScore: number; feedback: string; tip: string; } | null;
}

interface RankingEntry {
  userId: string; name: string; avatarUrl: string | null; role: string;
  totalScore: number; avgScore: number; submissionCount: number; isMe: boolean; rank: number;
}

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
  challenges: { id: string; title: string; type: string; prompt: string; scenario: string | null; targetVocab: string | null; startsAt: string; endsAt: string; _count: { submissions: number } }[];
}

const FOCUS_OPTIONS = [
  "Vendas & Negociação", "Reuniões Internacionais", "Apresentações", "Entrevistas de Emprego",
  "Customer Success", "Backend & Arquitetura", "Frontend & Design", "DevOps & Cloud",
  "Conversas do Dia a Dia", "Inglês para Viagens",
];

const BLANK_CHALLENGE = () => ({
  title: "", type: "written" as ChallengeType, prompt: "",
  scenario: "", targetVocab: "",
  startOffset: "now" as StartOffset, duration: "7d" as Duration,
  isRecurring: false, questions: [] as QuizQuestion[],
});

function buildResultMessage(data: any): string {
  const lines: string[] = [];
  if (data?.creditsEarned > 0) lines.push(`🎁 +${data.creditsEarned} créditos por participar!`);
  const ev = data?.evaluation;
  if (ev) {
    lines.push(`⭐ Nota: ${ev.totalScore}/10  (fluência ${ev.fluencyScore} · conteúdo ${ev.contentScore} · clareza ${ev.clarityScore})`);
    if (ev.feedback) lines.push(`\n${ev.feedback}`);
    if (ev.tip) lines.push(`\n💡 ${ev.tip}`);
  } else {
    lines.push("Sua resposta foi enviada. A avaliação da IA aparecerá em instantes.");
  }
  return lines.join("\n");
}

export default function CirclesScreen() {
  const qc = useQueryClient();
  const refreshUser = useAuthStore((s) => s.refreshUser);
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
  const [quizCount, setQuizCount] = useState(5);
  const [circleTab, setCircleTab] = useState<"desafios" | "ranking" | "membros">("desafios");
  const [rankingData, setRankingData] = useState<{ rankings: RankingEntry[] } | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [proficiency, setProficiency] = useState<ProficiencyResult | null | false>(false);
  const [proficiencyLoading, setProficiencyLoading] = useState(false);
  const [requestingProficiency, setRequestingProficiency] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const [challengeSubmissions, setChallengeSubmissions] = useState<Record<string, MySubmission[]>>({});
  const [submissionsLoading, setSubmissionsLoading] = useState<string | null>(null);

  // ── Challenge participation (written + spoken) ──
  const [answerChallenge, setAnswerChallenge] = useState<{ id: string; title: string; prompt: string; scenario: string | null; targetVocab: string | null; type: string; circleId: string } | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const audioRecorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY });
  const recorderState = useAudioRecorderState(audioRecorder, 200);

  function openAnswer(ch: { id: string; title: string; prompt: string; scenario: string | null; targetVocab: string | null; type: string }, circleId: string) {
    setAnswerChallenge({ ...ch, circleId });
    setAnswerText("");
  }

  function closeAnswer() {
    if (recorderState.isRecording) audioRecorder.stop().catch(() => {});
    setAnswerChallenge(null);
    setAnswerText("");
    setSubmittingAnswer(false);
  }

  async function submitWritten() {
    if (!answerChallenge || !answerText.trim()) return;
    setSubmittingAnswer(true);
    const r = await ApiClient.post<any>("/api/network/submissions", {
      challengeId: answerChallenge.id,
      circleId: answerChallenge.circleId,
      content: answerText.trim(),
    });
    setSubmittingAnswer(false);
    if (r.ok) {
      Alert.alert("Resposta enviada! ✨", buildResultMessage(r.data));
      setChallengeSubmissions((prev) => { const c = { ...prev }; delete c[answerChallenge.id]; return c; });
      closeAnswer();
      refreshUser().catch(() => {});
      if (selected) refreshDetail(selected.id);
    } else {
      Alert.alert("Erro", (r as any).error?.message ?? "Não foi possível enviar.");
    }
  }

  async function toggleRecording() {
    if (recorderState.isRecording) {
      await submitAudio();
      return;
    }
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      Alert.alert("Permissão necessária", "O SpeakFlow precisa do microfone para gravar o desafio de voz.");
      return;
    }
    await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await audioRecorder.prepareToRecordAsync({ ...RecordingPresets.HIGH_QUALITY });
    audioRecorder.record();
  }

  async function submitAudio() {
    if (!answerChallenge) return;
    setSubmittingAnswer(true);
    await audioRecorder.stop();
    await new Promise((r) => setTimeout(r, 400));
    const uri = audioRecorder.uri;
    if (!uri) {
      setSubmittingAnswer(false);
      Alert.alert("Erro", "Gravação não capturada. Tente novamente.");
      return;
    }
    try {
      const token = await TokenStorage.get();
      const formData = new FormData();
      formData.append("audio", { uri, type: "audio/m4a", name: "challenge.m4a" } as unknown as Blob);
      formData.append("challengeId", answerChallenge.id);
      formData.append("circleId", answerChallenge.circleId);
      const response = await fetch(`${API_BASE_URL}/api/network/submissions/audio`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      setSubmittingAnswer(false);
      if (response.ok) {
        const transcript = data.transcription ? `🎙️ "${data.transcription}"\n\n` : "";
        Alert.alert("Áudio enviado! ✨", transcript + buildResultMessage(data));
        setChallengeSubmissions((prev) => { const c = { ...prev }; delete c[answerChallenge.id]; return c; });
        closeAnswer();
        refreshUser().catch(() => {});
        if (selected) refreshDetail(selected.id);
      } else {
        Alert.alert("Erro", data.error ?? "Não foi possível enviar o áudio.");
      }
    } catch {
      setSubmittingAnswer(false);
      Alert.alert("Erro", "Falha no envio do áudio. Verifique sua conexão.");
    }
  }

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
      if (cf.type === "quiz" && cf.questions.length < 1) throw new Error("Adicione ao menos 1 pergunta ao quiz (use ✨ Gerar com IA).");
      for (const q of cf.questions) {
        if (!q.question.trim()) throw new Error("Todas as perguntas precisam de texto.");
        if (q.options.some((o) => !o.trim())) throw new Error("Todas as opções precisam ser preenchidas.");
      }
      const { startsAt, endsAt } = computeDates(cf.startOffset, cf.duration);
      const vocabArr = cf.targetVocab.split(",").map((w) => w.trim()).filter(Boolean).slice(0, 5);
      const r = await ApiClient.post("/api/network/challenges", {
        circleId: selected.id, title: cf.title.trim(), prompt: cf.prompt.trim() || undefined,
        scenario: cf.type !== "quiz" && cf.scenario.trim() ? cf.scenario.trim() : undefined,
        targetVocab: cf.type !== "quiz" && vocabArr.length > 0 ? vocabArr : undefined,
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
    setCircleTab("desafios");
    setRankingData(null);
    const r = await ApiClient.get<CircleDetail>(`/api/network/circles/${circle.id}`);
    setLoadingDetail(false);
    if (r.ok) setSelected(r.data);
    else setSelected({ ...circle, members: [], challenges: [] });
  }

  async function refreshDetail(circleId: string) {
    const r = await ApiClient.get<CircleDetail>(`/api/network/circles/${circleId}`);
    if (r.ok) setSelected(r.data);
  }

  async function loadRanking(circleId: string) {
    if (rankingLoading) return;
    setRankingLoading(true);
    const r = await ApiClient.get<{ rankings: RankingEntry[] }>(`/api/network/leaderboard/${circleId}`);
    setRankingLoading(false);
    if (r.ok) setRankingData(r.data);
  }

  async function loadProficiency() {
    if (proficiencyLoading) return;
    setProficiencyLoading(true);
    const r = await ApiClient.get<ProficiencyResult | null>("/api/network/proficiency");
    setProficiencyLoading(false);
    if (r.ok) setProficiency(r.data ? parseProficiency(r.data) : null);
  }

  function parseProficiency(raw: ProficiencyResult): ProficiencyResult {
    return {
      ...raw,
      strengths: typeof raw.strengths === "string" ? JSON.parse(raw.strengths) : (raw.strengths ?? []),
      improvements: typeof raw.improvements === "string" ? JSON.parse(raw.improvements) : (raw.improvements ?? []),
    };
  }

  async function requestProficiency() {
    setRequestingProficiency(true);
    const r = await ApiClient.post<ProficiencyResult>("/api/network/proficiency", {});
    setRequestingProficiency(false);
    if (r.ok) {
      setProficiency(parseProficiency(r.data));
      if (r.data.fluencyCredits) Alert.alert("🎓 Parabéns!", `Nível ${r.data.level} (${r.data.levelLabel})! +${r.data.fluencyCredits} créditos adicionados!`);
      else Alert.alert("Avaliação concluída!", `Seu nível: ${r.data.level} — ${r.data.levelLabel}`);
    } else {
      Alert.alert("Erro", (r as any).error?.message ?? "Erro ao avaliar. Conclua pelo menos 3 desafios avaliados.");
    }
  }

  async function loadChallengeSubmissions(challengeId: string) {
    if (submissionsLoading === challengeId || challengeSubmissions[challengeId]) return;
    setSubmissionsLoading(challengeId);
    const r = await ApiClient.get<MySubmission[]>(`/api/network/submissions?challengeId=${challengeId}&mine=true`);
    setSubmissionsLoading(null);
    if (r.ok) setChallengeSubmissions(prev => ({ ...prev, [challengeId]: r.data }));
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

      {/* ── Meu Progresso card ── */}
      <TouchableOpacity
        onPress={() => { setShowProgress(p => !p); if (proficiency === false) loadProficiency(); }}
        className="mx-5 mb-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3"
        activeOpacity={0.8}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-base">📈</Text>
            <Text className="text-white font-semibold text-sm">Meu Progresso</Text>
            {proficiency && typeof proficiency !== "boolean" && (
              <View className={`px-2 py-0.5 rounded-full ${
                proficiency.isEligible ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-primary/20 border border-primary/30"
              }`}>
                <Text className={`text-xs font-bold ${proficiency.isEligible ? "text-emerald-400" : "text-primary"}`}>
                  {proficiency.level}
                </Text>
              </View>
            )}
            {proficiency && typeof proficiency !== "boolean" && proficiency.isEligible && (
              <Text className="text-xs">🎓</Text>
            )}
          </View>
          <Text className="text-zinc-500 text-xs">{showProgress ? "▲" : "▼"}</Text>
        </View>

        {showProgress && (
          <View className="mt-3">
            {proficiencyLoading && <ActivityIndicator color="#7c3aed" size="small" />}
            {!proficiencyLoading && proficiency === null && (
              <View>
                <Text className="text-zinc-400 text-xs mb-3">Complete pelo menos 3 desafios avaliados para solicitar avaliação de proficiência CEFR.</Text>
                <TouchableOpacity
                  onPress={requestProficiency} disabled={requestingProficiency}
                  className="bg-primary/10 border border-primary/30 rounded-xl py-2.5 items-center"
                >
                  {requestingProficiency
                    ? <ActivityIndicator size="small" color="#7c3aed" />
                    : <Text className="text-primary text-xs font-semibold">✨ Avaliar meu inglês</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
            {!proficiencyLoading && proficiency && typeof proficiency !== "boolean" && (
              <View className="gap-3">
                <View className="flex-row items-center gap-3">
                  <View className={`px-3 py-1.5 rounded-xl border ${
                    proficiency.isEligible ? "bg-emerald-500/10 border-emerald-500/30" : "bg-primary/10 border-primary/30"
                  }`}>
                    <Text className={`font-bold text-lg ${proficiency.isEligible ? "text-emerald-400" : "text-primary"}`}>{proficiency.level}</Text>
                    <Text className="text-zinc-400 text-[10px]">{proficiency.levelLabel}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-xs font-semibold">Score médio: {proficiency.totalAvg.toFixed(1)}/10</Text>
                    <Text className="text-zinc-500 text-xs">{proficiency.submissionsUsed} submissões analisadas</Text>
                    <Text className="text-zinc-600 text-[10px]">{new Date(proficiency.createdAt).toLocaleDateString("pt-BR")}</Text>
                  </View>
                  {proficiency.isEligible && (
                    <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 items-center">
                      <Text className="text-lg">🎓</Text>
                      <Text className="text-emerald-400 text-[10px] font-semibold">Certificado</Text>
                    </View>
                  )}
                </View>
                <Text className="text-zinc-400 text-xs leading-relaxed">{proficiency.overallFeedback}</Text>
                {proficiency.strengths?.length > 0 && (
                  <View className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                    <Text className="text-emerald-400 text-xs font-semibold mb-1">✅ Pontos fortes</Text>
                    {proficiency.strengths.slice(0, 2).map((s, i) => <Text key={i} className="text-zinc-300 text-xs">• {s}</Text>)}
                  </View>
                )}
                {proficiency.improvements?.length > 0 && (
                  <View className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <Text className="text-amber-400 text-xs font-semibold mb-1">🎯 Melhorar</Text>
                    {proficiency.improvements.slice(0, 2).map((s, i) => <Text key={i} className="text-zinc-300 text-xs">• {s}</Text>)}
                  </View>
                )}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={requestProficiency} disabled={requestingProficiency}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl py-2 items-center"
                  >
                    {requestingProficiency
                      ? <ActivityIndicator size="small" color="#7c3aed" />
                      : <Text className="text-zinc-400 text-xs">↻ Nova avaliação</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Share.share({ message: `Atingi o nível ${proficiency.level} (${proficiency.levelLabel}) no SpeakFlow! 🎓\nScore médio: ${proficiency.totalAvg.toFixed(1)}/10\n${proficiency.isEligible ? "✅ Certificação CEFR desbloqueada" : "Praticando inglês profissional com IA"} 🚀` })}
                    className="flex-1 bg-primary/10 border border-primary/30 rounded-xl py-2 items-center"
                  >
                    <Text className="text-primary text-xs">🔗 Compartilhar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

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
                  {cf.type === "quiz" && (
                    <Text className="text-zinc-500 text-xs mt-1.5">💡 A IA vai gerar as perguntas do quiz com base neste título</Text>
                  )}
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
                  <>
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

                    <View>
                      <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Cenário / situação real (opcional)</Text>
                      <TextInput
                        value={cf.scenario} onChangeText={(v) => setCf(f => ({ ...f, scenario: v }))}
                        placeholder="Ex: Você recebeu um e-mail de um cliente irritado — responda acalmando ele." placeholderTextColor="#52525b"
                        multiline numberOfLines={2} textAlignVertical="top" maxLength={1000}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm"
                        style={{ minHeight: 60 }}
                      />
                      <Text className="text-zinc-600 text-xs mt-1">💡 Dar um contexto real aumenta muito o engajamento.</Text>
                    </View>

                    <View>
                      <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Vocabulário-alvo (opcional)</Text>
                      <TextInput
                        value={cf.targetVocab} onChangeText={(v) => setCf(f => ({ ...f, targetVocab: v }))}
                        placeholder="Ex: leverage, stakeholder, deadline" placeholderTextColor="#52525b"
                        maxLength={200}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm"
                      />
                      <Text className="text-zinc-600 text-xs mt-1">Separe por vírgula (máx. 5). A IA verifica se foram usadas.</Text>
                    </View>
                  </>
                )}

                {cf.type === "quiz" && (
                  <View>
                    <View className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-3">
                      <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Quantidade de perguntas</Text>
                      <View className="flex-row gap-2">
                        {[3, 5, 8, 10, 15].map(n => (
                          <TouchableOpacity key={n} onPress={() => setQuizCount(n)}
                            className={`flex-1 py-2 rounded-lg border items-center ${quizCount === n ? "bg-primary/20 border-primary/40" : "bg-zinc-800 border-zinc-700"}`}>
                            <Text className={`text-xs font-bold ${quizCount === n ? "text-primary" : "text-zinc-400"}`}>{n}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-zinc-400 text-xs uppercase tracking-wider">Perguntas ({cf.questions.length}/15)</Text>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={async () => {
                            if (!cf.title.trim()) { Alert.alert("Atenção", "Preencha o título antes de gerar."); return; }
                            setGeneratingQuiz(true);
                            const r = await ApiClient.post<{ questions: QuizQuestion[] }>(
                              "/api/network/challenges/generate-quiz",
                              { title: cf.title, focus: selected?.focus ?? "Business English", level: selected?.level ?? "Todos", count: quizCount }
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
                            : <Text className="text-violet-400 text-xs font-semibold">✨ Gerar {quizCount} com IA</Text>
                          }
                        </TouchableOpacity>
                        {cf.questions.length < 15 && (
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
                          multiline numberOfLines={3} textAlignVertical="top"
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs mb-2"
                          style={{ minHeight: 60 }}
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
                        <Text className="text-zinc-600 text-[10px] mt-1">👆 Toque no círculo para definir a resposta correta</Text>
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
                      <TouchableOpacity
                        onPress={() => Share.share({ message: `Fiz um quiz "${quizChallenge?.title}" no SpeakFlow e acertei ${quizResult.correct}/${quizResult.total} questões! 🎯\nPraticando inglês profissional com IA 🚀` })}
                        className="mt-3 flex-row items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
                      >
                        <Text className="text-zinc-400 text-xs">🔗 Compartilhar resultado</Text>
                      </TouchableOpacity>
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
                    <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-3">
                      <Text className="text-emerald-400 text-xs font-semibold mb-2">📊 {quizChallenge?.title}</Text>
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-zinc-400 text-xs">{Object.keys(quizAnswers).length} de {quizQuestions.length} respondidas</Text>
                        <Text className="text-zinc-400 text-xs">{Math.round((Object.keys(quizAnswers).length / quizQuestions.length) * 100)}%</Text>
                      </View>
                      <View className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <View className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.round((Object.keys(quizAnswers).length / quizQuestions.length) * 100)}%` }} />
                      </View>
                    </View>
                    {quizQuestions.map((q, qi) => (
                      <View key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-3">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-zinc-500 text-xs font-semibold">Pergunta {qi + 1} / {quizQuestions.length}</Text>
                          {quizAnswers[q.id] && <Text className="text-emerald-400 text-xs">✓ respondida</Text>}
                        </View>
                        <Text className="text-white text-sm font-semibold leading-relaxed mb-3">{q.question}</Text>
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
            <View className="flex-1">
              {/* Description */}
              {selected.description && (
                <Text className="text-zinc-400 text-sm leading-relaxed px-5 pt-3">{selected.description}</Text>
              )}

              {/* Stats strip */}
              <View className="flex-row gap-3 px-5 pt-3 pb-3">
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

              {/* Tab bar */}
              <View className="flex-row border-b border-zinc-800 px-5">
                {([
                  { key: "desafios", label: "⚡ Desafios" },
                  { key: "ranking",  label: "🏆 Ranking"  },
                  { key: "membros",  label: "👥 Membros"  },
                ] as const).map(tab => (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => {
                      setCircleTab(tab.key);
                      if (tab.key === "ranking" && !rankingData && !rankingLoading) loadRanking(selected.id);
                    }}
                    className={`mr-6 pb-2.5 border-b-2 ${circleTab === tab.key ? "border-primary" : "border-transparent"}`}
                  >
                    <Text className={`text-xs font-semibold ${circleTab === tab.key ? "text-primary" : "text-zinc-500"}`}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40, gap: 12 }}>

                {/* ── Tab: Desafios ── */}
                {circleTab === "desafios" && (
                  <>
                    {selected.challenges.length === 0 && (
                      <Text className="text-zinc-500 text-sm text-center py-10">Nenhum desafio ainda</Text>
                    )}
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
                          className={`rounded-2xl p-4 border ${
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
                          {ch.prompt ? (
                            <Text className="text-zinc-400 text-xs mt-1 leading-relaxed" numberOfLines={2}>{ch.prompt}</Text>
                          ) : null}
                          <View className="flex-row items-center justify-between mt-2">
                            <Text className="text-zinc-500 text-xs">{ch._count.submissions} submissões</Text>
                            {canEnter && <Text className="text-emerald-400 text-xs font-semibold">Fazer quiz ›</Text>}
                            {ch.type !== "quiz" && (
                              <View className="flex-row items-center gap-4">
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation?.();
                                    if (expandedChallenge === ch.id) { setExpandedChallenge(null); }
                                    else { setExpandedChallenge(ch.id); loadChallengeSubmissions(ch.id); }
                                  }}
                                >
                                  <Text className="text-zinc-500 text-xs">{expandedChallenge === ch.id ? "▲ ocultar" : "📋 minhas respostas"}</Text>
                                </TouchableOpacity>
                                {isActive && (
                                  <TouchableOpacity
                                    onPress={(e) => { e.stopPropagation?.(); openAnswer(ch, selected.id); }}
                                    className="bg-primary/20 border border-primary/40 rounded-lg px-3 py-1.5"
                                  >
                                    <Text className="text-primary text-xs font-bold">
                                      {ch.type === "spoken" ? "🎙️ Gravar ›" : "✍️ Responder ›"}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            )}
                          </View>
                          {/* Submission history */}
                          {expandedChallenge === ch.id && (
                            <View className="mt-3 border-t border-zinc-700 pt-3">
                              {submissionsLoading === ch.id && <ActivityIndicator size="small" color="#7c3aed" />}
                              {!submissionsLoading && (challengeSubmissions[ch.id] ?? []).length === 0 && (
                                <Text className="text-zinc-600 text-xs">Nenhuma resposta enviada ainda.</Text>
                              )}
                              {(challengeSubmissions[ch.id] ?? []).map((sub) => (
                                <View key={sub.id} className="mb-2">
                                  <View className="flex-row items-center justify-between mb-1">
                                    <Text className="text-zinc-500 text-[10px]">{new Date(sub.createdAt).toLocaleDateString("pt-BR")}</Text>
                                    {sub.evaluation && (
                                      <View className="flex-row gap-2">
                                        <Text className="text-primary text-xs font-bold">{sub.evaluation.totalScore}/10</Text>
                                        <Text className="text-zinc-600 text-[10px]">F:{sub.evaluation.fluencyScore} C:{sub.evaluation.contentScore}</Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text className="text-zinc-400 text-xs leading-relaxed" numberOfLines={3}>{sub.content}</Text>
                                  {sub.evaluation?.feedback && (
                                    <Text className="text-zinc-600 text-[10px] mt-1 leading-relaxed">{sub.evaluation.feedback}</Text>
                                  )}
                                </View>
                              ))}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}

                {/* ── Tab: Ranking ── */}
                {circleTab === "ranking" && (
                  <>
                    {rankingLoading && (
                      <View className="items-center py-12">
                        <ActivityIndicator color="#7c3aed" size="large" />
                        <Text className="text-zinc-500 text-sm mt-3">Carregando ranking...</Text>
                      </View>
                    )}
                    {!rankingLoading && rankingData && (
                      <>
                        {/* My position highlight */}
                        {(() => {
                          const me = rankingData.rankings.find(r => r.isMe);
                          if (!me) return null;
                          return (
                            <View className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
                              <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Sua posição</Text>
                              <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center gap-3">
                                  <Text className="text-3xl font-bold text-white">#{me.rank}</Text>
                                  <View>
                                    <Text className="text-white font-semibold">{me.name}</Text>
                                    <Text className="text-zinc-500 text-xs">{me.submissionCount} desafio{me.submissionCount !== 1 ? "s" : ""} feito{me.submissionCount !== 1 ? "s" : ""}</Text>
                                  </View>
                                </View>
                                <View className="items-end">
                                  <Text className="text-primary font-bold text-xl">{me.totalScore} pts</Text>
                                  <Text className="text-zinc-500 text-xs">média {me.avgScore}/10</Text>
                                </View>
                              </View>
                            </View>
                          );
                        })()}

                        {/* Ranking list */}
                        {rankingData.rankings.length === 0 && (
                          <Text className="text-zinc-500 text-sm text-center py-8">Nenhuma submissão ainda. Seja o primeiro! 🚀</Text>
                        )}
                        {rankingData.rankings.map((entry) => (
                          <View key={entry.userId} className={`flex-row items-center gap-3 rounded-xl p-3 border ${
                            entry.isMe ? "bg-primary/10 border-primary/30" : "bg-zinc-900 border-zinc-800"
                          }`}>
                            <Text className="text-lg w-8 text-center font-bold">
                              {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : String(entry.rank)}
                            </Text>
                            <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center">
                              <Text className="text-white text-xs font-bold">{entry.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View className="flex-1">
                              <Text className={`text-sm font-semibold ${entry.isMe ? "text-primary" : "text-white"}`}>
                                {entry.name}{entry.isMe ? " (você)" : ""}
                              </Text>
                              <Text className="text-zinc-600 text-xs">{entry.submissionCount} desafio{entry.submissionCount !== 1 ? "s" : ""}</Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-white font-bold text-sm">{entry.totalScore} pts</Text>
                              <Text className="text-zinc-600 text-[10px]">avg {entry.avgScore}/10</Text>
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                    {!rankingLoading && !rankingData && (
                      <TouchableOpacity onPress={() => loadRanking(selected.id)} className="items-center py-10">
                        <Text className="text-zinc-500 text-sm">Toque para tentar novamente</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* ── Tab: Membros ── */}
                {circleTab === "membros" && (
                  <>
                    <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">
                      {selected.members.length} Membros
                    </Text>
                    {selected.members.slice(0, 30).map((m) => (
                      <View key={m.userId} className="flex-row items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
                        <View className="w-9 h-9 rounded-full bg-primary/20 items-center justify-center">
                          <Text className="text-white text-sm font-bold">{m.user.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text className="text-white text-sm flex-1">{m.user.name}</Text>
                        {m.role !== "member" && (
                          <Text className="text-xs text-amber-400 font-semibold capitalize px-2 py-0.5 bg-amber-500/10 rounded-md">{m.role}</Text>
                        )}
                        {selected.myRole && ["owner", "moderator"].includes(selected.myRole) && m.role !== "owner" && (
                          <TouchableOpacity
                            onPress={() => handleRemoveMember(selected.id, m.id, m.user.name)}
                            className="bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1 ml-1"
                          >
                            <Text className="text-red-400 text-[10px]">🗑</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    {selected.members.length > 30 && (
                      <Text className="text-zinc-600 text-xs text-center mt-1">+{selected.members.length - 30} membros</Text>
                    )}
                  </>
                )}

              </ScrollView>
            </View>
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

      {/* ── Modal: Responder Desafio (Escrito / Voz) ── */}
      <Modal visible={!!answerChallenge} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeAnswer}>
        {answerChallenge && (
          <SafeAreaView className="flex-1 bg-background">
            <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
              <Text className="text-white font-bold text-base flex-1" numberOfLines={1}>
                {answerChallenge.type === "spoken" ? "🎙️ Desafio de Voz" : "✍️ Desafio Escrito"}
              </Text>
              <TouchableOpacity onPress={closeAnswer} disabled={submittingAnswer} className="border border-zinc-700 rounded-xl px-3 py-1.5">
                <Text className="text-zinc-400 text-xs font-semibold">✕ Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
              <Text className="text-white font-semibold text-lg mb-1">{answerChallenge.title}</Text>
              {answerChallenge.prompt ? (
                <View className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-3">
                  <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Instrução</Text>
                  <Text className="text-zinc-200 text-sm leading-relaxed">{answerChallenge.prompt}</Text>
                </View>
              ) : null}

              {answerChallenge.scenario ? (
                <View className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-3">
                  <Text className="text-blue-300 text-xs uppercase tracking-wider mb-1">🎬 Cenário</Text>
                  <Text className="text-zinc-200 text-sm leading-relaxed">{answerChallenge.scenario}</Text>
                </View>
              ) : null}

              {(() => {
                let vocab: string[] = [];
                try { if (answerChallenge.targetVocab) vocab = JSON.parse(answerChallenge.targetVocab); } catch { vocab = []; }
                if (vocab.length === 0) return null;
                return (
                  <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5">
                    <Text className="text-amber-300 text-xs uppercase tracking-wider mb-2">🎯 Use estas palavras</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {vocab.map((w) => (
                        <View key={w} className="bg-amber-500/20 rounded-lg px-2.5 py-1">
                          <Text className="text-amber-200 text-xs font-semibold">{w}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}

              {answerChallenge.type === "written" ? (
                <>
                  <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Sua resposta (em inglês)</Text>
                  <TextInput
                    value={answerText}
                    onChangeText={setAnswerText}
                    placeholder="Escreva sua resposta aqui..."
                    placeholderTextColor="#52525b"
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    maxLength={3000}
                    editable={!submittingAnswer}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm"
                    style={{ minHeight: 180 }}
                  />
                  <Text className="text-zinc-600 text-xs mt-1 text-right">{answerText.length}/3000</Text>
                  <TouchableOpacity
                    onPress={submitWritten}
                    disabled={submittingAnswer || !answerText.trim()}
                    className="bg-primary rounded-xl py-4 items-center mt-4 disabled:opacity-50"
                    activeOpacity={0.8}
                  >
                    {submittingAnswer
                      ? <ActivityIndicator color="#fff" />
                      : <Text className="text-white font-bold text-base">Enviar resposta ✨</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <View className="items-center pt-4">
                  <View className={`w-32 h-32 rounded-full items-center justify-center mb-6 ${recorderState.isRecording ? "bg-red-500/20 border-2 border-red-500" : "bg-primary/20 border-2 border-primary/40"}`}>
                    <Text style={{ fontSize: 48 }}>{recorderState.isRecording ? "⏺️" : "🎙️"}</Text>
                  </View>
                  <Text className="text-zinc-400 text-sm mb-2 text-center">
                    {submittingAnswer
                      ? "Enviando e transcrevendo..."
                      : recorderState.isRecording
                        ? "Gravando... fale em inglês e toque para enviar."
                        : "Toque no botão para gravar sua resposta em inglês."}
                  </Text>
                  {recorderState.isRecording && (
                    <Text className="text-red-400 text-xs mb-4">
                      {Math.floor((recorderState.durationMillis ?? 0) / 1000)}s
                    </Text>
                  )}
                  <TouchableOpacity
                    onPress={toggleRecording}
                    disabled={submittingAnswer}
                    className={`rounded-xl py-4 px-8 items-center mt-4 disabled:opacity-50 ${recorderState.isRecording ? "bg-red-500" : "bg-primary"}`}
                    activeOpacity={0.8}
                  >
                    {submittingAnswer
                      ? <ActivityIndicator color="#fff" />
                      : <Text className="text-white font-bold text-base">
                          {recorderState.isRecording ? "⏹ Parar e enviar" : "⏺ Começar a gravar"}
                        </Text>}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {loadingDetail && (
        <View className="absolute inset-0 bg-black/40 items-center justify-center">
          <ActivityIndicator color="#7c3aed" size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}
