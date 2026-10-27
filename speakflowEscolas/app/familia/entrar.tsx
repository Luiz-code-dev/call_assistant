import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { HeartHandshake } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiSend, API_BASE } from "@/lib/api";
import { salvarSessao } from "@/lib/session";

type Mode = "login" | "primeiro";
const RELATIONS = [
  { v: "MAE", l: "Mãe" }, { v: "PAI", l: "Pai" }, { v: "AVO_AVO", l: "Avó/Avô" },
  { v: "TIO_TIA", l: "Tio/Tia" }, { v: "TUTOR_LEGAL", l: "Tutor(a)" }, { v: "OUTRO", l: "Outro" },
];

// dd/mm/aaaa -> ISO yyyy-mm-dd (ou "" se incompleto)
function brParaISO(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
function mascaraData(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

interface Resp { ok?: boolean; token?: string; error?: string }

export default function FamiliaEntrar() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // login
  const [identifier, setIdentifier] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");
  // primeiro acesso
  const [familyCode, setFamilyCode] = useState("");
  const [birth, setBirth] = useState("");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("MAE");
  const [contato, setContato] = useState("");
  const [senha, setSenha] = useState("");

  async function entrarComToken(token: string) {
    await salvarSessao({ token, perfil: "family" });
    router.replace("/familia/painel" as never);
  }

  async function login() {
    if (!identifier || !senhaLogin) { setError("Informe e-mail/celular e senha."); return; }
    setLoading(true); setError("");
    const r = await apiSend<Resp>("/familia/login", "POST", { identifier: identifier.trim(), senha: senhaLogin }, { auth: false });
    setLoading(false);
    if (!r.ok || !r.data?.token) { setError(r.error ?? "E-mail/celular ou senha incorretos."); return; }
    await entrarComToken(r.data.token);
  }

  async function primeiroAcesso() {
    const iso = brParaISO(birth);
    if (!familyCode || !iso || !name || senha.length < 6) { setError("Preencha o código, a data (dd/mm/aaaa), seu nome e uma senha (mín. 6)."); return; }
    setLoading(true); setError("");
    const isEmail = contato.includes("@");
    const r = await apiSend<Resp>("/familia/ativar", "POST", {
      familyCode: familyCode.trim(), birthDate: iso, guardianName: name.trim(), relation,
      guardianEmail: isEmail ? contato.trim() : undefined, guardianPhone: isEmail ? undefined : (contato.trim() || undefined),
      senha, termsVersion: "v1.0",
    }, { auth: false });
    setLoading(false);
    if (!r.ok || !r.data?.token) { setError(r.error ?? "Código ou data não conferem."); return; }
    await entrarComToken(r.data.token);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, gap: 14 }}>
      <View style={styles.iconBox}><HeartHandshake size={26} color={colors.action} /></View>
      <Text style={styles.title}>Área da família</Text>

      {mode === "login" ? (
        <>
          <Campo label="E-mail ou celular" value={identifier} onChange={setIdentifier} placeholder="seu e-mail ou celular" />
          <Campo label="Senha" value={senhaLogin} onChange={setSenhaLogin} placeholder="Sua senha" secure />
          {error ? <Text style={styles.err}>{error}</Text> : null}
          <Pressable onPress={login} disabled={loading} style={[styles.entrar, loading && { opacity: 0.6 }]}>
            <Text style={styles.entrarText}>{loading ? "Entrando…" : "Entrar"}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(`${API_BASE}/escola/familia/esqueci-senha`)}><Text style={styles.link}>Esqueci minha senha</Text></Pressable>
          <Pressable onPress={() => { setError(""); setMode("primeiro"); }}><Text style={styles.linkMuted}>Primeiro acesso? Use o código do cartão do aluno</Text></Pressable>
        </>
      ) : (
        <>
          <Text style={styles.sub}>Use o código do cartão do aluno e a data de nascimento dele.</Text>
          <Campo label="Código de família" value={familyCode} onChange={(v) => setFamilyCode(v.toUpperCase())} placeholder="Do cartão do aluno" />
          <Campo label="Data de nascimento do aluno" value={birth} onChange={(v) => setBirth(mascaraData(v))} placeholder="dd/mm/aaaa" keyboard="number-pad" />
          <Campo label="Seu nome completo" value={name} onChange={setName} placeholder="Nome do responsável" />
          <View>
            <Text style={styles.label}>Parentesco</Text>
            <View style={styles.rels}>
              {RELATIONS.map((r) => (
                <Pressable key={r.v} onPress={() => setRelation(r.v)} style={[styles.rel, relation === r.v && { backgroundColor: colors.action }]}>
                  <Text style={[styles.relText, { color: relation === r.v ? "#FFFFFF" : colors.textMuted }]}>{r.l}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Campo label="E-mail ou celular" value={contato} onChange={setContato} placeholder="para entrar nas próximas vezes" />
          <Campo label="Crie uma senha" value={senha} onChange={setSenha} placeholder="Mínimo 6 caracteres" secure />
          {error ? <Text style={styles.err}>{error}</Text> : null}
          <Pressable onPress={primeiroAcesso} disabled={loading} style={[styles.entrar, loading && { opacity: 0.6 }]}>
            <Text style={styles.entrarText}>{loading ? "Criando acesso…" : "Acessar portal"}</Text>
          </Pressable>
          <Pressable onPress={() => { setError(""); setMode("login"); }}><Text style={styles.linkMuted}>Já tenho senha — voltar para Entrar</Text></Pressable>
        </>
      )}
    </ScrollView>
  );
}

function Campo({ label, value, onChange, placeholder, secure, keyboard }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; secure?: boolean; keyboard?: "default" | "number-pad" }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted} secureTextEntry={secure} keyboardType={keyboard ?? "default"} autoCapitalize="none" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center", fontFamily: fonts.extrabold },
  sub: { fontSize: 14, color: colors.textMuted, textAlign: "center", fontFamily: fonts.regular },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4, fontFamily: fonts.semibold },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: radius.input, paddingHorizontal: 14, height: 52, fontSize: 16, color: colors.text, fontFamily: fonts.regular },
  rels: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rel: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  relText: { fontSize: 13, fontWeight: "700", fontFamily: fonts.bold },
  entrar: { backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 16, alignItems: "center", minHeight: touch.default, marginTop: 4 },
  entrarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", fontFamily: fonts.bold },
  err: { color: colors.danger, fontSize: 14, textAlign: "center", fontFamily: fonts.regular },
  link: { color: colors.action, textAlign: "center", fontSize: 14, fontFamily: fonts.semibold },
  linkMuted: { color: colors.textMuted, textAlign: "center", fontSize: 14, fontFamily: fonts.regular },
});
