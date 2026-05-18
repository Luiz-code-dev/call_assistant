import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ApiClient } from "@infrastructure/http/ApiClient";

type Step = "form" | "sent";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("form");

  async function handleSubmit() {
    if (!email.trim() || loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await ApiClient.post<{ message: string }>(
        "/api/auth/forgot-password",
        { email: email.trim().toLowerCase() },
        { skipAuth: true }
      );
      if (!result.ok && result.error.statusCode !== 200) {
        setError(result.error.message);
        return;
      }
      setStep("sent");
    } finally {
      setLoading(false);
    }
  }

  if (step === "sent") {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text style={{ fontSize: 56 }} className="mb-6">📬</Text>
        <Text className="text-white text-2xl font-bold text-center mb-3">
          E-mail enviado!
        </Text>
        <Text className="text-zinc-400 text-base text-center leading-relaxed mb-8">
          Se{" "}
          <Text className="text-white font-medium">{email}</Text>{" "}
          estiver cadastrado, você receberá um link para redefinir sua senha.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          className="bg-primary rounded-xl py-4 px-8"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-base">Voltar ao login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View className="flex-1 px-6 pt-16 pb-10">
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center mb-8"
        >
          <Text className="text-white text-lg">←</Text>
        </TouchableOpacity>

        <View className="mb-8">
          <Text className="text-3xl font-bold text-white mb-2">Esqueceu a senha?</Text>
          <Text className="text-zinc-400 text-base leading-relaxed">
            Digite seu e-mail e enviaremos um link para você redefinir sua senha.
          </Text>
        </View>

        {error && (
          <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        )}

        <View className="mb-6">
          <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
            E-mail
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor="#52525b"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3.5 text-white text-base"
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !email.trim()}
          className="bg-primary rounded-xl py-4 items-center disabled:opacity-50"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Enviar link de recuperação</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
