import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Speech from "expo-speech";
import * as SecureStore from "expo-secure-store";
import Svg, { Circle, Polygon, Path, Ellipse, Line } from "react-native-svg";
import { QrCode, Hash, Volume2, ChevronLeft, Delete } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiSend } from "@/lib/api";
import { salvarSessao } from "@/lib/session";

// ── Figuras (SVG, sem emoji) ──────────────────────────────────────────────────
const FIGURES = [
  { id: "sun",    label: "Sol",     color: "#F59E0B",
    svg: <Svg viewBox="0 0 48 48" width={52} height={52}><Circle cx="24" cy="24" r="10" fill="#F59E0B"/>{[0,45,90,135,180,225,270,315].map((a,i)=><Line key={i} x1={24+14*Math.cos(a*Math.PI/180)} y1={24+14*Math.sin(a*Math.PI/180)} x2={24+19*Math.cos(a*Math.PI/180)} y2={24+19*Math.sin(a*Math.PI/180)} stroke="#F59E0B" strokeWidth="3" strokeLinecap="round"/>)}</Svg> },
  { id: "star",   label: "Estrela", color: "#7C3AED",
    svg: <Svg viewBox="0 0 48 48" width={52} height={52}><Polygon points="24,4 29,18 44,18 32,27 37,42 24,33 11,42 16,27 4,18 19,18" fill="#7C3AED"/></Svg> },
  { id: "heart",  label: "Coracao", color: "#BE185D",
    svg: <Svg viewBox="0 0 48 48" width={52} height={52}><Path d="M24 40 C24 40 6 28 6 17 C6 11 10 7 16 7 C20 7 23 10 24 12 C25 10 28 7 32 7 C38 7 42 11 42 17 C42 28 24 40 24 40Z" fill="#BE185D"/></Svg> },
  { id: "house",  label: "Casa",    color: "#0F766E",
    svg: <Svg viewBox="0 0 48 48" width={52} height={52}><Polygon points="24,6 42,22 38,22 38,42 10,42 10,22 6,22" fill="#0F766E"/></Svg> },
  { id: "fish",   label: "Peixe",   color: "#1D4ED8",
    svg: <Svg viewBox="0 0 48 48" width={52} height={52}><Ellipse cx="22" cy="24" rx="14" ry="9" fill="#1D4ED8"/><Polygon points="36,15 44,24 36,33" fill="#1D4ED8"/><Circle cx="14" cy="21" r="2" fill="white"/></Svg> },
  { id: "flower", label: "Flor",    color: "#BE185D",
    svg: <Svg viewBox="0 0 48 48" width={52} height={52}><Circle cx="24" cy="24" r="5" fill="#FBBF24"/>{[0,60,120,180,240,300].map((a,i)=><Ellipse key={i} cx={24+10*Math.cos(a*Math.PI/180)} cy={24+10*Math.sin(a*Math.PI/180)} rx="5" ry="3.5" fill="#BE185D" rotation={a} originX={24+10*Math.cos(a*Math.PI/180)} originY={24+10*Math.sin(a*Math.PI/180)}/>)}</Svg> },
  { id: "moon",   label: "Lua",     color: "#6D28D9",
    svg: <Svg viewBox="0 0 48 48" width={52} height={52}><Path d="M30 8 A16 16 0 1 0 30 40 A12 12 0 1 1 30 8Z" fill="#6D28D9"/></Svg> },
  { id: "drop",   label: "Gota",    color: "#0EA5E9",
    svg: <Svg viewBox="0 0 48 48" width={52} height={52}><Path d="M24 6 Q36 22 36 30 A12 12 0 0 1 12 30 Q12 22 24 6Z" fill="#0EA5E9"/></Svg> },
  { id: "cloud",  label: "Nuvem",   color: "#94A3B8",
    svg: <Svg viewBox="0 0 48 48" width={52} height={52}><Ellipse cx="20" cy="28" rx="12" ry="9" fill="#94A3B8"/><Ellipse cx="30" cy="30" rx="10" ry="8" fill="#94A3B8"/><Ellipse cx="24" cy="22" rx="9" ry="9" fill="#94A3B8"/></Svg> },
];

// Fix 2: inclui dígitos 2-9 (SESSION_CHARS = ABCDEFGHJKLMNPQRSTUVWXYZ23456789)
const AULA_KEYS = ["A","B","C","D","E","F","G","H","J","K","L","M","N","P","Q","R","S","T","U","V","W","X","Y","Z","2","3","4","5","6","7","8","9"];
const AVATAR_COLORS = ["#6D28D9","#BE185D","#0F766E","#1D4ED8","#C2410C","#15803D","#A16207","#0E7490"];
function avatarColor(name: string) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff; return AVATAR_COLORS[h % AVATAR_COLORS.length]; }
function falar(t: string) { Speech.speak(t, { language: "pt-BR", rate: 0.9 }); }

const DEVICE_KEY = "sf_device_students";
interface DeviceStudent { id: string; name: string; loginMode: string; }
interface SessionStudent { id: string; display: string; loginMode: string; }
interface SessionData { sessionId: string; classId: string; className: string; gradeYear: number; students: SessionStudent[]; }
interface LoginResp { ok?: boolean; token?: string; error?: string }

type Screen = "device" | "choose" | "qr" | "aula-code" | "aula-names" | "pin" | "figures";

export default function AlunoEntrar() {
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const [screen, setScreen] = useState<Screen>("choose");
  const [deviceStudents, setDeviceStudents] = useState<DeviceStudent[]>([]);

  // Aula
  const [aulaCode, setAulaCode] = useState<string[]>(Array(6).fill(""));
  const [aulaError, setAulaError] = useState("");
  const [aulaLoading, setAulaLoading] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);

  // Aluno selecionado
  const [selected, setSelected] = useState<{ id: string; display: string; loginMode: string } | null>(null);
  const [sessionId, setSessionId] = useState("");

  // PIN
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  // Figuras
  const [figSeq, setFigSeq] = useState<string[]>([]);
  const [figError, setFigError] = useState("");

  useEffect(() => {
    SecureStore.getItemAsync(DEVICE_KEY).then(raw => {
      if (raw) { try { const d = JSON.parse(raw); if (d?.length) { setDeviceStudents(d); setScreen("device"); } } catch { /* ignore */ } }
    });
  }, []);

  const resolveAulaCode = useCallback(async (code: string) => {
    setAulaLoading(true); setAulaError("");
    const r = await apiSend<SessionData & { error?: string }>("/aluno/entrar/codigo-aula", "POST", { code }, { auth: false });
    setAulaLoading(false);
    if (!r.ok || !r.data) { setAulaError(r.error ?? "Esse codigo nao funcionou. Confira com o professor."); setAulaCode(Array(6).fill("")); return; }
    setSession(r.data); setSessionId(r.data.sessionId);
    setScreen("aula-names");
  }, []);

  useEffect(() => {
    if (aulaCode.every(l => l !== "")) resolveAulaCode(aulaCode.join(""));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aulaCode]);

  async function abrirQr() {
    const r = perm?.granted ? perm : await requestPerm();
    if (!r?.granted) {
      Alert.alert("Camera", "Para ler o cartao, permita o uso da camera nos ajustes do aparelho.", [
        { text: "Abrir ajustes", onPress: () => Linking.openSettings() },
        { text: "Codigo da aula", onPress: () => setScreen("aula-code") },
      ]);
      return;
    }
    setScreen("qr");
  }

  function onQrScanned(data: string) {
    // QR do cartao: ?card=TOKEN → mode qr
    // QR da aula: ?aula=CÓDIGO → vai direto para aula-names
    const aulaM = /[?&]aula=([^&]+)/.exec(data);
    if (aulaM) { resolveAulaCode(decodeURIComponent(aulaM[1]).toUpperCase()); return; }
    const cardM = /[?&](?:card|token)=([^&]+)/.exec(data);
    const token = cardM ? decodeURIComponent(cardM[1]) : data.trim();
    // Para cartão: abrir pin com mode qr
    setSelected({ id: token, display: "...", loginMode: "PIN" }); setSessionId("__qr__"); setScreen("pin");
  }

  function selectStudent(s: { id: string; display: string; loginMode: string }) {
    setSelected(s); setPin(""); setPinError(""); setFigSeq([]); setFigError("");
    setScreen(s.loginMode === "PICTURE" ? "figures" : "pin");
  }

  async function submitPin(finalPin: string) {
    if (!selected) return;
    const mode = sessionId === "__qr__" ? "qr" : "aula";
    const body = mode === "qr"
      ? { mode: "qr", qrToken: selected.id, pin: finalPin }
      : { mode: "aula", studentId: selected.id, sessionId, pin: finalPin };
    const r = await apiSend<LoginResp>("/aluno/entrar", "POST", body, { auth: false });
    if (!r.ok || !r.data?.token) { setPinError(r.error ?? "PIN incorreto. Tente de novo."); setPin(""); return; }
    await salvarSessao({ token: r.data.token, perfil: "student" });
    router.replace("/aluno/trilha" as never);
  }

  async function submitFigures(seq: string[]) {
    if (!selected) return;
    const r = await apiSend<LoginResp>("/aluno/entrar", "POST", { mode: "aula", studentId: selected.id, sessionId, pictureSequence: seq }, { auth: false });
    if (!r.ok || !r.data?.token) { setFigError("Quase! Tente de novo."); setFigSeq([]); return; }
    await salvarSessao({ token: r.data.token, perfil: "student" });
    router.replace("/aluno/trilha" as never);
  }

  const firstName = selected?.display.split(" ")[0] ?? "";

  // ── Device ────────────────────────────────────────────────────────────────
  if (screen === "device") return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 32, alignItems: "center", gap: 24 }}>
      <OuvirBtn onPress={() => falar("Quem vai praticar agora?")} />
      <Text style={s.h1}>Quem vai praticar agora?</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
        {deviceStudents.map(st => (
          <Pressable key={st.id} onPress={() => selectStudent({ id: st.id, display: st.name, loginMode: st.loginMode })} style={s.avatarCard}>
            <View style={[s.avatar, { backgroundColor: avatarColor(st.name) }]}><Text style={s.avatarLetter}>{st.name[0].toUpperCase()}</Text></View>
            <Text style={s.avatarName}>{st.name.split(" ")[0]}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setScreen("choose")} style={s.avatarCardDashed}>
          <Text style={{ fontSize: 36, color: colors.action, fontWeight: "300" }}>+</Text>
          <Text style={{ color: colors.action, fontSize: 13, fontWeight: "600", fontFamily: fonts.semibold }}>Outro aluno</Text>
        </Pressable>
      </View>
      <Pressable onPress={async () => { await SecureStore.deleteItemAsync(DEVICE_KEY); setDeviceStudents([]); setScreen("choose"); }}>
        <Text style={s.link}>Esquecer este aparelho</Text>
      </Pressable>
    </ScrollView>
  );

  // ── Choose ────────────────────────────────────────────────────────────────
  if (screen === "choose") return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: insets.top + 32, gap: 20, alignItems: "center", justifyContent: "center" }}>
      <OuvirBtn onPress={() => falar("Como voce quer entrar?")} />
      <Text style={s.h1}>Como voce quer entrar?</Text>
      <Pressable onPress={() => { setAulaCode(Array(6).fill("")); setAulaError(""); setScreen("aula-code"); }} style={[s.bigBtn, { backgroundColor: "#0F766E" }]}>
        <View style={s.bigIcon}><Hash size={32} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.bigBtnTitle}>Codigo da aula</Text>
          <Text style={s.bigBtnSub}>O professor mostra no quadro</Text>
        </View>
      </Pressable>
      <Pressable onPress={abrirQr} style={[s.bigBtn, { backgroundColor: colors.action }]}>
        <View style={s.bigIcon}><QrCode size={32} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.bigBtnTitle}>Ler meu cartao</Text>
          <Text style={s.bigBtnSub}>Em casa ou na escola</Text>
        </View>
      </Pressable>
      <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: "center", fontFamily: fonts.regular }}>Nao tem cartao? Peca ao seu professor.</Text>
    </View>
  );

  // ── QR Camera ─────────────────────────────────────────────────────────────
  if (screen === "qr") return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <Pressable onPress={() => setScreen("choose")} style={s.backLight}><ChevronLeft size={22} color="#FFF" /><Text style={s.backLightText}>Voltar</Text></Pressable>
      </View>
      <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => { if (data) onQrScanned(data); }} />
      <Text style={s.scanHint}>Aponte para o QR do cartao ou da aula</Text>
      <Pressable onPress={() => setScreen("aula-code")} style={{ padding: 16, alignItems: "center" }}>
        <Text style={{ color: "#EDE9FE", fontSize: 14, fontFamily: fonts.semibold }}>Usar codigo da aula</Text>
      </Pressable>
    </View>
  );

  // ── Aula Code ─────────────────────────────────────────────────────────────
  if (screen === "aula-code") return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 32, alignItems: "center", gap: 20 }}>
      <View style={{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => setScreen("choose")} style={s.backDark}><ChevronLeft size={22} color={colors.action} /><Text style={s.backDarkText}>Voltar</Text></Pressable>
        <OuvirBtn onPress={() => falar("Digite as letras que o professor mostrou")} />
      </View>
      <Text style={s.h2}>Digite as letras que o professor mostrou</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {aulaCode.map((l, i) => (
          <View key={i} style={[s.codeBox, l ? s.codeBoxFilled : aulaCode.slice(0,i).every(x=>x) ? s.codeBoxActive : {}]}>
            <Text style={s.codeBoxText}>{l}</Text>
          </View>
        ))}
      </View>
      {!!aulaError && <Text style={s.err}>{aulaError}</Text>}
      {aulaLoading && <Text style={{ color: colors.textMuted, fontFamily: fonts.regular }}>Verificando...</Text>}
      {/* Teclado de letras */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 380 }}>
        {AULA_KEYS.map(k => (
          <Pressable key={k} onPress={() => {
            const idx = aulaCode.findIndex(l => l === "");
            if (idx === -1) return;
            const next = [...aulaCode]; next[idx] = k; setAulaCode(next); setAulaError("");
          }} style={s.letterKey}>
            <Text style={s.letterKeyText}>{k}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => {
          const last = [...aulaCode].reverse().findIndex(l=>l!=="");
          if(last===-1)return;
          const idx=5-last; const next=[...aulaCode]; next[idx]=""; setAulaCode(next);
        }} style={[s.letterKey, { width: 80, backgroundColor: "#FEE2E2" }]}>
          <Delete size={20} color="#B91C1C" />
        </Pressable>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center", fontFamily: fonts.regular }}>So letras. Sem I e O, para nao confundir com 1 e 0.</Text>
    </ScrollView>
  );

  // ── Toque no seu nome ──────────────────────────────────────────────────────
  if (screen === "aula-names" && session) return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 32, gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => setScreen("aula-code")} style={s.backDark}><ChevronLeft size={22} color={colors.action} /></Pressable>
        <OuvirBtn onPress={() => falar("Toque no seu nome")} />
      </View>
      <Text style={s.sub}>{session.className}</Text>
      <Text style={s.h1}>Toque no seu nome</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {session.students.map(st => (
          <Pressable key={st.id} onPress={() => selectStudent(st)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, minHeight: 64, minWidth: 160 }}>
            <View style={[s.avatarSm, { backgroundColor: avatarColor(st.display) }]}><Text style={s.avatarSmLetter}>{st.display[0].toUpperCase()}</Text></View>
            <Text style={s.nameTxt}>{st.display}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  // ── PIN ────────────────────────────────────────────────────────────────────
  if (screen === "pin" && selected) {
    // Fix 1: máx 6 dígitos (PIN legado=6, novo=4); auto-submit em 6; Confirmar aparece em 4-5
    const MAX_PIN = 6;
    const pressKey = (k: string) => {
      if (k === "del") { setPin(p => p.slice(0,-1)); return; }
      if (pin.length >= MAX_PIN) return;
      const next = pin + k;
      setPin(next);
      if (next.length === MAX_PIN) submitPin(next);
    };
    const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 16 }}>
        <View style={{ paddingHorizontal: 24, flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable onPress={() => setScreen(session ? "aula-names" : "device")} style={s.backDark}><ChevronLeft size={22} color={colors.action} /></Pressable>
          <OuvirBtn onPress={() => falar(`Oi ${firstName}! Digite seu PIN`)} />
        </View>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 40, paddingHorizontal: 24 }}>
          {/* Info aluno */}
          <View style={{ alignItems: "center", gap: 12, minWidth: 140 }}>
            <View style={[s.avatarLg, { backgroundColor: avatarColor(selected.display) }]}><Text style={s.avatarLgLetter}>{selected.display[0].toUpperCase()}</Text></View>
            <Text style={s.h2}>Oi, {firstName}!</Text>
            {!!session?.className && <Text style={s.sub}>{session.className}</Text>}
            <Text style={{ color: colors.text, fontWeight: "600", fontFamily: fonts.semibold, fontSize: 16 }}>Digite seu PIN</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
                <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
              ))}
            </View>
            {pin.length >= 4 && pin.length < MAX_PIN && (
              <Pressable onPress={() => submitPin(pin)}
                style={{ marginTop: 6, backgroundColor: colors.action, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, minHeight: 44, alignItems: "center" }}>
                <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 15, fontFamily: fonts.bold }}>Confirmar</Text>
              </Pressable>
            )}
            {!!pinError && <Text style={s.err}>{pinError}</Text>}
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center", fontFamily: fonts.regular }}>Esqueceu? Peca ao professor um PIN novo.</Text>
          </View>
          {/* Teclado */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", width: 248, gap: 12, justifyContent: "center" }}>
            {keys.map((k, i) => (
              <Pressable key={i} disabled={k===""} onPress={() => k !== "" && pressKey(k)}
                style={[s.numKey, k==="" && { backgroundColor: "transparent", elevation: 0 }, k==="del" && { backgroundColor: "#FEE2E2" }]}>
                {k==="del" ? <Delete size={22} color="#B91C1C" /> : <Text style={s.numKeyText}>{k}</Text>}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ── Figuras ────────────────────────────────────────────────────────────────
  if (screen === "figures" && selected) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 16 }}>
      <View style={{ paddingHorizontal: 24, flexDirection: "row", justifyContent: "space-between" }}>
        <Pressable onPress={() => setScreen(session ? "aula-names" : "device")} style={s.backDark}><ChevronLeft size={22} color={colors.action} /></Pressable>
        <OuvirBtn onPress={() => falar(`Oi ${firstName}! Toque nas suas 3 figuras secretas`)} />
      </View>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 40, paddingHorizontal: 24 }}>
        <View style={{ alignItems: "center", gap: 12, minWidth: 140 }}>
          <View style={[s.avatarLg, { backgroundColor: avatarColor(selected.display) }]}><Text style={s.avatarLgLetter}>{selected.display[0].toUpperCase()}</Text></View>
          <Text style={s.h2}>Oi, {firstName}!</Text>
          {!!session?.className && <Text style={s.sub}>{session.className}</Text>}
          <Text style={{ color: colors.text, fontWeight: "600", fontFamily: fonts.semibold, fontSize: 16, textAlign: "center" }}>Toque nas suas{"\n"}3 figuras secretas</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[0,1,2].map(i => (
              <View key={i} style={[s.dot, i < figSeq.length && s.dotFilled]} />
            ))}
          </View>
          {!!figError && <Text style={s.err}>{figError}</Text>}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", width: 248, gap: 12, justifyContent: "center" }}>
          {FIGURES.map(fig => {
            const pos = figSeq.indexOf(fig.id) + 1;
            const sel = pos > 0;
            return (
              <Pressable key={fig.id} onPress={() => {
                if (sel) return;
                const next = [...figSeq, fig.id];
                setFigSeq(next); setFigError("");
                if (next.length === 3) submitFigures(next);
              }} style={[s.figKey, sel && s.figKeySelected]}>
                {fig.svg}
                {sel && (
                  <View style={s.figBadge}><Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{pos}</Text></View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  return null;
}

function OuvirBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.actionSoft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, minHeight: 44 }}>
      <Volume2 size={16} color={colors.action} />
      <Text style={{ color: colors.action, fontSize: 13, fontWeight: "600", fontFamily: fonts.semibold }}>Ouvir</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: "800", color: colors.text, textAlign: "center", fontFamily: fonts.extrabold },
  h2: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center", fontFamily: fonts.extrabold },
  sub: { fontSize: 14, color: colors.textMuted, textAlign: "center", fontFamily: fonts.regular },
  err: { color: colors.danger, fontSize: 14, textAlign: "center", fontFamily: fonts.regular },
  link: { color: colors.textMuted, fontSize: 14, textDecorationLine: "underline", textAlign: "center", fontFamily: fonts.regular },
  // Botoes grandes
  bigBtn: { flexDirection: "row", alignItems: "center", gap: 16, borderRadius: 24, padding: 22, width: "100%", minHeight: 100 },
  bigIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  bigBtnTitle: { color: "#FFF", fontSize: 20, fontWeight: "800", fontFamily: fonts.extrabold },
  bigBtnSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
  // Avatar cards
  avatarCard: { alignItems: "center", gap: 10, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, borderRadius: 20, padding: 20, minWidth: 130 },
  avatarCardDashed: { alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 2, borderColor: colors.borderStrong, borderStyle: "dashed", borderRadius: 20, padding: 20, minWidth: 130 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#FFF", fontSize: 28, fontWeight: "800", fontFamily: fonts.extrabold },
  avatarName: { color: colors.text, fontSize: 18, fontWeight: "700", fontFamily: fonts.bold },
  avatarSm: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarSmLetter: { color: "#FFF", fontSize: 16, fontWeight: "700", fontFamily: fonts.bold },
  avatarLg: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  avatarLgLetter: { color: "#FFF", fontSize: 36, fontWeight: "800", fontFamily: fonts.extrabold },
  nameTxt: { color: colors.text, fontSize: 18, fontWeight: "700", fontFamily: fonts.bold, flexShrink: 1 },
  // Code boxes
  codeBox: { width: 48, height: 60, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  codeBoxFilled: { borderColor: colors.action },
  codeBoxActive: { borderColor: colors.action, shadowColor: colors.action, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  codeBoxText: { fontSize: 24, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  // Letter keys
  letterKey: { width: 44, height: 52, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  letterKeyText: { fontSize: 18, fontWeight: "700", color: colors.text, fontFamily: fonts.bold },
  // Numpad
  numKey: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", elevation: 2, shadowColor: "#6D28D9", shadowOpacity: 0.08, shadowRadius: 4 },
  numKeyText: { fontSize: 28, fontWeight: "700", color: colors.text, fontFamily: fonts.bold },
  // Dots
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.borderStrong },
  dotFilled: { backgroundColor: colors.action, borderColor: colors.action },
  // Figure keys
  figKey: { width: 76, height: 76, borderRadius: 20, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  figKeySelected: { borderColor: colors.action, backgroundColor: colors.actionSoft },
  figBadge: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.action, alignItems: "center", justifyContent: "center" },
  // Back
  backDark: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  backDarkText: { color: colors.action, fontSize: 15, fontWeight: "600", fontFamily: fonts.semibold },
  backLight: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  backLightText: { color: "#FFF", fontSize: 15, fontWeight: "600", fontFamily: fonts.semibold },
  // Scan
  scanHint: { position: "absolute", bottom: 80, left: 0, right: 0, textAlign: "center", color: "#FFF", fontSize: 15, fontFamily: fonts.semibold, backgroundColor: "rgba(0,0,0,0.4)", padding: 10 },
});
