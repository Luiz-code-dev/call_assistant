import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Lock, CheckCircle, ArrowRight, Trophy } from "lucide-react-native";
import { colors, radius, touch, fonts, subjectColors } from "@/lib/theme";
import { apiGet } from "@/lib/api";

interface Skill { id: string; code: string; shortLabel: string | null; }
interface Item  { id: string; order: number; activityId: string; estMinutes: number; done: boolean; }
interface AtivaTrilha {
  assignmentId: string; trackId: string; title: string; subjectId: string; gradeYear: number;
  skills: Skill[]; totalItems: number; dueAt: string | null; concluidos: number;
  completedAt: string | null; items: Item[];
}
interface ProximoPasso {
  assignmentId: string; trackId: string; title: string; subjectId: string;
  skills: Skill[]; itemId: string; activityId: string; ordem: number; total: number;
  estMinutes: number; dueAt: string | null;
}

function subjectColor(id: string) { return (subjectColors as Record<string,string>)[id] ?? colors.action; }

export default function AlunoTrilha() {
  const insets = useSafeAreaInsets();
  const [proximoPasso, setProximoPasso] = useState<ProximoPasso | null | undefined>(undefined);
  const [ativas, setAtivas]             = useState<AtivaTrilha[]>([]);
  const [concluidas, setConcluidas]     = useState<AtivaTrilha[]>([]);
  const [erro, setErro]                 = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await apiGet<any>("/aluno/trilhas");
    if (!d) { setErro(true); return; }
    setProximoPasso(d.proximoPasso ?? null);
    setAtivas(d.ativas ?? []);
    setConcluidas(d.concluidas ?? []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  if (proximoPasso === undefined && !erro) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={colors.action}/>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <Text style={s.pageTitle}>Minha trilha</Text>

      {erro ? (
        <View style={s.card}>
          <Text style={s.cardText}>Não foi possível carregar. Tente de novo.</Text>
          <Pressable onPress={carregar} style={s.retry}><Text style={s.retryText}>Tentar de novo</Text></Pressable>
        </View>
      ) : proximoPasso ? (
        /* ── Próximo passo em destaque ── */
        <View style={[s.heroCard, { borderTopColor: subjectColor(proximoPasso.subjectId) }]}>
          <View style={[s.heroBand, { backgroundColor: subjectColor(proximoPasso.subjectId) }]}>
            <Text style={s.heroBandText}>{proximoPasso.subjectId}</Text>
          </View>
          <View style={s.heroBody}>
            <Text style={s.heroTitle}>{proximoPasso.title}</Text>
            {proximoPasso.skills[0] && (
              <Text style={s.heroSkill}>{proximoPasso.skills[0].shortLabel ?? proximoPasso.skills[0].code}</Text>
            )}
            <View style={s.heroMeta}>
              <Text style={s.metaText}>Atividade {proximoPasso.ordem} de {proximoPasso.total}</Text>
              <Text style={s.metaText}>~{proximoPasso.estMinutes} min</Text>
            </View>
            {/* Barra de progresso */}
            <View style={s.progBar}>
              <View style={[s.progFill, { width: `${((proximoPasso.ordem-1)/proximoPasso.total)*100}%`, backgroundColor: subjectColor(proximoPasso.subjectId) }]}/>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: "/aluno/atividade", params: { id: proximoPasso.activityId, assignmentId: proximoPasso.assignmentId, itemId: proximoPasso.itemId } })}
              style={[s.heroBtn, { backgroundColor: subjectColor(proximoPasso.subjectId) }]}
            >
              <Text style={s.heroBtnText}>Continuar</Text>
              <ArrowRight size={18} color="#fff"/>
            </Pressable>
          </View>
        </View>
      ) : ativas.length === 0 && concluidas.length === 0 ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Nenhuma trilha ainda</Text>
          <Text style={s.cardText}>Quando o professor indicar uma trilha, ela aparece aqui.</Text>
        </View>
      ) : null}

      {/* Trilhas ativas */}
      {ativas.map(a => <TrilhaCard key={a.assignmentId} t={a}/>)}

      {/* Trilhas concluídas */}
      {concluidas.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Concluídas</Text>
          {concluidas.map(a => <TrilhaCard key={a.assignmentId} t={a} concluida/>)}
        </>
      )}
    </ScrollView>
  );
}

function TrilhaCard({ t, concluida }: { t: AtivaTrilha; concluida?: boolean }) {
  const cor = subjectColor(t.subjectId);
  const pct = t.totalItems > 0 ? Math.round((t.concluidos / t.totalItems) * 100) : 0;
  const nextItem = t.items.find(i => !i.done);

  return (
    <View style={[s.card, { borderTopWidth: 3, borderTopColor: cor }]}>
      <Text style={s.cardTitle}>{t.title}</Text>
      {t.skills[0] && <Text style={s.heroSkill}>{t.skills[0].shortLabel ?? t.skills[0].code}</Text>}

      {/* Barrinhas de itens */}
      <View style={s.itemRow}>
        {t.items.map((it, idx) => {
          const done = it.done;
          const isNext = !concluida && nextItem?.id === it.id;
          return (
            <View key={it.id} style={[
              s.itemDot,
              done ? { backgroundColor: cor } : isNext ? { borderColor: cor, borderWidth: 2 } : { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 },
            ]}>
              {done ? <CheckCircle size={10} color="#fff"/> : !isNext ? <Lock size={8} color={colors.textMuted}/> : <Text style={[s.dotNum, { color: cor }]}>{idx+1}</Text>}
            </View>
          );
        })}
      </View>

      {/* Barra de progresso */}
      <View style={s.progBar}>
        <View style={[s.progFill, { width: `${pct}%`, backgroundColor: cor }]}/>
      </View>
      <Text style={s.metaText}>{t.concluidos} de {t.totalItems} atividades · {pct}%</Text>

      {concluida ? (
        <View style={[s.okBanner]}>
          <Trophy size={14} color="#D97706"/>
          <Text style={s.okText}>Trilha concluída!</Text>
        </View>
      ) : nextItem ? (
        <Pressable
          onPress={() => router.push({ pathname: "/aluno/atividade", params: { id: nextItem.activityId, assignmentId: t.assignmentId, itemId: nextItem.id } })}
          style={[s.contBtn, { borderColor: cor }]}
        >
          <Text style={[s.contBtnText, { color: cor }]}>Continuar</Text>
          <ArrowRight size={14} color={cor}/>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  pageTitle:   { ...fonts.title, fontSize: 22, color: colors.text },
  sectionTitle:{ ...fonts.subtitle, marginTop: 8 },
  heroCard:    { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  heroBand:    { paddingVertical: 6, paddingHorizontal: 14 },
  heroBandText:{ color: "#fff", fontSize: 12, fontWeight: "600" },
  heroBody:    { padding: 16, gap: 8 },
  heroTitle:   { ...fonts.title, fontSize: 17 },
  heroSkill:   { ...fonts.body, color: colors.textMuted, fontSize: 12 },
  heroMeta:    { flexDirection: "row", justifyContent: "space-between" },
  metaText:    { ...fonts.body, color: colors.textMuted, fontSize: 12 },
  progBar:     { height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  progFill:    { height: "100%", borderRadius: 3 },
  heroBtn:     { borderRadius: radius.btn, paddingVertical: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, ...touch },
  heroBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  card:        { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  cardTitle:   { ...fonts.subtitle },
  cardText:    { ...fonts.body, color: colors.textMuted },
  itemRow:     { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  itemDot:     { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  dotNum:      { fontSize: 11, fontWeight: "700" },
  okBanner:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF3C7", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  okText:      { color: "#92400E", fontWeight: "600", fontSize: 13 },
  contBtn:     { borderWidth: 1.5, borderRadius: radius.btn, paddingVertical: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, ...touch },
  contBtnText: { fontWeight: "600", fontSize: 14 },
  retry:       { padding: 10, alignItems: "center" },
  retryText:   { color: colors.action, fontWeight: "600" },
});
