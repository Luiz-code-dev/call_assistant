import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiSend, API_BASE, APP_CLIENT } from "@/lib/api";
import { salvarSessao, rotaInicial } from "@/lib/session";

interface Membership { id: string; role: string; network: { name: string }; school: { name: string } | null }
interface LoginResp { ok?: boolean; redirect?: string; token?: string; needsProfile?: boolean; pending?: string; error?: string }

export default function EquipeEntrar() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [memberships, setMemberships] = useState<Membership[] | null>(null);

  async function entrarComSessao(token: string, redirect?: string) {
    await salvarSessao({ token, perfil: "staff", staffRedirect: redirect });
    router.replace(rotaInicial({ token, perfil: "staff", staffRedirect: redirect }) as never);
  }

  async function entrar() {
    setLoading(true); setError("");
    const r = await apiSend<LoginResp>("/auth/staff/login", "POST", { email: email.trim(), password: senha }, { auth: false });
    if (!r.ok || !r.data) { setError(r.error ?? "Credenciais inválidas"); setLoading(false); return; }
    const d = r.data;
    if (d.token) { await entrarComSessao(d.token, d.redirect); return; }
    if (d.needsProfile && d.pending) {
      setPending(d.pending);
      try {
        const res = await fetch(`${API_BASE}/api/escola/auth/memberships`, { headers: { "X-Client": APP_CLIENT, Authorization: `Bearer ${d.pending}` } });
        const data = await res.json();
        setMemberships(Array.isArray(data.memberships) ? data.memberships : []);
      } catch { setError("Erro de conexão. Tente de novo."); }
      setLoading(false);
      return;
    }
    setError("Não foi possível entrar."); setLoading(false);
  }

  async function escolher(mid: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/escola/auth/escolher-perfil`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Client": APP_CLIENT, Authorization: `Bearer ${pending}` },
        body: JSON.stringify({ membershipId: mid }),
      });
      const d = (await res.json()) as LoginResp;
      if (!res.ok || !d.token) { setError(d.error ?? "Não foi possível entrar."); setLoading(false); return; }
      await entrarComSessao(d.token, d.redirect);
    } catch { setError("Erro de conexão. Tente de novo."); setLoading(false); }
  }

  const ROLE_LABEL: Record<string, string> = {
    PLATFORM_ADMIN: "Administração da plataforma", NETWORK_ADMIN: "Secretaria (rede)", COORDINATOR: "Coordenação",
    SCHOOL_ADMIN: "Direção", TEACHER: "Professor(a)",
  };

  if (memberships) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, gap: 12 }}>
        <Text style={styles.title}>Onde você vai trabalhar agora?</Text>
        {memberships.map((m) => (
          <Pressable key={m.id} onPress={() => escolher(m.id)} disabled={loading} style={styles.card}>
            <Text style={styles.cardRole}>{ROLE_LABEL[m.role] ?? m.role}</Text>
            <Text style={styles.cardSub}>{m.school?.name ? `${m.school.name} · ` : ""}{m.network.name}</Text>
          </Pressable>
        ))}
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.action} /> : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 32, gap: 16 }}>
      <Text style={styles.title}>Equipe escolar</Text>
      <Text style={styles.sub}>Use o e-mail cadastrado pela escola.</Text>
      <View style={{ gap: 12, marginTop: 8 }}>
        <View>
          <Text style={styles.label}>E-mail</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="voce@escola.gov.br" placeholderTextColor={colors.textMuted} style={styles.input} />
        </View>
        <View>
          <Text style={styles.label}>Senha</Text>
          <TextInput value={senha} onChangeText={setSenha} secureTextEntry placeholder="Sua senha" placeholderTextColor={colors.textMuted} style={styles.input} />
        </View>
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Pressable onPress={entrar} disabled={loading || !email || !senha} style={[styles.entrar, (loading || !email || !senha) && { opacity: 0.6 }]}>
        <Text style={styles.entrarText}>{loading ? "Entrando…" : "Entrar"}</Text>
      </Pressable>
      <Text style={styles.hint}>Primeiro acesso? Abra o convite que chegou no seu e-mail e crie sua senha.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted, fontFamily: fonts.regular },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4, fontFamily: fonts.semibold },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: radius.input, paddingHorizontal: 14, height: 52, fontSize: 16, color: colors.text, fontFamily: fonts.regular },
  entrar: { backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 16, alignItems: "center", minHeight: touch.default, marginTop: 4 },
  entrarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", fontFamily: fonts.bold },
  hint: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 19, fontFamily: fonts.regular },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16 },
  cardRole: { fontSize: 16, fontWeight: "700", color: colors.text, fontFamily: fonts.bold },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontFamily: fonts.regular },
  err: { color: colors.danger, fontSize: 14, textAlign: "center", fontFamily: fonts.regular },
});
