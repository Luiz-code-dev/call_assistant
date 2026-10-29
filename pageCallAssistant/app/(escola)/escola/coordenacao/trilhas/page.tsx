"use client";
import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Library, Clock, BookOpen, AlertCircle } from "lucide-react";

type TrackStatus = "SUBMITTED" | "APPROVED" | "ARCHIVED" | "DRAFT";
interface Skill { id: string; code: string; shortLabel: string | null; }
interface TrackItem { id: string; estMinutes: number; }
interface Track { id: string; title: string; status: TrackStatus; gradeYear: number; items: TrackItem[]; skills: Skill[]; reviewNote: string | null; }

type Aba = "aguardando" | "biblioteca";

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  SUBMITTED: { label: "Aguardando aprovação", bg: "#FEF3C7", color: "#92400E" },
  APPROVED:  { label: "Aprovada",             bg: "#DCFCE7", color: "#166534" },
  ARCHIVED:  { label: "Arquivada",            bg: "#F1F5F9", color: "#64748B" },
  DRAFT:     { label: "Rascunho",             bg: "#FAF9FD", color: "#5B5470" },
};

export default function CoordenacaoTrilhasPage() {
  const [aba, setAba] = useState<Aba>("aguardando");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [abrindo, setAbrindo] = useState<Track | null>(null);
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async (a: Aba) => {
    setLoading(true); setErro("");
    const url = a === "aguardando"
      ? "/api/escola/trilhas?aba=pendentes"
      : "/api/escola/trilhas?aba=biblioteca";
    const r = await fetch(url).catch(() => null);
    if (!r?.ok) { setErro("Não foi possível carregar."); setLoading(false); return; }
    const d = await r.json();
    setTracks(d.tracks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(aba); }, [aba, carregar]);

  async function acao(trackId: string, action: "aprovar" | "devolver", reviewNote?: string) {
    const r = await fetch(`/api/escola/trilhas/${trackId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(reviewNote ? { reviewNote } : {}) }),
    });
    if (!r.ok) { const d = await r.json(); setErro(d.error ?? "Erro."); return; }
    setMsg(action === "aprovar" ? "Trilha aprovada e disponível na biblioteca." : "Devolvida ao professor.");
    setTimeout(() => setMsg(""), 4000);
    setAbrindo(null);
    carregar(aba);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1F1A2E]">Trilhas de Reforço</h1>
        <p className="text-[#5B5470] text-sm mt-0.5">Aprovação e biblioteca da rede</p>
      </div>

      {msg && <div className="mb-4 bg-[#DCFCE7] border border-[#166534]/20 text-[#166534] rounded-xl px-4 py-2.5 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-[#F8F7FC] border border-[#E9E5F5] rounded-xl p-1 mb-6">
        {([["aguardando","Aguardando aprovação"],["biblioteca","Biblioteca da rede"]] as [Aba,string][]).map(([id,label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]
              ${aba===id ? "bg-white text-[#1F1A2E] shadow-sm border border-[#E9E5F5]" : "text-[#5B5470] hover:text-[#1F1A2E]"}`}>
            {id==="aguardando" ? <Clock size={15}/> : <Library size={15}/>} {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[#5B5470] text-center py-16">Carregando...</div>
      ) : erro ? (
        <div className="text-center py-16">
          <AlertCircle className="mx-auto mb-3 text-[#B91C1C]" size={32}/>
          <p className="text-[#5B5470]">{erro}</p>
          <button onClick={() => carregar(aba)} className="mt-3 text-[#6D28D9] text-sm hover:underline">Tentar de novo</button>
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]">
          <BookOpen className="mx-auto mb-3" size={36} strokeWidth={1.5}/>
          <p>{aba==="aguardando" ? "Nenhuma trilha aguardando aprovação." : "Nenhuma trilha aprovada na rede ainda."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tracks.map(track => {
            const st = STATUS_LABEL[track.status] ?? STATUS_LABEL.DRAFT;
            const totalMin = track.items.reduce((s,i)=>s+i.estMinutes,0);
            return (
              <div key={track.id} className="bg-white border border-[#E9E5F5] rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[#1F1A2E] font-semibold">{track.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-[#5B5470] mt-1">
                      <span>{track.items.length} atividades · ~{totalMin} min</span>
                      <span>{track.gradeYear}º ano</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {track.skills.map(s=>(
                        <span key={s.id} className="bg-[#EDE9FE] text-[#4C1D95] text-xs px-2 py-0.5 rounded-full font-mono">{s.code}</span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full font-medium shrink-0" style={{background:st.bg,color:st.color}}>{st.label}</span>
                </div>
                {aba === "aguardando" && (
                  <div className="flex gap-2 pt-2 border-t border-[#F8F7FC]">
                    <button onClick={() => setAbrindo(track)}
                      className="flex-1 border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] py-2 rounded-lg text-sm min-h-[40px] transition-colors">
                      Ver detalhes
                    </button>
                    <button onClick={() => acao(track.id, "aprovar")}
                      className="flex items-center gap-1.5 bg-[#DCFCE7] text-[#166534] hover:bg-green-200 px-4 py-2 rounded-lg text-sm font-medium min-h-[40px] transition-colors">
                      <CheckCircle size={14}/> Aprovar
                    </button>
                    <button onClick={() => setAbrindo(track)}
                      className="flex items-center gap-1.5 bg-[#FEE2E2] text-[#B91C1C] hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-medium min-h-[40px] transition-colors">
                      <XCircle size={14}/> Devolver
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {abrindo && (
        <DevolverModal track={abrindo} onClose={() => setAbrindo(null)}
          onAprovar={() => acao(abrindo.id, "aprovar")}
          onDevolver={note => acao(abrindo.id, "devolver", note)} />
      )}
    </div>
  );
}

function DevolverModal({ track, onClose, onAprovar, onDevolver }: {
  track: Track; onClose: ()=>void;
  onAprovar: ()=>void; onDevolver: (note: string)=>void;
}) {
  const [note, setNote] = useState(track.reviewNote ?? "");
  const [modo, setModo] = useState<"ver"|"devolver">("ver");
  const totalMin = track.items.reduce((s,i)=>s+i.estMinutes,0);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E9E5F5] px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#1F1A2E]">{track.title}</h2>
          <button onClick={onClose} className="text-[#5B5470] hover:text-[#1F1A2E] p-1 text-lg"></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-1">
            {track.skills.map(s=>(
              <span key={s.id} className="bg-[#EDE9FE] text-[#4C1D95] text-xs px-2 py-0.5 rounded-full font-mono">{s.code}
                {s.shortLabel && <span className="ml-1 font-sans">{s.shortLabel}</span>}
              </span>
            ))}
          </div>
          <p className="text-[#5B5470] text-sm">{track.items.length} atividades · ~{totalMin} min · {track.gradeYear}º ano</p>
          {modo === "devolver" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Motivo da devolução</label>
                <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={500}
                  placeholder="Explique ao professor o que precisa ser ajustado..."
                  className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-sm text-[#1F1A2E] outline-none focus:border-[#6D28D9] bg-white resize-none"/>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModo("ver")} className="flex-1 border border-[#DDD6EE] text-[#5B5470] py-2.5 rounded-xl text-sm min-h-[44px]">Cancelar</button>
                <button onClick={() => onDevolver(note)} disabled={!note.trim()}
                  className="flex-1 bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-colors">
                  Devolver com comentário
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setModo("devolver")}
                className="flex-1 border border-[#DDD6EE] text-[#B91C1C] hover:bg-[#FEE2E2] py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-colors">
                <XCircle size={14} className="inline mr-1"/> Devolver
              </button>
              <button onClick={onAprovar}
                className="flex-1 bg-[#166534] hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-colors">
                <CheckCircle size={14} className="inline mr-1"/> Aprovar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
