import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { colors, radius, fonts } from "@/lib/theme";
import { apiGet } from "@/lib/api";

interface Hab { nome?: string; label?: string; nivel?: string }
interface Comp { name?: string; nome?: string; color?: string; habilidades?: Hab[] }

const NIVEL = (n?: string) => n === "MASTERED" ? { l: "Domina", fg: colors.success, bg: colors.successSoft }
  : n === "ALMOST" ? { l: "Quase lá", fg: colors.warn, bg: colors.warnSoft }
  : { l: "Ainda não", fg: colors.danger, bg: colors.dangerSoft };

export default function FamiliaEvolucao() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [comps, setComps] = useState<Comp[] | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    const d = await apiGet<{ componentes?: Comp[]; evolucao?: Comp[] }>(`/familia/filhos/${id}/evolucao`);
    if (!d) { setErro(true); setComps([]); return; }
    setComps(d.componentes ?? d.evolucao ?? []);
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={22} color={colors.text} /></Pressable>
        <Text style={styles.headTitle}>Evolução</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        {comps === null && !erro ? <View style={styles.sk}><ActivityIndicator color={colors.action} /></View>
          : erro ? <View style={styles.card}><Text style={styles.text}>Não foi possível carregar. Tente de novo.</Text><Pressable onPress={carregar} style={styles.retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable></View>
          : (comps?.length ?? 0) === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Sem dados ainda</Text><Text style={styles.text}>A evolução por habilidade aparece conforme o aluno pratica.</Text></View>
          : comps!.map((c, ci) => (
            <View key={ci} style={styles.card}>
              <Text style={[styles.comp, c.color ? { color: c.color } : null]}>{c.name ?? c.nome}</Text>
              {(c.habilidades ?? []).map((h, hi) => {
                const nv = NIVEL(h.nivel);
                return (
                  <View key={hi} style={styles.row}>
                    <Text style={styles.rowTitle} numberOfLines={2}>{h.nome ?? h.label}</Text>
                    <View style={[styles.badge, { backgroundColor: nv.bg }]}><Text style={[styles.badgeText, { color: nv.fg }]}>{nv.l}</Text></View>
                  </View>
                );
              })}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle: { fontSize: 16, fontWeight: "800", color: colors.text, fontFamily: fonts.bold },
  sk: { height: 120, borderRadius: radius.cardLg, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  comp: { fontSize: 15, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  text: { fontSize: 14, color: colors.textMuted, lineHeight: 20, fontFamily: fonts.regular },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowTitle: { flex: 1, fontSize: 14, color: colors.text, fontFamily: fonts.regular },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700", fontFamily: fonts.bold },
  retry: { alignSelf: "flex-start", backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
});
