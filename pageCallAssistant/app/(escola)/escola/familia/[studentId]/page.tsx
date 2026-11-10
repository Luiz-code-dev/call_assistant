"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Lightbulb, ChevronRight, School, QrCode, Smartphone, KeyRound, ShieldOff, Play, Check, Clock } from "lucide-react";
import { IconeMateria, materiaDe } from "@/components/escola/reforco-ui";
import { RecadoParaFilho, AgendaDoFilho } from "@/components/escola/familia/RecadosAgenda";
import FamilyShell from "@/components/escola/familia/FamilyShell";
import { QRCodeSVG } from "qrcode.react";

const DIAS = ["S", "T", "Q", "Q", "S", "S", "D"];
const LEVELS = [
  { key: "MASTERED", label: "Domina", fg: "#166534", bg: "#DCFCE7" },
  { key: "ALMOST", label: "Quase lá", fg: "#92400E", bg: "#FEF3C7" },
  { key: "NOT_YET", label: "Praticando", fg: "#6D28D9", bg: "#EDE9FE" },
] as const;
const levelInfo = (k: string | null) => LEVELS.find((l) => l.key === k);

interface Resumo {
  aluno: { fullName: string; firstName: string; loginMode: string; className: string | null; schoolName: string | null; shift: string | null; gradeYear: number | null };
  semana: { dias: boolean[]; atividades: number; minutos: number; frase: string; hojeIndex: number };
  trilhaAtual: { subjectName: string; subjectColor: string; skillLabel: string; feitas: number; total: number } | null;
  outrasTrilhas: number;
  evolucao: { MASTERED: number; ALMOST: number; NOT_YET: number; avancaramNoMes: number };
  dica: string;
  retornos: { subjectName: string; when: string; level: string | null; acertou: string | null; melhorar: string | null }[];
  alertas: { tipo: "warn" | "info"; texto: string }[];
  escola: { nome: string | null; turma: string | null; turno: string | null; phone: string | null; email: string | null };
}

interface MateriaFilho {
  codigo: string; nome: string; estado: "COMECAR" | "EM_TRILHA" | "REVISAR" | "AVANCAR";
  trilhaAtual?: { titulo: string; etapaAtual: number; totalEtapas: number };
  contagem: { domina: number; quaseLa: number; aindaNao: number };
  ultimaPraticaEm?: string; dica: string;
}

function quando(iso?: string) {
  if (!iso) return null;
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return dias <= 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;
}

function MateriasDoFilho({ materias, nome }: { materias: MateriaFilho[]; nome: string }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const ordem = { EM_TRILHA: 0, REVISAR: 1, AVANCAR: 2, COMECAR: 3 } as const;
  const lista = [...materias].sort((a, b) => ordem[a.estado] - ordem[b.estado]);
  const comecadas = materias.filter((m) => m.estado !== "COMECAR").length;
  return (
    <section className="bg-white rounded-3xl p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[16px] font-extrabold text-[#1F1A2E]">Matérias</h2>
        <span className="text-[12px] font-bold text-[#6D28D9] bg-[#EDE9FE] rounded-full px-2.5 py-1">{comecadas} de {materias.length} começadas</span>
      </div>
      <p className="text-[13px] text-[#5B5470] mb-3">Toque em uma matéria para ver como ajudar {nome} em casa.</p>
      <ul className="space-y-2">
        {lista.map((m) => {
          const cor = materiaDe(m.codigo)?.cor ?? "#6D28D9";
          const aberto = aberta === m.codigo;
          const status = m.estado === "EM_TRILHA" && m.trilhaAtual
            ? `Praticando: ${m.trilhaAtual.titulo}`
            : m.estado === "REVISAR" ? "Diagnóstico feito · revisando o que está quase lá"
            : m.estado === "AVANCAR" ? "Diagnóstico feito · pronto para avançar"
            : "Ainda não começou";
          const ult = quando(m.ultimaPraticaEm);
          return (
            <li key={m.codigo} className="rounded-2xl" style={{ background: aberto ? cor + "10" : "#F8F7FC" }}>
              <button onClick={() => setAberta(aberto ? null : m.codigo)} className="w-full flex items-center gap-3 p-3 text-left min-h-[64px]">
                <IconeMateria chave={m.codigo} tamanho={40} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-extrabold text-[#1F1A2E]">{m.nome}</span>
                  <span className={`block text-[12px] leading-snug ${m.estado === "COMECAR" ? "text-[#8B84A0]" : "text-[#5B5470]"}`}>{status}</span>
                </span>
                {m.estado === "EM_TRILHA" && m.trilhaAtual ? (
                  <span className="text-[11px] font-bold rounded-full px-2 py-1 text-white shrink-0" style={{ background: cor }}>{m.trilhaAtual.etapaAtual} de {m.trilhaAtual.totalEtapas}</span>
                ) : m.estado === "COMECAR" ? null : (
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: cor }}><Check className="size-4" strokeWidth={3} /></span>
                )}
                <ChevronRight className={`size-4 text-[#A59FB8] shrink-0 transition-transform ${aberto ? "rotate-90" : ""}`} />
              </button>
              {aberto && (
                <div className="px-3 pb-3 space-y-2">
                  {m.estado !== "COMECAR" && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#166534]">Domina {m.contagem.domina}</span>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E]">Quase lá {m.contagem.quaseLa}</span>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EDE9FE] text-[#6D28D9]">Praticando {m.contagem.aindaNao}</span>
                      {ult && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-[#5B5470] inline-flex items-center gap-1"><Clock className="size-3" />Praticou {ult}</span>}
                    </div>
                  )}
                  <div className="flex gap-2 rounded-2xl bg-white p-3">
                    <Lightbulb className="size-4 text-[#D97706] shrink-0 mt-0.5" />
                    <p className="text-[13px] text-[#1F1A2E] leading-snug">{m.dica}</p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AcessoFilhoCard({ studentId, loginMode }: { studentId: string; loginMode: string }) {
  const [fase, setFase] = useState<"idle" | "pin" | "figuras" | "qr" | "aparelho_ok">("idle");
  const [pinInput, setPinInput] = useState("");
  const [figInput, setFigInput] = useState<string[]>([]);
  const [qrUrl, setQrUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const FIGURE_IDS = ["sun","star","heart","house","fish","flower","moon","drop","cloud"];
  const FIGURE_LABEL: Record<string,string> = { sun:"Sol", star:"Estrela", heart:"Coração", house:"Casa", fish:"Peixe", flower:"Flor", moon:"Lua", drop:"Gota", cloud:"Nuvem" };

  async function prepararAparelho() {
    setLoading(true); setMsg("");
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/aparelho`, { method: "POST" });
    const d = await r.json();
    setLoading(false);
    if (r.ok) { setFase("aparelho_ok"); setMsg(`Aparelho preparado para ${d.name ?? "o aluno"}.`); }
    else setMsg(d.error ?? "Erro ao preparar aparelho.");
  }

  async function mostrarQr() {
    setLoading(true); setMsg("");
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/cartao`);
    const d = await r.json();
    setLoading(false);
    if (r.ok) { setQrUrl(d.qrUrl); setFase("qr"); }
    else setMsg(d.error ?? "Erro ao obter QR.");
  }

  async function salvarPin() {
    if (!/^\d{4}$/.test(pinInput)) { setMsg("PIN deve ter 4 dígitos."); return; }
    setLoading(true); setMsg("");
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/pin`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pinInput }),
    });
    const d = await r.json();
    setLoading(false);
    if (r.ok) { setFase("idle"); setMsg("PIN criado. O PIN antigo não funciona mais."); setPinInput(""); }
    else setMsg(d.error ?? "Erro ao criar PIN.");
  }

  async function salvarFiguras() {
    if (figInput.length !== 3) { setMsg("Selecione exatamente 3 figuras."); return; }
    setLoading(true); setMsg("");
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/figuras`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ figures: figInput }),
    });
    const d = await r.json();
    setLoading(false);
    if (r.ok) { setFase("idle"); setMsg("Figuras trocadas. A sequência antiga não funciona mais."); setFigInput([]); }
    else setMsg(d.error ?? "Erro ao trocar figuras.");
  }

  async function perderCartao() {
    setLoading(true); setMsg("");
    const r = await fetch(`/api/escola/familia/filhos/${studentId}/cartao`, { method: "POST" });
    const d = await r.json();
    setLoading(false);
    if (r.ok) { setQrUrl(d.qrUrl); setFase("qr"); setMsg("Cartão antigo bloqueado. Este é o novo QR."); }
    else setMsg(d.error ?? "Erro ao bloquear cartão.");
  }

  function toggleFigura(id: string) {
    setFigInput(prev => prev.includes(id) ? prev.filter(f => f !== id) : prev.length < 3 ? [...prev, id] : prev);
  }

  return (
    <section className="bg-white rounded-3xl p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
      <h2 className="text-[16px] font-extrabold text-[#1F1A2E] mb-3">Acesso do seu filho</h2>

      {msg && <p className="text-sm text-[#166534] bg-[#DCFCE7] border border-[#BBF7D0] px-3 py-2 rounded-lg mb-3">{msg}</p>}

      {fase === "idle" && (
        <div className="flex flex-col gap-2">
          <button onClick={prepararAparelho} disabled={loading}
            className="flex items-center gap-3 bg-[#EDE9FE] hover:bg-[#DDD6EE] text-[#4C1D95] px-4 py-3 rounded-2xl text-[14px] font-semibold min-h-[52px] transition-colors disabled:opacity-50">
            <Smartphone size={18} className="shrink-0" />
            <div className="text-left"><p>Preparar este aparelho para o meu filho</p><p className="text-xs font-normal text-[#5B5470]">O filho poderá entrar tocando no nome, sem o cartão</p></div>
          </button>
          <button onClick={mostrarQr} disabled={loading}
            className="flex items-center gap-3 border border-[#DDD6EE] hover:border-[#6D28D9] text-[#1F1A2E] px-4 py-3 rounded-2xl text-[14px] font-semibold min-h-[52px] transition-colors disabled:opacity-50">
            <QrCode size={18} className="text-[#6D28D9] shrink-0" />
            <span>Mostrar o QR do cartão</span>
          </button>
          <button onClick={() => { setFase(loginMode === "PICTURE" ? "figuras" : "pin"); setMsg(""); setPinInput(""); setFigInput([]); }}
            className="flex items-center gap-3 border border-[#DDD6EE] hover:border-[#6D28D9] text-[#1F1A2E] px-4 py-3 rounded-2xl text-[14px] font-semibold min-h-[52px] transition-colors">
            <KeyRound size={18} className="text-[#6D28D9] shrink-0" />
            <span>{loginMode === "PICTURE" ? "Trocar as figuras" : "Criar um PIN novo"}</span>
          </button>
          <button onClick={perderCartao} disabled={loading}
            className="flex items-center gap-3 border border-[#FECACA] hover:border-[#B91C1C] text-[#B91C1C] px-4 py-3 rounded-2xl text-[14px] font-semibold min-h-[52px] transition-colors disabled:opacity-50">
            <ShieldOff size={18} className="shrink-0" />
            <span>Perdeu o cartão?</span>
          </button>
        </div>
      )}

      {fase === "pin" && (
        <div>
          <p className="text-sm text-[#5B5470] mb-2">Digite um PIN de 4 dígitos para o seu filho.</p>
          <p className="text-xs text-[#5B5470] mb-3">Você não verá o PIN atual — apenas define um novo.</p>
          <input type="password" inputMode="numeric" maxLength={4} value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))}
            className="block w-32 border-2 border-[#DDD6EE] rounded-xl px-3 py-2 text-center text-2xl font-bold tracking-widest text-[#1F1A2E] focus:border-[#6D28D9] outline-none mb-3"
            placeholder="0000" />
          <div className="flex gap-2">
            <button onClick={salvarPin} disabled={loading || pinInput.length !== 4}
              className="bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-50">
              {loading ? "Salvando…" : "Salvar PIN"}
            </button>
            <button onClick={() => { setFase("idle"); setPinInput(""); setMsg(""); }}
              className="border border-[#DDD6EE] text-[#5B5470] px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">Cancelar</button>
          </div>
        </div>
      )}

      {fase === "figuras" && (
        <div>
          <p className="text-sm text-[#5B5470] mb-2">Escolha 3 figuras para o seu filho memorizar.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {FIGURE_IDS.map(id => (
              <button key={id} onClick={() => toggleFigura(id)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${figInput.includes(id) ? "bg-[#6D28D9] border-[#6D28D9] text-white" : "bg-white border-[#DDD6EE] text-[#1F1A2E] hover:border-[#6D28D9]"}`}>
                {FIGURE_LABEL[id]}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#5B5470] mb-3">Selecionadas: {figInput.map(f => FIGURE_LABEL[f]).join(", ") || "nenhuma"}</p>
          <div className="flex gap-2">
            <button onClick={salvarFiguras} disabled={loading || figInput.length !== 3}
              className="bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-50">
              {loading ? "Salvando…" : "Salvar figuras"}
            </button>
            <button onClick={() => { setFase("idle"); setFigInput([]); setMsg(""); }}
              className="border border-[#DDD6EE] text-[#5B5470] px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">Cancelar</button>
          </div>
        </div>
      )}

      {fase === "qr" && qrUrl && (
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <QRCodeSVG value={qrUrl} size={160} level="M" />
          </div>
          <p className="text-xs text-[#5B5470] mb-3">Aponte o celular do seu filho para este QR para entrar.</p>
          <button onClick={() => { setFase("idle"); setQrUrl(""); setMsg(""); }}
            className="border border-[#DDD6EE] text-[#5B5470] px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">Fechar</button>
        </div>
      )}

      {fase === "aparelho_ok" && (
        <div>
          <p className="text-sm text-[#166534]">{msg}</p>
          <button onClick={() => { setFase("idle"); setMsg(""); }} className="mt-3 border border-[#DDD6EE] text-[#5B5470] px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">Ok</button>
        </div>
      )}
    </section>
  );
}

function Card({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-3xl p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
      {title && <div className="flex items-center justify-between mb-3"><h2 className="text-[16px] font-extrabold text-[#1F1A2E]">{title}</h2>{right}</div>}
      {children}
    </section>
  );
}

export default function PainelFilho() {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<Resumo | null>(null);
  const [materias, setMaterias] = useState<MateriaFilho[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const r = await fetch(`/api/escola/familia/filhos/${studentId}/resumo`);
      if (!r.ok) { setError(true); return; }
      setData(await r.json());
      fetch(`/api/escola/familia/filhos/${studentId}/materias`)
        .then((m) => (m.ok ? m.json() : null))
        .then((m) => setMaterias(m?.materias ?? []))
        .catch(() => setMaterias([]));
      if (typeof window !== "undefined") localStorage.setItem("sf_familia_ultimo_filho", studentId);
    } catch { setError(true); } finally { setLoading(false); }
  }, [studentId]);
  useEffect(() => { load(); }, [load]);

  return (
    <FamilyShell activeStudentId={studentId}>
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-3xl bg-white/70 animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl px-6 py-12 text-center shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
          <div className="w-14 h-14 rounded-2xl bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4"><AlertTriangle size={26} className="text-[#B91C1C]" /></div>
          <p className="text-[#1F1A2E] font-semibold mb-3">Não foi possível carregar. Tente de novo.</p>
          <button onClick={load} className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 rounded-2xl text-sm font-bold min-h-[48px]"><RefreshCw size={15} /> Tentar de novo</button>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Filho */}
          <section className="bg-white rounded-3xl p-5 shadow-[0_8px_24px_rgba(91,33,182,0.12)]">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#FBBF24] text-white flex items-center justify-center text-xl font-extrabold shrink-0">
                {data.aluno.firstName.charAt(0)}
              </div>
              <div className="min-w-0">
                <h2 className="text-[19px] font-extrabold text-[#1F1A2E] leading-tight">{data.aluno.fullName}</h2>
                <p className="text-[#5B5470] text-[13px]">{[data.aluno.className, data.aluno.schoolName].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-[#F8F7FC] p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-extrabold text-[#1F1A2E]">Esta semana</p>
                {data.semana.atividades > 0 && <p className="text-[12px] text-[#5B5470]">{data.semana.atividades} atividades · cerca de {data.semana.minutos} min</p>}
              </div>
              <div className="flex justify-between mb-2">
                {DIAS.map((d, i) => (
                  <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${data.semana.dias[i] ? "bg-gradient-to-br from-[#F97316] to-[#FB923C] text-white" : i === data.semana.hojeIndex ? "bg-white text-[#6D28D9] ring-2 ring-[#6D28D9]" : "bg-white text-[#8B84A0]"}`}>
                    {data.semana.dias[i] ? <Check className="size-4" strokeWidth={3} /> : d}
                  </span>
                ))}
              </div>
              <p className="text-[13px] text-[#1F1A2E] leading-snug">{data.semana.frase}</p>
            </div>
          </section>

          {/* Alertas */}
          {data.alertas.map((a, i) => (
            <div key={i} className={`rounded-3xl px-4 py-3 text-[14px] font-medium ${a.tipo === "warn" ? "bg-[#FFF7E0] text-[#92400E]" : "bg-[#EDE9FE] text-[#4C1D95]"}`}>{a.texto}</div>
          ))}

          {/* Praticando agora */}
          {data.trilhaAtual && (
            <section className="rounded-3xl p-5 text-white shadow-md"
              style={{ background: `linear-gradient(135deg, ${materiaDe(data.trilhaAtual.subjectName)?.cor ?? data.trilhaAtual.subjectColor}, #6D28D9)` }}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/80">Praticando agora · {data.trilhaAtual.subjectName}</p>
              <p className="text-[17px] font-extrabold mt-1 leading-snug">{data.trilhaAtual.skillLabel}</p>
              <div className="mt-3 h-2.5 rounded-full bg-white/25 overflow-hidden"><div className="h-full rounded-full bg-white" style={{ width: `${data.trilhaAtual.total ? (data.trilhaAtual.feitas / data.trilhaAtual.total) * 100 : 0}%` }} /></div>
              <p className="text-[12px] text-white/85 mt-1.5 flex items-center gap-1"><Play className="size-3 fill-current" />{data.trilhaAtual.feitas} de {data.trilhaAtual.total} etapas{data.outrasTrilhas > 0 ? ` · mais ${data.outrasTrilhas} ${data.outrasTrilhas === 1 ? "trilha" : "trilhas"}` : ""}</p>
            </section>
          )}

          {/* Recado e agenda: o aluno vê na tela inicial */}
          <RecadoParaFilho studentId={studentId} nome={data.aluno.firstName} />
          <AgendaDoFilho studentId={studentId} nome={data.aluno.firstName} />

          {/* Matérias */}
          {materias.length > 0 && <MateriasDoFilho materias={materias} nome={data.aluno.firstName} />}

          {/* Como ajudar */}
          <section className="rounded-3xl bg-[#FFF7E0] p-5 flex gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FBBF24] text-white flex items-center justify-center shrink-0"><Lightbulb size={20} /></div>
            <div><h2 className="text-[15px] font-extrabold text-[#92400E] mb-1">Como ajudar em casa</h2><p className="text-[14px] text-[#78350F] leading-snug">{data.dica}</p></div>
          </section>

          {/* Evolução */}
          <Card title="Evolução" right={<Link href={`/escola/familia/${studentId}/evolucao`} className="text-[13px] font-bold text-[#6D28D9] inline-flex items-center gap-1 min-h-[40px]">Ver tudo <ChevronRight size={14} /></Link>}>
            {(data.evolucao.MASTERED + data.evolucao.ALMOST + data.evolucao.NOT_YET) > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {LEVELS.map((l) => (
                    <div key={l.key} className="rounded-2xl p-3 text-center" style={{ backgroundColor: l.bg }}>
                      <p className="text-[22px] font-extrabold leading-none" style={{ color: l.fg }}>{data.evolucao[l.key]}</p>
                      <p className="text-[11px] font-bold mt-1" style={{ color: l.fg }}>{l.label}</p>
                    </div>
                  ))}
                </div>
                {data.evolucao.avancaramNoMes > 0 && <p className="text-[12px] text-[#5B5470]">{data.evolucao.avancaramNoMes} habilidades avançaram este mês</p>}
              </>
            ) : (
              <p className="text-[14px] text-[#5B5470] leading-snug">Assim que {data.aluno.firstName} fizer o primeiro diagnóstico, você verá aqui o que já domina e o que vai praticar.</p>
            )}
          </Card>

          {/* Últimos retornos */}
          <Card title="Últimos retornos" right={data.retornos.length ? <Link href={`/escola/familia/${studentId}/retornos`} className="text-[13px] font-bold text-[#6D28D9] inline-flex items-center gap-1 min-h-[40px]">Ver todos <ChevronRight size={14} /></Link> : undefined}>
            {data.retornos.length ? (
              <div className="space-y-2">
                {data.retornos.map((r, i) => {
                  const lv = levelInfo(r.level);
                  return (
                    <div key={i} className="rounded-2xl bg-[#F8F7FC] p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <IconeMateria chave={r.subjectName} tamanho={28} />
                        <span className="text-[13px] font-bold text-[#1F1A2E]">{r.subjectName}</span>
                        <span className="text-[12px] text-[#8B84A0]">· {r.when}</span>
                        {lv && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full ml-auto" style={{ color: lv.fg, backgroundColor: lv.bg }}>{lv.label}</span>}
                      </div>
                      {r.acertou && <p className="text-[13px] text-[#1F1A2E]"><b className="font-bold text-[#166534]">Acertou:</b> {r.acertou}</p>}
                      {r.melhorar && <p className="text-[13px] text-[#1F1A2E]"><b className="font-bold text-[#92400E]">Pode melhorar:</b> {r.melhorar}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[14px] text-[#5B5470]">Ainda não há retornos. Eles aparecem quando {data.aluno.firstName} entrega uma atividade.</p>
            )}
          </Card>

          {/* Escola */}
          <Card title="Escola">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] flex items-center justify-center shrink-0"><School size={18} className="text-[#6D28D9]" /></div>
              <div className="text-[14px] text-[#1F1A2E]">
                <p className="font-semibold">{[data.escola.nome, data.escola.turma, data.escola.turno].filter(Boolean).join(" · ")}</p>
                <p className="text-[13px] text-[#5B5470]">{[data.escola.phone, data.escola.email].filter(Boolean).join(" · ") || "Contato da secretaria não informado."}</p>
              </div>
            </div>
          </Card>

          {/* Acesso do seu filho */}
          <AcessoFilhoCard studentId={studentId} loginMode={data.aluno.loginMode} />
        </div>
      ) : null}
    </FamilyShell>
  );
}
