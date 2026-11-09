"use client";
import { useEffect, useState, useRef } from "react";
import { QrCode, Mail, Printer, Users, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import { QRCodeSVG } from "qrcode.react";

interface ClassInfo {
  id: string;
  name: string;
  gradeYear: number;
  shift: string;
  _count: { enrollments: number };
}
interface StudentRow {
  id: string;
  fullName: string;
  loginMode: string;
}
interface KitResult {
  studentId: string;
  fullName: string;
  loginMode: string;
  pin?: string;
  figures?: string[];
  qrUrl: string;
  qrToken: string;
}

const SHIFT_LABEL: Record<string, string> = { MORNING: "Manhã", AFTERNOON: "Tarde", EVENING: "Noite", FULL_TIME: "Integral" };
const FIGURE_LABEL: Record<string, string> = { sun:"Sol", star:"Estrela", heart:"Coracao", house:"Casa", fish:"Peixe", flower:"Flor", moon:"Lua", drop:"Gota", cloud:"Nuvem" };

function FigureBadge({ id }: { id: string }) {
  const colors: Record<string, string> = { sun:"#F59E0B", star:"#7C3AED", heart:"#BE185D", house:"#0F766E", fish:"#1D4ED8", flower:"#BE185D", moon:"#6D28D9", drop:"#0EA5E9", cloud:"#94A3B8" };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs font-semibold" style={{ background: colors[id] ?? "#6D28D9" }}>
      {FIGURE_LABEL[id] ?? id}
    </span>
  );
}

function KitCard({ kit, onClose }: { kit: KitResult; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  function printKit() {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kit de Acesso</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;max-width:500px;margin:0 auto}
    h2{font-size:18px;margin-bottom:4px}p{margin:4px 0;font-size:13px;color:#555}
    .pin{font-size:36px;font-weight:900;color:#6D28D9;letter-spacing:6px;margin:8px 0}
    .fig{display:inline-block;padding:4px 10px;margin:2px;border-radius:16px;color:#fff;font-weight:700;font-size:13px}
    .warn{background:#FEE2E2;border:1px solid #FECACA;color:#B91C1C;padding:8px 12px;border-radius:8px;margin-top:12px;font-size:12px}
    .inst{background:#F8F7FC;border:1px solid #E9E5F5;padding:8px 12px;border-radius:8px;margin-top:8px;font-size:12px}
    </style></head><body>${html}</body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* Título — sempre visível */}
        <div className="px-6 pt-6 pb-2 shrink-0">
          <h2 className="text-[#1F1A2E] font-bold text-lg mb-0.5">{kit.fullName}</h2>
          <p className="text-[#5B5470] text-sm">Kit de acesso ao SpeakFlow Escolas</p>
        </div>
        {/* Área rolável */}
        <div className="overflow-y-auto flex-1 px-6">
        <div ref={printRef} className="pt-2">
          <div className="mb-1" />
          <div className="flex justify-center mb-4">
            <QRCodeSVG value={kit.qrUrl} size={140} level="M" />
          </div>
          {kit.loginMode === "PIN" && kit.pin ? (
            <div className="text-center mb-4">
              <p className="text-xs font-semibold text-[#5B5470] mb-1">Senha (PIN)</p>
              <p className="pin text-[#6D28D9] text-4xl font-black tracking-widest">{kit.pin}</p>
            </div>
          ) : kit.figures ? (
            <div className="text-center mb-4">
              <p className="text-xs font-semibold text-[#5B5470] mb-2">Sequência de figuras</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {kit.figures.map((f, i) => <FigureBadge key={i} id={f} />)}
              </div>
            </div>
          ) : null}
          <div className="warn bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-xs px-3 py-2 rounded-lg mb-3">
            <strong>Confidencial.</strong> Entregue em envelope individual. Destrua esta folha após a entrega.
            A senha NÃO aparecerá novamente — para ver outra vez, gere um novo kit.
          </div>
          <div className="inst bg-[#F8F7FC] border border-[#E9E5F5] text-xs px-3 py-2 rounded-lg">
            <strong className="text-[#1F1A2E]">Como entrar em casa:</strong>
            <ol className="mt-1 text-[#5B5470] space-y-0.5 pl-4 list-decimal">
              <li>Abra o app SpeakFlow Escolas ou acesse o site.</li>
              <li>Toque em &quot;Ler o QR do meu cartão&quot;.</li>
              <li>Aponte a câmera para o QR acima.</li>
              <li>Digite {kit.loginMode === "PIN" ? "a senha" : "as figuras na ordem"} para confirmar.</li>
            </ol>
          </div>
        </div>
        </div>{/* fecha scrollable */}
        <div className="flex gap-2 px-6 pb-6 pt-3 shrink-0 border-t border-[#E9E5F5]">
          <button onClick={printKit}
            className="flex-1 flex items-center justify-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">
            <Printer size={15} /> Imprimir / PDF
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#DDD6EE] text-[#5B5470] text-sm font-semibold min-h-[44px] hover:bg-[#F8F7FC]">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AcessoFamiliasPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [students, setStudents] = useState<Record<string, StudentRow[]>>({});
  const [studentsLoading, setStudentsLoading] = useState<Record<string, boolean>>({});
  const [kitLoading, setKitLoading] = useState<Record<string, boolean>>({});
  const [activeKit, setActiveKit] = useState<KitResult | null>(null);
  const [inviteLoading, setInviteLoading] = useState<Record<string, boolean>>({});
  const [inviteMsg, setInviteMsg] = useState<Record<string, string>>({});
  // email input inline por aluno: null = fechado, string = valor digitado
  const [inviteEmail, setInviteEmail] = useState<Record<string, string | null>>({});

  async function load() {
    setLoading(true); setError(false);
    try {
      const r = await fetch("/api/escola/turmas");
      if (!r.ok) { setError(true); return; }
      const d = await r.json();
      setClasses(d.classes ?? []);
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function toggleClass(classId: string) {
    if (expanded === classId) { setExpanded(null); return; }
    setExpanded(classId);
    if (!students[classId]) {
      setStudentsLoading(p => ({ ...p, [classId]: true }));
      try {
        const r = await fetch(`/api/escola/turmas/${classId}/alunos`);
        const d = await r.json();
        setStudents(p => ({ ...p, [classId]: d.students ?? [] }));
      } catch { /* silencia */ }
      setStudentsLoading(p => ({ ...p, [classId]: false }));
    }
  }

  async function gerarKit(studentId: string) {
    setKitLoading(p => ({ ...p, [studentId]: true }));
    try {
      const r = await fetch(`/api/escola/direcao/alunos/${studentId}/kit-acesso`, { method: "POST" });
      const d = await r.json();
      if (r.ok) setActiveKit(d);
    } catch { /* silencia */ }
    setKitLoading(p => ({ ...p, [studentId]: false }));
  }

  function abrirFormConvite(studentId: string) {
    setInviteEmail(p => ({ ...p, [studentId]: p[studentId] ?? "" }));
    setInviteMsg(p => ({ ...p, [studentId]: "" }));
  }

  async function enviarConvite(studentId: string) {
    const email = inviteEmail[studentId] ?? "";
    if (!email.includes("@")) {
      setInviteMsg(p => ({ ...p, [studentId]: "Digite um e-mail válido." }));
      return;
    }
    setInviteLoading(p => ({ ...p, [studentId]: true }));
    setInviteMsg(p => ({ ...p, [studentId]: "" }));
    try {
      const r = await fetch(`/api/escola/familia/convidar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, email }),
      });
      const d = await r.json();
      if (r.ok) {
        setInviteMsg(p => ({ ...p, [studentId]: "Convite enviado." }));
        setInviteEmail(p => ({ ...p, [studentId]: null }));
      } else {
        setInviteMsg(p => ({ ...p, [studentId]: d.error ?? "Erro ao enviar." }));
      }
    } catch { setInviteMsg(p => ({ ...p, [studentId]: "Erro ao enviar." })); }
    setInviteLoading(p => ({ ...p, [studentId]: false }));
  }

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Direção", href: "/escola/direcao" }, { label: "Acesso das famílias" }]}
        title="Acesso das famílias"
        subtitle="Gere o kit de acesso individual ou envie o convite digital para o responsável."
      />

      <div className="px-7 py-6 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="text-center py-16 text-[#5B5470]">Carregando…</div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-[#B91C1C] mb-3">Erro ao carregar turmas.</p>
            <button onClick={load} className="text-[#6D28D9] underline text-sm flex items-center gap-1 mx-auto"><RefreshCw size={13} /> Tentar de novo</button>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 text-[#5B5470]">
            <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-4">
              <QrCode size={26} className="text-[#6D28D9]" />
            </div>
            <p className="font-semibold text-[#1F1A2E]">Nenhuma turma cadastrada</p>
            <p className="text-sm mt-1">Vá em <Link href="/escola/direcao/turmas" className="text-[#6D28D9] underline">Turmas e alunos</Link> para cadastrar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-[#EDE9FE] border border-[#C4B5FD] text-[#4C1D95] text-sm px-4 py-3 rounded-xl flex gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>
                <strong>Kit impresso</strong>: o PIN aparece <em>somente</em> na primeira geração — para ver novamente, gere um novo kit.
                <strong className="ml-2">Convite digital</strong>: enviado por e-mail ao responsável cadastrado.
              </p>
            </div>
            {classes.map((c) => (
              <div key={c.id} className="bg-white border border-[#E9E5F5] rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleClass(c.id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#F8F7FC] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1F1A2E] font-semibold">{c.name}</p>
                    <p className="text-[#5B5470] text-sm">{c.gradeYear}º · {SHIFT_LABEL[c.shift] ?? c.shift}</p>
                    <p className="text-[#5B5470] text-xs mt-0.5 flex items-center gap-1">
                      <Users size={12} /> {c._count.enrollments} aluno(s)
                    </p>
                  </div>
                  {expanded === c.id ? <ChevronUp size={18} className="text-[#5B5470]" /> : <ChevronDown size={18} className="text-[#5B5470]" />}
                </button>

                {expanded === c.id && (
                  <div className="border-t border-[#E9E5F5] px-5 pb-4">
                    {studentsLoading[c.id] ? (
                      <div className="py-6 text-center text-[#5B5470] text-sm">Carregando alunos…</div>
                    ) : (students[c.id] ?? []).length === 0 ? (
                      <div className="py-6 text-center text-[#5B5470] text-sm">Nenhum aluno matriculado.</div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {(students[c.id] ?? []).map((s) => (
                          <div key={s.id} className="flex items-center justify-between gap-3 py-2 border-b border-[#F0EDF9] last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-[#1F1A2E] text-sm font-medium truncate">{s.fullName}</p>
                              <p className="text-[#5B5470] text-xs">{s.loginMode === "PICTURE" ? "Figuras" : "PIN"}</p>
                              {inviteMsg[s.id] && (
                                <p className={`text-xs mt-0.5 ${inviteMsg[s.id] === "Convite enviado." ? "text-[#166534]" : "text-[#B91C1C]"}`}>{inviteMsg[s.id]}</p>
                              )}
                              {/* Formulário inline de email para convite digital */}
                              {inviteEmail[s.id] !== null && inviteEmail[s.id] !== undefined && (
                                <div className="mt-1.5 flex gap-1.5 items-center">
                                  <input
                                    type="email"
                                    placeholder="email@responsavel.com"
                                    value={inviteEmail[s.id] ?? ""}
                                    onChange={e => setInviteEmail(p => ({ ...p, [s.id]: e.target.value }))}
                                    className="flex-1 border border-[#DDD6EE] rounded-lg px-2 py-1 text-xs text-[#1F1A2E] focus:border-[#6D28D9] outline-none min-w-0"
                                  />
                                  <button
                                    onClick={() => enviarConvite(s.id)}
                                    disabled={!!inviteLoading[s.id]}
                                    className="bg-[#6D28D9] text-white px-2 py-1 rounded-lg text-xs font-semibold min-h-[28px] disabled:opacity-50"
                                  >{inviteLoading[s.id] ? "…" : "Enviar"}</button>
                                  <button
                                    onClick={() => setInviteEmail(p => ({ ...p, [s.id]: null }))}
                                    className="text-[#5B5470] px-1.5 py-1 rounded-lg text-xs border border-[#DDD6EE] min-h-[28px]"
                                  >X</button>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => abrirFormConvite(s.id)}
                                disabled={!!inviteLoading[s.id]}
                                title="Enviar convite digital ao responsável"
                                className="flex items-center gap-1 border border-[#DDD6EE] text-[#5B5470] hover:border-[#6D28D9] hover:text-[#6D28D9] px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] disabled:opacity-50 transition-colors"
                              >
                                <Mail size={13} /> Convidar
                              </button>
                              <button
                                onClick={() => gerarKit(s.id)}
                                disabled={!!kitLoading[s.id]}
                                title="Gerar kit impresso individual"
                                className="flex items-center gap-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] disabled:opacity-50 transition-colors"
                              >
                                <Printer size={13} /> {kitLoading[s.id] ? "…" : "Kit impresso"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activeKit && <KitCard kit={activeKit} onClose={() => setActiveKit(null)} />}
    </div>
  );
}
