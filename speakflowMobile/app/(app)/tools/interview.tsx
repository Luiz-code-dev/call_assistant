import { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ApiClient } from "@infrastructure/http/ApiClient";
import { useAuthStore } from "@presentation/stores/authStore";

const LEVELS = ["Junior", "Pleno", "Senior", "Lead"] as const;
type Level = typeof LEVELS[number];
type Phase = "setup" | "chatting" | "finished";

interface AITurn {
  question: string;
  feedback: string;
  suggestion: string;
  score: number;
  tip: string;
  isFinished: boolean;
  summary: string;
  creditsUsed: number;
}

interface Message {
  role: "assistant" | "user";
  content: string;
  feedback?: string;
  suggestion?: string;
  score?: number;
  tip?: string;
}

export default function InterviewScreen() {
  const { user, refreshUser } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);

  const [phase, setPhase] = useState<Phase>("setup");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState<Level>("Pleno");
  const [messages, setMessages] = useState<Message[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [totalCredits, setTotalCredits] = useState(0);

  const setup = useRef({ role: "", level: "" });

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  async function startInterview() {
    if (!role.trim() || loading) return;
    setup.current = { role: role.trim(), level };
    setError(null);
    setMessages([]);
    setLoading(true);

    const res = await ApiClient.post<AITurn>("/api/tools/interview", {
      isStart: true,
      setup: { role: role.trim(), level },
    });

    setLoading(false);
    if (!res.ok) { setError(res.error.message); return; }

    const turn = res.data;
    setMessages([{ role: "assistant", content: turn.question }]);
    setPhase("chatting");
    scrollToBottom();
  }

  async function sendAnswer() {
    if (!answer.trim() || loading) return;
    const userMsg = answer.trim();
    setAnswer("");
    setError(null);

    const updatedMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(updatedMessages);
    setLoading(true);
    scrollToBottom();

    const apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));

    const res = await ApiClient.post<AITurn>("/api/tools/interview", {
      messages: apiMessages,
      message: userMsg,
      setup: { role: setup.current.role, level: setup.current.level },
    });

    setLoading(false);
    if (!res.ok) { setError(res.error.message); return; }

    const turn = res.data;
    setTotalCredits((c) => c + (turn.creditsUsed ?? 0));
    refreshUser();

    const assistantMsg: Message = {
      role: "assistant",
      content: turn.question,
      feedback: turn.feedback || undefined,
      suggestion: turn.suggestion || undefined,
      score: turn.score || undefined,
      tip: turn.tip || undefined,
    };
    setMessages([...updatedMessages, assistantMsg]);

    if (turn.isFinished) {
      setSummary(turn.summary);
      setPhase("finished");
    }
    scrollToBottom();
  }

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-3 border-b border-zinc-800">
          <TouchableOpacity onPress={() => { if (phase !== "setup") { setPhase("setup"); setMessages([]); } else router.back(); }} className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center">
            <Text className="text-white">←</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white font-bold text-base">🎯 Simulador de Entrevista</Text>
            <Text className="text-zinc-500 text-xs">
              {phase === "setup" ? "⚡ 2 créditos por resposta" : `${setup.current.role} · ${setup.current.level} · ${user?.credits ?? 0} créditos`}
            </Text>
          </View>
          {phase !== "setup" && (
            <TouchableOpacity onPress={() => { setPhase("setup"); setMessages([]); setSummary(""); setTotalCredits(0); }} className="bg-zinc-800 rounded-xl px-3 py-1.5">
              <Text className="text-zinc-400 text-xs">Reiniciar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── SETUP ── */}
        {phase === "setup" && (
          <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
            <View className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 mb-5">
              <Text className="text-violet-300 font-semibold text-sm mb-1">Como funciona</Text>
              <Text className="text-zinc-400 text-xs leading-relaxed">
                A IA conduz uma entrevista real em inglês. Ela faz perguntas, você responde em inglês, e recebe feedback personalizado a cada resposta. Após 8 respostas você recebe uma avaliação completa.
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Cargo / função</Text>
              <TextInput
                value={role} onChangeText={setRole}
                placeholder="Ex: Software Engineer, Product Manager..."
                placeholderTextColor="#52525b" returnKeyType="done"
                className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3.5 text-white text-sm"
              />
            </View>

            <View className="mb-6">
              <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Nível</Text>
              <View className="flex-row gap-2">
                {LEVELS.map((l) => (
                  <TouchableOpacity key={l} onPress={() => setLevel(l)} activeOpacity={0.7}
                    className={`flex-1 rounded-xl py-2.5 items-center border ${level === l ? "bg-primary border-primary" : "bg-zinc-800/50 border-zinc-700"}`}
                  >
                    <Text className={`text-xs font-semibold ${level === l ? "text-white" : "text-zinc-500"}`}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {error && <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4"><Text className="text-red-400 text-sm">{error}</Text></View>}

            <TouchableOpacity onPress={startInterview} disabled={loading || !role.trim()} className="bg-primary rounded-xl py-4 items-center disabled:opacity-50" activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Iniciar entrevista ✨</Text>}
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ── CHAT ── */}
        {(phase === "chatting" || phase === "finished") && (
          <>
            <ScrollView ref={scrollRef} className="flex-1 px-4 pt-3" contentContainerStyle={{ paddingBottom: 16, gap: 12 }}>
              {messages.map((m, i) => (
                <View key={i} className={`${m.role === "user" ? "items-end" : "items-start"}`}>
                  {/* bubble */}
                  <View className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary rounded-tr-sm" : "bg-zinc-800 border border-zinc-700 rounded-tl-sm"}`}>
                    <Text className="text-white text-sm leading-relaxed">{m.content}</Text>
                  </View>
                  {/* feedback card (only for assistant messages after first) */}
                  {m.role === "assistant" && m.feedback && (
                    <View className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 mt-2">
                      {m.score !== undefined && m.score > 0 && (
                        <View className="flex-row items-center gap-2 mb-2">
                          <View className={`w-8 h-8 rounded-full items-center justify-center ${m.score >= 7 ? "bg-green-500/20" : m.score >= 4 ? "bg-yellow-500/20" : "bg-red-500/20"}`}>
                            <Text className={`text-xs font-bold ${m.score >= 7 ? "text-green-400" : m.score >= 4 ? "text-yellow-400" : "text-red-400"}`}>{m.score}</Text>
                          </View>
                          <Text className="text-zinc-400 text-xs">Score da resposta</Text>
                        </View>
                      )}
                      {m.feedback && <Text className="text-zinc-300 text-xs leading-relaxed mb-2">{m.feedback}</Text>}
                      {m.suggestion && (
                        <View className="bg-zinc-800 rounded-lg p-2.5">
                          <Text className="text-zinc-500 text-[10px] mb-1 uppercase tracking-wider">Modelo de resposta</Text>
                          <Text className="text-zinc-200 text-xs italic leading-relaxed">"{m.suggestion}"</Text>
                        </View>
                      )}
                      {m.tip && <Text className="text-amber-400 text-xs mt-2">💡 {m.tip}</Text>}
                    </View>
                  )}
                </View>
              ))}

              {loading && (
                <View className="items-start">
                  <View className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-tl-sm px-4 py-3">
                    <ActivityIndicator size="small" color="#7c3aed" />
                  </View>
                </View>
              )}

              {/* Summary */}
              {phase === "finished" && summary && (
                <View className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 mt-2">
                  <Text className="text-violet-400 font-bold text-sm mb-2">🏆 Avaliação Final</Text>
                  <Text className="text-zinc-200 text-sm leading-relaxed">{summary}</Text>
                  <Text className="text-zinc-600 text-xs mt-3">⚡ {totalCredits} créditos usados nessa sessão</Text>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            {phase === "chatting" && (
              <View className="px-4 pb-4 pt-2 border-t border-zinc-800 flex-row items-end gap-2">
                <TextInput
                  value={answer} onChangeText={setAnswer}
                  placeholder="Responda em inglês..." placeholderTextColor="#52525b"
                  multiline maxLength={3000}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white text-sm"
                  style={{ maxHeight: 100, textAlignVertical: "top" }}
                  editable={!loading}
                />
                <TouchableOpacity onPress={sendAnswer} disabled={loading || !answer.trim()} className="bg-primary rounded-2xl w-11 h-11 items-center justify-center disabled:opacity-50">
                  <Text className="text-white text-base">▶</Text>
                </TouchableOpacity>
              </View>
            )}

            {error && (
              <View className="mx-4 mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                <Text className="text-red-400 text-xs">{error}</Text>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
