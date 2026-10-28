"use client";
import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Monitor, X } from "lucide-react";

interface ClassOffer { id: string; classId: string; class: { name: string; gradeYear: number; shift: string } }
interface ActiveSession { id: string; code: string; expiresAt: string; class: { name: string; gradeYear: number; shift: string }; classId: string }
interface Presente { id: string; display: string }
interface Bloqueado { id: string; display: string; failedCount: number }

const SHIFT_LABEL: Record<string, string> = { MORNING: "Manhã", AFTERNOON: "Tarde", EVENING: "Noturno", FULL_TIME: "Integral" };

export default function AulaPage() {
  const [offers, setOffers] = useState<ClassOffer[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [presentes, setPresentes] = useState<Record<string, { list: Presente[]; bloqueados: Bloqueado[]; total: number }>>({});

  const load = useCallback(async () => {
    const [offersRes, sessionsRes] = await Promise.all([
      fetch("/api/escola/professor/ofertas"),
      fetch("/api/escola/aulas"),
    ]);
    if (offersRes.ok) {
      const d = await offersRes.json();
      const list: ClassOffer[] = d.ofertas ?? [];
      setOffers(list);
      const unique = list.filter((o, i, a) => a.findIndex(x => x.classId === o.classId) === i);
      if (unique.length) setSelectedClassId(prev => prev || unique[0].classId);
    }
    if (sessionsRes.ok) {
      const d = await sessionsRes.json();
      setSessions(d.sessions ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll presentes a cada 10s para cada sessão aberta
  useEffect(() => {
    if (sessions.length === 0) return;
    async function pollPresentes() {
      for (const s of sessions) {
        const r = await fetch(`/api/escola/aulas/${s.id}/presentes`).catch(() => null);
        if (r?.ok) {
          const d = await r.json();
          setPresentes(prev => ({ ...prev, [s.id]: { list: d.presentes ?? [], bloqueados: d.bloqueados ?? [], total: d.total ?? 0 } }));
        }
      }
    }
    pollPresentes();
    const interval = setInterval(pollPresentes, 10000);
    return () => clearInterval(interval);
  }, [sessions]);

  async function openAula() {
    if (!selectedClassId) return;
    setOpening(true); setError("");
    const r = await fetch("/api/escola/aulas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClassId }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error); setOpening(false); return; }
    setOpening(false); load();
  }

  async function closeAula(id: string) {
    await fetch(`/api/escola/aulas/${id}/encerrar`, { method: "POST" });
    load();
  }

  async function liberarAluno(studentId: string) {
    await fetch(`/api/escola/alunos/${studentId}/desbloquear`, { method: "POST" }).catch(() => null);
    // Recarregar presentes
    for (const s of sessions) {
      const r = await fetch(`/api/escola/aulas/${s.id}/presentes`).catch(() => null);
      if (r?.ok) {
        const d = await r.json();
        setPresentes(prev => ({ ...prev, [s.id]: { list: d.presentes ?? [], bloqueados: d.bloqueados ?? [], total: d.total ?? 0 } }));
      }
    }
  }

  const uniqueClasses = offers.filter((o, i, a) => a.findIndex(x => x.classId === o.classId) === i);

  if (loading) return <div className="p-8 text-[#5B5470] text-center">Carregando...</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1F1A2E] mb-2">Modo Sala de Aula</h1>
      <p className="text-[#5B5470] text-sm mb-6">Abra uma aula para que os alunos entrem pelo codigo no projetor.</p>

      {/* Sessões abertas */}
      {sessions.map(s => {
        const expiresAt = new Date(s.expiresAt);
        const expiresStr = expiresAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const aulaUrl = `https://www.speakflow.ia.br/escola/aluno/entrar?aula=${s.code}`;
        const info = presentes[s.id];

        return (
          <div key={s.id} className="mb-6">
            <div className="bg-white border border-[#E9E5F5] rounded-2xl p-6 flex flex-col lg:flex-row gap-6">
              {/* Lado esquerdo: QR + código + info */}
              <div className="flex-1 flex flex-col items-center lg:items-start gap-4">
                <div className="text-[#5B5470] text-sm font-medium">
                  Aula aberta · {s.class.name} · {SHIFT_LABEL[s.class.shift] ?? s.class.shift}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* QR Code */}
                  <div className="bg-white border-2 border-[#E9E5F5] rounded-xl p-3">
                    <QRCodeSVG value={aulaUrl} size={160} level="M" />
                  </div>

                  <div className="text-center sm:text-left">
                    <div className="text-[#5B5470] text-xs font-semibold tracking-widest uppercase mb-1">Codigo da aula</div>
                    <div className="text-5xl font-bold font-mono text-[#1F1A2E] tracking-widest">{s.code}</div>
                    <div className="text-[#166534] text-sm mt-1">expira as {expiresStr}</div>
                  </div>
                </div>

                {/* Instrucoes */}
                <div className="bg-[#F8F7FC] border border-[#E9E5F5] rounded-xl p-4 text-sm text-[#3F3A4F] max-w-md">
                  <span className="font-semibold">Como os alunos entram:</span>{" "}
                  no app, <span className="font-semibold">Sou aluno &rsaquo; Codigo da aula</span> (ou apontam a camera para o QR), tocam no proprio nome e fazem a senha.
                </div>

                {/* Botões */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => window.open(aulaUrl, "_blank")}
                    className="flex items-center gap-2 bg-[#EDE9FE] hover:bg-[#DDD6EE] text-[#4C1D95] px-5 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] transition-colors"
                  >
                    <Monitor size={16} /> Tela cheia (projetor)
                  </button>
                  <button
                    onClick={() => closeAula(s.id)}
                    className="flex items-center gap-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] transition-colors"
                  >
                    <X size={16} /> Encerrar aula
                  </button>
                </div>
                <p className="text-[#5B5470] text-xs">Ao encerrar, todos saem automaticamente dos tablets da escola.</p>
              </div>

              {/* Lado direito: presentes */}
              <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-[#E9E5F5] pt-4 lg:pt-0 lg:pl-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#1F1A2E] font-semibold text-sm">Quem ja entrou</span>
                  {info && (
                    <span className="bg-[#DCFCE7] text-[#166534] text-xs font-bold px-2 py-0.5 rounded-full">
                      {info.list.length} de {info.total}
                    </span>
                  )}
                </div>

                {/* Bloqueados */}
                {info?.bloqueados.map(b => (
                  <div key={b.id} className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-3 mb-2 flex items-center justify-between">
                    <span className="text-[#92400E] text-xs font-medium">{b.display} errou a senha {b.failedCount} vezes.</span>
                    <button
                      onClick={() => liberarAluno(b.id)}
                      className="text-[#B45309] underline text-xs font-semibold ml-2 min-h-[44px] flex items-center"
                    >
                      Liberar
                    </button>
                  </div>
                ))}

                {/* Lista de presentes */}
                {info && info.list.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {info.list.map(p => (
                      <span key={p.id} className="bg-[#F8F7FC] border border-[#E9E5F5] rounded-lg px-2.5 py-1 text-xs text-[#1F1A2E]">{p.display}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#5B5470] text-xs">Nenhum aluno entrou ainda. Atualizando a cada 10 s.</p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Formulário para abrir nova aula */}
      {uniqueClasses.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]">
          <p className="text-lg font-semibold mb-2">Voce nao esta atribuido a nenhuma turma.</p>
          <p className="text-sm">Peca a coordenacao para vincular voce a uma turma.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-6 max-w-sm">
          <h2 className="text-[#1F1A2E] font-semibold mb-4">Abrir nova aula</h2>
          <div className="mb-4">
            <label className="text-[#5B5470] text-sm block mb-1.5">Turma</label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-xl px-3 py-2.5 text-sm border border-[#DDD6EE] outline-none focus:border-[#6D28D9] min-h-[44px]"
            >
              {uniqueClasses.map(o => (
                <option key={o.classId} value={o.classId}>
                  {o.class.name} — {o.class.gradeYear}º {SHIFT_LABEL[o.class.shift] ?? o.class.shift}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-[#B91C1C] text-sm mb-3">{error}</p>}
          <button
            onClick={openAula}
            disabled={opening || !selectedClassId}
            className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-6 py-3 rounded-xl text-base font-semibold min-h-[52px] disabled:opacity-50 transition-colors"
          >
            {opening ? "Abrindo..." : "Abrir aula"}
          </button>
          <p className="text-[#5B5470] text-xs text-center mt-2">A aula fica aberta por ate 2 horas. Feche ao terminar.</p>
        </div>
      )}
    </div>
  );
}
