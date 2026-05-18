import { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "@infrastructure/http/ApiClient";
import { useAuthStore } from "@presentation/stores/authStore";

type AssistAction = "translate" | "grammar" | "native" | "cefr";
interface AssistResult {
  action: AssistAction;
  result?: string;
  corrected?: string;
  hasErrors?: boolean;
  errors?: { original: string; fix: string; tip: string }[];
  level?: string;
  label?: string;
  tip?: string;
}

const ASSIST_BUTTONS: { action: AssistAction; emoji: string; label: string }[] = [
  { action: "translate", emoji: "🌐", label: "Traduzir" },
  { action: "grammar", emoji: "✅", label: "Gramática" },
  { action: "native", emoji: "✨", label: "Nativo" },
  { action: "cefr", emoji: "📊", label: "Nível CEFR" },
];

interface Friend {
  id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
}

interface Friendship {
  id: string;
  status: string;
  friend: Friend;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

type Phase = "inbox" | "conversation";

function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View
      className="rounded-full bg-primary/20 border border-primary/30 items-center justify-center"
      style={{ width: size * 4, height: size * 4 }}
    >
      <Text className="text-white font-bold" style={{ fontSize: size * 1.4 }}>{initials}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  const [phase, setPhase] = useState<Phase>("inbox");
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // AI assist
  const [assistTarget, setAssistTarget] = useState<{ id: string; content: string } | null>(null);
  const [assistResult, setAssistResult] = useState<AssistResult | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);

  async function runAssist(action: AssistAction) {
    if (!assistTarget || assistLoading) return;
    setAssistLoading(true);
    setAssistResult(null);
    const r = await ApiClient.post<AssistResult>("/api/messages/assist", {
      text: assistTarget.content,
      action,
      targetLang: "pt",
    });
    setAssistLoading(false);
    if (r.ok) setAssistResult({ ...r.data, action });
  }

  // ── Inbox: accepted friends ──
  const { data: friendships, isLoading: loadingFriends, refetch: refetchFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const r = await ApiClient.get<Friendship[]>("/api/friends");
      if (!r.ok) return [];
      return r.data.filter((f) => f.status === "accepted");
    },
    enabled: phase === "inbox",
  });

  // ── Unread counts ──
  const { data: unreadMap } = useQuery({
    queryKey: ["messages-unread-per-sender"],
    queryFn: async () => {
      const r = await ApiClient.get<Record<string, number>>("/api/messages/unread-per-sender");
      if (!r.ok) return {};
      return r.data;
    },
    refetchInterval: 15000,
  });

  // ── Conversation messages ──
  const { data: messages, isLoading: loadingMsgs, refetch: refetchMsgs } = useQuery({
    queryKey: ["messages", activeFriend?.id],
    queryFn: async () => {
      if (!activeFriend) return [];
      const r = await ApiClient.get<Message[]>(`/api/messages/${activeFriend.id}`);
      if (!r.ok) return [];
      return r.data;
    },
    enabled: phase === "conversation" && !!activeFriend,
    refetchInterval: 5000,
  });

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    if (phase === "conversation") scrollToBottom();
  }, [messages, phase, scrollToBottom]);

  function openConversation(friend: Friend) {
    setActiveFriend(friend);
    setPhase("conversation");
    setSendError(null);
    setMessageText("");
    qc.invalidateQueries({ queryKey: ["messages", friend.id] });
  }

  function backToInbox() {
    setPhase("inbox");
    setActiveFriend(null);
    qc.invalidateQueries({ queryKey: ["messages-unread-per-sender"] });
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  async function sendMessage() {
    if (!messageText.trim() || !activeFriend || sending) return;
    const content = messageText.trim();
    setMessageText("");
    setSendError(null);
    setSending(true);

    const r = await ApiClient.post<Message>(`/api/messages/${activeFriend.id}`, { content });
    setSending(false);

    if (!r.ok) {
      setSendError((r as any).error?.message ?? "Erro ao enviar.");
      setMessageText(content);
      return;
    }

    qc.invalidateQueries({ queryKey: ["messages", activeFriend.id] });
    scrollToBottom();
  }

  const totalUnread = unreadMap ? Object.values(unreadMap).reduce((a, b) => a + b, 0) : 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* ── Header ── */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3 border-b border-zinc-800">
        {phase === "conversation" && (
          <TouchableOpacity onPress={backToInbox} className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center">
            <Text className="text-white">←</Text>
          </TouchableOpacity>
        )}
        <View className="flex-1">
          {phase === "inbox" ? (
            <>
              <Text className="text-2xl font-bold text-white">💬 Mensagens</Text>
              {totalUnread > 0 && (
                <Text className="text-violet-400 text-xs">{totalUnread} mensagem{totalUnread > 1 ? "ns" : ""} não lida{totalUnread > 1 ? "s" : ""}</Text>
              )}
            </>
          ) : (
            <>
              <Text className="text-white font-bold text-base">{activeFriend?.name}</Text>
              <Text className="text-zinc-500 text-xs">@{activeFriend?.username ?? "..."}</Text>
            </>
          )}
        </View>
      </View>

      {/* ── INBOX ── */}
      {phase === "inbox" && (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={loadingFriends} onRefresh={refetchFriends} tintColor="#7c3aed" />}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {loadingFriends && (
            <View className="py-12 items-center"><ActivityIndicator color="#7c3aed" /></View>
          )}

          {!loadingFriends && (!friendships || friendships.length === 0) && (
            <View className="py-20 items-center px-6">
              <Text style={{ fontSize: 48 }} className="mb-4">💬</Text>
              <Text className="text-white font-semibold text-base text-center mb-2">Nenhuma conversa ainda</Text>
              <Text className="text-zinc-500 text-sm text-center">
                Conecte-se com outros usuários nos Circles para trocar mensagens.
              </Text>
            </View>
          )}

          {(friendships ?? []).map((f) => {
            const unread = unreadMap?.[f.friend.id] ?? 0;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => openConversation(f.friend)}
                className="flex-row items-center gap-4 px-5 py-4 border-b border-zinc-800/50"
                activeOpacity={0.7}
              >
                <Avatar name={f.friend.name} size={11} />
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm">{f.friend.name}</Text>
                  {f.friend.username && (
                    <Text className="text-zinc-500 text-xs">@{f.friend.username}</Text>
                  )}
                </View>
                {unread > 0 && (
                  <View className="bg-primary rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
                    <Text className="text-white text-[10px] font-bold">{unread}</Text>
                  </View>
                )}
                <Text className="text-zinc-600">›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── CONVERSATION ── */}
      {phase === "conversation" && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-4 pt-3"
            contentContainerStyle={{ paddingBottom: 12, gap: 8 }}
            refreshControl={<RefreshControl refreshing={loadingMsgs} onRefresh={refetchMsgs} tintColor="#7c3aed" />}
          >
            {loadingMsgs && (
              <View className="py-10 items-center"><ActivityIndicator color="#7c3aed" /></View>
            )}

            {!loadingMsgs && messages?.length === 0 && (
              <View className="py-16 items-center">
                <Text className="text-zinc-600 text-sm text-center">
                  Nenhuma mensagem ainda.{"\n"}Diga olá em inglês! 👋
                </Text>
              </View>
            )}

            {(messages ?? []).map((m) => {
              const isMe = m.senderId === user?.id;
              return (
                <View key={m.id} className={`${isMe ? "items-end" : "items-start"}`}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onLongPress={() => { setAssistTarget({ id: m.id, content: m.content }); setAssistResult(null); }}
                    delayLongPress={400}
                  >
                    <View
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? "bg-primary rounded-tr-sm"
                          : "bg-zinc-800 border border-zinc-700 rounded-tl-sm"
                      } ${assistTarget?.id === m.id ? "opacity-80 border-2 border-primary" : ""}`}
                    >
                      <Text className="text-white text-sm leading-relaxed">{m.content}</Text>
                      <Text className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-zinc-600"} text-right`}>
                        {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {isMe && (m.isRead ? " ✓✓" : " ✓")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}

            {sending && (
              <View className="items-end">
                <View className="bg-primary/50 rounded-2xl rounded-tr-sm px-4 py-2.5">
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              </View>
            )}
          </ScrollView>

          {sendError && (
            <View className="mx-4 mb-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <Text className="text-red-400 text-xs">{sendError}</Text>
            </View>
          )}

          <View className="px-4 pb-4 pt-2 border-t border-zinc-800 flex-row items-end gap-2">
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Escreva sua mensagem..."
              placeholderTextColor="#52525b"
              multiline
              maxLength={2000}
              editable={!sending}
              onSubmitEditing={sendMessage}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white text-sm"
              style={{ maxHeight: 100, textAlignVertical: "top" }}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={sending || !messageText.trim()}
              className="bg-primary rounded-2xl w-11 h-11 items-center justify-center disabled:opacity-50"
            >
              <Text className="text-white text-base">▶</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── AI Assist Modal ── */}
      <Modal
        visible={!!assistTarget}
        transparent
        animationType="slide"
        onRequestClose={() => { setAssistTarget(null); setAssistResult(null); }}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => { setAssistTarget(null); setAssistResult(null); }}
        />
        <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-10">
          {/* Message preview */}
          <View className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 mb-4">
            <Text className="text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Mensagem selecionada</Text>
            <Text className="text-white text-sm" numberOfLines={3}>{assistTarget?.content}</Text>
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-2 mb-4">
            {ASSIST_BUTTONS.map(({ action, emoji, label }) => (
              <TouchableOpacity
                key={action}
                onPress={() => runAssist(action)}
                disabled={assistLoading}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  assistResult?.action === action
                    ? "bg-primary/20 border-primary/40"
                    : "bg-zinc-800 border-zinc-700"
                } disabled:opacity-50`}
              >
                <Text style={{ fontSize: 18 }}>{emoji}</Text>
                <Text className={`text-[10px] font-semibold mt-1 ${
                  assistResult?.action === action ? "text-primary" : "text-zinc-400"
                }`}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Loading */}
          {assistLoading && (
            <View className="py-4 items-center">
              <ActivityIndicator color="#7c3aed" />
              <Text className="text-zinc-500 text-xs mt-2">Analisando com IA...</Text>
            </View>
          )}

          {/* Results */}
          {!assistLoading && assistResult && (
            <View className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
              {/* translate / native */}
              {(assistResult.action === "translate" || assistResult.action === "native") && (
                <Text className="text-white text-sm leading-relaxed">{assistResult.result}</Text>
              )}

              {/* grammar */}
              {assistResult.action === "grammar" && (
                <View>
                  {assistResult.hasErrors ? (
                    <>
                      <Text className="text-emerald-300 text-sm font-semibold mb-2">✅ {assistResult.corrected}</Text>
                      {(assistResult.errors ?? []).map((e, i) => (
                        <View key={i} className="mb-2 border-l-2 border-red-400/50 pl-3">
                          <Text className="text-red-400 text-xs line-through">{e.original}</Text>
                          <Text className="text-emerald-400 text-xs">→ {e.fix}</Text>
                          <Text className="text-zinc-500 text-[10px] mt-0.5">{e.tip}</Text>
                        </View>
                      ))}
                    </>
                  ) : (
                    <Text className="text-emerald-400 text-sm">✅ Nenhum erro encontrado!</Text>
                  )}
                </View>
              )}

              {/* cefr */}
              {assistResult.action === "cefr" && (
                <View>
                  <View className="flex-row items-center gap-3 mb-2">
                    <View className="bg-primary/20 border border-primary/40 rounded-xl px-4 py-2">
                      <Text className="text-primary text-xl font-bold">{assistResult.level}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-semibold text-sm">{assistResult.label}</Text>
                      <Text className="text-zinc-400 text-xs">Nível CEFR detectado</Text>
                    </View>
                  </View>
                  {assistResult.tip && (
                    <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-1">
                      <Text className="text-amber-300 text-xs">💡 {assistResult.tip}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
