import { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "@infrastructure/http/ApiClient";
import { useAuthStore } from "@presentation/stores/authStore";

interface GrammarError { original: string; fix: string; tip: string; }
interface GrammarResult { hasErrors: boolean; corrected: string; errors: GrammarError[]; }
interface CefrResult { level: string; label: string; tip: string; }

const CEFR_BG: Record<string, string> = {
  A1: "#71717a", A2: "#3b82f6", B1: "#10b981",
  B2: "#7c3aed", C1: "#f59e0b", C2: "#f43f5e",
};

function MessageBubble({ m, isMe }: { m: Message; isMe: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [nativeVersion, setNativeVersion] = useState<string | null>(null);
  const [cefrResult, setCefrResult] = useState<CefrResult | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function assist(action: string) {
    if (loadingAction) return;
    if (action === "translate" && translation) return;
    if (action === "native" && nativeVersion) return;
    if (action === "cefr" && cefrResult) return;
    setLoadingAction(action);
    const r = await ApiClient.post<Record<string, unknown>>("/api/messages/assist", {
      text: m.content, action, targetLang: "pt",
    });
    setLoadingAction(null);
    if (!r.ok) return;
    if (action === "translate") setTranslation((r.data.result as string) ?? null);
    if (action === "native") setNativeVersion((r.data.result as string) ?? null);
    if (action === "cefr") setCefrResult(r.data as unknown as CefrResult);
  }

  return (
    <View className={`${isMe ? "items-end" : "items-start"}`}>
      {/* Bubble */}
      <View className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
        isMe ? "bg-primary rounded-tr-sm" : "bg-zinc-800 border border-zinc-700 rounded-tl-sm"
      }`}>
        <Text className="text-white text-sm leading-relaxed">{m.content}</Text>
        <View className="flex-row items-center justify-end mt-1 gap-2">
          {cefrResult && (
            <View style={{ backgroundColor: CEFR_BG[cefrResult.level] ?? "#71717a" }}
              className="rounded-full px-1.5 py-0.5">
              <Text className="text-white text-[8px] font-bold">{cefrResult.level}</Text>
            </View>
          )}
          <Text className={`text-[10px] ${isMe ? "text-white/60" : "text-zinc-600"}`}>
            {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            {isMe && (m.isRead ? " ✓✓" : " ✓")}
          </Text>
        </View>
      </View>

      {/* Action pills row */}
      <View className="flex-row items-center gap-1 mt-1 flex-wrap">
        {expanded && (
          <>
            <TouchableOpacity onPress={() => assist("translate")} disabled={!!loadingAction}
              className={`flex-row items-center gap-1 px-2 py-1 rounded-full border ${translation ? "bg-blue-500/20 border-blue-500/40" : "bg-zinc-900 border-zinc-700"}`}>
              {loadingAction === "translate" ? <ActivityIndicator size="small" color="#60a5fa" /> : <Text className="text-blue-400 text-[10px]">🌐</Text>}
              <Text className={`text-[10px] ${translation ? "text-blue-400" : "text-zinc-400"}`}>{translation ? "✓ Traduzido" : "Traduzir"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => assist("native")} disabled={!!loadingAction}
              className={`flex-row items-center gap-1 px-2 py-1 rounded-full border ${nativeVersion ? "bg-violet-500/20 border-violet-500/40" : "bg-zinc-900 border-zinc-700"}`}>
              {loadingAction === "native" ? <ActivityIndicator size="small" color="#a78bfa" /> : <Text className="text-violet-400 text-[10px]">✨</Text>}
              <Text className={`text-[10px] ${nativeVersion ? "text-violet-400" : "text-zinc-400"}`}>{nativeVersion ? "✓ Nativo" : "Nativo"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => assist("cefr")} disabled={!!loadingAction}
              className={`flex-row items-center gap-1 px-2 py-1 rounded-full border ${cefrResult ? "bg-amber-500/20 border-amber-500/40" : "bg-zinc-900 border-zinc-700"}`}>
              {loadingAction === "cefr" ? <ActivityIndicator size="small" color="#fbbf24" /> : <Text className="text-amber-400 text-[10px]">📊</Text>}
              <Text className={`text-[10px] ${cefrResult ? "text-amber-400" : "text-zinc-400"}`}>{cefrResult ? `✓ ${cefrResult.level}` : "CEFR"}</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={() => setExpanded(!expanded)}
          className="px-2 py-1 rounded-full border border-zinc-700 bg-zinc-900">
          <Text className="text-zinc-500 text-[10px]">{expanded ? "▲" : "···"}</Text>
        </TouchableOpacity>
      </View>

      {/* Inline result panels */}
      {translation && (
        <View className="mt-1 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 max-w-[82%]">
          <Text className="text-blue-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">🌍 Tradução</Text>
          <Text className="text-blue-300 text-xs leading-relaxed">{translation}</Text>
        </View>
      )}
      {nativeVersion && (
        <View className="mt-1 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2 max-w-[82%]">
          <Text className="text-violet-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">🎤 Como nativo diria</Text>
          <Text className="text-violet-300 text-xs leading-relaxed">{nativeVersion}</Text>
        </View>
      )}
      {cefrResult && (
        <View className="mt-1 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 max-w-[82%]">
          <View className="flex-row items-center gap-2 mb-1">
            <View style={{ backgroundColor: CEFR_BG[cefrResult.level] ?? "#71717a" }} className="rounded-full px-2 py-0.5">
              <Text className="text-white text-[10px] font-bold">{cefrResult.level}</Text>
            </View>
            <Text className="text-amber-300 text-xs">{cefrResult.label}</Text>
          </View>
          <Text className="text-zinc-500 text-[10px]">{cefrResult.tip}</Text>
        </View>
      )}
    </View>
  );
}

function GrammarPanel({ result, onAccept, onDismiss }: {
  result: GrammarResult;
  onAccept: (text: string) => void;
  onDismiss: () => void;
}) {
  if (!result.hasErrors) return (
    <View className="mx-4 mb-2 flex-row items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
      <Text className="text-emerald-400 text-xs flex-1">✅ Sem erros de gramática!</Text>
      <TouchableOpacity onPress={onDismiss}><Text className="text-zinc-500">✕</Text></TouchableOpacity>
    </View>
  );
  return (
    <View className="mx-4 mb-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-amber-400 text-xs font-semibold">⚠️ {result.errors.length} correção{result.errors.length > 1 ? "ões" : ""}</Text>
        <TouchableOpacity onPress={onDismiss}><Text className="text-zinc-500">✕</Text></TouchableOpacity>
      </View>
      {result.errors.map((e, i) => (
        <View key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 mb-1.5">
          <Text className="text-xs"><Text className="text-red-400 line-through">{e.original}</Text><Text className="text-zinc-500"> → </Text><Text className="text-emerald-400">{e.fix}</Text></Text>
          <Text className="text-zinc-500 text-[10px] mt-0.5">{e.tip}</Text>
        </View>
      ))}
      <TouchableOpacity onPress={() => onAccept(result.corrected)}
        className="bg-emerald-600 rounded-lg py-2 items-center mt-1">
        <Text className="text-white text-xs font-semibold">✓ Usar versão corrigida</Text>
      </TouchableOpacity>
    </View>
  );
}

interface Friend {
  id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
}

interface Friendship {
  id: string;
  status: string;
  direction: "sent" | "received";
  friend: Friend;
  createdAt: string;
}

interface SearchUser {
  id: string; name: string; email: string;
  avatarUrl: string | null; username: string | null;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

type Phase = "inbox" | "conversation" | "search";

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

  // Friend management
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState<string | null>(null);

  // Input AI tools
  const [grammarResult, setGrammarResult] = useState<GrammarResult | null>(null);
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [rewritingNative, setRewritingNative] = useState(false);

  async function checkGrammar() {
    if (!messageText.trim() || checkingGrammar) return;
    setCheckingGrammar(true);
    const r = await ApiClient.post<GrammarResult>("/api/messages/assist", {
      text: messageText.trim(), action: "grammar",
    });
    setCheckingGrammar(false);
    if (r.ok) setGrammarResult(r.data);
  }

  async function rewriteNative() {
    if (!messageText.trim() || rewritingNative) return;
    setRewritingNative(true);
    const r = await ApiClient.post<{ result: string }>("/api/messages/assist", {
      text: messageText.trim(), action: "native",
    });
    setRewritingNative(false);
    if (r.ok && r.data.result) { setMessageText(r.data.result); setGrammarResult(null); }
  }

  // ── All friendships (accepted + pending) ──
  const { data: friendships, isLoading: loadingFriends, refetch: refetchFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const r = await ApiClient.get<Friendship[]>("/api/friends");
      if (!r.ok) return [];
      return r.data;
    },
    enabled: phase === "inbox" || phase === "search",
  });

  const acceptedFriends = (friendships ?? []).filter(f => f.status === "accepted");
  const pendingReceived = (friendships ?? []).filter(f => f.status === "pending" && f.direction === "received");
  const pendingSent    = (friendships ?? []).filter(f => f.status === "pending" && f.direction === "sent");

  async function searchUsers(q: string) {
    setSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    const r = await ApiClient.get<SearchUser[]>(`/api/network/users/search?q=${encodeURIComponent(q.trim())}`);
    setSearchLoading(false);
    if (r.ok) setSearchResults(r.data);
  }

  async function sendFriendRequest(userId: string) {
    setFriendActionLoading(userId);
    const r = await ApiClient.post("/api/friends", { userId });
    setFriendActionLoading(null);
    if (r.ok) { refetchFriends(); Alert.alert("Pedido enviado!", "A pessoa receberá uma notificação."); }
    else Alert.alert("Erro", (r as any).error?.message ?? "Não foi possível enviar pedido.");
  }

  async function respondFriendRequest(friendshipId: string, action: "accept" | "reject") {
    setFriendActionLoading(friendshipId);
    const r = await ApiClient.patch(`/api/friends/${friendshipId}`, { action });
    setFriendActionLoading(null);
    if (r.ok) { refetchFriends(); qc.invalidateQueries({ queryKey: ["messages-unread-per-sender"] }); }
    else Alert.alert("Erro", (r as any).error?.message ?? "Erro ao processar.");
  }

  async function removeFriend(friendshipId: string, name: string) {
    Alert.alert("Remover amigo", `Deseja remover ${name} da sua lista?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => {
        setFriendActionLoading(friendshipId);
        const r = await ApiClient.delete(`/api/friends/${friendshipId}`);
        setFriendActionLoading(null);
        if (r.ok) { refetchFriends(); if (activeFriend) backToInbox(); }
        else Alert.alert("Erro", "Não foi possível remover.");
      }},
    ]);
  }

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
        {(phase === "conversation" || phase === "search") && (
          <TouchableOpacity onPress={() => { setPhase("inbox"); setSearchQuery(""); setSearchResults([]); }} className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center">
            <Text className="text-white">←</Text>
          </TouchableOpacity>
        )}
        <View className="flex-1">
          {phase === "inbox" && (
            <>
              <Text className="text-2xl font-bold text-white">💬 Mensagens</Text>
              {totalUnread > 0 && (
                <Text className="text-violet-400 text-xs">{totalUnread} mensagem{totalUnread > 1 ? "ns" : ""} não lida{totalUnread > 1 ? "s" : ""}</Text>
              )}
            </>
          )}
          {phase === "search" && <Text className="text-white font-bold text-base">👥 Adicionar amigo</Text>}
          {phase === "conversation" && (
            <>
              <Text className="text-white font-bold text-base">{activeFriend?.name}</Text>
              <Text className="text-zinc-500 text-xs">@{activeFriend?.username ?? "..."}</Text>
            </>
          )}
        </View>
        {phase === "inbox" && (
          <TouchableOpacity onPress={() => setPhase("search")}
            className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 items-center justify-center">
            <Text className="text-primary text-lg">+</Text>
          </TouchableOpacity>
        )}
        {phase === "conversation" && activeFriend && (
          <TouchableOpacity onPress={() => {
            const fs = (friendships ?? []).find(f => f.friend.id === activeFriend.id);
            if (fs) removeFriend(fs.id, activeFriend.name);
          }} className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 items-center justify-center">
            <Text className="text-red-400 text-xs">🗑</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── SEARCH / ADD FRIEND ── */}
      {phase === "search" && (
        <View className="flex-1">
          <View className="px-4 pt-3 pb-2">
            <TextInput
              value={searchQuery}
              onChangeText={searchUsers}
              placeholder="Buscar por nome ou e-mail..." placeholderTextColor="#52525b"
              autoFocus
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm"
            />
          </View>
          <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 24 }}>
            {searchLoading && <ActivityIndicator color="#7c3aed" style={{ marginTop: 20 }} />}
            {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
              <Text className="text-zinc-500 text-sm text-center mt-8">Nenhum usuário encontrado</Text>
            )}
            {searchResults.map(u => {
              const existing = (friendships ?? []).find(f => f.friend.id === u.id);
              return (
                <View key={u.id} className="flex-row items-center gap-3 py-3 border-b border-zinc-800">
                  <Avatar name={u.name} size={10} />
                  <View className="flex-1">
                    <Text className="text-white text-sm font-semibold">{u.name}</Text>
                    <Text className="text-zinc-500 text-xs">{u.username ? `@${u.username}` : u.email}</Text>
                  </View>
                  {existing ? (
                    <View className={`px-3 py-1 rounded-lg border ${
                      existing.status === "accepted" ? "bg-emerald-500/10 border-emerald-500/30"
                      : existing.direction === "sent" ? "bg-zinc-800 border-zinc-700"
                      : "bg-primary/10 border-primary/30"
                    }`}>
                      <Text className={`text-xs font-semibold ${
                        existing.status === "accepted" ? "text-emerald-400"
                        : existing.direction === "sent" ? "text-zinc-400"
                        : "text-primary"
                      }`}>
                        {existing.status === "accepted" ? "✓ Amigos" : existing.direction === "sent" ? "Enviado" : "Responder"}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => sendFriendRequest(u.id)}
                      disabled={friendActionLoading === u.id}
                      className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5"
                    >
                      {friendActionLoading === u.id
                        ? <ActivityIndicator size="small" color="#7c3aed" />
                        : <Text className="text-primary text-xs font-semibold">+ Adicionar</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── INBOX ── */}
      {phase === "inbox" && (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={loadingFriends} onRefresh={refetchFriends} tintColor="#7c3aed" />}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {loadingFriends && <View className="py-12 items-center"><ActivityIndicator color="#7c3aed" /></View>}

          {/* Pedidos recebidos */}
          {pendingReceived.length > 0 && (
            <View className="px-4 pt-4 pb-2">
              <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                👥 {pendingReceived.length} pedido{pendingReceived.length > 1 ? "s" : ""} recebido{pendingReceived.length > 1 ? "s" : ""}
              </Text>
              {pendingReceived.map(f => (
                <View key={f.id} className="flex-row items-center gap-3 bg-zinc-900 border border-primary/20 rounded-xl px-3 py-3 mb-2">
                  <Avatar name={f.friend.name} size={9} />
                  <View className="flex-1">
                    <Text className="text-white text-sm font-semibold">{f.friend.name}</Text>
                    {f.friend.username && <Text className="text-zinc-500 text-xs">@{f.friend.username}</Text>}
                  </View>
                  <TouchableOpacity
                    onPress={() => respondFriendRequest(f.id, "accept")}
                    disabled={friendActionLoading === f.id}
                    className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-1.5 mr-1"
                  >
                    {friendActionLoading === f.id
                      ? <ActivityIndicator size="small" color="#34d399" />
                      : <Text className="text-emerald-400 text-xs font-semibold">✓ Aceitar</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => respondFriendRequest(f.id, "reject")}
                    disabled={friendActionLoading === f.id}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1.5"
                  >
                    <Text className="text-red-400 text-xs">✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Pedidos enviados pendentes */}
          {pendingSent.length > 0 && (
            <View className="px-4 pt-2 pb-2">
              <Text className="text-zinc-600 text-xs font-semibold uppercase tracking-wider mb-2">Aguardando resposta</Text>
              {pendingSent.map(f => (
                <View key={f.id} className="flex-row items-center gap-3 px-3 py-2 mb-1">
                  <Avatar name={f.friend.name} size={8} />
                  <Text className="text-zinc-400 text-sm flex-1">{f.friend.name}</Text>
                  <Text className="text-zinc-600 text-xs">⏳ pendente</Text>
                </View>
              ))}
            </View>
          )}

          {/* Amigos aceitos */}
          {!loadingFriends && acceptedFriends.length === 0 && pendingReceived.length === 0 && (
            <View className="py-16 items-center px-6">
              <Text style={{ fontSize: 48 }} className="mb-4">💬</Text>
              <Text className="text-white font-semibold text-base text-center mb-2">Nenhuma conversa ainda</Text>
              <Text className="text-zinc-500 text-sm text-center mb-4">Adicione amigos usando o botão + para começar.</Text>
              <TouchableOpacity onPress={() => setPhase("search")} className="bg-primary/10 border border-primary/30 rounded-xl px-5 py-2.5">
                <Text className="text-primary text-sm font-semibold">+ Adicionar amigo</Text>
              </TouchableOpacity>
            </View>
          )}

          {acceptedFriends.map((f) => {
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
                  {f.friend.username && <Text className="text-zinc-500 text-xs">@{f.friend.username}</Text>}
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

            {(messages ?? []).map((m) => (
              <MessageBubble key={m.id} m={m} isMe={m.senderId === user?.id} />
            ))}

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

          {/* Grammar panel */}
          {grammarResult && (
            <GrammarPanel
              result={grammarResult}
              onAccept={(text) => { setMessageText(text); setGrammarResult(null); }}
              onDismiss={() => setGrammarResult(null)}
            />
          )}

          {/* Input area */}
          <View className="px-4 pb-4 pt-2 border-t border-zinc-800">
            {/* Toolbar */}
            <View className="flex-row gap-2 mb-2">
              <TouchableOpacity
                onPress={checkGrammar}
                disabled={!messageText.trim() || checkingGrammar || sending}
                className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-900 disabled:opacity-40"
              >
                {checkingGrammar ? <ActivityIndicator size="small" color="#34d399" /> : <Text className="text-emerald-400 text-[11px]">✅</Text>}
                <Text className="text-zinc-400 text-[11px]">{checkingGrammar ? "Checando..." : "Grammar"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={rewriteNative}
                disabled={!messageText.trim() || rewritingNative || sending}
                className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-900 disabled:opacity-40"
              >
                {rewritingNative ? <ActivityIndicator size="small" color="#a78bfa" /> : <Text className="text-violet-400 text-[11px]">✨</Text>}
                <Text className="text-zinc-400 text-[11px]">{rewritingNative ? "Reescrevendo..." : "Nativo"}</Text>
              </TouchableOpacity>
              <Text className="ml-auto text-[10px] text-zinc-600 self-center">🔒 criptografado</Text>
            </View>

            <View className="flex-row items-end gap-2">
              <TextInput
                value={messageText}
                onChangeText={(t) => { setMessageText(t); setGrammarResult(null); }}
                placeholder="Escreva em inglês..."
                placeholderTextColor="#52525b"
                multiline maxLength={2000} editable={!sending}
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
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
