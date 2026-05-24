import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useAuth } from "@presentation/hooks/useAuth";

export default function LoginScreen() {
  const { login, submitting, error, clearError, pendingVerification } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  async function handleLogin() {
    clearError();
    const success = await login(email.trim().toLowerCase(), password);
    if (success) {
      router.replace("/(app)");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#09090b" }}>
      {/* Background glow */}
      <LinearGradient
        colors={["rgba(124,58,237,0.22)", "rgba(79,70,229,0.08)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 350 }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 40 }}>

            {/* Logo */}
            <View style={{ marginBottom: 36 }}>
              <LinearGradient
                colors={["rgba(124,58,237,0.35)", "rgba(79,70,229,0.2)"]}
                style={{ width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: "rgba(124,58,237,0.4)" }}
              >
                <Text style={{ fontSize: 32 }}>🎙️</Text>
              </LinearGradient>
              <Text style={{ color: "#ffffff", fontSize: 32, fontWeight: "800", letterSpacing: -0.5, marginBottom: 6 }}>Bem-vindo</Text>
              <Text style={{ color: "#71717a", fontSize: 15 }}>Entre na sua conta SpeakFlow</Text>
            </View>

            {/* Pending verification */}
            {pendingVerification && (
              <View style={{ backgroundColor: "rgba(245,158,11,0.1)", borderWidth: 1, borderColor: "rgba(245,158,11,0.2)", borderRadius: 14, padding: 14, marginBottom: 20 }}>
                <Text style={{ color: "#fbbf24", fontSize: 13, fontWeight: "700", marginBottom: 4 }}>📧 Confirme seu e-mail</Text>
                <Text style={{ color: "rgba(252,211,77,0.75)", fontSize: 12, lineHeight: 18 }}>Verifique sua caixa de entrada e clique no link de ativação antes de entrar.</Text>
              </View>
            )}

            {/* Error */}
            {error && !pendingVerification && (
              <View style={{ backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", borderRadius: 14, padding: 14, marginBottom: 20 }}>
                <Text style={{ color: "#f87171", fontSize: 13 }}>{error}</Text>
              </View>
            )}

            {/* Email field */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: "#a1a1aa", fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" }}>E-mail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="seu@email.com"
                placeholderTextColor="#3f3f46"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                style={{
                  backgroundColor: emailFocused ? "rgba(124,58,237,0.08)" : "rgba(24,24,27,0.8)",
                  borderWidth: 1,
                  borderColor: emailFocused ? "rgba(124,58,237,0.5)" : "#27272a",
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: "#ffffff",
                  fontSize: 15,
                }}
              />
            </View>

            {/* Password field */}
            <View style={{ marginBottom: 28 }}>
              <Text style={{ color: "#a1a1aa", fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" }}>Senha</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  placeholder="••••••••"
                  placeholderTextColor="#3f3f46"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={{
                    backgroundColor: passFocused ? "rgba(124,58,237,0.08)" : "rgba(24,24,27,0.8)",
                    borderWidth: 1,
                    borderColor: passFocused ? "rgba(124,58,237,0.5)" : "#27272a",
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    paddingRight: 80,
                    color: "#ffffff",
                    fontSize: 15,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 16, top: 14 }}
                >
                  <Text style={{ color: "#7c3aed", fontSize: 13, fontWeight: "600" }}>
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={submitting || !email || !password}
              activeOpacity={0.85}
              style={{ borderRadius: 14, overflow: "hidden", marginBottom: 16, opacity: submitting || !email || !password ? 0.5 : 1 }}
            >
              <LinearGradient
                colors={["#7c3aed", "#4f46e5"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, alignItems: "center" }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 16 }}>Entrar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Forgot password */}
            <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")} style={{ alignItems: "center", marginBottom: 28 }}>
              <Text style={{ color: "#71717a", fontSize: 13 }}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#1f1f22" }} />
              <Text style={{ color: "#3f3f46", fontSize: 11, marginHorizontal: 14, fontWeight: "600" }}>NÃO TEM CONTA?</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#1f1f22" }} />
            </View>

            {/* Register */}
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ borderWidth: 1, borderColor: "#2d2d30", borderRadius: 14, paddingVertical: 15, alignItems: "center", backgroundColor: "#111113" }}
              >
                <Text style={{ color: "#e4e4e7", fontWeight: "600", fontSize: 15 }}>Criar conta gratuita</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
