import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { QrCode, ListOrdered, ArrowLeft } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiSend } from "@/lib/api";
import { salvarSessao } from "@/lib/session";

type Mode = "select" | "qr" | "manual";

interface LoginResp { ok?: boolean; token?: string; error?: string }

// Extrai o token do cartao do dado lido no QR (token puro ou URL com ?card=/token=).
function extrairQrToken(data: string): string {
  const m = /[?&](?:card|token|qr)=([^&]+)/.exec(data);
  return m ? decodeURIComponent(m[1]) : data.trim();
}

export default function AlunoEntrar() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("select");
  const [turma, setTurma] = useState("");
  const [matricula, setMatricula] = useState("");
  const [pin, setPin] = useState("");
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [perm, requestPerm] = useCameraPermissions();

  async function entrarComToken(token: string) {
    await salvarSessao({ token, perfil: "student" });
    router.replace("/aluno/trilha" as never);
  }

  async function abrirQr() {
    setError("");
    const r = perm?.granted ? perm : await requestPerm();
    if (!r?.granted) {
      Alert.alert("Câmera", "Para ler o cartão, permita o uso da câmera nos ajustes do aparelho.", [
        { text: "Abrir ajustes", onPress: () => Linking.openSettings() },
        { text: "Entrar com código", onPress: () => setMode("manual") },
      ]);
      return;
    }
    setQrToken(null); setPin(""); setMode("qr");
  }

  async function loginManual() {
    if (!turma || !matricula || pin.length < 4) { setError("Preencha a turma, a matrícula e o PIN."); return; }
    setLoading(true); setError("");
    const r = await apiSend<LoginResp>("/aluno/entrar", "POST", { mode: "manual", accessCode: turma.trim().toUpperCase(), enrollmentCode: matricula.trim(), pin }, { auth: false });
    setLoading(false);
    if (!r.ok || !r.data?.token) { setError(r.error ?? "Matrícula ou PIN incorretos."); setPin(""); return; }
    await entrarComToken(r.data.token);
  }

  async function loginQr() {
    if (!qrToken || pin.length < 4) { setError("Digite seu PIN."); return; }
    setLoading(true); setError("");
    const r = await apiSend<LoginResp>("/aluno/entrar", "POST", { mode: "qr", qrToken, pin }, { auth: false });
    setLoading(false);
    if (!r.ok || !r.data?.token) { setError(r.error ?? "Não foi possível entrar. Tente de novo."); setPin(""); return; }
    await entrarComToken(r.data.token);
  }

  // ── Seleção ──
  if (mode === "select") return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 32, gap: 16 }}>
      <Text style={styles.title}>Olá! Como você quer entrar?</Text>
      <Pressable onPress={abrirQr} style={[styles.big, { backgroundColor: colors.action }]}>
        <QrCode size={26} color="#FFFFFF" />
        <View style={{ flex: 1 }}>
          <Text style={styles.bigTitleOn}>Ler meu cartão</Text>
          <Text style={styles.bigSubOn}>Aponte a câmera para o QR do cartão</Text>
        </View>
      </Pressable>
      <Pressable onPress={() => { setError(""); setMode("manual"); }} style={[styles.big, styles.bigOutline]}>
        <ListOrdered size={26} color="#C2410C" />
        <View style={{ flex: 1 }}>
          <Text style={styles.bigTitle}>Código da turma e matrícula</Text>
          <Text style={styles.bigSub}>Digite o código da turma, a matrícula e o PIN</Text>
        </View>
      </Pressable>
      <Text style={styles.foot}>Se este aparelho for da escola, toque sempre em Sair ao terminar.</Text>
    </ScrollView>
  );

  // ── QR ──
  if (mode === "qr") return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <Pressable onPress={() => setMode("select")} style={styles.back}><ArrowLeft size={22} color="#FFF" /><Text style={styles.backText}>Voltar</Text></Pressable>
      </View>
      {!qrToken ? (
        <View style={{ flex: 1 }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => { if (!qrToken && data) { setQrToken(extrairQrToken(data)); setPin(""); } }}
          />
          <Text style={styles.scanHint}>Aponte para o QR code do cartão</Text>
        </View>
      ) : (
        <View style={styles.pinWrap}>
          <Text style={styles.pinTitle}>Digite seu PIN</Text>
          <TextInput value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="6 dígitos" placeholderTextColor="#9CA3AF" style={styles.pinInput} autoFocus />
          {error ? <Text style={styles.err}>{error}</Text> : null}
          <Pressable onPress={loginQr} disabled={loading || pin.length < 4} style={[styles.entrar, (loading || pin.length < 4) && { opacity: 0.6 }]}>
            <Text style={styles.entrarText}>{loading ? "Verificando…" : "Entrar"}</Text>
          </Pressable>
          <Pressable onPress={() => { setQrToken(null); setError(""); }} style={{ paddingVertical: 12 }}><Text style={styles.linkLight}>Ler o cartão de novo</Text></Pressable>
        </View>
      )}
    </View>
  );

  // ── Manual ──
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, gap: 14 }}>
      <Pressable onPress={() => setMode("select")} style={styles.back}><ArrowLeft size={20} color={colors.action} /><Text style={[styles.backText, { color: colors.action }]}>Voltar</Text></Pressable>
      <Text style={styles.title}>Digitar matrícula</Text>
      <Campo label="Código da turma" value={turma} onChange={(v) => setTurma(v.toUpperCase())} placeholder="Ex.: SF2027-6A" />
      <Campo label="Matrícula" value={matricula} onChange={setMatricula} placeholder="Sua matrícula" keyboard="number-pad" />
      <Campo label="PIN" value={pin} onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))} placeholder="6 dígitos" secure keyboard="number-pad" />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Pressable onPress={loginManual} disabled={loading} style={[styles.entrar, loading && { opacity: 0.6 }]}>
        <Text style={styles.entrarText}>{loading ? "Verificando…" : "Entrar"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Campo({ label, value, onChange, placeholder, secure, keyboard }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; secure?: boolean; keyboard?: "default" | "number-pad" }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted} secureTextEntry={secure} keyboardType={keyboard ?? "default"} autoCapitalize="characters" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "center", fontFamily: fonts.extrabold },
  big: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: radius.cardLg, padding: 20, minHeight: 96 },
  bigOutline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  bigTitleOn: { color: "#FFF", fontSize: 18, fontWeight: "800", fontFamily: fonts.extrabold },
  bigSubOn: { color: "#EDE9FE", fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
  bigTitle: { color: colors.text, fontSize: 18, fontWeight: "800", fontFamily: fonts.extrabold },
  bigSub: { color: colors.textMuted, fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
  foot: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginTop: 8, fontFamily: fonts.regular },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4, fontFamily: fonts.semibold },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: radius.input, paddingHorizontal: 14, height: 52, fontSize: 16, color: colors.text, fontFamily: fonts.regular },
  entrar: { backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 16, alignItems: "center", minHeight: touch.aluno, marginTop: 4 },
  entrarText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800", fontFamily: fonts.extrabold },
  err: { color: colors.danger, fontSize: 14, textAlign: "center", fontFamily: fonts.regular },
  back: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  backText: { color: "#FFF", fontSize: 15, fontWeight: "600", fontFamily: fonts.semibold },
  scanHint: { position: "absolute", bottom: 48, left: 0, right: 0, textAlign: "center", color: "#FFF", fontSize: 15, fontFamily: fonts.semibold },
  pinWrap: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 14, justifyContent: "center" },
  pinTitle: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center", fontFamily: fonts.extrabold },
  pinInput: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.borderStrong, borderRadius: radius.input, paddingHorizontal: 14, height: 64, fontSize: 28, letterSpacing: 8, textAlign: "center", color: colors.text, fontFamily: fonts.bold },
  linkLight: { color: colors.action, textAlign: "center", fontSize: 14, fontFamily: fonts.semibold },
});
