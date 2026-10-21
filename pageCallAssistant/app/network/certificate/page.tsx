"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Assessment {
  id: string;
  level: string;
  levelLabel: string;
  confidence: string;
  fluencyAvg: number;
  contentAvg: number;
  clarityAvg: number;
  totalAvg: number;
  strengths: string[];
  improvements: string[];
  overallFeedback: string;
  submissionsUsed: number;
  isEligible: boolean;
  createdAt: string;
}

interface Me { id: string; name: string; email: string }

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A1: { bg: "#e5e7eb", text: "#374151", border: "#9ca3af" },
  A2: { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" },
  B1: { bg: "#d1fae5", text: "#065f46", border: "#10b981" },
  B2: { bg: "#dbeafe", text: "#1e40af", border: "#3b82f6" },
  C1: { bg: "#ede9fe", text: "#4c1d95", border: "#7c3aed" },
  C2: { bg: "#fdf2f8", text: "#831843", border: "#ec4899" },
};

export default function CertificatePage() {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [notEligible, setNotEligible] = useState(false);
  const [notPremium, setNotPremium] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/network/proficiency").then((r) => r.json()),
    ]).then(([meData, assessData]) => {
      setMe(meData);
      if (meData?.plan !== "premium") { setNotPremium(true); return; }
      if (!assessData || !assessData.isEligible) {
        setNotEligible(true);
      } else {
        setAssessment({ ...assessData, strengths: assessData.strengths ?? [], improvements: assessData.improvements ?? [] });
      }
    }).catch(() => setNotEligible(true))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => window.print();

  const colors = assessment ? (LEVEL_COLORS[assessment.level] ?? LEVEL_COLORS.B1) : LEVEL_COLORS.B1;
  const issueDate = assessment ? new Date(assessment.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "";
  const certNumber = assessment ? `SF-${assessment.id.slice(-8).toUpperCase()}` : "";

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-muted-foreground text-sm animate-pulse">Carregando certificado...</div>
    </div>
  );

  if (notPremium) return (
    <div className="max-w-xl mx-auto text-center space-y-4 py-20">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto">
        <Award className="h-8 w-8 text-amber-400" />
      </div>
      <h2 className="text-xl font-bold">Certificado Exclusivo Premium</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        O Certificado de Proficiência SpeakFlow é um benefício exclusivo do plano <strong className="text-amber-400">Premium</strong>.<br />
        Faça upgrade para avaliar seu nível CEFR (A1–C2) e gerar seu certificado oficial.
      </p>
      <div className="flex gap-3 justify-center">
        <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"><Link href="/pricing">Ver Plano Premium</Link></Button>
        <Button variant="outline" asChild><Link href="/network/progress">Meu Progresso</Link></Button>
      </div>
    </div>
  );

  if (notEligible) return (
    <div className="max-w-xl mx-auto text-center space-y-4 py-20">
      <Award className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
      <h2 className="text-xl font-bold">Certificado não disponível</h2>
      <p className="text-sm text-muted-foreground">Você precisa completar uma Avaliação de Proficiência com nível B1 ou superior para gerar seu certificado.</p>
      <Button asChild><Link href="/network/progress">Ver meu Progresso</Link></Button>
    </div>
  );

  if (!assessment || !me) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild><Link href="/network/progress"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-xl font-bold">Certificado de Proficiência</h1>
            <p className="text-xs text-muted-foreground">SpeakFlow Network · Nível {assessment.level} {assessment.levelLabel}</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
          <Download className="h-4 w-4" />Salvar / Imprimir
        </Button>
      </div>

      {/* CERTIFICATE */}
      <div ref={certRef} className="print:m-0 print:shadow-none">
        <div style={{
          background: "white",
          color: "#111",
          fontFamily: "'Georgia', serif",
          border: `4px solid ${colors.border}`,
          borderRadius: "16px",
          padding: "60px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}>
          {/* Background decoration */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: `radial-gradient(ellipse at top right, ${colors.bg}88 0%, transparent 60%)`,
            pointerEvents: "none",
          }} />

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "40px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontSize: "20px", fontWeight: "bold", fontFamily: "sans-serif" }}>S</span>
              </div>
              <span style={{ fontSize: "22px", fontWeight: "700", fontFamily: "sans-serif", color: "#111" }}>SpeakFlow</span>
            </div>
            <p style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase", color: "#6b7280", fontFamily: "sans-serif" }}>Network · English Proficiency</p>
          </div>

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: "32px", position: "relative" }}>
            <p style={{ fontSize: "12px", letterSpacing: "6px", textTransform: "uppercase", color: "#9ca3af", marginBottom: "12px", fontFamily: "sans-serif" }}>This certifies that</p>
            <h1 style={{ fontSize: "42px", fontWeight: "400", color: "#111", marginBottom: "8px", fontStyle: "italic" }}>{me.name}</h1>
            <div style={{ width: "120px", height: "2px", background: colors.border, margin: "0 auto 16px" }} />
            <p style={{ fontSize: "13px", color: "#6b7280", fontFamily: "sans-serif" }}>has demonstrated English proficiency at</p>
          </div>

          {/* Level Badge */}
          <div style={{ textAlign: "center", marginBottom: "36px", position: "relative" }}>
            <div style={{
              display: "inline-block",
              background: colors.bg,
              border: `2px solid ${colors.border}`,
              borderRadius: "16px",
              padding: "20px 48px",
            }}>
              <div style={{ fontSize: "56px", fontWeight: "700", color: colors.text, fontFamily: "sans-serif", lineHeight: 1 }}>{assessment.level}</div>
              <div style={{ fontSize: "16px", color: colors.text, fontFamily: "sans-serif", marginTop: "4px", fontWeight: "600" }}>{assessment.levelLabel}</div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "sans-serif", marginTop: "2px", letterSpacing: "2px", textTransform: "uppercase" }}>CEFR Standard</div>
            </div>
          </div>

          {/* Scores */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "36px", position: "relative" }}>
            {[
              { label: "Fluency", value: assessment.fluencyAvg },
              { label: "Content", value: assessment.contentAvg },
              { label: "Clarity", value: assessment.clarityAvg },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: "center", background: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "28px", fontWeight: "700", color: colors.text, fontFamily: "sans-serif" }}>{value.toFixed(1)}</div>
                <div style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Overall feedback */}
          <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "20px 24px", marginBottom: "36px", position: "relative" }}>
            <p style={{ fontSize: "13px", color: "#374151", lineHeight: "1.7", fontFamily: "sans-serif", textAlign: "center", fontStyle: "italic" }}>
              &ldquo;{assessment.overallFeedback}&rdquo;
            </p>
          </div>

          {/* Strengths */}
          {assessment.strengths.length > 0 && (
            <div style={{ marginBottom: "36px", position: "relative" }}>
              <p style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: "#9ca3af", marginBottom: "12px", fontFamily: "sans-serif" }}>Demonstrated Strengths</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {assessment.strengths.map((s, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: colors.bg, color: colors.text, borderRadius: "20px", padding: "4px 14px", fontSize: "12px", fontFamily: "sans-serif", border: `1px solid ${colors.border}` }}>
                    <span style={{ fontSize: "10px" }}>✓</span>{s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "24px", borderTop: "1px solid #e5e7eb", position: "relative" }}>
            <div>
              <p style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "sans-serif", marginBottom: "4px" }}>Issue Date</p>
              <p style={{ fontSize: "13px", color: "#374151", fontFamily: "sans-serif", fontWeight: "600" }}>{issueDate}</p>
              <p style={{ fontSize: "10px", color: "#d1d5db", fontFamily: "sans-serif", marginTop: "4px" }}>Certificate #{certNumber}</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "sans-serif", marginBottom: "8px" }}>Based on {assessment.submissionsUsed} evaluated responses</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }} />
                <span style={{ fontSize: "11px", color: "#6b7280", fontFamily: "sans-serif" }}>Verified by SpeakFlow AI</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#7c3aed", fontFamily: "sans-serif" }}>SpeakFlow</div>
              <div style={{ width: "120px", height: "1px", background: "#e5e7eb", margin: "4px 0 4px auto" }} />
              <p style={{ fontSize: "10px", color: "#d1d5db", fontFamily: "sans-serif" }}>speakflow.com.br</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info below cert - not printed */}
      <div className="print:hidden rounded-xl border border-border/50 bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">Certificado verificável</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Este certificado é gerado com base em {assessment.submissionsUsed} respostas avaliadas pela IA do SpeakFlow.
          Código de verificação: <span className="font-mono text-violet-400">{certNumber}</span>
        </p>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Áreas para desenvolver:</p>
          <ul className="space-y-1">
            {assessment.improvements.map((imp, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-amber-400 shrink-0 mt-0.5">→</span>{imp}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:m-0 { margin: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
