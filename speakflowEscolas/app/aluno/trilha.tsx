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
        <>
          <Text style={s.sectionLabel}>Seu próximo passo</Text>
          <View style={s.heroCard}>
            {/* Linha superior: componente · trilha */}
            <Text style={s.heroBandText} numberOfLines={1}>
              {proximoPasso.subjectId} · {proximoPasso.title}
            </Text>
            {/* Habilidade em linguagem simples */}
            {proximoPasso.skills[0] && (
              <Text style={s.heroSkill} numberOfLines={2}>
                {proximoPasso.skills[0].shortLabel ?? proximoPasso.skills[0].code}
              </Text>
            )}
            {/* Meta: atividade N de M · ~X min */}
            <View style={s.heroMeta}>
              <Text style={s.metaWhite}>Atividade {proximoPasso.ordem} de {proximoPasso.total}</Text>
              <Text style={s.metaWhite}>cerca de {proximoPasso.estMinutes} min</Text>
            </View>
            {/* Barra de progresso branca */}
            <View style={s.progBar}>
              <View style={[s.progFill, { width: `${((proximoPasso.ordem - 1) / proximoPasso.total) * 100}%` }]} />
            </View>
            {/* Botão Continuar */}
            <Pressable
              onPress={() => router.push({ pathname: "/aluno/atividade", params: { id: proximoPasso.activityId, assignmentId: proximoPasso.assignmentId, itemId: proximoPasso.itemId } })}
              style={s.heroBtn}
            >
              <Text style={s.heroBtnText}>Continuar</Text>
              <ArrowRight size={18} color={colors.action} />
            </Pressable>
          </View>
        </>
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
      {t.skills[0] && <Text style={s.cardSkill}>{t.skills[0].shortLabel ?? t.skills[0].code}</Text>}

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
  pageTitle:    { ...fonts.title, fontSize: 22, color: colors.text },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, fontFamily: fonts.bold, marginBottom: -4 },
  sectionTitle: { ...fonts.subtitle, marginTop: 8 },
  // Hero card: fundo roxo profundo, texto branco
  heroCard:    { backgroundColor: colors.actionTint, borderRadius: radius.card, padding: 20, gap: 10 },
  heroBandText:{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600", fontFamily: fonts.semibold },
  heroSkill:   { color: "#fff", fontSize: 18, fontWeight: "800", fontFamily: fonts.extrabold, lineHeight: 24 },
  cardSkill:   { ...fonts.body, color: colors.textMuted, fontSize: 12 },
  heroMeta:    { flexDirection: "row", justifyContent: "space-between" },
  metaWhite:   { color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: fonts.regular },
  metaText:    { ...fonts.body, color: colors.textMuted, fontSize: 12 },
  progBar:     { height: 5, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 3, overflow: "hidden" },
  progFill:    { height: "100%", borderRadius: 3, backgroundColor: "#fff" },
  heroBtn:     { backgroundColor: "#fff", borderRadius: radius.btn, paddingVertical: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, ...touch, marginTop: 4 },
  heroBtnText: { color: colors.action, fontWeight: "800", fontSize: 15, fontFamily: fonts.extrabold },
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
