import { useState, useRef, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Animated, Dimensions, Platform, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AuthApi } from "@infrastructure/api/AuthApi";

const { width: SCREEN_W } = Dimensions.get("window");

const LEVELS = [
  { value: "A1", label: "A1", desc: "Conheço palavras básicas" },
  { value: "A2", label: "A2", desc: "Consigo frases simples" },
  { value: "B1", label: "B1", desc: "Me viro em conversas" },
  { value: "B2", label: "B2", desc: "Trabalho com inglês mas travo às vezes" },
  { value: "C1", label: "C1", desc: "Inglês fluente, quero refinar" },
];

const FEATURES = [
  { emoji: "🔧", title: "Ferramentas de IA", desc: "Melhore textos, gere respostas e simule entrevistas com IA" },
  { emoji: "🎙️", title: "SpeakFlow Live", desc: "Copiloto em tempo real durante suas calls em inglês" },
  { emoji: "👥", title: "Circles", desc: "Grupos de prática com desafios semanais" },
];

function getRecommendation(level: string | null): { label: string; route: string } {
  if (!level || level === "A1" || level === "A2") {
    return { label: "Melhorar um texto", route: "/(app)/tools/improve" };
  }
  if (level === "B1" || level === "B2") {
    return { label: "Simular uma entrevista", route: "/(app)/tools/interview" };
  }
  return { label: "Ativar o Live Assist", route: "/(app)/live" };
}

interface Props {
  userName: string;
  credits: number;
  onDone: () => void;
}

export default function OnboardingScreen({ userName, credits, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0); // 0-3
  const [level, setLevel] = useState<string | null>(null);
  const [featureIdx, setFeatureIdx] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function animateTo(nextStep: number) {
    const dir = nextStep > step ? 1 : -1;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir * -30, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(dir * 30);
      setStep(nextStep);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  }

  async function complete(targetRoute?: string) {
    try {
      await AuthApi.onboardingComplete();
      if (level) {
        await SecureStore.setItemAsync("sf_onboarding_level", level);
      }
    } catch { /* silent */ }
    onDone();
    if (targetRoute) {
      setTimeout(() => router.push(targetRoute as never), 100);
    }
  }

  const rec = getRecommendation(level);
  const firstName = userName.split(" ")[0];

  return (
    <View style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "#09090b", zIndex: 9999,
      paddingTop: insets.top, paddingBottom: insets.bottom,
    }}>
      {/* Background glow */}
      <LinearGradient
        colors={["rgba(124,58,237,0.20)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 300 }}
      />

      {/* Skip button */}
      <TouchableOpacity
        onPress={() => complete()}
        style={{ position: "absolute", top: insets.top + 12, right: 20, zIndex: 10 }}
      >
        <Text style={{ color: "#71717a", fontSize: 14 }}>Pular</Text>
      </TouchableOpacity>

      {/* Progress dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 16, paddingTop: 8 }}>
        {[0, 1, 2, 3].map((s) => (
          <View
            key={s}
            style={{
              height: 6, borderRadius: 3,
              width: s === step ? 20 : 8,
              backgroundColor: s <= step ? "#7c3aed" : "#27272a",
            }}
          />
        ))}
      </View>

      <Animated.View style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}>
        {/* ── Step 0: Boas-vindas ── */}
        {step === 0 && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 20 }}>
            <Text style={{ fontSize: 56 }}>🎉</Text>
            <View style={{ alignItems: "center", gap: 8 }}>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center" }}>
                Bem-vindo ao SpeakFlow,{"\n"}{firstName}!
              </Text>
              <Text style={{ color: "#71717a", fontSize: 14, textAlign: "center", lineHeight: 22 }}>
                Você está a um passo de evoluir seu inglês profissional com IA.
              </Text>
            </View>
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              backgroundColor: "rgba(124,58,237,0.15)",
              borderWidth: 1, borderColor: "rgba(124,58,237,0.3)",
              borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18,
            }}>
              <Text style={{ fontSize: 18 }}>⚡</Text>
              <Text style={{ color: "#c4b5fd", fontSize: 14, fontWeight: "600" }}>
                Você recebeu <Text style={{ color: "#fff", fontWeight: "700" }}>{credits} créditos</Text> para começar
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => animateTo(1)}
              style={{
                marginTop: 8, width: "100%", borderRadius: 16,
                backgroundColor: "#7c3aed", paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Começar →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 1: Nível ── */}
        {step === 1 && (
          <View style={{ flex: 1, padding: 24, gap: 16 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Me conta sobre seu inglês</Text>
              <Text style={{ color: "#71717a", fontSize: 14 }}>Qual nível te descreve melhor hoje?</Text>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                {LEVELS.map((l) => {
                  const selected = level === l.value;
                  return (
                    <TouchableOpacity
                      key={l.value}
                      onPress={() => setLevel(l.value)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 14,
                        borderRadius: 14, borderWidth: 1,
                        borderColor: selected ? "#7c3aed" : "#27272a",
                        backgroundColor: selected ? "rgba(124,58,237,0.15)" : "rgba(24,24,27,0.8)",
                        paddingVertical: 14, paddingHorizontal: 16,
                      }}
                    >
                      <View style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: selected ? "#7c3aed" : "#27272a",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ color: selected ? "#fff" : "#71717a", fontSize: 12, fontWeight: "700" }}>
                          {l.label}
                        </Text>
                      </View>
                      <Text style={{ color: selected ? "#e4e4e7" : "#a1a1aa", fontSize: 14, flex: 1 }}>
                        {l.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => animateTo(0)}
                style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: "#27272a" }}
              >
                <Text style={{ color: "#71717a", fontSize: 14 }}>← Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => level && animateTo(2)}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 14,
                  backgroundColor: level ? "#7c3aed" : "#27272a",
                  alignItems: "center", opacity: level ? 1 : 0.5,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Step 2: Tour ── */}
        {step === 2 && (
          <View style={{ flex: 1, padding: 24, gap: 16 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>O que você vai encontrar</Text>
              <Text style={{ color: "#71717a", fontSize: 14 }}>Toque em cada card para saber mais</Text>
            </View>
            <View style={{ flex: 1, gap: 12 }}>
              {FEATURES.map((f, i) => (
                <TouchableOpacity
                  key={f.title}
                  onPress={() => setFeatureIdx(i)}
                  style={{
                    flexDirection: "row", alignItems: "flex-start", gap: 14,
                    borderRadius: 16, borderWidth: 1,
                    borderColor: featureIdx === i ? "#7c3aed" : "#27272a",
                    backgroundColor: featureIdx === i ? "rgba(124,58,237,0.12)" : "rgba(24,24,27,0.8)",
                    padding: 16,
                  }}
                >
                  <View style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: "rgba(124,58,237,0.25)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 22 }}>{f.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: "#e4e4e7", fontSize: 14, fontWeight: "600" }}>{f.title}</Text>
                    <Text style={{ color: "#71717a", fontSize: 12, lineHeight: 18 }}>{f.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            {/* Dots */}
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 5 }}>
              {FEATURES.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setFeatureIdx(i)}>
                  <View style={{
                    height: 6, borderRadius: 3,
                    width: i === featureIdx ? 16 : 6,
                    backgroundColor: i === featureIdx ? "#7c3aed" : "#27272a",
                  }} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => animateTo(1)}
                style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: "#27272a" }}
              >
                <Text style={{ color: "#71717a", fontSize: 14 }}>← Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => animateTo(3)}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#7c3aed", alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Entendi →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Step 3: Primeira ação ── */}
        {step === 3 && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 20 }}>
            <Text style={{ fontSize: 52 }}>🚀</Text>
            <View style={{ alignItems: "center", gap: 8 }}>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center" }}>
                Pronto para começar!
              </Text>
              <Text style={{ color: "#71717a", fontSize: 14, textAlign: "center", lineHeight: 22 }}>
                Com base no seu nível, aqui está a melhor primeira ação:
              </Text>
            </View>
            <View style={{
              width: "100%", borderRadius: 16,
              borderWidth: 1, borderColor: "rgba(124,58,237,0.35)",
              backgroundColor: "rgba(124,58,237,0.12)",
              padding: 18, gap: 4,
            }}>
              <Text style={{ color: "#a78bfa", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
                Recomendado para você
              </Text>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>{rec.label}</Text>
            </View>
            <TouchableOpacity
              onPress={() => complete(rec.route)}
              style={{
                width: "100%", borderRadius: 16, paddingVertical: 16, alignItems: "center",
                backgroundColor: "#7c3aed",
              }}
            >
              <LinearGradient
                colors={["#7c3aed", "#4f46e5"]}
                style={{
                  position: "absolute", inset: 0, borderRadius: 16,
                }}
              />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                {rec.label} →
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => complete()}>
              <Text style={{ color: "#52525b", fontSize: 13 }}>Explorar por conta própria</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}
