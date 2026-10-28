"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BookOpen, Plus, Users, Library, CheckSquare, Clock, ChevronRight, Copy, AlertCircle } from "lucide-react";

type TrackStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "ARCHIVED";
interface Skill { id: string; code: string; shortLabel: string | null; description: string; }
interface TrackItem { id: string; order: number; estMinutes: number; }
interface Track {
  id: string; title: string; status: TrackStatus; subjectId: string; gradeYear: number;
  items: TrackItem[]; skills: Skill[];
  _count?: { assignments: number };
  reviewNote?: string | null;
}
type Aba = "minhas" | "biblioteca" | "atribuidas";

const STATUS_LABEL: Record<TrackStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: "Rascunho",             bg: "#FAF9FD", color: "#5B5470"  },
  SUBMITTED: { label: "Aguardando aprovação", bg: "#FEF3C7", color: "#92400E" },
  APPROVED:  { label: "Aprovada",             bg: "#DCFCE7", color: "#166534"  },
  ARCHIVED:  { label: "Arquivada",            bg: "#F1F5F9", color: "#64748B"  },
};

function totalMin(items: TrackItem[]) { return items.reduce((s, i) => s + i.estMinutes, 0); }

export default function TrilhasProfessorPage() {
  const [aba, setAba] = useState<Aba>("minhas");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [atribuindo, setAtribuindo] = useState<Track | null>(null);
  const [msgSalvo, setMsgSalvo] = useState("");

  const carregar = useCallback(async (a: Aba) => {
    setLoading(true); setErro("");
    const r = await fetch(`/api/escola/trilhas?aba=${a}`).catch(() => null);
    if (!r || !r.ok) { setErro("Não foi possível carregar as trilhas."); setLoading(false); return; }
    const d = await r.json();
    setTracks(d.tracks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(aba); }, [aba, carregar]);

  async function duplicar(track: Track) {
    const r = await fetch("/api/escola/trilhas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${track.title} (cópia)`,
        subjectId: track.subjectId,
        gradeYear: track.gradeYear,
        skillIds: track.skills.map(s => s.id),
        items: track.items.map(it => ({ activityId: (it as unknown as { activityId: string }).activityId ?? "", order: it.order, estMinutes: it.estMinutes })),
      }),
    });
    if (r.ok) {
      setMsgSalvo("Trilha duplicada como rascunho.");
      setTimeout(() => setMsgSalvo(""), 4000);
      if (aba === "minhas") carregar("minhas");
    }
  }

  const abas: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: "minhas",    label: "Minhas trilhas",  icon: <BookOpen  size={16} /> },
    { id: "biblioteca",label: "Biblioteca",       icon: <Library   size={16} /> },
    { id: "atribuidas",label: "Atribuídas",       icon: <CheckSquare size={16} /> },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1A2E]">Trilhas de Reforço</h1>
          <p className="text-[#5B5470] text-sm mt-0.5">Sequências de atividades personalizadas por habilidade BNCC</p>
        </div>
        <Link
          href="/escola/professor/trilhas/nova"
          className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors min-h-[44px]"
        >
          <Plus size={16} /> Nova trilha
        </Link>
      </div>

      {msgSalvo && (
        <div className="mb-4 bg-[#DCFCE7] border border-[#166534]/20 text-[#166534] rounded-xl px-4 py-2.5 text-sm">{msgSalvo}</div>
      )}

      {/* Abas */}
      <div className="flex gap-1 bg-[#F8F7FC] border border-[#E9E5F5] rounded-xl p-1 mb-6 overflow-x-auto">
        {abas.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[40px] flex-1 justify-center
              ${aba === a.id ? "bg-white text-[#1F1A2E] shadow-sm border border-[#E9E5F5]" : "text-[#5B5470] hover:text-[#1F1A2E]"}`}
          >
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="text-[#5B5470] text-center py-16">Carregando...</div>
      ) : erro ? (
        <div className="text-center py-16">
          <AlertCircle className="mx-auto mb-3 text-[#B91C1C]" size={32} />
          <p className="text-[#5B5470]">{erro}</p>
          <button onClick={() => carregar(aba)} className="mt-4 text-[#6D28D9] hover:underline text-sm">Tentar de novo</button>
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]">
          <BookOpen className="mx-auto mb-3" size={36} strokeWidth={1.5} />
          <p className="font-medium text-[#1F1A2E]">
            {aba === "minhas" ? "Você ainda não criou nenhuma trilha" : aba === "biblioteca" ? "Nenhuma trilha aprovada na rede" : "Nenhuma trilha atribuída"}
          </p>
          <p className="text-sm mt-1">
            {aba === "minhas" ? "Crie uma trilha de 3 a 8 atividades para reforçar habilidades BNCC" : ""}
          </p>
          {aba === "minhas" && (
            <Link href="/escola/professor/trilhas/nova" className="mt-4 inline-flex items-center gap-1.5 text-[#6D28D9] hover:underline text-sm">
              <Plus size={14} /> Criar primeira trilha
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map(track => <TrackCard key={track.id} track={track} onAtribuir={setAtribuindo} onDuplicar={duplicar} />)}
        </div>
      )}

      {atribuindo && (
        <AtribuirModal track={atribuindo} onClose={() => setAtribuindo(null)} onSucesso={msg => { setMsgSalvo(msg); setAtribuindo(null); carregar("atribuidas"); }} />
      )}
    </div>
  );
}

/* ─── Card da trilha ───────────────────────────────────────── */
function TrackCard({ track, onAtribuir, onDuplicar }: {
  track: Track;
  onAtribuir: (t: Track) => void;
  onDuplicar: (t: Track) => void;
}) {
  const st = STATUS_LABEL[track.status] ?? STATUS_LABEL.DRAFT;
  const min = totalMin(track.items);
  const isDraft = track.status === "DRAFT";
  const isApproved = track.status === "APPROVED";

  return (
    <div className="bg-white border border-[#E9E5F5] rounded-xl p-5 flex flex-col gap-3 hover:border-[#DDD6EE] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[#1F1A2E] font-semibold text-sm leading-tight flex-1 line-clamp-2">{track.title}</h3>
        <span className="text-xs px-2 py-1 rounded-full font-medium shrink-0" style={{ background: st.bg, color: st.color }}>
          {st.label}
        </span>
      </div>

      {track.reviewNote && (
        <div className="bg-[#FEF3C7] border border-yellow-200 rounded-lg px-3 py-2 text-xs text-[#92400E]">
          <span className="font-medium">Devolvido: </span>{track.reviewNote}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {track.skills.slice(0, 3).map(s => (
          <span key={s.id} className="bg-[#EDE9FE] text-[#4C1D95] text-xs px-2 py-0.5 rounded-full font-mono">{s.code}</span>
        ))}
      </div>

      <div className="flex items-center gap-3 text-[#5B5470] text-xs">
        <span className="flex items-center gap-1"><BookOpen size={12} /> {track.items.length} {track.items.length === 1 ? "atividade" : "atividades"}</span>
        <span className="flex items-center gap-1"><Clock size={12} /> ~{min} min</span>
        <span className="flex items-center gap-1"><Users size={12} /> {track.gradeYear}º ano</span>
      </div>

      <div className="flex gap-2 pt-1 mt-auto">
        <Link
          href={`/escola/professor/trilhas/${track.id}`}
          className="flex-1 text-center text-sm border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] hover:border-[#6D28D9] py-2 rounded-lg transition-colors min-h-[40px] flex items-center justify-center gap-1"
        >
          <ChevronRight size={14} /> {isDraft ? "Editar" : "Ver"}
        </Link>
        <button
          onClick={() => onDuplicar(track)}
          className="p-2 border border-[#DDD6EE] text-[#5B5470] hover:text-[#6D28D9] hover:border-[#6D28D9] rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          title="Duplicar"
        >
          <Copy size={14} />
        </button>
        {isApproved && (
          <button
            onClick={() => onAtribuir(track)}
            className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm py-2 rounded-lg transition-colors min-h-[40px]"
          >
            Atribuir
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Modal de atribuição ──────────────────────────────────── */
interface EduClass { id: string; name: string; gradeYear: number; }
interface Preview { atribuidos: number; pulados: Array<{ studentId: string; motivo: string }>; }

function AtribuirModal({ track, onClose, onSucesso }: {
  track: Track;
  onClose: () => void;
  onSucesso: (msg: string) => void;
}) {
  const [classes, setClasses] = useState<EduClass[]>([]);
  const [classId, setClassId] = useState("");
  const [filter, setFilter] = useState<"todos" | "NOT_YET_ALMOST">("todos");
  const [dueAt, setDueAt] = useState("");
  const [force, setForce] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/escola/escolas").then(r => r.json()).then(async (d) => {
      if (!d.schools?.[0]) return;
      const schoolId = d.schools[0].id;
      const r2 = await fetch(`/api/escola/escolas/${schoolId}/atribuicoes`);
      const d2 = await r2.json();
      setClasses(d2.classes ?? []);
      if (d2.classes?.[0]) setClassId(d2.classes[0].id);
    });
  }, []);

  async function calcPreview() {
    if (!classId) return;
    setLoadingPrev(true); setErro("");
    const body = {
      classId,
      ...(filter === "NOT_YET_ALMOST" ? { skillLevelFilter: ["NOT_YET","ALMOST"] } : {}),
      ...(dueAt ? { dueAt } : {}),
      force,
    };
    const r = await fetch(`/api/escola/trilhas/${track.id}/atribuir?preview=1`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) { setErro(d.error ?? "Erro ao calcular prévia."); setLoadingPrev(false); return; }
    setPreview(d);
    setLoadingPrev(false);
  }

  async function confirmar() {
    if (!classId) return;
    setSaving(true); setErro("");
    const body = {
      classId,
      ...(filter === "NOT_YET_ALMOST" ? { skillLevelFilter: ["NOT_YET","ALMOST"] } : {}),
      ...(dueAt ? { dueAt } : {}),
      force,
    };
    const r = await fetch(`/api/escola/trilhas/${track.id}/atribuir`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) { setErro(d.error ?? "Erro ao atribuir."); setSaving(false); return; }
    onSucesso(`Trilha atribuída a ${d.atribuidos} aluno${d.atribuidos !== 1 ? "s" : ""}.`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E9E5F5] px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#1F1A2E]">Atribuir: {track.title}</h2>
          <button onClick={onClose} className="text-[#5B5470] hover:text-[#1F1A2E] p-1">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Turma</label>
            <select value={classId} onChange={e => { setClassId(e.target.value); setPreview(null); }}
              className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-[#1F1A2E] text-sm outline-none focus:border-[#6D28D9] bg-white min-h-[44px]">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Para quem</label>
            <div className="flex gap-2">
              {[
                { id: "todos", label: "Turma inteira" },
                { id: "NOT_YET_ALMOST", label: "Ainda não / Quase lá" },
              ].map(op => (
                <button key={op.id} onClick={() => { setFilter(op.id as typeof filter); setPreview(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors min-h-[44px] ${filter === op.id ? "bg-[#EDE9FE] border-[#6D28D9] text-[#4C1D95] font-medium" : "border-[#DDD6EE] text-[#5B5470]"}`}>
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Prazo (opcional)</label>
            <input type="date" value={dueAt} onChange={e => { setDueAt(e.target.value); setPreview(null); }}
              className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-[#1F1A2E] text-sm outline-none focus:border-[#6D28D9] bg-white min-h-[44px]" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={force} onChange={e => { setForce(e.target.checked); setPreview(null); }}
              className="w-4 h-4 accent-[#6D28D9]" />
            <span className="text-sm text-[#5B5470]">Atribuir mesmo a quem já domina</span>
          </label>

          {!preview && (
            <button onClick={calcPreview} disabled={!classId || loadingPrev}
              className="w-full border border-[#6D28D9] text-[#6D28D9] hover:bg-[#EDE9FE] py-2.5 rounded-xl text-sm font-medium min-h-[44px] disabled:opacity-50 transition-colors">
              {loadingPrev ? "Calculando..." : "Calcular prévia"}
            </button>
          )}

          {preview && (
            <div className="bg-[#F8F7FC] border border-[#E9E5F5] rounded-xl p-4 space-y-2">
              <p className="font-medium text-[#1F1A2E] text-sm">
                Vai para <strong>{preview.atribuidos}</strong> aluno{preview.atribuidos !== 1 ? "s" : ""}.
              </p>
              {preview.pulados.length > 0 && (
                <details className="text-xs text-[#5B5470]">
                  <summary className="cursor-pointer hover:text-[#1F1A2E]">{preview.pulados.length} aluno{preview.pulados.length !== 1 ? "s" : ""} não vão receber</summary>
                  <ul className="mt-2 space-y-1 pl-3">
                    {preview.pulados.map((p, i) => <li key={i}>· {p.motivo}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

          {erro && <p className="text-[#B91C1C] text-sm">{erro}</p>}

          {preview && (
            <button onClick={confirmar} disabled={saving || preview.atribuidos === 0}
              className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold min-h-[44px] transition-colors">
              {saving ? "Atribuindo..." : `Confirmar — ${preview.atribuidos} aluno${preview.atribuidos !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
