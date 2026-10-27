import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Settings, Lightbulb, Plus, ChevronRight, AlertTriangle } from "lucide-react-native";
import { colors, radius, fonts } from "@/lib/theme";
import { apiGet } from "@/lib/api";

interface Filho { id: string; fullName?: string; name?: string; firstName?: string; className?: string | null }
interface Resumo {
  aluno?: { firstName?: string; className?: string | null; shift?: string | null };
  semana?: { dias?: boolean[]; atividades?: number; minutos?: number; frase?: string; hojeIndex?: number };
  trilhaAtual?: { subject?: { name?: string }; habilidade?: string; feitas?: number; total?: number } | null;
  evolucao?: { mastered?: number; almost?: number; notYet?: number; frase?: string } | null;
  dica?: string | null;
  retornos?: { id?: string; subject?: string; nivel?: string; resumo?: string }[];
  alertas?: string[];
  escola?: { nome?: string | null; turma?: string | null; turno?: string | null; phone?: string | null; email?: string | null };
}
const DIAS = ["S", "T", "Q", "Q", "S", "S", "D"];

export default function FamiliaPainel() {
  const insets = useSafeAreaInsets();
  const [guardian, setGuardian] = useState("");
  const [filhos, setFilhos] = useState<Filho[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState(false);

  const carregarFilhos = useCallback(async () => {
    setErro(false);
    const d = await apiGet<{ guardianFirstName?: string; filhos: Filho[] }>("/familia/filhos");
    if (!d) { setErro(true); setFilhos([]); return; }
    setGuardian(d.guardianFirstName ?? "");
    setFilhos(d.filhos ?? []);
    if (d.filhos?.[0]) setSel(d.filhos[0].id);
  }, []);
  useEffect(() => { carregarFilhos(); }, [carregarFilhos]);

  useEffect(() => {
    if (!sel) return;
    setResumo(null);
    apiGet<Resumo>(`/familia/filhos/${sel}/resumo`).then((d) => setResumo(d ?? {}));
  }, [sel]);

  const nome = (f: Filho) => f.firstName || f.name || f.fullName?.split(" ")[0] || "Aluno";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <View style={styles.header}>
        <Text style={styles.hi}>Olá{guardian ? `, ${guardian}` : ""}</Text>
        <Pressable onPress={() => router.push("/configuracoes")} hitSlop={10}><Settings size={22} color={colors.textMuted} /></Pressable>
      </View>

      {filhos === null && !erro ? (
        <View style={styles.skeleton}><ActivityIndicator color={colors.action} /></View>
      ) : erro ? (
        <View style={styles.card}><Text style={styles.text}>Não foi possível carregar. Tente de novo.</Text>
          <Pressable onPress={carregarFilhos} style={styles.retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable></View>
      ) : (filhos?.length ?? 0) === 0 ? (
        <View style={styles.card}><Text style={styles.cardTitle}>Vincule um filho</Text><Text style={styles.text}>Use o código do cartão do aluno para acompanhar a evolução dele.</Text>
          <Pressable onPress={() => router.push("/familia/adicionar-filho")} style={styles.addBtn}><Plus size={18} color="#FFF" /><Text style={styles.addText}>Adicionar filho</Text></Pressable></View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {filhos!.map((f) => (
              <Pressable key={f.id} onPress={() => setSel(f.id)} style={[styles.chip, sel === f.id && { backgroundColor: colors.action }]}>
                <Text style={[styles.chipText, { color: sel === f.id ? "#FFF" : colors.text }]}>{nome(f)}{f.className ? ` · ${f.className}` : ""}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => router.push("/familia/adicionar-filho")} style={styles.chipAdd}><Plus size={16} color={colors.action} /></Pressable>
          </ScrollView>

          {!resumo ? (
            <View style={styles.skeleton}><ActivityIndicator color={colors.action} /></View>
          ) : (
            <>
              {resumo.alertas?.map((a, i) => (
                <View key={i} style={[styles.block, { backgroundColor: colors.warnSoft, borderColor: "#FDE68A", flexDirection: "row", gap: 10 }]}>
                  <AlertTriangle size={18} color={colors.warn} /><Text style={[styles.text, { flex: 1, color: colors.warn }]}>{a}</Text>
                </View>
              ))}

              <View style={styles.block}>
                <Text style={styles.blockTitle}>Esta semana</Text>
                <View style={styles.dias}>
                  {DIAS.map((d, i) => (
                    <View key={i} style={[styles.dia, resumo.semana?.dias?.[i] && { backgroundColor: colors.action }]}>
                      <Text style={[styles.diaText, resumo.semana?.dias?.[i] && { color: "#FFF" }]}>{d}</Text>
                    </View>
                  ))}
                </View>
                {resumo.semana?.frase ? <Text style={styles.text}>{resumo.semana.frase}</Text> : null}
                <Text style={styles.textMuted}>{resumo.semana?.atividades ?? 0} atividades · cerca de {resumo.semana?.minutos ?? 0} minutos</Text>
              </View>

              {resumo.trilhaAtual ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Trilha atual</Text>
                  {resumo.trilhaAtual.subject?.name ? <Text style={styles.pillInline}>{resumo.trilhaAtual.subject.name}</Text> : null}
                  {resumo.trilhaAtual.habilidade ? <Text style={styles.text}>{resumo.trilhaAtual.habilidade}</Text> : null}
                  <Text style={styles.textMuted}>{resumo.trilhaAtual.feitas ?? 0} de {resumo.trilhaAtual.total ?? 0}</Text>
                </View>
              ) : null}

              {resumo.evolucao ? (
                <Pressable onPress={() => router.push(`/familia/evolucao?id=${sel}` as never)} style={styles.block}>
                  <View style={styles.rowBetween}><Text style={styles.blockTitle}>Evolução</Text><ChevronRight size={16} color={colors.action} /></View>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Badge n={resumo.evolucao.mastered} label="Domina" fg={colors.success} bg={colors.successSoft} />
                    <Badge n={resumo.evolucao.almost} label="Quase lá" fg={colors.warn} bg={colors.warnSoft} />
                    <Badge n={resumo.evolucao.notYet} label="Ainda não" fg={colors.danger} bg={colors.dangerSoft} />
                  </View>
                  {resumo.evolucao.frase ? <Text style={styles.textMuted}>{resumo.evolucao.frase}</Text> : null}
                </Pressable>
              ) : null}

              {resumo.dica ? (
                <View style={[styles.block, { backgroundColor: colors.warnSoft, borderColor: "#FDE68A" }]}>
                  <View style={styles.rowGap}><Lightbulb size={18} color={colors.warn} /><Text style={styles.blockTitle}>Como ajudar</Text></View>
                  <Text style={[styles.text, { color: colors.warn }]}>{resumo.dica}</Text>
                </View>
              ) : null}

              {resumo.retornos && resumo.retornos.length > 0 ? (
                <Pressable onPress={() => router.push(`/familia/retornos?id=${sel}` as never)} style={styles.block}>
                  <View style={styles.rowBetween}><Text style={styles.blockTitle}>Últimos retornos</Text><ChevronRight size={16} color={colors.action} /></View>
                  {resumo.retornos.slice(0, 3).map((r, i) => (
                    <Text key={r.id ?? i} style={styles.textMuted} numberOfLines={1}>{r.subject ? `${r.subject} · ` : ""}{r.resumo ?? r.nivel ?? ""}</Text>
                  ))}
                </Pressable>
              ) : null}

              {resumo.escola ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Escola</Text>
                  <Text style={styles.textMuted}>{[resumo.escola.nome, resumo.escola.turma, resumo.escola.turno].filter(Boolean).join(" · ")}</Text>
                  {resumo.escola.phone ? <Text style={styles.textMuted}>{resumo.escola.phone}</Text> : null}
                  {resumo.escola.email ? <Text style={styles.textMuted}>{resumo.escola.email}</Text> : null}
                </View>
              ) : null}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Badge({ n, label, fg, bg }: { n?: number; label: string; fg: string; bg: string }) {
  return <View style={[styles.badge, { backgroundColor: bg }]}><Text style={[styles.badgeText, { color: fg }]}>{label} {n ?? 0}</Text></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hi: { fontSize: 24, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  skeleton: { height: 120, borderRadius: radius.cardLg, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, padding: 18, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  block: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, gap: 8 },
  blockTitle: { fontSize: 15, fontWeight: "800", color: colors.text, fontFamily: fonts.bold },
  text: { fontSize: 14, color: colors.text, lineHeight: 20, fontFamily: fonts.regular },
  textMuted: { fontSize: 13, color: colors.textMuted, lineHeight: 19, fontFamily: fonts.regular },
  chip: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 13, fontWeight: "700", fontFamily: fonts.bold },
  chipAdd: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  dias: { flexDirection: "row", gap: 8 },
  dia: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  diaText: { fontSize: 13, fontWeight: "700", color: colors.action, fontFamily: fonts.bold },
  pillInline: { alignSelf: "flex-start", backgroundColor: colors.actionSoft, color: colors.action, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, fontSize: 12, fontWeight: "700", fontFamily: fonts.bold, overflow: "hidden" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowGap: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "700", fontFamily: fonts.bold },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.action, borderRadius: radius.input, paddingVertical: 14 },
  addText: { color: "#FFF", fontSize: 15, fontWeight: "700", fontFamily: fonts.bold },
  retry: { alignSelf: "flex-start", backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
});
