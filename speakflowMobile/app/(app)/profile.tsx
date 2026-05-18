import { useState } from "react";
import {
  View, Text, TouchableOpacity, Alert, ScrollView, Modal,
  TextInput, ActivityIndicator, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@presentation/stores/authStore";
import { ApiClient } from "@infrastructure/http/ApiClient";
import { API_BASE_URL } from "@shared/constants/config";

const PLAN_LABEL: Record<string, string> = { free: "Gratuito", basic: "Básico", premium: "Premium" };
const PLAN_FEATURES: Record<string, string[]> = {
  free:    ["50 créditos iniciais", "Ferramentas básicas de IA", "Circles públicos"],
  basic:   ["200 créditos/mês", "Todas as ferramentas", "Live Assist (10/dia)", "Circles ilimitados"],
  premium: ["Créditos ilimitados", "Todas as ferramentas", "Live Assist ilimitado", "Prioridade no suporte"],
};

function SettingRow({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5"
      activeOpacity={0.7}
    >
      <Text>{emoji}</Text>
      <Text className="text-white flex-1 text-sm">{label}</Text>
      <Text className="text-zinc-600">›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [modal, setModal] = useState<"plan" | "privacy" | "terms" | "suggest" | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [sending, setSending] = useState(false);

  function handleLogout() {
    Alert.alert("Sair", "Deseja encerrar sua sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
    ]);
  }

  async function handleSendSuggestion() {
    if (!suggestion.trim() || !user) return;
    setSending(true);
    const result = await ApiClient.post("/api/support/contact", {
      name: user.name, email: user.email, question: suggestion.trim(),
    });
    setSending(false);
    if (result.ok) {
      setSuggestion("");
      setModal(null);
      Alert.alert("Obrigado!", "Sua sugestão foi enviada para nossa equipe.");
    } else {
      Alert.alert("Erro", "Não foi possível enviar. Tente novamente.");
    }
  }

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Avatar + name */}
        <View className="items-center px-5 pt-8 pb-6">
          <View className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/30 items-center justify-center mb-3">
            <Text style={{ fontSize: 32 }}>👤</Text>
          </View>
          <Text className="text-white text-xl font-bold">{user.name}</Text>
          <Text className="text-zinc-500 text-sm mt-0.5">{user.email}</Text>
          <View className="flex-row items-center gap-2 mt-2">
            <View className="bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
              <Text className="text-primary text-xs font-semibold">
                {PLAN_LABEL[user.plan] ?? user.plan}
              </Text>
            </View>
            {user.b2bAccess && (
              <View className="bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
                <Text className="text-amber-400 text-xs font-semibold">🏢 Corporativo</Text>
              </View>
            )}
          </View>
        </View>

        {/* Credits card */}
        <View className="px-5 mb-4">
          <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Créditos disponíveis</Text>
            <Text className="text-4xl font-bold text-white">{user.credits}</Text>
            <Text className="text-zinc-500 text-xs mt-1">
              {user.b2bAccess ? "Uso ilimitado pela empresa" : "2 créditos por uso de ferramenta"}
            </Text>
            {!user.b2bAccess && (
              <TouchableOpacity onPress={() => setModal("plan")} className="mt-3 bg-primary/10 border border-primary/20 rounded-xl py-2 items-center">
                <Text className="text-primary text-sm font-semibold">Ver planos →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Company access */}
        {user.b2bAccess && (
          <View className="px-5 mb-4">
            <TouchableOpacity
              onPress={() => router.push("/empresa" as any)}
              className="flex-row items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5"
              activeOpacity={0.7}
            >
              <Text>🏢</Text>
              <Text className="text-white flex-1 text-sm font-medium">Painel da Empresa</Text>
              <Text className="text-zinc-600">›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Admin / CRM */}
        {(user.crmAccess || user.superAdmin) && (
          <View className="px-5 mb-4">
            <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">Administração</Text>
            <View className="gap-2">
              {user.crmAccess && (
                <TouchableOpacity onPress={() => router.push("/(app)/crm")} className="flex-row items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3.5" activeOpacity={0.7}>
                  <Text>📋</Text>
                  <Text className="text-violet-300 flex-1 text-sm font-medium">CRM — Leads</Text>
                  <Text className="text-violet-500">›</Text>
                </TouchableOpacity>
              )}
              {user.superAdmin && (
                <TouchableOpacity onPress={() => router.push("/(app)/admin")} className="flex-row items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3.5" activeOpacity={0.7}>
                  <Text>⚙️</Text>
                  <Text className="text-amber-300 flex-1 text-sm font-medium">Painel Super Admin</Text>
                  <Text className="text-amber-500">›</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Settings */}
        <View className="px-5 gap-2">
          <SettingRow emoji="🔔" label="Notificações" onPress={() => Linking.openSettings()} />
          <SettingRow emoji="🔒" label="Privacidade e segurança" onPress={() => setModal("privacy")} />
          <SettingRow emoji="💳" label="Plano e cobrança" onPress={() => setModal("plan")} />
          <SettingRow emoji="💡" label="Sugerir melhoria" onPress={() => setModal("suggest")} />
          <SettingRow emoji="📋" label="Termos de uso" onPress={() => setModal("terms")} />

          <TouchableOpacity onPress={handleLogout} className="flex-row items-center gap-3 border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-3.5 mt-2" activeOpacity={0.7}>
            <Text>🚪</Text>
            <Text className="text-red-400 flex-1 text-sm font-medium">Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Modal: Plano e Cobrança ── */}
      <Modal visible={modal === "plan"} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(null)}>
        <View className="flex-1 bg-background px-5 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-white">Plano e Cobrança</Text>
            <TouchableOpacity onPress={() => setModal(null)}><Text className="text-zinc-400 text-lg">✕</Text></TouchableOpacity>
          </View>
          <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
            <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Plano atual</Text>
            <Text className="text-2xl font-bold text-white mb-1">{PLAN_LABEL[user.plan] ?? user.plan}</Text>
            <Text className="text-zinc-400 text-sm mb-4">{user.credits} créditos disponíveis</Text>
            <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Incluso no seu plano</Text>
            {(PLAN_FEATURES[user.plan] ?? []).map((f) => (
              <View key={f} className="flex-row items-center gap-2 mb-1.5">
                <Text className="text-emerald-400 text-xs">✓</Text>
                <Text className="text-zinc-300 text-sm">{f}</Text>
              </View>
            ))}
          </View>
          {user.plan !== "premium" && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`${API_BASE_URL}/dashboard`).catch(() => {})}
              className="bg-primary rounded-xl py-4 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-base">Fazer upgrade →</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {/* ── Modal: Sugerir Melhoria ── */}
      <Modal visible={modal === "suggest"} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(null)}>
        <View className="flex-1 bg-background px-5 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-white">Sugerir Melhoria</Text>
            <TouchableOpacity onPress={() => setModal(null)}><Text className="text-zinc-400 text-lg">✕</Text></TouchableOpacity>
          </View>
          <Text className="text-zinc-400 text-sm mb-4">
            Tem uma ideia para melhorar o SpeakFlow? Conta pra gente! Lemos todas as sugestões.
          </Text>
          <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Sua sugestão</Text>
          <TextInput
            value={suggestion}
            onChangeText={setSuggestion}
            placeholder="Descreva sua ideia ou melhoria..."
            placeholderTextColor="#52525b"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm mb-6"
            style={{ minHeight: 120 }}
          />
          <TouchableOpacity
            onPress={handleSendSuggestion}
            disabled={sending || !suggestion.trim()}
            className="bg-primary rounded-xl py-4 items-center disabled:opacity-50"
            activeOpacity={0.8}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Enviar sugestão</Text>}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Modal: Privacidade ── */}
      <Modal visible={modal === "privacy"} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(null)}>
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
            <Text className="text-xl font-bold text-white">Privacidade e Segurança</Text>
            <TouchableOpacity onPress={() => setModal(null)}><Text className="text-zinc-400 text-lg">✕</Text></TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
            {[
              { title: "Dados coletados", body: "Coletamos nome, e-mail, dados de uso das ferramentas e sessões Live para personalizar sua experiência." },
              { title: "Uso dos dados", body: "Seus dados são usados exclusivamente para entregar e melhorar os serviços SpeakFlow. Nunca vendemos dados a terceiros." },
              { title: "Armazenamento", body: "Dados armazenados em servidores seguros na Railway (US/EU). Transcrições de sessões Live são processadas e descartadas em até 24h." },
              { title: "Seus direitos", body: "Você pode solicitar exclusão ou exportação dos seus dados a qualquer momento pelo e-mail privacidade@speakflow.ia.br." },
              { title: "Segurança", body: "Senhas criptografadas com bcrypt. Comunicação via HTTPS/TLS. Tokens JWT com expiração de 30 dias." },
              { title: "Contato", body: "Dúvidas sobre privacidade: privacidade@speakflow.ia.br" },
            ].map((s) => (
              <View key={s.title} className="mb-5">
                <Text className="text-white font-semibold text-base mb-1">{s.title}</Text>
                <Text className="text-zinc-400 text-sm leading-relaxed">{s.body}</Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Modal: Termos de Uso ── */}
      <Modal visible={modal === "terms"} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(null)}>
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
            <Text className="text-xl font-bold text-white">Termos de Uso</Text>
            <TouchableOpacity onPress={() => setModal(null)}><Text className="text-zinc-400 text-lg">✕</Text></TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
            {[
              { title: "1. Aceitação", body: "Ao usar o SpeakFlow você concorda com estes termos. Se não concordar, não utilize o serviço." },
              { title: "2. Conta", body: "Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na sua conta." },
              { title: "3. Uso aceitável", body: "É proibido usar o SpeakFlow para atividades ilegais, spam, assédio ou violação de direitos de terceiros." },
              { title: "4. Créditos", body: "Créditos adquiridos não são reembolsáveis. Créditos gratuitos expiram após 12 meses de inatividade." },
              { title: "5. Conteúdo", body: "Você mantém os direitos sobre o conteúdo que envia. Ao enviar, concede ao SpeakFlow licença para processar com IA." },
              { title: "6. Disponibilidade", body: "Nos esforçamos para manter o serviço disponível 24/7, mas não garantimos uptime de 100%." },
              { title: "7. Encerramento", body: "Podemos suspender contas que violem estes termos. Você pode encerrar sua conta a qualquer momento." },
              { title: "8. Contato", body: "Dúvidas: contato@speakflow.ia.br" },
            ].map((s) => (
              <View key={s.title} className="mb-5">
                <Text className="text-white font-semibold text-base mb-1">{s.title}</Text>
                <Text className="text-zinc-400 text-sm leading-relaxed">{s.body}</Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
