import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BookOpen, Zap, Edit3, AlertCircle, RefreshCw, ChevronRight, Plus } from "lucide-react-native";
import { colors, radius, touch, fonts } from "@/lib/theme";
import { apiGet, apiPost } from "@/lib/api";

interface Oferta { id: string; name: string; gradeYear: number; }
interface Objetivo { code: string; description: string; selecionado: boolean; }

export default function ProfessorAulaHoje() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1|2|3|4|5|6>(1);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [ofertaId, setOfertaId] = useState<string | null>(null);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [material, setMaterial] = useState("");
  const [perguntas, setPerguntas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [aulaId, setAulaId] = useState<string | null>(null);

  const carregarOfertas = useCallback(async () => {
    const d = await apiGet<{ ofertas: Oferta[] }>("/professor/ofertas");
    setOfertas(d?.ofertas ?? []);
  }, []);

  useEffect(() => { carregarOfertas(); }, [carregarOfertas]);

  // Passo 2: Sugerir objetivos via IA
  const sugerirObjetivos = async () => {
    if (!ofertaId) return;
    setLoading(true); setErro("");
    const d = await apiPost<{ objetivos: Objetivo[] }>("/professor/aulas/sugerir-objetivos", { ofertaId, material });
    setLoading(false);
    if (!d) { setErro("Não foi possível sugerir objetivos. Tente novamente."); return; }
    setObjetivos((d.objetivos ?? []).map(o => ({ ...o, selecionado: true })));
    setStep(3);
  };

  // Passo 4: Gerar perguntas via IA
  const gerarPerguntas = async () => {
    setLoading(true); setErro("");
    const codigosSelecionados = objetivos.filter(o => o.selecionado).map(o => o.code);
    const d = await apiPost<{ perguntas: string[] }>("/professor/aulas/gerar-perguntas", { ofertaId, objetivos: codigosSelecionados, material });
    setLoading(false);
    if (!d) { setErro("Não foi possível gerar perguntas. Tente novamente."); return; }
    setPerguntas(d.perguntas ?? []);
    setStep(5);
  };

  // Passo 6: Publicar aula
  const publicar = async () => {
    setLoading(true); setErro("");
    const d = await apiPost<{ aulaId: string }>("/professor/aulas/nova", { ofertaId, material, objetivos: objetivos.filter(o=>o.selecionado).map(o=>o.code), perguntas });
    setLoading(false);
    if (!d) { setErro("Não foi possível publicar a aula. Tente novamente."); return; }
    setAulaId(d.aulaId);
    setStep(6);
  };

  const header = (title: string, sub?: string) => (
    <View style={s.stepHeader}>
      <Text style={s.stepTitle}>{title}</Text>
      {sub && <Text style={s.stepSub}>{sub}</Text>}
    </View>
  );

  // Passo 1: escolher turma
  if (step === 1) return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]}>
      {header("Nova Aula", "Passo 1: Escolha a turma")}
      {ofertas.map(o => (
        <Pressable key={o.id} style={[s.optCard, ofertaId === o.id && s.optSelected]} onPress={() => { setOfertaId(o.id); setStep(2); }}>
          <Text style={s.optText}>{o.name} · {o.gradeYear}º ano</Text>
          <ChevronRight size={16} color={colors.action} />
        </Pressable>
      ))}
      {ofertas.length === 0 && <Text style={s.hint}>Nenhuma turma atribuída. Peça à coordenação.</Text>}
    </ScrollView>
  );

  // Passo 2: material
  if (step === 2) return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]}>
      {header("Nova Aula", "Passo 2: Descreva o conteúdo da aula (opcional)")}
      <TextInput style={s.textArea} multiline numberOfLines={5} placeholder="Ex.: Frações equivalentes — comparação de 1/2 e 2/4..." value={material} onChangeText={setMaterial} placeholderTextColor="#8B7FA8" />
      {erro ? <Text style={s.erroText}>{erro}</Text> : null}
      <Pressable style={s.btn} onPress={() => loading ? undefined : sugerirObjetivos()}>
        {loading ? <ActivityIndicator color="#fff" /> : <><Zap size={16} color="#fff" /><Text style={s.btnText}>Sugerir objetivos com IA</Text></>}
      </Pressable>
      <Pressable style={[s.btn, s.btnSecundario]} onPress={() => setStep(3)}>
        <Text style={[s.btnText, { color: colors.action }]}>Pular → definir objetivos manualmente</Text>
      </Pressable>
    </ScrollView>
  );

  // Passo 3: objetivos
  if (step === 3) return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]}>
      {header("Nova Aula", "Passo 3: Confirme os objetivos da aula")}
      {objetivos.map(o => (
        <Pressable key={o.code} style={[s.optCard, o.selecionado && s.optSelected]} onPress={() => setObjetivos(prev => prev.map(x => x.code === o.code ? { ...x, selecionado: !x.selecionado } : x))}>
          <View style={{ flex: 1 }}>
            <Text style={s.optCode}>{o.code}</Text>
            <Text style={s.optText}>{o.description}</Text>
          </View>
        </Pressable>
      ))}
      {objetivos.length === 0 && <Text style={s.hint}>Nenhum objetivo sugerido. Vá ao próximo passo para continuar.</Text>}
      <Pressable style={s.btn} onPress={() => setStep(4)}>
        <Text style={s.btnText}>Próximo: Gerar perguntas</Text>
      </Pressable>
    </ScrollView>
  );

  // Passo 4: gerar perguntas
  if (step === 4) return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]}>
      {header("Nova Aula", "Passo 4: Gerar perguntas com IA")}
      {erro ? <Text style={s.erroText}>{erro}</Text> : null}
      <Pressable style={s.btn} onPress={() => loading ? undefined : gerarPerguntas()}>
        {loading ? <ActivityIndicator color="#fff" /> : <><Zap size={16} color="#fff" /><Text style={s.btnText}>Gerar perguntas</Text></>}
      </Pressable>
      <Pressable style={[s.btn, s.btnSecundario]} onPress={() => { setPerguntas([]); setStep(5); }}>
        <Text style={[s.btnText, { color: colors.action }]}>Criar perguntas manualmente</Text>
      </Pressable>
    </ScrollView>
  );

  // Passo 5: editar/revisar perguntas
  if (step === 5) return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]}>
      {header("Nova Aula", "Passo 5: Edite as perguntas antes de publicar")}
      {perguntas.map((p, i) => (
        <View key={i} style={s.perguntaCard}>
          <Text style={s.perguntaNum}>Pergunta {i + 1}</Text>
          <TextInput
            style={s.perguntaInput}
            value={p}
            onChangeText={t => setPerguntas(prev => prev.map((x, j) => j === i ? t : x))}
            multiline
            placeholderTextColor="#8B7FA8"
          />
        </View>
      ))}
      <Pressable style={[s.btn, s.btnSecundario]} onPress={() => setPerguntas(prev => [...prev, ""])}>
        <Plus size={16} color={colors.action} />
        <Text style={[s.btnText, { color: colors.action }]}>Adicionar pergunta</Text>
      </Pressable>
      {erro ? <Text style={s.erroText}>{erro}</Text> : null}
      <Pressable style={s.btn} onPress={() => loading ? undefined : publicar()}>
        {loading ? <ActivityIndicator color="#fff" /> : <><BookOpen size={16} color="#fff" /><Text style={s.btnText}>Publicar aula</Text></>}
      </Pressable>
    </ScrollView>
  );

  // Passo 6: aula publicada
  return (
    <View style={[s.center, { paddingTop: insets.top + 16 }]}>
      <BookOpen size={48} color={colors.action} />
      <Text style={s.successTitle}>Aula publicada!</Text>
      <Text style={s.hint}>Os alunos já podem responder pelo código no projetor.</Text>
      {aulaId && (
        <Pressable style={s.btn} onPress={() => router.push(`/professor/aula/${aulaId}`)}>
          <Text style={s.btnText}>Ver painel da aula</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F8F7FC" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F7FC", padding: 24 },
  stepHeader: { marginBottom: 20 },
  stepTitle: { fontFamily: fonts.bold, fontSize: 22, color: "#1F1A2E" },
  stepSub: { fontFamily: fonts.regular, fontSize: 14, color: "#5B5470", marginTop: 4 },
  optCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: "#E9E5F5", marginBottom: 8, minHeight: touch },
  optSelected: { borderColor: colors.action, backgroundColor: "#EDE9FE" },
  optText: { fontFamily: fonts.medium, fontSize: 14, color: "#1F1A2E", flex: 1 },
  optCode: { fontFamily: fonts.mono ?? fonts.medium, fontSize: 11, color: "#5B5470", marginBottom: 2 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.action, borderRadius: radius.md, paddingVertical: 14, minHeight: touch, marginTop: 12 },
  btnSecundario: { backgroundColor: "#EDE9FE", marginTop: 8 },
  btnText: { color: "#fff", fontFamily: fonts.semibold, fontSize: 15 },
  erroText: { color: "#B91C1C", fontFamily: fonts.medium, fontSize: 13, textAlign: "center", marginVertical: 8 },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: "#8B7FA8", textAlign: "center", marginVertical: 16 },
  textArea: { backgroundColor: "#fff", borderRadius: radius.md, borderWidth: 1, borderColor: "#E9E5F5", padding: 12, fontFamily: fonts.regular, fontSize: 14, color: "#1F1A2E", minHeight: 120, textAlignVertical: "top", marginBottom: 8 },
  perguntaCard: { backgroundColor: "#fff", borderRadius: radius.md, borderWidth: 1, borderColor: "#E9E5F5", padding: 12, marginBottom: 8 },
  perguntaNum: { fontFamily: fonts.semibold, fontSize: 12, color: "#5B5470", marginBottom: 4 },
  perguntaInput: { fontFamily: fonts.regular, fontSize: 14, color: "#1F1A2E", minHeight: 60, textAlignVertical: "top" },
  successTitle: { fontFamily: fonts.bold, fontSize: 22, color: "#1F1A2E", marginTop: 16, marginBottom: 8 },
});
