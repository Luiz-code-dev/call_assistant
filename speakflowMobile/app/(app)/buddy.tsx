import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Animated, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@presentation/stores/authStore";
import { BuddyTheme as T } from "@shared/constants/BuddyTheme";

// ─── Types ───────────────────────────────────────────────
interface Suggestion { pt: string; en: string }
interface ChatMsg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  suggestions?: Suggestion[];
}

const TOPICS = [
  { emoji: "💼", label: "Reunião internacional", value: "meeting" },
  { emoji: "🎯", label: "Entrevista de emprego",  value: "interview" },
  { emoji: "📧", label: "E-mail profissional",    value: "email" },
  { emoji: "🗣️", label: "Apresentação / pitch",  value: "presentation" },
  { emoji: "☕", label: "Conversa livre",          value: "free" },
];

const LANGUAGES = [
  { emoji: "🇧🇷", label: "Português (com sugestões)", value: "pt-BR" },
  { emoji: "🇺🇸", label: "Inglês (modo imersivo)",    value: "en" },
  { emoji: "🌍", label: "Outro idioma",               value: "other" },
];

function genId() { return Math.random().toString(36).slice(2); }
function genSessionId() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

// ─── TypingDot ────────────────────────────────────────────
function TypingDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 300, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity, delay]);
  return (
    <Animated.View style={{
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: T.purple, opacity,
    }} />
  );
}

// ─── TypingIndicator ──────────────────────────────────────
function TypingIndicator() {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 14 }}>
      <BuddyAvatarSmall />
      <View style={{
        backgroundColor: T.bgCard,
        borderWidth: 0.5, borderColor: T.border,
        borderRadius: 16, borderBottomLeftRadius: 4,
        paddingVertical: 12, paddingHorizontal: 14,
        flexDirection: "row", gap: 5, alignItems: "center",
      }}>
        <TypingDot delay={0} />
        <TypingDot delay={200} />
        <TypingDot delay={400} />
      </View>
    </View>
  );
}

// ─── BuddyAvatarSmall ─────────────────────────────────────
function BuddyAvatarSmall() {
  return (
    <LinearGradient
      colors={["#7c3aed", "#4f46e5"]}
      style={{
        width: 34, height: 34, borderRadius: 17,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1.5, borderColor: T.purple,
      }}
    >
      <Text style={{ fontSize: 16 }}>🤖</Text>
    </LinearGradient>
  );
}

// ─── AnimatedBubble ───────────────────────────────────────
function AnimatedBubble({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── SuggestionChips ─────────────────────────────────────
function SuggestionChips({ suggestions, onPress }: { suggestions: Suggestion[]; onPress: (s: Suggestion) => void }) {
  if (!suggestions.length) return null;
  return (
    <View style={{ marginLeft: 42, marginTop: -4, marginBottom: 8 }}>
      <Text style={{ color: T.textMuted, fontSize: 10, marginBottom: 5 }}>
        💡 palavras desta conversa
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 5 }}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s.pt}
              onPress={() => onPress(s)}
              activeOpacity={0.75}
              style={{
                backgroundColor: T.bgCard,
                borderWidth: 0.5, borderColor: T.borderStrong,
                borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
                flexDirection: "row", alignItems: "center", gap: 4,
              }}
            >
              <Text style={{ color: T.purpleText, fontSize: 11 }}>{s.pt}</Text>
              <Text style={{ color: T.purple, fontSize: 9 }}>→</Text>
              <Text style={{ color: T.textSecondary, fontSize: 11 }}>{s.en}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── QuickReplies ─────────────────────────────────────────
function QuickReplies({ options, onSelect }: {
  options: { emoji: string; label: string; value: string }[];
  onSelect: (v: string, l: string) => void;
}) {
  return (
    <View style={{ marginLeft: 42, flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          onPress={() => onSelect(o.value, `${o.emoji} ${o.label}`)}
          activeOpacity={0.75}
          style={{
            borderWidth: 0.5, borderColor: T.borderStrong,
            borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12,
            flexDirection: "row", alignItems: "center", gap: 5,
            backgroundColor: T.bgCard,
          }}
        >
          <Text style={{ fontSize: 13 }}>{o.emoji}</Text>
          <Text style={{ color: T.purpleText, fontSize: 12 }}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── MessageRow ───────────────────────────────────────────
function MessageRow({ msg, onChipPress }: { msg: ChatMsg; onChipPress: (s: Suggestion) => void }) {
  if (msg.role === "system") {
    return (
      <AnimatedBubble>
        <View style={{ alignItems: "center", marginVertical: 8 }}>
          <Text style={{
            color: T.textMuted, fontSize: 11,
            backgroundColor: T.bgCard,
            paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
          }}>{msg.content}</Text>
        </View>
      </AnimatedBubble>
    );
  }

  if (msg.role === "user") {
    return (
      <AnimatedBubble>
        <View style={{ alignItems: "flex-end", marginBottom: 14 }}>
          <View style={{
            backgroundColor: T.userBubble,
            borderRadius: 16, borderBottomRightRadius: 4,
            paddingVertical: 10, paddingHorizontal: 14,
            maxWidth: "75%",
          }}>
            <Text style={{ color: "#fff", fontSize: 13, lineHeight: 19 }}>{msg.content}</Text>
          </View>
        </View>
      </AnimatedBubble>
    );
  }

  return (
    <AnimatedBubble>
      <View style={{ marginBottom: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <BuddyAvatarSmall />
          <View style={{
            backgroundColor: T.buddyBubble,
            borderWidth: 0.5, borderColor: T.border,
            borderRadius: 16, borderBottomLeftRadius: 4,
            paddingVertical: 11, paddingHorizontal: 14,
            maxWidth: "75%",
          }}>
            <Text style={{
              color: T.purpleLight, fontSize: 10, fontWeight: "600",
              marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6,
            }}>Buddy</Text>
            <Text style={{ color: T.textPrimary, fontSize: 13, lineHeight: 20 }}>
              {msg.content}
            </Text>
          </View>
        </View>
        {msg.suggestions && msg.suggestions.length > 0 && (
          <SuggestionChips suggestions={msg.suggestions} onPress={onChipPress} />
        )}
      </View>
    </AnimatedBubble>
  );
}

// ─── WelcomeState ─────────────────────────────────────────
function WelcomeState({ onStart }: { onStart: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: T.bgCard,
        borderWidth: 1.5, borderColor: T.borderStrong,
        alignItems: "center", justifyContent: "center",
        marginBottom: 16,
      }}>
        <Text style={{ fontSize: 36 }}>🤖</Text>
      </View>
      <Text style={{
        color: T.textPrimary, fontSize: 17, fontWeight: "600",
        marginBottom: 8, textAlign: "center",
      }}>
        Oi! Eu sou o Buddy 👋
      </Text>
      <Text style={{
        color: T.textMuted, fontSize: 14, textAlign: "center",
        lineHeight: 21, marginBottom: 28,
      }}>
        Seu parceiro de prática de inglês.{"\n"}
        Aqui você pode errar à vontade — prometo não te julgar 😄
      </Text>
      <TouchableOpacity
        onPress={onStart}
        activeOpacity={0.85}
        style={{
          backgroundColor: T.purple,
          borderRadius: 24, paddingVertical: 13, paddingHorizontal: 32,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
          Começar a praticar ✨
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────
export default function BuddyScreen() {
  const { token } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [phase, setPhase] = useState<"lang" | "topic" | "chat" | "limit" | "ended">("lang");
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [sessionId] = useState(() => genSessionId());
  const [credits, setCredits] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const addMsg = useCallback((msg: Omit<ChatMsg, "id">) => {
    setMessages((prev) => [...prev, { id: genId(), ...msg }]);
    scrollToBottom();
  }, [scrollToBottom]);

  function startConversation() {
    setStarted(true);
    setTimeout(() => {
      addMsg({
        role: "assistant",
        content: "Oi! Fico feliz que você veio praticar comigo 😄\n\nAqui é um espaço seguro — pode errar à vontade que eu não vou te julgar!\n\nEm qual idioma você quer conversar hoje?",
      });
    }, 200);
  }

  function handleLanguageSelect(value: string, label: string) {
    const lang = value === "other" ? "multilingual" : value;
    setLanguage(lang);
    addMsg({ role: "user", content: label });
    setPhase("topic");
    setTimeout(() => {
      const reply =
        lang === "pt-BR"
          ? "Boa escolha! Vou conversar em português e te mostrar as palavras em inglês pelo caminho 🎯\nSobre o que você quer praticar hoje?"
          : lang === "en"
          ? "Great choice! Let's go full English mode 🇺🇸\nWhat would you like to practice today?"
          : "Ótimo! Vamos praticar juntos 🌍\nSobre o que você quer conversar?";
      addMsg({ role: "assistant", content: reply });
    }, 350);
  }

  function handleTopicSelect(value: string, label: string) {
    setTopic(value);
    addMsg({ role: "user", content: label });
    setPhase("chat");
    setTimeout(() => {
      addMsg({ role: "assistant", content: "Ótimo tema! Me conta mais — você tem alguma situação específica chegando ou quer explorar de forma geral?" });
    }, 350);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userText = text.trim();
    setInput("");
    addMsg({ role: "user", content: userText });
    const newHistory = [...history, { role: "user" as const, content: userText }];
    setHistory(newHistory);
    setLoading(true);

    try {
      const apiBase = process.env.EXPO_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/chat/buddy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: userText,
          sessionId,
          language: language ?? "pt-BR",
          topic: topic ?? undefined,
          history: newHistory.slice(-20),
        }),
      });

      if (res.status === 429) {
        setPhase("limit");
        addMsg({ role: "assistant", content: "Eita! Você chegou no limite de mensagens de hoje 😅\nMas volta amanhã que eu estarei aqui esperando!\nQuer continuar agora? Dá uma olhada nos planos ✨" });
        return;
      }
      if (res.status === 402) {
        addMsg({ role: "assistant", content: "Parece que seus créditos acabaram 😅 Recarregue para continuar praticando." });
        return;
      }

      const data = await res.json();
      if (data.reply) {
        addMsg({ role: "assistant", content: data.reply, suggestions: data.suggestions ?? [] });
        setHistory((h) => [...h, { role: "assistant", content: data.reply }]);
        if (data.creditsRemaining !== null && data.creditsRemaining !== undefined) {
          setCredits(data.creditsRemaining);
        }
      }
    } catch {
      addMsg({ role: "assistant", content: "Ops, tive um problema de conexão. Tenta novamente 😅" });
    } finally {
      setLoading(false);
    }
  }

  function handleChipPress(s: Suggestion) {
    sendMessage(`Me dê um exemplo de "${s.en}" em uma frase profissional`);
  }

  function handleSend() {
    if (!input.trim()) return;
    if (phase === "lang") {
      const lower = input.toLowerCase();
      if (lower.includes("portugu") || lower.includes("pt-br")) handleLanguageSelect("pt-BR", "🇧🇷 Português");
      else if (lower.includes("ingl") || lower.includes("english")) handleLanguageSelect("en", "🇺🇸 Inglês");
      else handleLanguageSelect("other", input.trim());
      setInput("");
      return;
    }
    if (phase === "topic") {
      const val = input.trim();
      setTopic(val);
      addMsg({ role: "user", content: val });
      setPhase("chat");
      setInput("");
      setTimeout(() => addMsg({ role: "assistant", content: "Ótimo! Vamos lá 😄\nMe conta mais sobre isso." }), 350);
      return;
    }
    sendMessage(input);
  }

  function handleEndSession() {
    Alert.alert(
      "Encerrar sessão",
      "Quer encerrar a sessão de prática?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Encerrar", style: "destructive", onPress: () => router.back() },
      ]
    );
  }

  const sendDisabled = !input.trim() || loading || phase === "ended" || phase === "limit";

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      {/* ── Header ── */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingVertical: 11,
        borderBottomWidth: 0.5, borderBottomColor: T.bgCard,
        backgroundColor: T.bg,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: T.purpleLight, fontSize: 15 }}>← Voltar</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LinearGradient
            colors={["#7c3aed", "#4f46e5"]}
            style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 14 }}>🤖</Text>
          </LinearGradient>
          <View>
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Buddy</Text>
            <Text style={{ color: T.green, fontSize: 10 }}>● online agora</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleEndSession}
          style={{
            borderWidth: 0.5, borderColor: T.border,
            borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
          }}
        >
          <Text style={{ color: T.textMuted, fontSize: 12 }}>Encerrar</Text>
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Welcome state */}
        {!started ? (
          <WelcomeState onStart={startConversation} />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={scrollToBottom}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => (
              <MessageRow key={msg.id} msg={msg} onChipPress={handleChipPress} />
            ))}

            {phase === "lang" && !loading && (
              <View style={{ marginLeft: 42 }}>
                <QuickReplies options={LANGUAGES} onSelect={handleLanguageSelect} />
              </View>
            )}
            {phase === "topic" && !loading && (
              <View style={{ marginLeft: 42 }}>
                <QuickReplies options={TOPICS} onSelect={handleTopicSelect} />
              </View>
            )}

            {loading && <TypingIndicator />}
            <View style={{ height: 8 }} />
          </ScrollView>
        )}

        {/* ── Input bar ── */}
        {started && (
          <View style={{
            paddingHorizontal: 12, paddingTop: 10,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 16,
            borderTopWidth: 0.5, borderTopColor: T.bgCard,
            backgroundColor: T.bg,
          }}>
            {/* Credits / streak bar */}
            {credits !== null && (
              <Text style={{ textAlign: "center", color: T.textMuted, fontSize: 10, marginBottom: 7 }}>
                🔥{" "}
                <Text style={{ color: T.textSecondary }}>{credits} créditos</Text>
                {" "}restantes hoje
              </Text>
            )}

            {/* Row */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
              {/* Mic button (placeholder) */}
              <TouchableOpacity
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: T.bgCard,
                  borderWidth: 0.5, borderColor: T.border,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18 }}>🎤</Text>
              </TouchableOpacity>

              {/* Text input */}
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Digite ou fale..."
                placeholderTextColor={T.borderStrong}
                multiline
                maxLength={500}
                editable={phase !== "ended" && phase !== "limit"}
                style={{
                  flex: 1,
                  backgroundColor: T.bgInput,
                  borderWidth: 0.5, borderColor: T.border,
                  borderRadius: 22, paddingVertical: 10, paddingHorizontal: 14,
                  color: T.textPrimary, fontSize: 13,
                  maxHeight: 100,
                }}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                blurOnSubmit={false}
              />

              {/* Send button */}
              <TouchableOpacity
                onPress={handleSend}
                disabled={sendDisabled}
                activeOpacity={0.8}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: sendDisabled ? T.bgCard : T.purple,
                  borderWidth: 0.5,
                  borderColor: sendDisabled ? T.border : T.purple,
                  alignItems: "center", justifyContent: "center",
                  opacity: sendDisabled ? 0.4 : 1,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 18 }}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
