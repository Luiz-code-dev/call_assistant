import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiGet, apiSend } from "@/lib/api";

interface Track { id: string; name?: string; title?: string; subject?: { name?: string } | null }
interface Turma { id: string; name: string }

export default function ProfessorAtribuir() {
  const insets = useSafeAreaInsets();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [erro, setErro] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [okMsg, setOkMsg] = useState("");

  const carregar = useCallback(async () => {
    setErro(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [t, c] = await Promise.all([apiGet<any>("/trilhas"), apiGet<{ classes: Turma[] }>("/professor/turmas")]);
    if (!t) { setErro(true); setTracks([]); return; }
    setTracks(t.trilhas ?? t.tracks ?? t.items ?? []);
    setTurmas(c?.classes ?? []);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function atribuir(classId: string) {
    if (!track) return;
    setEnviando(true); setOkMsg("");
    const r = await apiSend(`/trilhas/${track.id}/atribuir`, "POST", { classId });
    setEnviando(false);
    if (r.ok) { setOkMsg("Trilha atribuída à turma."); setTrack(null); }
  }

  const nomeTrack = (t: Track) => t.name ?? t.title ?? "Trilha";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => (track ? setTrack(null) : router.back())} hitSlop={10}><ArrowLeft size={22} color={colors.text} /></Pressable>
        <Text style={styles.headTitle}>{track ? "Escolha a turma" : "Atribuir trilha"}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
        {okMsg ? <View style={[styles.card, { backgroundColor: colors.successSoft, borderColor: "#BBF7D0", flexDirection: "row", gap: 8 }]}><Check size={18} color={colors.success} /><Text style={[styles.text, { color: colors.success }]}>{okMsg}</Text></View> : null}

        {tracks === null && !erro ? <View style={styles.sk}><ActivityIndicator color={colors.action} /></View>
          : erro ? <View style={styles.card}><Text style={styles.text}>Não foi possível carregar. Tente de novo.</Text><Pressable onPress={carregar} style={styles.retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable></View>
          : !track ? (
            (tracks?.length ?? 0) === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Sem trilhas aprovadas</Text><Text style={styles.text}>As trilhas aprovadas pela coordenação aparecem aqui para atribuir.</Text></View>
            : tracks!.map((t) => (
              <Pressable key={t.id} onPress={() => { setOkMsg(""); setTrack(t); }} style={styles.rowCard}>
                <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{nomeTrack(t)}</Text>{t.subject?.name ? <Text style={styles.rowSub}>{t.subject.name}</Text> : null}</View>
              </Pressable>
            ))
          ) : (
            turmas.length === 0 ? <View style={styles.card}><Text style={styles.text}>Você não tem turmas para atribuir.</Text></View>
            : turmas.map((tu) => (
              <Pressable key={tu.id} onPress={() => atribuir(tu.id)} disabled={enviando} style={[styles.rowCard, enviando && { opacity: 0.6 }]}>
                <Text style={styles.rowTitle}>{tu.name}</Text>
              </Pressable>
            ))
          )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle: { fontSize: 16, fontWeight: "800", color: colors.text, fontFamily: fonts.bold },
  sk: { height: 100, borderRadius: radius.cardLg, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, gap: 6 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  text: { fontSize: 14, color: colors.textMuted, lineHeight: 20, fontFamily: fonts.regular },
  rowCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, minHeight: 60, justifyContent: "center" },
  rowTitle: { fontSize: 16, fontWeight: "700", color: colors.text, fontFamily: fonts.bold },
  rowSub: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.regular },
  retry: { alignSelf: "flex-start", backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
});
