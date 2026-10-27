import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { colors, radius, fonts } from "@/lib/theme";
import { apiGet } from "@/lib/api";

interface Skill { id: string; name: string }
interface Mastery { studentId: string; studentName?: string; skillId: string; level?: string }

const cell = (lvl?: string) => lvl === "MASTERED" ? colors.success : lvl === "ALMOST" ? "#CA8A04" : lvl === "NOT_YET" ? colors.danger : "#D1D5DB";

export default function ProfessorMapa() {
  const insets = useSafeAreaInsets();
  const { classId, nome } = useLocalSearchParams<{ classId: string; nome?: string }>();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mast, setMast] = useState<Mastery[] | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    const d = await apiGet<{ masteries: Mastery[]; skills: Skill[] }>(`/professor/turmas/${classId}/mastery`);
    if (!d) { setErro(true); setMast([]); return; }
    setSkills(d.skills ?? []); setMast(d.masteries ?? []);
  }, [classId]);
  useEffect(() => { carregar(); }, [carregar]);

  // Agrupa por aluno
  const porAluno = new Map<string, { name: string; cells: Record<string, string | undefined> }>();
  (mast ?? []).forEach((m) => {
    const row = porAluno.get(m.studentId) ?? { name: m.studentName ?? "Aluno", cells: {} };
    row.cells[m.skillId] = m.level;
    porAluno.set(m.studentId, row);
  });
  const alunos = Array.from(porAluno.entries());

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={22} color={colors.text} /></Pressable>
        <Text style={styles.headTitle} numberOfLines={1}>{nome ?? "Mapa da turma"}</Text>
      </View>

      {mast === null && !erro ? <View style={styles.sk}><ActivityIndicator color={colors.action} /></View>
        : erro ? <View style={styles.card}><Text style={styles.text}>Não foi possível carregar. Tente de novo.</Text><Pressable onPress={carregar} style={styles.retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable></View>
        : alunos.length === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Sem dados ainda</Text><Text style={styles.text}>O mapa aparece conforme os alunos praticam.</Text></View>
        : (
          <ScrollView horizontal>
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              {/* Cabeçalho de habilidades */}
              <View style={styles.gridRow}>
                <View style={styles.nameCol}><Text style={styles.th}>Aluno</Text></View>
                {skills.map((s) => <View key={s.id} style={styles.skillCol}><Text style={styles.thSkill} numberOfLines={2}>{s.name}</Text></View>)}
              </View>
              {alunos.map(([sid, row]) => (
                <View key={sid} style={styles.gridRow}>
                  <View style={styles.nameCol}><Text style={styles.td} numberOfLines={1}>{row.name}</Text></View>
                  {skills.map((s) => <View key={s.id} style={styles.skillCol}><View style={[styles.cell, { backgroundColor: cell(row.cells[s.id]) }]} /></View>)}
                </View>
              ))}
              <View style={styles.legend}>
                <Legend c={colors.success} l="Domina" /><Legend c="#CA8A04" l="Quase lá" /><Legend c={colors.danger} l="Ainda não" /><Legend c="#D1D5DB" l="Sem dados" />
              </View>
            </ScrollView>
          </ScrollView>
        )}
    </View>
  );
}

function Legend({ c, l }: { c: string; l: string }) {
  return <View style={styles.legItem}><View style={[styles.legDot, { backgroundColor: c }]} /><Text style={styles.legText}>{l}</Text></View>;
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text, fontFamily: fonts.bold },
  sk: { margin: 16, height: 120, borderRadius: radius.cardLg, backgroundColor: colors.actionSoft, alignItems: "center", justifyContent: "center" },
  card: { margin: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, padding: 18, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, fontFamily: fonts.extrabold },
  text: { fontSize: 14, color: colors.textMuted, lineHeight: 20, fontFamily: fonts.regular },
  gridRow: { flexDirection: "row", alignItems: "center" },
  nameCol: { width: 120, paddingVertical: 6, paddingRight: 8 },
  skillCol: { width: 52, alignItems: "center", paddingVertical: 6 },
  th: { fontSize: 12, fontWeight: "800", color: colors.text, fontFamily: fonts.bold },
  thSkill: { fontSize: 10, color: colors.textMuted, textAlign: "center", fontFamily: fonts.regular },
  td: { fontSize: 13, color: colors.text, fontFamily: fonts.regular },
  cell: { width: 32, height: 32, borderRadius: 8 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 14, paddingHorizontal: 4 },
  legItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legDot: { width: 14, height: 14, borderRadius: 4 },
  legText: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.regular },
  retry: { alignSelf: "flex-start", backgroundColor: colors.actionSoft, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: colors.action, fontWeight: "700", fontFamily: fonts.bold },
});
