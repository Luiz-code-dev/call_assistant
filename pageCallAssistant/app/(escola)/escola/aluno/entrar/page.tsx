"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { QrCode, Monitor, ListOrdered, MessageSquare, Delete } from "lucide-react";

type LoginMode = "select" | "qr" | "aula" | "manual";
type ManualStep = "turma" | "matricula" | "pin";

interface StudentItem { id: string; display: string; loginMode: string; }
interface SessionData { sessionId: string; classId: string; className: string; students: StudentItem[]; }

const PICTURES = [
  { id: "sun",    emoji: "☀️",  label: "Sol" },
  { id: "cat",    emoji: "🐱",  label: "Gato" },
  { id: "ball",   emoji: "⚽",  label: "Bola" },
  { id: "tree",   emoji: "🌳",  label: "Árvore" },
  { id: "house",  emoji: "🏠",  label: "Casa" },
  { id: "fish",   emoji: "🐟",  label: "Peixe" },
  { id: "flower", emoji: "🌸",  label: "Flor" },
  { id: "book",   emoji: "📚",  label: "Livro" },
  { id: "heart",  emoji: "❤️",  label: "Coração" },
];

const BACK_BTN: React.CSSProperties = {
  background: "none", border: "none", color: "#6D28D9", fontSize: 15,
  fontWeight: 600, cursor: "pointer", padding: "8px 0", minHeight: 44,
  display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
};

const SCREEN: React.CSSProperties = {
  minHeight: "100vh", background: "#F8F7FC",
  display: "flex", flexDirection: "column", alignItems: "center",
};

function NumPad({ onPress, onDelete }: { onPress: (d: string) => void; onDelete: () => void }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: "100%", maxWidth: 320 }}>
      {keys.map((k, i) => (
        <button
          key={i} type="button"
          disabled={k === ""}
          onClick={() => k === "del" ? onDelete() : onPress(k)}
          style={{
            height: 72, borderRadius: 14, border: "none",
            background: k === "" ? "transparent" : "#FFFFFF",
            boxShadow: k === "" ? "none" : "0 1px 4px rgba(109,40,217,0.12)",
            fontSize: k === "del" ? 16 : 28, fontWeight: 700,
            color: "#3B0764", cursor: k === "" ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {k === "del" ? <Delete size={22} color="#6D28D9" /> : k}
        </button>
      ))}
    </div>
  );
}

function AlphaNumPad({ onPress, onDelete, onClear }: { onPress: (c: string) => void; onDelete: () => void; onClear: () => void }) {
  const rows = [
    ["Q","W","E","R","T","Y","U","I","O","P"],
    ["A","S","D","F","G","H","J","K","L"],
    ["Z","X","C","V","B","N","M"],
    ["1","2","3","4","5","6","7","8","9","0"],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {row.map(c => (
            <button key={c} type="button" onClick={() => onPress(c)}
              style={{ height: 52, minWidth: 36, flex: 1, maxWidth: 52, borderRadius: 10, border: "none", background: "#FFFFFF", boxShadow: "0 1px 3px rgba(109,40,217,0.10)", fontSize: 18, fontWeight: 700, color: "#3B0764", cursor: "pointer" }}>
              {c}
            </button>
          ))}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button type="button" onClick={onClear} style={{ height: 48, padding: "0 20px", borderRadius: 10, border: "none", background: "#EDE9FE", color: "#6D28D9", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Limpar</button>
        <button type="button" onClick={onDelete} style={{ height: 48, padding: "0 20px", borderRadius: 10, border: "none", background: "#EDE9FE", color: "#6D28D9", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Delete size={16} color="#6D28D9" /> Apagar</button>
      </div>
    </div>
  );
}

function AlunoEntrarInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [mode, setMode] = useState<LoginMode>("select");
  const [error, setError] = useState("");

  const aviso = sp.get("expirou") ? "Sua sessão expirou. Entre de novo." : sp.get("saiu") ? "Você saiu." : "";

  // Aula mode
  const [aulaCode, setAulaCode] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [searchLetter, setSearchLetter] = useState("");

  // PIN / picture
  const [pin, setPin] = useState("");
  const [picSequence, setPicSequence] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Manual mode — 3-step: turma → matrícula → PIN
  const [manualStep, setManualStep] = useState<ManualStep>("turma");
  const [turmaCode, setTurmaCode] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState("");

  async function safeJson(r: Response) {
    try { return await r.json(); } catch { return {}; }
  }

  // Load saved turma from sessionStorage (teacher sets once per day)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("sf_edu_turma");
      if (saved) setTurmaCode(saved);
    } catch { /* noop */ }
  }, []);

  async function enterAulaCode() {
    if (aulaCode.length !== 6) return;
    setError("");
    const r = await fetch("/api/escola/aluno/entrar/codigo-aula", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: aulaCode }),
    });
    const data = await safeJson(r);
    if (!r.ok) { setError(data.error ?? "Código inválido. Verifique e tente novamente."); return; }
    setSession(data);
  }

  async function loginStudent(studentId: string, loginMode: string) {
    if (!session) return;
    if (loginMode === "PIN" && pin.length < 4) { setError("Digite o PIN completo"); return; }
    if (loginMode === "PICTURE" && picSequence.length !== 3) { setError("Selecione 3 figuras"); return; }
    setSubmitting(true); setError("");
    const r = await fetch("/api/escola/aluno/entrar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "aula", studentId, sessionId: session.sessionId, pin: loginMode === "PIN" ? pin : undefined, pictureSequence: loginMode === "PICTURE" ? picSequence : undefined }),
    });
    const data = await safeJson(r);
    setSubmitting(false);
    if (!r.ok) { setError(data.error ?? "Não foi possível entrar. Tente novamente."); setPin(""); setPicSequence([]); return; }
    window.location.href = "/escola/aluno/painel";
  }

  async function loginManual() {
    if (!turmaCode || !enrollmentCode || pin.length < 4) { setError("Preencha todos os campos e o PIN"); return; }
    setSubmitting(true); setError("");
    const r = await fetch("/api/escola/aluno/entrar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "manual", accessCode: turmaCode, enrollmentCode, pin }),
    });
    const data = await safeJson(r);
    setSubmitting(false);
    if (!r.ok) { setError(data.error ?? "Matrícula ou PIN incorretos. Tente novamente."); setPin(""); return; }
    window.location.href = "/escola/aluno/painel";
  }

  function resetManual() {
    setManualStep("turma");
    setEnrollmentCode("");
    setPin("");
    setError("");
  }

  function saveTurmaAndContinue() {
    if (!turmaCode) return;
    try { sessionStorage.setItem("sf_edu_turma", turmaCode); } catch { /* noop */ }
    setManualStep("matricula");
    setError("");
  }

  const filteredStudents = session?.students.filter(s => searchLetter ? s.display.toUpperCase().startsWith(searchLetter) : true) ?? [];
  const letters = Array.from(new Set((session?.students ?? []).map(s => s.display[0].toUpperCase()))).sort();

  // PIN display: dots
  const pinDisplay = Array(6).fill("").map((_, i) => i < pin.length ? "●" : "○").join(" ");

  // Select mode screen
  if (mode === "select") return (
    <div style={{ minHeight: "100vh", background: "#F8F7FC", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", background: "#FFFFFF", borderBottom: "1px solid #E9E5F5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#6D28D9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MessageSquare size={16} color="#FFFFFF" strokeWidth={2} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#1F1A2E" }}>
            SpeakFlow <span style={{ color: "#6D28D9" }}>Escolas</span>
          </span>
        </div>
        <Link href="/escola/entrar" style={{ fontSize: 14, fontWeight: 600, color: "#6D28D9", textDecoration: "none" }}>
          Sou da equipe escolar
        </Link>
      </header>

      {/* Content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px 24px" }}>
        {aviso && (
          <div style={{ background: "#EDE9FE", border: "1px solid #DDD6EE", borderRadius: 12, padding: "12px 20px", marginBottom: 28, fontSize: 15, fontWeight: 600, color: "#4C1D95", textAlign: "center" }}>
            {aviso}
          </div>
        )}
        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#3B0764", textAlign: "center", margin: "0 0 12px" }}>
          Olá! Como você quer entrar?
        </h1>
        <p style={{ fontSize: 16, color: "#5B5470", textAlign: "center", margin: "0 0 48px" }}>
          Escolha uma opção. Se tiver dúvida, peça ajuda ao seu professor.
        </p>

        {/* BigChoiceButtons */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 960 }}>
          {/* Ler meu cartão */}
          <button
            onClick={() => setMode("qr")}
            style={{
              flex: "1 1 260px", maxWidth: 300, minHeight: 300,
              background: "#FFFFFF", border: "1.5px solid #C4B5FD",
              borderRadius: 24, padding: "32px 24px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 20, cursor: "pointer", transition: "border-color 0.15s",
            }}
            aria-label="Ler meu cartão"
          >
            <div style={{ width: 104, height: 104, background: "#EDE9FE", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <QrCode size={52} color="#6D28D9" strokeWidth={1.8} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: "#1F1A2E", margin: "0 0 8px" }}>Ler meu cartão</p>
              <p style={{ fontSize: 15, color: "#5B5470", margin: 0, lineHeight: 1.4 }}>Aponte a câmera para o QR code do cartão</p>
            </div>
          </button>

          {/* Código da aula */}
          <button
            onClick={() => setMode("aula")}
            style={{
              flex: "1 1 260px", maxWidth: 300, minHeight: 300,
              background: "#FFFFFF", border: "1.5px solid #99F6E4",
              borderRadius: 24, padding: "32px 24px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 20, cursor: "pointer", transition: "border-color 0.15s",
            }}
            aria-label="Código da aula"
          >
            <div style={{ width: 104, height: 104, background: "#CCFBF1", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Monitor size={52} color="#0F766E" strokeWidth={1.8} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: "#1F1A2E", margin: "0 0 8px" }}>Código da aula</p>
              <p style={{ fontSize: 15, color: "#5B5470", margin: 0, lineHeight: 1.4 }}>Digite o código que o professor mostrou</p>
            </div>
          </button>

          {/* Digitar matrícula */}
          <button
            onClick={() => setMode("manual")}
            style={{
              flex: "1 1 260px", maxWidth: 300, minHeight: 300,
              background: "#FFFFFF", border: "1.5px solid #FCD34D",
              borderRadius: 24, padding: "32px 24px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 20, cursor: "pointer", transition: "border-color 0.15s",
            }}
            aria-label="Digitar matrícula"
          >
            <div style={{ width: 104, height: 104, background: "#FFEDD5", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ListOrdered size={52} color="#C2410C" strokeWidth={1.8} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: "#1F1A2E", margin: "0 0 8px" }}>Digitar matrícula</p>
              <p style={{ fontSize: 15, color: "#5B5470", margin: 0, lineHeight: 1.4 }}>Código da turma e número de matrícula</p>
            </div>
          </button>
        </div>

        <p style={{ marginTop: 48, fontSize: 14, color: "#5B5470", textAlign: "center" }}>
          Este tablet é compartilhado. Ao terminar, toque sempre em <strong style={{ color: "#1F1A2E" }}>Sair</strong>.
        </p>
      </main>
    </div>
  );

  // QR / cartão mode — placeholder (câmera não implementada)
  if (mode === "qr") return (
    <div style={{ minHeight: "100vh", background: "#F8F7FC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <button onClick={() => { setMode("select"); setError(""); }} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#5B5470", fontSize: 15, cursor: "pointer", marginBottom: 24, minHeight: 44 }}>
        ← Voltar
      </button>
      <div style={{ width: 104, height: 104, background: "#EDE9FE", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <QrCode size={52} color="#6D28D9" strokeWidth={1.8} />
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1F1A2E", marginBottom: 8, textAlign: "center" }}>Ler meu cartão</h1>
      <p style={{ fontSize: 15, color: "#5B5470", textAlign: "center", maxWidth: 320 }}>
        A leitura de QR code estará disponível em breve. Use outra opção de entrada por enquanto.
      </p>
      <button onClick={() => setMode("select")} style={{ marginTop: 28, height: 48, padding: "0 32px", background: "#6D28D9", color: "#FFFFFF", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        Escolher outra opção
      </button>
    </div>
  );

  // ── Código da Aula — enter code ──────────────────────────────────────────
  if (mode === "aula" && !session) return (
    <div style={{ ...SCREEN, justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <button onClick={() => { setMode("select"); setAulaCode(""); setError(""); }} style={BACK_BTN}>← Voltar</button>
        <div style={{ width: 72, height: 72, background: "#CCFBF1", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "24px auto 16px" }}>
          <Monitor size={36} color="#0F766E" strokeWidth={1.8} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1F1A2E", textAlign: "center", margin: "0 0 8px" }}>Código da Aula</h1>
        <p style={{ fontSize: 15, color: "#5B5470", textAlign: "center", margin: "0 0 24px", lineHeight: 1.5 }}>
          Digite o código de 6 caracteres que o professor mostrou no quadro ou na tela.
        </p>
        <input
          value={aulaCode}
          onChange={e => { setAulaCode(e.target.value.toUpperCase().slice(0, 6)); setError(""); }}
          autoFocus
          maxLength={6}
          placeholder="A B C 1 2 3"
          autoCapitalize="characters"
          style={{
            width: "100%", boxSizing: "border-box", height: 72,
            border: "2px solid #C4B5FD", borderRadius: 16,
            background: "#FFFFFF", color: "#3B0764",
            fontSize: 36, fontWeight: 800, letterSpacing: "0.3em",
            textAlign: "center", outline: "none", fontFamily: "monospace",
          }}
        />
        {error && <p style={{ color: "#B91C1C", fontSize: 14, textAlign: "center", marginTop: 10 }}>{error}</p>}
        <button
          onClick={enterAulaCode}
          disabled={aulaCode.length !== 6}
          style={{ width: "100%", height: 56, marginTop: 16, background: aulaCode.length === 6 ? "#6D28D9" : "#C4B5FD", color: "#FFFFFF", border: "none", borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: aulaCode.length === 6 ? "pointer" : "not-allowed", fontFamily: "inherit" }}
        >
          Entrar na aula
        </button>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#9CA3AF" }}>
          O código é exibido pelo professor no computador ou projetor.
        </p>
      </div>
    </div>
  );

  // ── Aula — select student ──────────────────────────────────────────────
  if (mode === "aula" && session && !selectedStudent) return (
    <div style={{ ...SCREEN, alignItems: "stretch" }}>
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E9E5F5", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => { setSession(null); setAulaCode(""); }} style={BACK_BTN}>←</button>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "#1F1A2E" }}>{session.className}</p>
          <p style={{ margin: 0, fontSize: 14, color: "#5B5470" }}>Toque no seu nome</p>
        </div>
      </div>
      <div style={{ padding: "12px 16px 4px", display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button onClick={() => setSearchLetter("")}
          style={{ height: 40, minWidth: 56, padding: "0 12px", borderRadius: 10, border: "none", background: searchLetter === "" ? "#6D28D9" : "#EDE9FE", color: searchLetter === "" ? "#FFFFFF" : "#6D28D9", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Todos
        </button>
        {letters.map(l => (
          <button key={l} onClick={() => setSearchLetter(l === searchLetter ? "" : l)}
            style={{ height: 40, minWidth: 40, padding: "0 10px", borderRadius: 10, border: "none", background: searchLetter === l ? "#6D28D9" : "#EDE9FE", color: searchLetter === l ? "#FFFFFF" : "#6D28D9", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {filteredStudents.map(s => (
          <button key={s.id}
            onClick={() => { setSelectedStudent(s); setPin(""); setPicSequence([]); setError(""); }}
            style={{ background: "#FFFFFF", border: "1.5px solid #E9E5F5", borderRadius: 16, padding: "20px 12px", fontSize: 17, fontWeight: 700, color: "#1F1A2E", cursor: "pointer", textAlign: "center", minHeight: 72 }}>
            {s.display}
          </button>
        ))}
      </div>
      {error && <p style={{ color: "#B91C1C", fontSize: 14, textAlign: "center", padding: "0 16px 16px" }}>{error}</p>}
    </div>
  );

  // ── Aula — PIN or picture ───────────────────────────────────────────────
  if (mode === "aula" && session && selectedStudent) {
    const isPicture = selectedStudent.loginMode === "PICTURE";
    const pinDots = Array(6).fill("").map((_, i) => (
      <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: i < pin.length ? "#6D28D9" : "#DDD6EE" }} />
    ));
    return (
      <div style={{ ...SCREEN, padding: "24px 16px 32px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <button onClick={() => { setSelectedStudent(null); setPin(""); setPicSequence([]); setError(""); }} style={BACK_BTN}>← Voltar</button>
          <div style={{ textAlign: "center", margin: "16px 0 24px" }}>
            <div style={{ width: 72, height: 72, background: "#EDE9FE", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 32 }}>👤</div>
            <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#1F1A2E" }}>{selectedStudent.display}</h2>
            <p style={{ margin: 0, fontSize: 14, color: "#5B5470" }}>{isPicture ? "Selecione suas 3 figuras na ordem" : "Digite seu PIN"}</p>
          </div>
          {isPicture ? (
            <>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24 }}>
                {Array(3).fill("").map((_, i) => {
                  const pic = PICTURES.find(p => p.id === picSequence[i]);
                  return (
                    <div key={i} style={{ width: 64, height: 64, borderRadius: 14, border: `2px solid ${pic ? "#6D28D9" : "#DDD6EE"}`, background: pic ? "#EDE9FE" : "#F8F7FC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                      {pic?.emoji ?? "?"}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                {PICTURES.map(p => (
                  <button key={p.id}
                    onClick={() => { if (picSequence.length < 3) setPicSequence(seq => [...seq, p.id]); }}
                    disabled={picSequence.length >= 3}
                    style={{ height: 76, borderRadius: 14, border: "1.5px solid #E9E5F5", background: "#FFFFFF", fontSize: 32, cursor: picSequence.length >= 3 ? "not-allowed" : "pointer", opacity: picSequence.length >= 3 ? 0.4 : 1 }}>
                    {p.emoji}
                  </button>
                ))}
              </div>
              <button onClick={() => setPicSequence([])} style={{ ...BACK_BTN, margin: "0 auto" }}>Limpar</button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 24 }}>{pinDots}</div>
              <NumPad onPress={d => { if (pin.length < 6) setPin(p => p + d); }} onDelete={() => setPin(p => p.slice(0, -1))} />
            </>
          )}
          {error && <p style={{ color: "#B91C1C", fontSize: 14, textAlign: "center", marginTop: 16 }}>{error}</p>}
          <button
            onClick={() => loginStudent(selectedStudent.id, selectedStudent.loginMode)}
            disabled={submitting || (isPicture ? picSequence.length !== 3 : pin.length < 4)}
            style={{ width: "100%", height: 56, marginTop: 20, background: "#6D28D9", color: "#FFFFFF", border: "none", borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: "pointer", opacity: (submitting || (isPicture ? picSequence.length !== 3 : pin.length < 4)) ? 0.5 : 1, fontFamily: "inherit" }}>
            {submitting ? "Verificando..." : "Entrar"}
          </button>
        </div>
      </div>
    );
  }

  // ── Manual mode — Step: turma ──────────────────────────────────────────
  if (mode === "manual" && manualStep === "turma") return (
    <div style={{ ...SCREEN, padding: "24px 16px 32px" }}>
      <div style={{ width: "100%", maxWidth: 540 }}>
        <button onClick={() => { setMode("select"); resetManual(); }} style={BACK_BTN}>← Voltar</button>
        <div style={{ width: 72, height: 72, background: "#FFEDD5", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "16px auto 16px" }}>
          <ListOrdered size={36} color="#C2410C" strokeWidth={1.8} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1F1A2E", textAlign: "center", margin: "0 0 4px" }}>Digitar matrícula</h1>
        <p style={{ fontSize: 14, color: "#5B5470", textAlign: "center", margin: "0 0 24px" }}>Passo 1 de 3 · Código da turma</p>

        {/* Display */}
        <div style={{ background: "#FFFFFF", border: "2px solid #C4B5FD", borderRadius: 14, height: 64, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: "#3B0764", letterSpacing: "0.15em", fontFamily: "monospace" }}>
            {turmaCode || <span style={{ color: "#DDD6EE" }}>TURMA</span>}
          </span>
        </div>

        {turmaCode && (
          <p style={{ fontSize: 13, color: "#6D28D9", textAlign: "center", marginBottom: 12, fontWeight: 600 }}>
            Turma salva. O professor pode alterar se necessário.
          </p>
        )}

        <AlphaNumPad
          onPress={c => { if (turmaCode.length < 12) setTurmaCode(v => v + c); }}
          onDelete={() => setTurmaCode(v => v.slice(0, -1))}
          onClear={() => setTurmaCode("")}
        />

        {error && <p style={{ color: "#B91C1C", fontSize: 14, textAlign: "center", marginTop: 12 }}>{error}</p>}

        <button
          onClick={saveTurmaAndContinue}
          disabled={!turmaCode}
          style={{ width: "100%", height: 56, marginTop: 20, background: turmaCode ? "#6D28D9" : "#C4B5FD", color: "#FFFFFF", border: "none", borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: turmaCode ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
          Continuar →
        </button>
      </div>
    </div>
  );

  // ── Manual mode — Step: matrícula ──────────────────────────────────────
  if (mode === "manual" && manualStep === "matricula") return (
    <div style={{ ...SCREEN, padding: "24px 16px 32px" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <button onClick={() => { setManualStep("turma"); setEnrollmentCode(""); setError(""); }} style={BACK_BTN}>← Voltar</button>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1F1A2E", textAlign: "center", margin: "16px 0 4px" }}>Qual é sua matrícula?</h1>
        <p style={{ fontSize: 14, color: "#5B5470", textAlign: "center", margin: "0 0 24px" }}>
          Passo 2 de 3 · Turma: <strong style={{ color: "#6D28D9" }}>{turmaCode}</strong>
        </p>

        {/* Matrícula display */}
        <div style={{ background: "#FFFFFF", border: "2px solid #C4B5FD", borderRadius: 14, height: 72, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: "#3B0764", letterSpacing: "0.1em", fontFamily: "monospace" }}>
            {enrollmentCode || <span style={{ color: "#DDD6EE", fontSize: 22 }}>000000000</span>}
          </span>
        </div>

        <NumPad
          onPress={d => { if (enrollmentCode.length < 12) setEnrollmentCode(v => v + d); }}
          onDelete={() => setEnrollmentCode(v => v.slice(0, -1))}
        />

        {error && <p style={{ color: "#B91C1C", fontSize: 14, textAlign: "center", marginTop: 12 }}>{error}</p>}

        <button
          onClick={() => { if (enrollmentCode.length >= 1) { setManualStep("pin"); setError(""); } }}
          disabled={!enrollmentCode}
          style={{ width: "100%", height: 56, marginTop: 20, background: enrollmentCode ? "#6D28D9" : "#C4B5FD", color: "#FFFFFF", border: "none", borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: enrollmentCode ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
          Continuar →
        </button>
      </div>
    </div>
  );

  // ── Manual mode — Step: PIN ────────────────────────────────────────────
  const pinDots = Array(6).fill("").map((_, i) => (
    <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", background: i < pin.length ? "#6D28D9" : "#DDD6EE" }} />
  ));

  return (
    <div style={{ ...SCREEN, padding: "24px 16px 32px" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <button onClick={() => { setManualStep("matricula"); setPin(""); setError(""); }} style={BACK_BTN}>← Voltar</button>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1F1A2E", textAlign: "center", margin: "16px 0 4px" }}>Qual é seu PIN?</h1>
        <p style={{ fontSize: 14, color: "#5B5470", textAlign: "center", margin: "0 0 24px" }}>
          Passo 3 de 3 · Matrícula: <strong style={{ color: "#6D28D9" }}>{enrollmentCode}</strong>
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 28 }}>{pinDots}</div>

        <NumPad
          onPress={d => { if (pin.length < 6) setPin(p => p + d); }}
          onDelete={() => setPin(p => p.slice(0, -1))}
        />

        {error && <p style={{ color: "#B91C1C", fontSize: 14, textAlign: "center", marginTop: 12 }}>{error}</p>}

        <button
          onClick={loginManual}
          disabled={submitting || pin.length < 4}
          style={{ width: "100%", height: 56, marginTop: 20, background: pin.length >= 4 ? "#6D28D9" : "#C4B5FD", color: "#FFFFFF", border: "none", borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: pin.length >= 4 ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
          {submitting ? "Verificando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}

export default function AlunoEntrarPage() {
  return (
    <Suspense fallback={null}>
      <AlunoEntrarInner />
    </Suspense>
  );
}
