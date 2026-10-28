import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Check, Eye } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiGet, apiSend } from "@/lib/api";

interface Track  { id: string; name?: string; title?: string; }
interface Turma  { id: string; name: string; }
interface Preview { atribuidos: number; pulados: { studentId: string; motivo: string }[]; }

export default function ProfessorAtribuir() {
  const insets = useSafeAreaInsets();
  const [tracks,   setTracks]   = useState<Track[] | null>(null);
  const [turmas,   setTurmas]   = useState<Turma[]>([]);
  const [track,    setTrack]    = useState<Track | null>(null);
  const [turma,    setTurma]    = useState<Turma | null>(null);
  const [filter,   setFilter]   = useState<"todos"|"NOT_YET_ALMOST">("NOT_YET_ALMOST");
  const [force,    setForce]    = useState(false);
  const [preview,  setPreview]  = useState<Preview | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [okMsg,    setOkMsg]    = useState("");
  const [erro,     setErro]     = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [t, c] = await Promise.all([
      apiGet<any>("/trilhas?aba=biblioteca"),
      apiGet<{ classes: Turma[] }>("/professor/turmas"),
    ]);
    if (!t) { setErro(true); setTracks([]); return; }
    setTracks(t.tracks ?? t.trilhas ?? t.items ?? []);
    setTurmas(c?.classes ?? []);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function calcPreview(tid: string, cid: string) {
    setEnviando(true);
    const body: Record<string, unknown> = { classId: cid, force };
    if (filter === "NOT_YET_ALMOST") body.skillLevelFilter = ["NOT_YET", "ALMOST"];
    const r = await apiSend(`/trilhas/${tid}/atribuir?preview=1`, "POST", body);
    setEnviando(false);
    if (r.ok) setPreview(await r.json());
  }

  async function confirmar() {
    if (!track || !turma) return;
    setEnviando(true);
    const body: Record<string, unknown> = { classId: turma.id, force };
    if (filter === "NOT_YET_ALMOST") body.skillLevelFilter = ["NOT_YET", "ALMOST"];
    const r = await apiSend(`/trilhas/${track.id}/atribuir`, "POST", body);
    setEnviando(false);
    if (r.ok) {
      const d = await r.json();
      setOkMsg(`Trilha atribuída a ${d.atribuidos} aluno${d.atribuidos !== 1 ? "s" : ""}.`);
      setTrack(null); setTurma(null); setPreview(null);
    }
  }

  const nomeTrack = (t: Track) => t.name ?? t.title ?? "Trilha";

  // ── Passo 3: Preview ─────────────────────────────
  if (preview && track && turma) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[s.head, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => setPreview(null)} hitSlop={10}><ArrowLeft size={22} color={colors.text}/></Pressable>
          <Text style={s.headTitle}>Prévia</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
          <View style={[s.card, { backgroundColor: "#EDE9FE" }]}>
            <Text style={[s.cardTitle, { color: "#4C1D95" }]}>
              Vai para {preview.atribuidos} aluno{preview.atribuidos !== 1 ? "s" : ""} da {turma.name}
            </Text>
            {preview.pulados.length > 0 && (
              <Text style={[s.text, { marginTop: 4, color: colors.textMuted }]}>
                {preview.pulados.length} não {preview.pulados.length === 1 ? "vai" : "vão"} receber (já dominam ou limite atingido)
              </Text>
            )}
          </View>
          <Pressable
            onPress={confirmar}
            disabled={enviando || preview.atribuidos === 0}
            style={[s.btn, { opacity: preview.atribuidos === 0 ? 0.4 : 1 }]}
          >
            {enviando ? <ActivityIndicator color="#fff"/> : <Text style={s.btnText}>Confirmar — {preview.atribuidos} aluno{preview.atribuidos !== 1 ? "s" : ""}</Text>}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── Passo 2: Turma ───────────────────────────────
  if (track) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[s.head, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => { setTrack(null); setTurma(null); setPreview(null); }} hitSlop={10}><ArrowLeft size={22} color={colors.text}/></Pressable>
          <Text style={s.headTitle}>Atribuir: {nomeTrack(track)}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
          {/* Filtro de nível */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Para quem</Text>
            <Pressable onPress={() => setFilter("NOT_YET_ALMOST")} style={[s.optRow, filter === "NOT_YET_ALMOST" && s.optSel]}>
              <Text style={filter === "NOT_YET_ALMOST" ? s.optTextSel : s.optText}>Ainda não e Quase lá (reforço)</Text>
            </Pressable>
            <Pressable onPress={() => setFilter("todos")} style={[s.optRow, filter === "todos" && s.optSel]}>
              <Text style={filter === "todos" ? s.optTextSel : s.optText}>Turma inteira</Text>
            </Pressable>
          </View>
          {/* Atribuir mesmo a quem já domina */}
          <View style={[s.card, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
            <Text style={s.text}>Atribuir mesmo a quem já domina</Text>
            <Switch value={force} onValueChange={setForce} trackColor={{ true: colors.action }} thumbColor="#fff"/>
          </View>
          {/* Escolher turma */}
          <Text style={[s.cardTitle, { paddingHorizontal: 4 }]}>Escolha a turma</Text>
          {turmas.length === 0 ? <View style={s.card}><Text style={s.text}>Você não tem turmas para atribuir.</Text></View>
            : turmas.map(c => (
              <Pressable key={c.id} onPress={() => { setTurma(c); calcPreview(track.id, c.id); }} style={s.rowCard}>
                <Text style={s.rowTitle}>{c.name}</Text>
                <Eye size={18} color={colors.action}/>
              </Pressable>
            ))}
        </ScrollView>
      </View>
    );
  }

  // ── Passo 1: Escolher trilha ─────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[s.head, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={22} color={colors.text}/></Pressable>
        <Text style={s.headTitle}>Atribuir trilha</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
        {okMsg ? (
          <View style={[s.card, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0", flexDirection: "row", gap: 8 }]}>
            <Check size={18} color="#166534"/>
            <Text style={[s.text, { color: "#166534" }]}>{okMsg}</Text>
          </View>
        ) : null}
        {tracks === null && !erro ? (
          <View style={s.sk}><ActivityIndicator color={colors.action}/></View>
        ) : erro ? (
          <View style={s.card}>
            <Text style={s.text}>Não foi possível carregar. Tente de novo.</Text>
            <Pressable onPress={carregar} style={s.retry}><Text style={s.retryText}>Tentar de novo</Text></Pressable>
          </View>
        ) : (tracks?.length ?? 0) === 0 ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Sem trilhas aprovadas</Text>
            <Text style={s.text}>As trilhas aprovadas pela coordenação aparecem aqui para atribuir.</Text>
          </View>
        ) : (
          tracks!.map(t => (
            <Pressable key={t.id} onPress={() => { setOkMsg(""); setTrack(t); }} style={s.rowCard}>
              <Text style={s.rowTitle}>{nomeTrack(t)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  head:      { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle: { ...fonts.title, fontSize: 18, flex: 1 },
  card:      { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 16 },
  cardTitle: { ...fonts.subtitle },
  text:      { ...fonts.body },
  optRow:    { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 14, marginTop: 8 },
  optSel:    { borderColor: colors.action, backgroundColor: "#EDE9FE" },
  optText:   { ...fonts.body, color: colors.textMuted },
  optTextSel:{ ...fonts.body, color: "#4C1D95", fontWeight: "600" },
  rowCard:   { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  rowTitle:  { ...fonts.subtitle, flex: 1 },
  btn:       { backgroundColor: colors.action, borderRadius: radius.btn, padding: 16, alignItems: "center", ...touch },
  btnText:   { color: "#fff", fontWeight: "700", fontSize: 15 },
  sk:        { height: 80, justifyContent: "center", alignItems: "center" },
  retry:     { marginTop: 10, padding: 10, alignItems: "center" },
  retryText: { color: colors.action, fontWeight: "600" },
});
