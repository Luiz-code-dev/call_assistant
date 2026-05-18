import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@presentation/hooks/useAuth";

export default function RegisterScreen() {
  const { register, submitting, error, clearError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  async function handleRegister() {
    clearError();
    const success = await register(name.trim(), email.trim().toLowerCase(), password);
    if (success) {
      setDone(true);
    }
  }

  if (done) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-5xl mb-6">📧</Text>
        <Text className="text-2xl font-bold text-white mb-3 text-center">
          Confirme seu e-mail
        </Text>
        <Text className="text-zinc-400 text-base text-center mb-8">
          Enviamos um link de confirmação para {email}. Clique no link e depois volte para fazer login.
        </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity className="bg-primary rounded-xl py-4 px-8">
            <Text className="text-white font-bold text-base">Ir para Login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6 pt-16 pb-10">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center mb-8"
          >
            <Text className="text-white text-lg">←</Text>
          </TouchableOpacity>

          <View className="mb-8">
            <Text className="text-3xl font-bold text-white mb-1">Criar conta</Text>
            <Text className="text-zinc-400 text-base">
              Junte-se ao SpeakFlow e evolua seu inglês profissional
            </Text>
          </View>

          {error && (
            <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          <View className="gap-4 mb-8">
            <View>
              <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                Nome completo
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor="#52525b"
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3.5 text-white text-base"
              />
            </View>

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
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mín. 8 caracteres, 1 maiúscula e 1 número"
                placeholderTextColor="#52525b"
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3.5 text-white text-base"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={submitting || !name || !email || !password}
            className="bg-primary rounded-xl py-4 items-center mb-4 disabled:opacity-50"
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Criar minha conta</Text>
            )}
          </TouchableOpacity>

          <Text className="text-xs text-zinc-600 text-center">
            Ao criar conta você concorda com nossos{" "}
            <Text className="text-zinc-400">Termos de Uso</Text> e{" "}
            <Text className="text-zinc-400">Política de Privacidade</Text>.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
