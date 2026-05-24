import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@presentation/hooks/useAuth";

export default function LoginScreen() {
  const { login, submitting, error, clearError, pendingVerification } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    clearError();
    const success = await login(email.trim().toLowerCase(), password);
    if (success) {
      router.replace("/(app)");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-20 pb-10">
          {/* Logo / header */}
          <View className="mb-10">
            <View className="w-14 h-14 rounded-2xl bg-primary/20 items-center justify-center mb-4">
              <Text className="text-3xl">🎙️</Text>
            </View>
            <Text className="text-3xl font-bold text-white mb-1">Bem-vindo</Text>
            <Text className="text-base text-zinc-400">Entre na sua conta SpeakFlow</Text>
          </View>

          {/* Pending verification banner */}
          {pendingVerification && (
            <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5">
              <Text className="text-amber-400 text-sm font-semibold mb-1">📧 Confirme seu e-mail</Text>
              <Text className="text-amber-300/80 text-xs leading-relaxed">Verifique sua caixa de entrada e clique no link de ativação antes de entrar.</Text>
            </View>
          )}

          {/* Error */}
          {error && !pendingVerification && (
            <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          {/* Fields */}
          <View className="gap-4 mb-8">
            <View>
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
                returnKeyType="next"
                className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3.5 text-white text-base"
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                Senha
              </Text>
              <View className="relative">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#52525b"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3.5 text-white text-base pr-12"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5"
                >
                  <Text className="text-zinc-400 text-sm">
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={submitting || !email || !password}
            className="bg-primary rounded-xl py-4 items-center mb-4 disabled:opacity-50"
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Entrar</Text>
            )}
          </TouchableOpacity>

          {/* Forgot password */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password")}
            className="items-center mb-6"
          >
            <Text className="text-zinc-400 text-sm">Esqueceu a senha?</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-zinc-800" />
            <Text className="text-zinc-600 text-xs mx-4">NÃO TEM CONTA?</Text>
            <View className="flex-1 h-px bg-zinc-800" />
          </View>

          {/* Register link */}
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity
              className="border border-zinc-700 rounded-xl py-4 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-zinc-300 font-semibold text-base">Criar conta gratuita</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
