"use client";
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QrCode, Volume2, Delete, ChevronLeft, Camera, AlertCircle } from "lucide-react";

// ── Figuras SVG (sem emoji) ──────────────────────────────────────────────────
const FIGURES = [
  { id: "sun",    label: "Sol",     svg: <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="24" cy="24" r="10" fill="#F59E0B"/><g stroke="#F59E0B" strokeWidth="3" strokeLinecap="round">{[0,45,90,135,180,225,270,315].map((a,i)=><line key={i} x1={24+14*Math.cos(a*Math.PI/180)} y1={24+14*Math.sin(a*Math.PI/180)} x2={24+19*Math.cos(a*Math.PI/180)} y2={24+19*Math.sin(a*Math.PI/180)}/>)}</g></svg> },
  { id: "star",   label: "Estrela", svg: <svg viewBox="0 0 48 48" className="w-full h-full"><polygon points="24,4 29,18 44,18 32,27 37,42 24,33 11,42 16,27 4,18 19,18" fill="#7C3AED"/></svg> },
  { id: "heart",  label: "Coracao", svg: <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M24 40 C24 40 6 28 6 17 C6 11 10 7 16 7 C20 7 23 10 24 12 C25 10 28 7 32 7 C38 7 42 11 42 17 C42 28 24 40 24 40Z" fill="#BE185D"/></svg> },
  { id: "house",  label: "Casa",    svg: <svg viewBox="0 0 48 48" className="w-full h-full"><polygon points="24,6 42,22 38,22 38,42 10,42 10,22 6,22" fill="#0F766E"/></svg> },
  { id: "fish",   label: "Peixe",   svg: <svg viewBox="0 0 48 48" className="w-full h-full"><ellipse cx="22" cy="24" rx="14" ry="9" fill="#1D4ED8"/><polygon points="36,15 44,24 36,33" fill="#1D4ED8"/><circle cx="14" cy="21" r="2" fill="white"/></svg> },
  { id: "flower", label: "Flor",    svg: <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="24" cy="24" r="6" fill="#FBBF24"/>{[0,60,120,180,240,300].map((a,i)=><ellipse key={i} cx={24+11*Math.cos(a*Math.PI/180)} cy={24+11*Math.sin(a*Math.PI/180)} rx="6" ry="4" fill="#BE185D" transform={`rotate(${a},${24+11*Math.cos(a*Math.PI/180)},${24+11*Math.sin(a*Math.PI/180)})`}/>)}</svg> },
  { id: "moon",   label: "Lua",     svg: <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M30 8 A16 16 0 1 0 30 40 A12 12 0 1 1 30 8Z" fill="#6D28D9"/></svg> },
  { id: "drop",   label: "Gota",    svg: <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M24 6 Q36 22 36 30 A12 12 0 0 1 12 30 Q12 22 24 6Z" fill="#0EA5E9"/></svg> },
  { id: "cloud",  label: "Nuvem",   svg: <svg viewBox="0 0 48 48" className="w-full h-full"><ellipse cx="20" cy="28" rx="12" ry="9" fill="#94A3B8"/><ellipse cx="30" cy="30" rx="10" ry="8" fill="#94A3B8"/><ellipse cx="24" cy="22" rx="9" ry="9" fill="#94A3B8"/></svg> },
];

// Fix 2: inclui dígitos 2-9 (SESSION_CHARS = ABCDEFGHJKLMNPQRSTUVWXYZ23456789)
const AULA_KEYS = ["A","B","C","D","E","F","G","H","J","K","L","M","N","P","Q","R","S","T","U","V","W","X","Y","Z","2","3","4","5","6","7","8","9"];

const AVATAR_COLORS = ["#6D28D9","#BE185D","#0F766E","#1D4ED8","#C2410C","#15803D","#A16207","#0E7490"];
function avatarColor(name: string) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff; return AVATAR_COLORS[h % AVATAR_COLORS.length]; }
function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = "pt-BR"; u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

interface DeviceStudent { id: string; name: string; loginMode: string; }
interface SessionStudent { id: string; display: string; loginMode: string; }
interface SessionData { sessionId: string; classId: string; className: string; gradeYear: number; defaultLoginMode: string; students: SessionStudent[]; }

// Fix 1: PIN aceita 4 ou 6 dígitos (novos=4, legados=6)
const MAX_PIN = 6;

type Screen = "device" | "choose" | "aula-code" | "aula-names" | "pin" | "figures" | "qr-camera";
// qrMode: quando autenticando com cartão (mode="qr"), studentId guarda o token JWT
type LoginCtx = { mode: "aula"; studentId: string; sessionId: string } | { mode: "qr"; qrToken: string } | { mode: "dispositivo"; studentId: string };

function EntrarInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [screen, setScreen] = useState<Screen>("choose");
  const [deviceStudents, setDeviceStudents] = useState<DeviceStudent[]>([]);

  const [aulaCode, setAulaCode] = useState<string[]>(Array(6).fill(""));
  const [aulaError, setAulaError] = useState("");
  const [aulaLoading, setAulaLoading] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<{ id: string; display: string; loginMode: string } | null>(null);
  const [loginCtx, setLoginCtx] = useState<LoginCtx | null>(null);

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [figSeq, setFigSeq] = useState<string[]>([]);
  const [figError, setFigError] = useState("");

  const resolveAulaCode = useCallback(async (code: string) => {
    setAulaLoading(true); setAulaError("");
    const r = await fetch("/api/escola/aluno/entrar/codigo-aula", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const d = await r.json();
    setAulaLoading(false);
    if (!r.ok) { setAulaError(d.error ?? "Esse codigo nao funcionou. Confira com o professor."); setAulaCode(Array(6).fill("")); return; }
    setSession(d); setScreen("aula-names");
  }, []);

  // Fix 3 + Fix 4: carrega ?card= e alunos do dispositivo via cookie
  useEffect(() => {
    const cardParam = sp.get("card");
    const aulaParam = sp.get("aula");

    // Fix 3: ?card=TOKEN — vai direto para PIN com mode "qr"
    if (cardParam) {
      setLoginCtx({ mode: "qr", qrToken: cardParam });
      // Precisamos saber o loginMode — chamar API para resolver o token
      fetch("/api/escola/aluno/entrar/card-info", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: cardParam }),
      }).then(r => r.json()).then(d => {
        if (d.studentId) {
          setSelectedStudent({ id: d.studentId, display: d.display ?? "Aluno", loginMode: d.loginMode ?? "PIN" });
          setScreen(d.loginMode === "PICTURE" ? "figures" : "pin");
        } else {
          setAulaError(d.error ?? "QR invalido ou cartao bloqueado.");
          setScreen("choose");
        }
      }).catch(() => { setAulaError("Nao foi possivel verificar o cartao."); setScreen("choose"); });
      return;
    }

    if (aulaParam) {
      const letters = aulaParam.toUpperCase().split("").slice(0, 6);
      setAulaCode([...letters, ...Array(6 - letters.length).fill("")]);
      if (letters.length === 6) resolveAulaCode(aulaParam.toUpperCase());
      else setScreen("aula-code");
      return;
    }

    // Fix 4: alunos lembrados via cookie assinado (não localStorage)
    fetch("/api/escola/aluno/dispositivo")
      .then(r => r.json())
      .then(d => {
        if (d.students?.length) {
          setDeviceStudents(d.students);
          setScreen("device");
        } else {
          setScreen("choose");
        }
      })
      .catch(() => setScreen("choose"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (aulaCode.every(l => l !== "")) resolveAulaCode(aulaCode.join(""));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aulaCode]);

  function selectStudent(student: SessionStudent) {
    setSelectedStudent(student); setPin(""); setPinError(""); setFigSeq([]); setFigError("");
    if (session) setLoginCtx({ mode: "aula", studentId: student.id, sessionId: session.sessionId });
    setScreen(student.loginMode === "PICTURE" ? "figures" : "pin");
  }

  function selectDeviceStudent(s: DeviceStudent) {
    // Fix 4: mode dispositivo para alunos lembrados no cookie
    setSelectedStudent({ id: s.id, display: s.name, loginMode: s.loginMode });
    setLoginCtx({ mode: "dispositivo", studentId: s.id });
    setPin(""); setPinError(""); setFigSeq([]); setFigError("");
    setScreen(s.loginMode === "PICTURE" ? "figures" : "pin");
  }

  async function submitPin(finalPin: string) {
    if (!loginCtx) return;
    let body: Record<string, unknown>;
    if (loginCtx.mode === "qr") {
      body = { mode: "qr", qrToken: loginCtx.qrToken, pin: finalPin };
    } else if (loginCtx.mode === "dispositivo") {
      body = { mode: "dispositivo", studentId: loginCtx.studentId };
    } else {
      body = { mode: "aula", studentId: loginCtx.studentId, sessionId: loginCtx.sessionId, pin: finalPin };
    }
    const r = await fetch("/api/escola/aluno/entrar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) { setPinError(d.error ?? "PIN incorreto. Tente de novo."); setPin(""); return; }
    router.replace("/escola/aluno/trilha");
  }

  async function submitFigures(seq: string[]) {
    if (!loginCtx || loginCtx.mode !== "aula") return;
    const r = await fetch("/api/escola/aluno/entrar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "aula", studentId: loginCtx.studentId, sessionId: loginCtx.sessionId, pictureSequence: seq }),
    });
    const d = await r.json();
    if (!r.ok) { setFigError("Quase! Tente de novo."); setFigSeq([]); return; }
    router.replace("/escola/aluno/trilha");
  }

  const headerName = selectedStudent?.display.split(" ")[0] ?? "";

  // ── Device ──────────────────────────────────────────────────────────────────
  if (screen === "device" && deviceStudents.length > 0) {
    return (
      <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
        <button onClick={() => speak("Quem vai praticar agora?")} className="absolute top-4 right-4 flex items-center gap-2 text-[#6D28D9] text-sm font-semibold min-h-[44px] px-3 py-1.5 bg-[#EDE9FE] rounded-full">
          <Volume2 size={16} /> Ouvir
        </button>
        <h1 className="text-3xl font-bold text-[#1F1A2E] mb-8">Quem vai praticar agora?</h1>
        <div className="flex flex-wrap gap-4 justify-center max-w-2xl mb-8">
          {deviceStudents.map(s => (
            <button key={s.id} onClick={() => selectDeviceStudent(s)}
              className="flex flex-col items-center gap-3 bg-white border-2 border-[#E9E5F5] rounded-2xl p-5 min-w-[140px] hover:border-[#6D28D9] transition-all min-h-[64px]">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold" style={{ background: avatarColor(s.name) }}>{s.name[0].toUpperCase()}</div>
              <span className="text-[#1F1A2E] text-xl font-bold">{s.name.split(" ")[0]}</span>
            </button>
          ))}
          <button onClick={() => setScreen("choose")} className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#DDD6EE] rounded-2xl p-5 min-w-[140px] hover:border-[#6D28D9] text-[#6D28D9] transition-all min-h-[64px]">
            <span className="text-4xl font-light leading-none">+</span>
            <span className="text-sm font-semibold">Outro aluno</span>
          </button>
        </div>
        {/* Fix 4: DELETE no cookie via API */}
        <button onClick={() => fetch("/api/escola/aluno/dispositivo", { method: "DELETE" }).then(() => { setDeviceStudents([]); setScreen("choose"); })}
          className="text-[#5B5470] text-sm underline min-h-[44px]">Esquecer este aparelho</button>
      </div>
    );
  }

  // ── Choose ──────────────────────────────────────────────────────────────────
  if (screen === "choose") {
    return (
      <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
        <button onClick={() => speak("Como voce quer entrar?")} className="absolute top-4 right-4 flex items-center gap-2 text-[#6D28D9] text-sm font-semibold min-h-[44px] px-3 py-1.5 bg-[#EDE9FE] rounded-full">
          <Volume2 size={16} /> Ouvir
        </button>
        {aulaError && <p className="text-[#B91C1C] text-sm mb-4 bg-[#FEE2E2] px-4 py-2 rounded-xl">{aulaError}</p>}
        <h1 className="text-3xl font-bold text-[#1F1A2E] mb-10">Como voce quer entrar?</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
          <button onClick={() => { setAulaCode(Array(6).fill("")); setAulaError(""); setScreen("aula-code"); }}
            className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-2xl p-8 min-h-[180px] transition-colors">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"><span className="text-4xl font-bold">#</span></div>
            <div className="text-center"><div className="text-xl font-bold">Codigo da aula</div><div className="text-sm opacity-90 mt-1">O professor mostra no quadro</div></div>
          </button>
          <button onClick={() => setScreen("qr-camera")}
            className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-2xl p-8 min-h-[180px] transition-colors">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"><QrCode size={36} /></div>
            <div className="text-center"><div className="text-xl font-bold">Ler meu cartao</div><div className="text-sm opacity-90 mt-1">Camera le o QR do cartao</div></div>
          </button>
        </div>
        <p className="text-[#5B5470] text-sm mt-8">Nao tem cartao? Peca ao seu professor.</p>
      </div>
    );
  }

  // ── Codigo da aula ──────────────────────────────────────────────────────────
  if (screen === "aula-code") {
    return (
      <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center p-6 pt-16">
        <button onClick={() => setScreen("choose")} className="absolute top-4 left-4 text-[#6D28D9] font-semibold min-h-[44px] px-3 flex items-center gap-1"><ChevronLeft size={18}/> Voltar</button>
        <button onClick={() => speak("Digite as letras ou numeros que o professor mostrou")} className="absolute top-4 right-4 flex items-center gap-2 text-[#6D28D9] text-sm font-semibold min-h-[44px] px-3 py-1.5 bg-[#EDE9FE] rounded-full"><Volume2 size={16} /> Ouvir</button>
        <h2 className="text-[#1F1A2E] font-bold text-2xl mb-6">Digite o codigo que o professor mostrou</h2>
        <div className="flex gap-3 mb-6">
          {aulaCode.map((l, i) => (
            <div key={i} className={`w-14 h-16 flex items-center justify-center rounded-xl border-2 text-3xl font-bold font-mono text-[#1F1A2E] bg-white ${l ? "border-[#6D28D9]" : aulaCode.slice(0,i).every(x=>x) ? "border-[#6D28D9] shadow-[0_0_0_3px_rgba(109,40,217,0.2)]" : "border-[#DDD6EE]"}`}>{l}</div>
          ))}
        </div>
        {aulaError && <p className="text-[#B91C1C] text-sm mb-4 font-medium">{aulaError}</p>}
        {aulaLoading && <p className="text-[#5B5470] text-sm mb-4">Verificando...</p>}
        {/* Fix 2: teclado inclui digitos 2-9 */}
        <div className="grid gap-2 w-full max-w-sm" style={{ gridTemplateColumns: "repeat(8, 1fr)" }}>
          {AULA_KEYS.map(k => (
            <button key={k} onClick={() => {
              const idx = aulaCode.findIndex(l => l === ""); if (idx === -1) return;
              const next = [...aulaCode]; next[idx] = k; setAulaCode(next); setAulaError("");
            }} className="h-14 rounded-xl border border-[#DDD6EE] bg-white text-[#1F1A2E] text-xl font-bold hover:bg-[#EDE9FE] hover:border-[#6D28D9] transition-colors min-h-[56px]">{k}</button>
          ))}
          <button onClick={() => { const last = [...aulaCode].reverse().findIndex(l=>l!==""); if(last===-1)return; const idx=5-last; const next=[...aulaCode]; next[idx]=""; setAulaCode(next); }}
            className="h-14 col-span-2 rounded-xl border border-[#DDD6EE] bg-white text-[#1F1A2E] hover:bg-[#FEE2E2] transition-colors flex items-center justify-center min-h-[56px]">
            <Delete size={22} color="#B91C1C" />
          </button>
        </div>
        <p className="text-[#5B5470] text-xs mt-4">Letras e numeros. Sem I, O, 0 e 1.</p>
      </div>
    );
  }

  // ── Leitor QR com câmera ──────────────────────────────────────────────────
  if (screen === "qr-camera") {
    return <QRCameraScreen onCancel={() => setScreen("choose")} onDetected={url => {
      const m = /[?&]card=([^&]+)/.exec(url);
      if (m) router.replace(`/escola/aluno/entrar?card=${encodeURIComponent(decodeURIComponent(m[1]))}`);
    }} onUseCode={() => setScreen("aula-code")} />;
  }

  // ── Nomes da aula ───────────────────────────────────────────────────────────
  if (screen === "aula-names" && session) {
    return (
      <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center p-6 pt-16">
        <button onClick={() => setScreen("aula-code")} className="absolute top-4 left-4 text-[#6D28D9] font-semibold min-h-[44px] px-3 flex items-center gap-1"><ChevronLeft size={18}/> Voltar</button>
        <button onClick={() => speak("Toque no seu nome")} className="absolute top-4 right-4 flex items-center gap-2 text-[#6D28D9] text-sm font-semibold min-h-[44px] px-3 py-1.5 bg-[#EDE9FE] rounded-full"><Volume2 size={16} /> Ouvir</button>
        <p className="text-[#5B5470] text-sm mb-2">{session.className}</p>
        <h2 className="text-3xl font-bold text-[#1F1A2E] mb-6">Toque no seu nome</h2>
        <div className="grid gap-3 w-full max-w-2xl" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {session.students.map(s => (
            <button key={s.id} onClick={() => selectStudent(s)}
              className="flex items-center gap-3 bg-white border-2 border-[#E9E5F5] rounded-xl px-4 py-3 hover:border-[#6D28D9] hover:bg-[#EDE9FE] transition-all min-h-[64px]">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ background: avatarColor(s.display) }}>{s.display[0].toUpperCase()}</div>
              <span className="text-[#1F1A2E] text-lg font-bold text-left">{s.display}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── PIN (Fix 1: 4-6 dígitos) ─────────────────────────────────────────────
  if (screen === "pin" && selectedStudent) {
    // Fix 1: máx MAX_PIN=6 dígitos; auto-submit em 6; "Confirmar" libera em 4+
    const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];
    const pressKey = (k: string) => {
      if (k === "del") { setPin(p => p.slice(0,-1)); return; }
      if (pin.length >= MAX_PIN) return;
      const next = pin + k;
      setPin(next);
      if (next.length === MAX_PIN) submitPin(next);
    };
    const dotsCount = Math.max(4, pin.length);
    return (
      <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
        <button onClick={() => setScreen(session ? "aula-names" : "device")} className="absolute top-4 left-4 text-[#6D28D9] font-semibold min-h-[44px] px-3 flex items-center gap-1"><ChevronLeft size={18}/> Voltar</button>
        <button onClick={() => speak(`Oi ${headerName}! Digite seu PIN`)} className="absolute top-4 right-4 flex items-center gap-2 text-[#6D28D9] text-sm font-semibold min-h-[44px] px-3 py-1.5 bg-[#EDE9FE] rounded-full"><Volume2 size={16} /> Ouvir</button>
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4" style={{ background: avatarColor(selectedStudent.display) }}>{selectedStudent.display[0].toUpperCase()}</div>
            <div className="text-2xl font-bold text-[#1F1A2E]">Oi, {headerName}!</div>
            <div className="text-[#5B5470] text-sm mt-1">{session?.className ?? ""}</div>
            <div className="text-[#1F1A2E] font-semibold mt-6 mb-3">Digite seu PIN</div>
            <div className="flex gap-3 mb-2">
              {Array.from({ length: dotsCount }, (_, i) => (
                <div key={i} className={`w-5 h-5 rounded-full border-2 ${i < pin.length ? "bg-[#6D28D9] border-[#6D28D9]" : "border-[#DDD6EE]"}`}/>
              ))}
            </div>
            {/* Botão Confirmar aparece quando 4 ou 5 dígitos digitados (PIN legado pode ser menos que 6) */}
            {pin.length >= 4 && pin.length < MAX_PIN && (
              <button onClick={() => submitPin(pin)} className="mt-3 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-6 py-2 rounded-xl font-semibold text-sm min-h-[44px] transition-colors">
                Confirmar
              </button>
            )}
            {pinError && <p className="text-[#B91C1C] text-sm mt-2">{pinError}</p>}
            <p className="text-[#5B5470] text-xs mt-3">Esqueceu? Peca ao professor um PIN novo.</p>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {keys.map((k, i) => (
              <button key={i} disabled={k===""} onClick={() => k !== "" && pressKey(k)}
                className={`h-16 w-20 rounded-xl text-2xl font-bold text-[#1F1A2E] transition-colors ${k===""?"invisible":"bg-white border border-[#DDD6EE] hover:bg-[#EDE9FE]"}`}>
                {k==="del" ? <Delete size={22} className="mx-auto" color="#B91C1C"/> : k}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Figuras ──────────────────────────────────────────────────────────────────
  if (screen === "figures" && selectedStudent) {
    return (
      <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
        <button onClick={() => setScreen(session ? "aula-names" : "device")} className="absolute top-4 left-4 text-[#6D28D9] font-semibold min-h-[44px] px-3 flex items-center gap-1"><ChevronLeft size={18}/> Voltar</button>
        <button onClick={() => speak(`Oi ${headerName}! Toque nas suas 3 figuras secretas`)} className="absolute top-4 right-4 flex items-center gap-2 text-[#6D28D9] text-sm font-semibold min-h-[44px] px-3 py-1.5 bg-[#EDE9FE] rounded-full"><Volume2 size={16} /> Ouvir</button>
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4" style={{ background: avatarColor(selectedStudent.display) }}>{selectedStudent.display[0].toUpperCase()}</div>
            <div className="text-2xl font-bold text-[#1F1A2E]">Oi, {headerName}!</div>
            <div className="text-[#5B5470] text-sm mt-1">{session?.className ?? ""}</div>
            <div className="text-[#1F1A2E] font-semibold mt-6 mb-3 text-center">Toque nas suas<br/>3 figuras secretas</div>
            <div className="flex gap-3 mb-2">
              {[0,1,2].map(i => (<div key={i} className={`w-5 h-5 rounded-full border-2 ${i < figSeq.length ? "bg-[#6D28D9] border-[#6D28D9]" : "border-[#DDD6EE]"}`}/>))}
            </div>
            {figError && <p className="text-[#B91C1C] text-sm mt-2">{figError}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {FIGURES.map(fig => {
              const pos = figSeq.indexOf(fig.id) + 1;
              const isSel = pos > 0;
              return (
                <button key={fig.id} onClick={() => {
                  if (isSel) return;
                  const next = [...figSeq, fig.id]; setFigSeq(next); setFigError("");
                  if (next.length === 3) submitFigures(next);
                }} className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 relative transition-all ${isSel ? "border-[#6D28D9] bg-[#EDE9FE]" : "border-[#E9E5F5] bg-white hover:border-[#6D28D9]"}`}>
                  <div className="w-14 h-14">{fig.svg}</div>
                  {isSel && <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#6D28D9] text-white text-xs font-bold flex items-center justify-center">{pos}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── Leitor QR com câmera ────────────────────────────────────────────────────
function QRCameraScreen({ onCancel, onDetected, onUseCode }: { onCancel: () => void; onDetected: (url: string) => void; onUseCode: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    let rafId: number;

    async function start() {
      setScanning(true); setErr(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }

        const scanFrame = async () => {
          if (cancelled || !videoRef.current || videoRef.current.readyState < 2) { rafId = requestAnimationFrame(scanFrame); return; }
          // BarcodeDetector (Chrome 83+, Safari 17.4+)
          if ("BarcodeDetector" in window) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const bd = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
              const codes = await bd.detect(videoRef.current);
              if (codes.length > 0 && !cancelled) { cleanup(); onDetected(codes[0].rawValue); return; }
            } catch { /* ignore */ }
          } else {
            // Fallback jsqr (lazy import)
            const canvas = document.createElement("canvas");
            const vw = videoRef.current.videoWidth; const vh = videoRef.current.videoHeight;
            if (vw && vh) {
              canvas.width = vw; canvas.height = vh;
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(videoRef.current, 0, 0, vw, vh);
              const imageData = ctx.getImageData(0, 0, vw, vh);
              const jsQR = (await import("jsqr").catch(() => null))?.default;
              if (jsQR) {
                const code = jsQR(imageData.data, vw, vh);
                if (code && !cancelled) { cleanup(); onDetected(code.data); return; }
              }
            }
          }
          rafId = requestAnimationFrame(scanFrame);
        }
        scanFrame();
      } catch {
        if (!cancelled) setErr("Câmera não disponível. Verifique as permissões do navegador.");
        setScanning(false);
      }
    }

    function cleanup() { cancelled = true; cancelAnimationFrame(rafId); streamRef.current?.getTracks().forEach(t => t.stop()); }
    start();
    return () => cleanup();
  }, [onDetected]);

  return (
    <div className="min-h-screen bg-[#1F1A2E] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onCancel} className="text-white/70 flex items-center gap-1 text-sm"><ChevronLeft size={16} /> Voltar</button>
          <span className="text-white font-semibold">Escanear cartão</span>
          <div className="w-16" />
        </div>
        {err ? (
          <div className="bg-white rounded-2xl p-6 text-center">
            <AlertCircle className="mx-auto mb-3 text-[#B91C1C]" size={32} />
            <p className="text-[#1F1A2E] text-sm mb-4">{err}</p>
            <button onClick={onUseCode} className="w-full bg-[#6D28D9] text-white py-3 rounded-xl font-semibold text-sm min-h-[44px]">Usar código da aula</button>
          </div>
        ) : (
          <>
            <div className="relative rounded-2xl overflow-hidden aspect-square bg-black mb-4">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-4 border-white/60 rounded-2xl" />
                  <div className="absolute top-1/2 -translate-y-1/2 w-48 h-0.5 bg-[#6D28D9] animate-bounce" />
                </div>
              )}
            </div>
            <p className="text-white/60 text-sm text-center mb-4">Aponte para o QR do cartão do aluno</p>
            <button onClick={onUseCode} className="w-full border border-white/30 text-white/80 py-3 rounded-xl text-sm font-semibold min-h-[44px]">
              <Camera size={14} className="inline mr-1.5" />Usar código da aula
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AlunoEntrarPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#F8F7FC] flex items-center justify-center text-[#5B5470]">Carregando...</div>}><EntrarInner /></Suspense>;
}
