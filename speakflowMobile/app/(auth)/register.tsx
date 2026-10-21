import { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@presentation/hooks/useAuth";

function RuleRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-1">
      <Text className={ok ? "text-emerald-400 text-xs" : "text-zinc-600 text-xs"}>
        {ok ? "✓" : "○"}
      </Text>
      <Text className={`text-xs ${ok ? "text-emerald-400" : "text-zinc-500"}`}>{label}</Text>
    </View>
  );
}

export default function RegisterScreen() {
  const { register, submitting, error, clearError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touchedPass, setTouchedPass] = useState(false);
  const [done, setDone] = useState(false);

  const rules = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: password.length > 0 && password === confirm,
  }), [password, confirm]);

  const allRulesOk = rules.length && rules.upper && rules.number && rules.match;

  async function handleRegister() {
    clearError();
    if (!allRulesOk) return;
    const success = await register(name.trim(), email.trim().toLowerCase(), password);
    if (success) setDone(true);
  }

  if (done) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-5xl mb-6">📧</Text>
        <Text className="text-2xl font-bold text-white mb-3 text-center">Confirme seu e-mail</Text>
        <Text className="text-zinc-400 text-base text-center mb-8">
          Enviamos um link de confirmação para{" "}
          <Text className="text-white font-medium">{email}</Text>.{"\n"}
          Clique no link e volte para fazer login.
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
            <Text className="text-zinc-400 text-base">Junte-se ao SpeakFlow e evolua seu inglês profissional</Text>
          </View>

          {error && (
            <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          <View className="gap-4 mb-6">
            {/* Nome */}
            <View>
              <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Nome completo</Text>
              <TextInput
                value={name} onChangeText={setName}
                placeholder="Seu nome" placeholderTextColor="#52525b"
                autoCapitalize="words" autoComplete="name" returnKeyType="next"
                className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3.5 text-white text-base"
              />
            </View>

            {/* E-mail */}
            <View>
              <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">E-mail</Text>
              <TextInput
                value={email} onChangeText={setEmail}
                placeholder="seu@email.com" placeholderTextColor="#52525b"
                keyboardType="email-address" autoCapitalize="none"
                autoComplete="email" returnKeyType="next"
                className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3.5 text-white text-base"
              />
            </View>

            {/* Senha */}
            <View>
              <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Senha</Text>
              <View className="flex-row items-center bg-zinc-800/50 border border-zinc-700 rounded-xl pr-3">
                <TextInput
                  value={password}
                  onChangeText={(v) => { setPassword(v); setTouchedPass(true); }}
                  placeholder="Crie uma senha segura" placeholderTextColor="#52525b"
                  secureTextEntry={!showPass} autoComplete="new-password" returnKeyType="next"
                  className="flex-1 px-4 py-3.5 text-white text-base"
                />
                <TouchableOpacity onPress={() => setShowPass(p => !p)}>
                  <Text className="text-zinc-500 text-xs">{showPass ? "Ocultar" : "Mostrar"}</Text>
                </TouchableOpacity>
              </View>

              {/* Password rules — shown as soon as user starts typing */}
              {touchedPass && (
                <View className="mt-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                  <Text className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Requisitos da senha</Text>
                  <RuleRow ok={rules.length} label="Mínimo 8 caracteres" />
                  <RuleRow ok={rules.upper} label="Pelo menos 1 letra maiúscula" />
                  <RuleRow ok={rules.number} label="Pelo menos 1 número" />
                </View>
              )}
            </View>

            {/* Confirmar senha */}
            <View>
              <Text className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Confirmar senha</Text>
              <View className={`flex-row items-center bg-zinc-800/50 border rounded-xl pr-3 ${
                confirm.length > 0
                  ? rules.match ? "border-emerald-500/50" : "border-red-500/50"
                  : "border-zinc-700"
              }`}>
                <TextInput
                  value={confirm} onChangeText={setConfirm}
                  placeholder="Repita a senha" placeholderTextColor="#52525b"
                  secureTextEntry={!showConfirm} autoComplete="new-password" returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  className="flex-1 px-4 py-3.5 text-white text-base"
                />
                <TouchableOpacity onPress={() => setShowConfirm(p => !p)}>
                  <Text className="text-zinc-500 text-xs">{showConfirm ? "Ocultar" : "Mostrar"}</Text>
                </TouchableOpacity>
              </View>
              {confirm.length > 0 && !rules.match && (
                <Text className="text-red-400 text-xs mt-1.5 ml-1">As senhas não coincidem</Text>
              )}
              {confirm.length > 0 && rules.match && (
                <Text className="text-emerald-400 text-xs mt-1.5 ml-1">✓ Senhas coincidem</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={submitting || !name || !email || !allRulesOk}
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
