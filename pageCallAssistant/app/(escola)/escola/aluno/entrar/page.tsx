"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QrCode, Monitor, ListOrdered, MessageSquare } from "lucide-react";

type LoginMode = "select" | "qr" | "aula" | "manual";

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

function NumericKeypad({ onPress, onDelete, onClear }: { onPress: (d: string) => void; onDelete: () => void; onClear: () => void }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return (
    <div className="grid grid-cols-3 gap-3 mt-4">
      {keys.map((k, i) => (
        <button key={i} type="button" disabled={k === ""}
          onClick={() => { if (k === "⌫") onDelete(); else onPress(k); }}
          className={`h-16 text-2xl font-bold rounded-xl transition-colors ${k === "" ? "invisible" : "bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white"}`}
        >{k}</button>
      ))}
    </div>
  );
}

export default function AlunoEntrarPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("select");
  const [error, setError] = useState("");

  // Aula mode
  const [aulaCode, setAulaCode] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [searchLetter, setSearchLetter] = useState("");

  // PIN / picture
  const [pin, setPin] = useState("");
  const [picSequence, setPicSequence] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Manual mode
  const [accessCode, setAccessCode] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState("");

  async function enterAulaCode() {
    if (aulaCode.length !== 6) return;
    setError("");
    const r = await fetch("/api/escola/aluno/entrar/codigo-aula", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: aulaCode }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error); return; }
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
    const data = await r.json();
    setSubmitting(false);
    if (!r.ok) { setError(data.error); setPin(""); setPicSequence([]); return; }
    router.push("/escola/aluno/painel");
  }

  async function loginManual() {
    if (!accessCode || !enrollmentCode || pin.length < 4) { setError("Preencha todos os campos e o PIN"); return; }
    setSubmitting(true); setError("");
    const r = await fetch("/api/escola/aluno/entrar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "manual", accessCode, enrollmentCode, pin }),
    });
    const data = await r.json();
    setSubmitting(false);
    if (!r.ok) { setError(data.error); setPin(""); return; }
    router.push("/escola/aluno/painel");
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

  // Aula mode — enter session code
  if (mode === "aula" && !session) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <button onClick={() => { setMode("select"); setAulaCode(""); setError(""); }} className="self-start text-gray-500 mb-6 min-h-[44px]">← Voltar</button>
      <div className="text-5xl mb-4 text-center">📺</div>
      <h1 className="text-2xl font-bold text-white mb-2 text-center">Código da Aula</h1>
      <p className="text-gray-400 text-center mb-6">Digite o código de 6 letras que aparece no quadro</p>
      <div className="w-full max-w-sm">
        <input value={aulaCode} onChange={e => { setAulaCode(e.target.value.toUpperCase().slice(0, 6)); setError(""); }}
          className="w-full bg-gray-800 text-white text-center text-4xl font-mono rounded-xl py-4 border-2 border-gray-700 focus:border-purple-500 outline-none tracking-widest"
          maxLength={6} placeholder="ABCD12" autoCapitalize="characters" />
        {error && <p className="text-red-400 text-center mt-2 text-sm">{error}</p>}
        <button onClick={enterAulaCode} disabled={aulaCode.length !== 6}
          className="w-full mt-4 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xl font-bold py-4 rounded-xl min-h-[64px] transition-colors">Entrar</button>
      </div>
    </div>
  );

  // Aula mode — select student from list
  if (mode === "aula" && session && !selectedStudent) return (
    <div className="min-h-screen bg-gray-950 flex flex-col p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setSession(null); setAulaCode(""); }} className="text-gray-500 min-h-[44px]">←</button>
        <div>
          <h1 className="text-xl font-bold text-white">{session.className}</h1>
          <p className="text-gray-400 text-sm">Toque no seu nome</p>
        </div>
      </div>
      {/* Letter filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setSearchLetter("")} className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${searchLetter === "" ? "bg-purple-700 text-white" : "bg-gray-800 text-gray-400"}`}>
          Todos
        </button>
        {letters.map(l => (
          <button key={l} onClick={() => setSearchLetter(l === searchLetter ? "" : l)} className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${searchLetter === l ? "bg-purple-700 text-white" : "bg-gray-800 text-gray-400"}`}>{l}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto">
        {filteredStudents.map(s => (
          <button key={s.id} onClick={() => { setSelectedStudent(s); setPin(""); setPicSequence([]); setError(""); }}
            className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white font-semibold py-5 px-3 rounded-xl text-center min-h-[80px] text-lg transition-colors">
            {s.display}
          </button>
        ))}
      </div>
      {error && <p className="text-red-400 text-center mt-4 text-sm">{error}</p>}
    </div>
  );

  // Aula mode — PIN or picture entry
  if (mode === "aula" && session && selectedStudent) {
    const isPicture = selectedStudent.loginMode === "PICTURE";
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center p-4 pt-8">
        <button onClick={() => { setSelectedStudent(null); setPin(""); setPicSequence([]); setError(""); }} className="self-start text-gray-500 mb-6 min-h-[44px]">← Voltar</button>
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">👤</div>
          <h2 className="text-2xl font-bold text-white">{selectedStudent.display}</h2>
          <p className="text-gray-400 text-sm mt-1">{isPicture ? "Selecione suas 3 figuras" : "Digite seu PIN"}</p>
        </div>
        {isPicture ? (
          <>
            <div className="flex gap-3 mb-6">
              {Array(3).fill("").map((_, i) => {
                const pic = PICTURES.find(p => p.id === picSequence[i]);
                return <div key={i} className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl border-2 ${pic ? "bg-gray-700 border-purple-500" : "bg-gray-800 border-gray-700"}`}>{pic?.emoji ?? "?"}</div>;
              })}
            </div>
            <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
              {PICTURES.map(p => (
                <button key={p.id} onClick={() => { if (picSequence.length < 3) setPicSequence(seq => [...seq, p.id]); }}
                  disabled={picSequence.length >= 3}
                  className="h-20 text-4xl bg-gray-800 hover:bg-gray-700 rounded-2xl disabled:opacity-40 transition-colors">{p.emoji}</button>
              ))}
            </div>
            <button onClick={() => setPicSequence([])} className="text-gray-500 mt-4 text-sm min-h-[44px]">Limpar</button>
          </>
        ) : (
          <>
            <div className="text-4xl text-white font-mono tracking-widest mb-2">{pinDisplay}</div>
            <NumericKeypad onPress={d => { if (pin.length < 6) setPin(p => p + d); }} onDelete={() => setPin(p => p.slice(0, -1))} onClear={() => setPin("")} />
          </>
        )}
        {error && <p className="text-red-400 text-center mt-4 text-sm">{error}</p>}
        <button onClick={() => loginStudent(selectedStudent.id, selectedStudent.loginMode)} disabled={submitting || (isPicture ? picSequence.length !== 3 : pin.length < 4)}
          className="w-full max-w-xs mt-6 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xl font-bold py-4 rounded-xl min-h-[64px] transition-colors">
          {submitting ? "Verificando..." : "Entrar"}
        </button>
      </div>
    );
  }

  // Manual mode
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <button onClick={() => { setMode("select"); setError(""); setPin(""); }} className="self-start text-gray-500 mb-6 min-h-[44px]">← Voltar</button>
      <div className="text-5xl mb-4 text-center">🔢</div>
      <h1 className="text-2xl font-bold text-white mb-6 text-center">Digitar Matrícula</h1>
      <div className="w-full max-w-sm space-y-4">
        <div>
          <label className="text-gray-400 text-sm block mb-1">Código da turma</label>
          <input value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} maxLength={8}
            className="w-full bg-gray-800 text-white text-xl text-center font-mono rounded-xl py-3 border-2 border-gray-700 focus:border-purple-500 outline-none" placeholder="TURMA12" />
        </div>
        <div>
          <label className="text-gray-400 text-sm block mb-1">Matrícula</label>
          <input value={enrollmentCode} onChange={e => setEnrollmentCode(e.target.value)}
            className="w-full bg-gray-800 text-white text-xl text-center rounded-xl py-3 border-2 border-gray-700 focus:border-purple-500 outline-none" placeholder="2026000123" />
        </div>
        <div>
          <label className="text-gray-400 text-sm block mb-1">PIN</label>
          <div className="text-3xl text-white font-mono tracking-widest text-center mb-2">{pinDisplay}</div>
          <NumericKeypad onPress={d => { if (pin.length < 6) setPin(p => p + d); }} onDelete={() => setPin(p => p.slice(0, -1))} onClear={() => setPin("")} />
        </div>
        {error && <p className="text-red-400 text-center text-sm">{error}</p>}
        <button onClick={loginManual} disabled={submitting || !accessCode || !enrollmentCode || pin.length < 4}
          className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xl font-bold py-4 rounded-xl min-h-[64px] transition-colors">
          {submitting ? "Verificando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}
