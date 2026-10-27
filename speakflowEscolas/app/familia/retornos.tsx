import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { colors, radius, fonts } from "@/lib/theme";
import { apiGet } from "@/lib/api";

interface Retorno { id?: string; subject?: string; componente?: string; nivel?: string; titulo?: string; acertou?: string; melhorar?: string; resumo?: string; data?: string }

const NIVEL = (n?: string) => n === "MASTERED" ? { l: "Domina", fg: colors.success, bg: colors.successSoft }
  : n === "ALMOST" ? { l: "Quase lá", fg: colors.warn, bg: colors.warnSoft }
  : n === "NOT_YET" ? { l: "Ainda não", fg: colors.danger, bg: colors.dangerSoft } : null;

export default function FamiliaRetornos() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lista, setLista] = useState<Retorno[] | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    const d = await apiGet<{ retornos?: Retorno[] }>(`/familia/filhos/${id}/retornos`);
    if (!d) { setErro(true); setLista([]); return; }
    setLista(d.retornos ?? []);
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={22} color={colors.text} /></Pressable>
        <Text style={styles.headTitle}>Retornos</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
        {lista === null && !erro ? <View style={styles.sk}><ActivityIndicator color={colors.action} /></View>
          : erro ? <View style={styles.card}><Text style={styles.text}>Não foi possível carregar. Tente de novo.</Text><Pressable onPress={carregar} style={styles.retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable></View>
          : (lista?.length ?? 0) === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Ainda sem retornos</Text><Text style={styles.text}>Quando seu filho praticar, os retornos aparecem aqui.</Text></View>
          : lista!.map((r, i) => {
            const nv = NIVEL(r.nivel);
            return (
              <View key={r.id ?? i} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.comp}>{r.subject ?? r.componente ?? ""}</Text>
                  {nv ? <View style={[styles.badge, { backgroundColor: nv.bg }]}><Text style={[styles.badgeText, { color: nv.fg }]}>{nv.l}</Text></View> : null}
                </View>
                {r.titulo ? <Text style={styles.titulo}>{r.titulo}</Text> : null}
                {r.acertou ? <Text style={styles.text}>✓ {r.acertou}</Text> : null}
                {r.melhorar ? <Text style={styles.textMuted}>↗ {r.melhorar}</Text> : null}
                {!r.acertou && !r.melhorar && r.resumo ? <Text style={styles.text}>{r.resumo}</Text> : null}
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle: { fontSize: 16, fontWeight: "800", color: colors.text, fontFamily: fonts.bold },
  sk: { height: 120, borderRadius: radius.cardLg, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, gap: 6 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  comp: { fontSize: 14, fontWeight: "800", color: colors.action, fontFamily: fonts.bold },
  titulo: { fontSize: 15, fontWeight: "700", color: colors.text, fontFamily: fonts.semibold },
  text: { fontSize: 14, color: colors.text, lineHeight: 20, fontFamily: fonts.regular },
  textMuted: { fontSize: 13, color: colors.textMuted, lineHeight: 19, fontFamily: fonts.regular },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700", fontFamily: fonts.bold },
  retry: { alignSelf: "flex-start", backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
});
