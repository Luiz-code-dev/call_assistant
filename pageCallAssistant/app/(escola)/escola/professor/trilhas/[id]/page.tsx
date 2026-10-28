"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Trash2, Sparkles, Loader2, AlertCircle, Users } from "lucide-react";

type TrackStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "ARCHIVED";
interface Skill { id: string; code: string; shortLabel: string | null; description: string; }
interface TrackItem { id: string; order: number; activityId: string; estMinutes: number; _tipo?: string; _enunciado?: string; }
interface Track {
  id: string; title: string; status: TrackStatus; subjectId: string; gradeYear: number;
  items: TrackItem[]; skills: Skill[]; reviewNote: string | null;
}

const STATUS_LABEL: Record<TrackStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: "Rascunho",             bg: "#FAF9FD", color: "#5B5470"  },
  SUBMITTED: { label: "Aguardando aprovação", bg: "#FEF3C7", color: "#92400E" },
  APPROVED:  { label: "Aprovada",             bg: "#DCFCE7", color: "#166534"  },
  ARCHIVED:  { label: "Arquivada",            bg: "#F1F5F9", color: "#64748B"  },
};

export default function TrilhaDetalhe() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [suggerindo, setSuggerindo] = useState(false);
  const [atribuindo, setAtribuindo] = useState(false);

  // Campos editáveis (só DRAFT)
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<TrackItem[]>([]);

  const carregar = useCallback(async () => {
    const r = await fetch(`/api/escola/trilhas/${id}`).catch(() => null);
    if (!r?.ok) { setErro("Trilha não encontrada."); setLoading(false); return; }
    const d = await r.json();
    setTrack(d.track);
    setTitle(d.track.title);
    setItems(d.track.items);
    setLoading(false);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvar(action?: string) {
    setSaving(true); setErro(""); setMsg("");
    const body = action ? { action } : { title, items: items.map(it => ({ activityId: it.activityId, order: it.order, estMinutes: it.estMinutes })) };
    const r = await fetch(`/api/escola/trilhas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) { setErro(d.error ?? "Erro ao salvar."); setSaving(false); return; }
    if (action === "arquivar") { router.push("/escola/professor/trilhas"); return; }
    setTrack(d.track);
    setTitle(d.track.title);
    setItems(d.track.items);
    setMsg(action === "enviar" ? "Enviada para aprovação!" : "Salvo!");
    setTimeout(() => setMsg(""), 3000);
    setSaving(false);
  }

  async function sugerirIA() {
    if (!track) return;
    setSuggerindo(true); setErro("");
    const r = await fetch("/api/escola/trilhas/sugerir", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectName: track.subjectId, gradeYear: track.gradeYear, skills: track.skills.map(s => ({ code: s.code, description: s.description })) }),
    });
    if (!r.ok) { setErro("Não foi possível gerar sugestões."); setSuggerindo(false); return; }
    const d = await r.json();
    setItems((d.atividades ?? []).map((it: { order: number; type: string; enunciado: string; criterios: string; estMinutes: number }, i: number) => ({
      id: `sug_${i}`, order: it.order - 1, activityId: `sug_${i}`, estMinutes: it.estMinutes, _tipo: it.type, _enunciado: it.enunciado,
    })));
    setSuggerindo(false);
  }

  function moverItem(idx: number, dir: -1 | 1) {
    const arr = [...items]; const sw = idx + dir;
    if (sw < 0 || sw >= arr.length) return;
    [arr[idx], arr[sw]] = [arr[sw], arr[idx]];
    setItems(arr.map((it, i) => ({ ...it, order: i })));
  }

  if (loading) return <div className="p-8 text-[#5B5470] text-center">Carregando...</div>;
  if (erro && !track) return (
    <div className="p-8 text-center">
      <AlertCircle className="mx-auto mb-3 text-[#B91C1C]" size={32} />
      <p className="text-[#5B5470]">{erro}</p>
      <Link href="/escola/professor/trilhas" className="mt-4 inline-block text-[#6D28D9] hover:underline text-sm">Voltar</Link>
    </div>
  );
  if (!track) return null;

  const st = STATUS_LABEL[track.status];
  const isDraft = track.status === "DRAFT";
  const totalMin = items.reduce((s, it) => s + it.estMinutes, 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/escola/professor/trilhas" className="text-[#5B5470] hover:text-[#1F1A2E]"><ChevronLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1F1A2E] truncate">{track.title}</h1>
            <span className="text-xs px-2 py-1 rounded-full font-medium shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
          </div>
          <p className="text-[#5B5470] text-sm">{items.length} atividades · ~{totalMin} min · {track.gradeYear}º ano</p>
        </div>
      </div>

      {track.reviewNote && (
        <div className="mb-4 bg-[#FEF3C7] border border-yellow-200 rounded-xl px-4 py-3 text-sm text-[#92400E]">
          <span className="font-semibold">Devolvido pela coordenação: </span>{track.reviewNote}
        </div>
      )}

      {msg && <div className="mb-4 bg-[#DCFCE7] border border-[#166534]/20 text-[#166534] rounded-xl px-4 py-2.5 text-sm">{msg}</div>}
      {erro && <div className="mb-4 bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] rounded-xl px-4 py-2.5 text-sm flex items-center gap-2"><AlertCircle size={16}/>{erro}</div>}

      {/* Habilidades */}
      <div className="bg-white border border-[#E9E5F5] rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-[#1F1A2E] mb-2">Habilidades</h2>
        <div className="flex flex-wrap gap-2">
          {track.skills.map(s => (
            <span key={s.id} className="bg-[#EDE9FE] text-[#4C1D95] text-xs px-2 py-1 rounded-full">
              <span className="font-mono font-semibold">{s.code}</span>
              {s.shortLabel && <span className="ml-1 text-[#6D28D9]">· {s.shortLabel}</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Título (editável se DRAFT) */}
      {isDraft && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-sm text-[#1F1A2E] outline-none focus:border-[#6D28D9] bg-white min-h-[44px]" />
        </div>
      )}

      {/* Atividades */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#1F1A2E]">Atividades</h2>
          {isDraft && (
            <button onClick={sugerirIA} disabled={suggerindo}
              className="flex items-center gap-1.5 border border-[#6D28D9] text-[#6D28D9] hover:bg-[#EDE9FE] text-xs px-3 py-1.5 rounded-lg min-h-[36px] transition-colors disabled:opacity-50">
              {suggerindo ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {suggerindo ? "Gerando..." : "Sugerir com IA"}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.id + idx} className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${isDraft ? "bg-white border-[#E9E5F5]" : "bg-[#F8F7FC] border-[#E9E5F5]"}`}>
              <span className="w-6 h-6 rounded-full bg-[#F8F7FC] border border-[#E9E5F5] flex items-center justify-center text-xs font-medium text-[#5B5470] shrink-0">{idx+1}</span>
              <div className="flex-1 min-w-0">
                {it._tipo && <span className="text-xs bg-[#F8F7FC] text-[#5B5470] px-1.5 py-0.5 rounded mr-2">{it._tipo}</span>}
                <span className="text-sm text-[#1F1A2E]">{it._enunciado ?? `Atividade ${idx+1}`}</span>
                <div className="text-xs text-[#5B5470] mt-0.5">~{it.estMinutes} min</div>
              </div>
              {isDraft && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moverItem(idx,-1)} disabled={idx===0} className="p-1 text-[#5B5470] hover:text-[#6D28D9] disabled:opacity-30 text-xs">▲</button>
                  <button onClick={() => moverItem(idx,1)} disabled={idx===items.length-1} className="p-1 text-[#5B5470] hover:text-[#6D28D9] disabled:opacity-30 text-xs">▼</button>
                  <button onClick={() => setItems(prev => prev.filter((_,i)=>i!==idx).map((x,i)=>({...x,order:i})))}
                    className="p-1 text-[#B91C1C] hover:text-[#991B1B]"><Trash2 size={12}/></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-3">
        {isDraft && (
          <>
            <button onClick={() => salvar()} disabled={saving || items.length < 3 || items.length > 8}
              className="w-full border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] py-3 rounded-xl text-sm font-medium min-h-[44px] disabled:opacity-50 transition-colors">
              {saving ? "Salvando..." : "Salvar rascunho"}
            </button>
            <button onClick={() => salvar("enviar")} disabled={saving || items.length < 3}
              className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white py-3 rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-50 transition-colors">
              {saving ? "Enviando..." : "Enviar para aprovação"}
            </button>
          </>
        )}
        {track.status === "APPROVED" && (
          <button onClick={() => setAtribuindo(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white py-3 rounded-xl text-sm font-semibold min-h-[44px] transition-colors">
            <Users size={16}/> Atribuir à turma
          </button>
        )}
        {isDraft && (
          <button onClick={() => salvar("arquivar")} disabled={saving}
            className="w-full text-[#B91C1C] hover:underline text-sm py-2 transition-colors">
            Arquivar trilha
          </button>
        )}
      </div>

      {atribuindo && (
        <AtribuirInline trackId={id} trackTitle={track.title} onClose={() => setAtribuindo(false)}
          onSucesso={msg => { setMsg(msg); setAtribuindo(false); }} />
      )}
    </div>
  );
}

/* Modal de atribuição embutido */
function AtribuirInline({ trackId, trackTitle, onClose, onSucesso }: { trackId: string; trackTitle: string; onClose: () => void; onSucesso: (m: string) => void }) {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [force, setForce] = useState(false);
  const [preview, setPreview] = useState<{ atribuidos: number; pulados: { studentId: string; motivo: string }[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/escola/escolas").then(r => r.json()).then(async d => {
      if (!d.schools?.[0]) return;
      const r2 = await fetch(`/api/escola/escolas/${d.schools[0].id}/atribuicoes`);
      const d2 = await r2.json();
      setClasses(d2.classes ?? []);
      if (d2.classes?.[0]) setClassId(d2.classes[0].id);
    });
  }, []);

  async function calcPreview() {
    if (!classId) return;
    setSaving(true);
    const r = await fetch(`/api/escola/trilhas/${trackId}/atribuir?preview=1`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, ...(dueAt ? { dueAt } : {}), force }),
    });
    const d = await r.json();
    if (!r.ok) { setErro(d.error ?? "Erro."); setSaving(false); return; }
    setPreview(d); setSaving(false);
  }

  async function confirmar() {
    if (!classId || !preview) return;
    setSaving(true);
    const r = await fetch(`/api/escola/trilhas/${trackId}/atribuir`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, ...(dueAt ? { dueAt } : {}), force }),
    });
    const d = await r.json();
    if (!r.ok) { setErro(d.error ?? "Erro."); setSaving(false); return; }
    onSucesso(`Trilha atribuída a ${d.atribuidos} aluno${d.atribuidos!==1?"s":""}.`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl">
        <div className="border-b border-[#E9E5F5] px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#1F1A2E] text-sm">Atribuir: {trackTitle}</h2>
          <button onClick={onClose} className="text-[#5B5470] hover:text-[#1F1A2E] p-1 text-lg">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Turma</label>
            <select value={classId} onChange={e => { setClassId(e.target.value); setPreview(null); }}
              className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-sm text-[#1F1A2E] outline-none focus:border-[#6D28D9] bg-white min-h-[44px]">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Prazo (opcional)</label>
            <input type="date" value={dueAt} onChange={e => { setDueAt(e.target.value); setPreview(null); }}
              className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-sm text-[#1F1A2E] outline-none focus:border-[#6D28D9] bg-white min-h-[44px]" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={force} onChange={e => { setForce(e.target.checked); setPreview(null); }} className="w-4 h-4 accent-[#6D28D9]" />
            <span className="text-sm text-[#5B5470]">Atribuir mesmo a quem já domina</span>
          </label>
          {erro && <p className="text-[#B91C1C] text-sm">{erro}</p>}
          {!preview ? (
            <button onClick={calcPreview} disabled={!classId || saving}
              className="w-full border border-[#6D28D9] text-[#6D28D9] hover:bg-[#EDE9FE] py-2.5 rounded-xl text-sm font-medium min-h-[44px] disabled:opacity-50 transition-colors">
              {saving ? "Calculando..." : "Ver prévia"}
            </button>
          ) : (
            <>
              <div className="bg-[#F8F7FC] border border-[#E9E5F5] rounded-xl p-4 text-sm">
                <p className="font-medium text-[#1F1A2E]">Vai para <strong>{preview.atribuidos}</strong> aluno{preview.atribuidos!==1?"s":""}.</p>
                {preview.pulados.length > 0 && <p className="text-[#5B5470] text-xs mt-1">{preview.pulados.length} não vão receber (já dominam ou limite atingido)</p>}
              </div>
              <button onClick={confirmar} disabled={saving || preview.atribuidos === 0}
                className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold min-h-[44px] transition-colors">
                {saving ? "Atribuindo..." : `Confirmar — ${preview.atribuidos} aluno${preview.atribuidos!==1?"s":""}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
