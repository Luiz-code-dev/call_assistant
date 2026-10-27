import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QrCode, KeyRound } from "lucide-react-native";
import { Camera } from "expo-camera";
import { colors, radius, touch } from "@/lib/theme";

// Entrada do aluno: QR (câmera, permissão só no uso) ou código da turma +
// matrícula + PIN. (Senha por figuras para anos iniciais — próxima iteração.)
export default function AlunoEntrar() {
  const insets = useSafeAreaInsets();
  const [turma, setTurma] = useState("");
  const [matricula, setMatricula] = useState("");
  const [pin, setPin] = useState("");

  async function lerQr() {
    const perm = await Camera.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Câmera", "Para ler o QR do cartão, libere a câmera nas configurações do aparelho."); return; }
    Alert.alert("Ler QR", "Aponte a câmera para o QR do seu cartão de acesso.");
    // Scanner de QR entra na próxima iteração (expo-camera CameraView).
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, gap: 16 }}>
      <Text style={styles.title}>Sou aluno</Text>

      <Pressable onPress={lerQr} style={styles.qrBtn}>
        <QrCode size={22} color="#FFFFFF" />
        <Text style={styles.qrText}>Ler o QR do meu cartão</Text>
      </Pressable>

      <View style={styles.or}><View style={styles.line} /><Text style={styles.orText}>ou digite</Text><View style={styles.line} /></View>

      <View style={{ gap: 12 }}>
        <Campo label="Código da turma" value={turma} onChange={setTurma} placeholder="Ex.: SF2027-6A" />
        <Campo label="Matrícula" value={matricula} onChange={setMatricula} placeholder="Sua matrícula" />
        <Campo label="PIN" value={pin} onChange={setPin} placeholder="6 dígitos" secure />
      </View>

      <Pressable style={styles.entrar}><Text style={styles.entrarText}>Entrar</Text></Pressable>
    </ScrollView>
  );
}

function Campo({ label, value, onChange, placeholder, secure }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; secure?: boolean }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted} secureTextEntry={secure} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "center" },
  qrBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 18, minHeight: touch.aluno },
  qrText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  or: { flexDirection: "row", alignItems: "center", gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textMuted, fontSize: 13 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: radius.input, paddingHorizontal: 14, height: 52, fontSize: 16, color: colors.text },
  entrar: { backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 16, alignItems: "center", minHeight: touch.aluno },
  entrarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
