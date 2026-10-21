import { Tabs } from "expo-router";
import { View, Text, Modal, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center gap-0.5">
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text
        className={`text-[10px] font-semibold ${focused ? "text-primary" : "text-zinc-600"}`}
      >
        {label}
      </Text>
    </View>
  );
}

const AI_CONSENT_KEY = "sf_ai_consent_v1";

function AiConsentModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(AI_CONSENT_KEY).then((v) => {
      if (!v) setVisible(true);
    });
  }, []);

  async function accept() {
    await SecureStore.setItemAsync(AI_CONSENT_KEY, "accepted");
    setVisible(false);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: "#09090b" }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#27272a" }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Uso de IA e Privacidade</Text>
          <Text style={{ color: "#71717a", fontSize: 13, marginTop: 4 }}>Leia antes de usar as ferramentas de IA</Text>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 20 }}>
          {[
            {
              title: "🤖 Quais dados são enviados",
              body: "Quando você usa ferramentas de IA (Buddy, Live Assist, Ferramentas de texto), seus textos escritos e/ou transcrições de voz são enviados para processamento.",
            },
            {
              title: "🏢 Para quem são enviados",
              body: "Os dados são processados pela OpenAI (modelos GPT-4 e Whisper). A OpenAI é uma empresa norte-americana sujeita às leis de privacidade dos EUA.",
            },
            {
              title: "🔒 Como a OpenAI usa seus dados",
              body: "A OpenAI não usa dados enviados via API para treinar seus modelos. Seus dados são processados para gerar a resposta e descartados. Consulte: openai.com/privacy",
            },
            {
              title: "📍 Armazenamento",
              body: "O SpeakFlow armazena o histórico de conversas no nosso servidor (Railway, EUA/Europa) para oferecer continuidade de sessão. Você pode excluir sua conta e todos os dados a qualquer momento em Perfil → Privacidade.",
            },
          ].map((s) => (
            <View key={s.title} style={{ gap: 6 }}>
              <Text style={{ color: "#e4e4e7", fontSize: 14, fontWeight: "600" }}>{s.title}</Text>
              <Text style={{ color: "#71717a", fontSize: 13, lineHeight: 20 }}>{s.body}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={{ padding: 24, gap: 10 }}>
          <TouchableOpacity
            onPress={accept}
            style={{ backgroundColor: "#7c3aed", borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Entendi e aceito continuar</Text>
          </TouchableOpacity>
          <Text style={{ color: "#52525b", fontSize: 11, textAlign: "center", lineHeight: 16 }}>
            Ao aceitar, você confirma que leu e concorda com o uso dos seus dados conforme descrito acima.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <AiConsentModal />
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#18181b",
          borderTopColor: "#27272a",
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔧" label="Tools" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="buddy" options={{ href: null }} />
      <Tabs.Screen name="empresa" options={{ href: null }} />
      <Tabs.Screen name="crm" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="tools/improve" options={{ href: null }} />
      <Tabs.Screen name="tools/generate" options={{ href: null }} />
      <Tabs.Screen name="tools/interview" options={{ href: null }} />
      <Tabs.Screen
        name="live"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🎙️" label="Live" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👥" label="Circles" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Perfil" focused={focused} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
