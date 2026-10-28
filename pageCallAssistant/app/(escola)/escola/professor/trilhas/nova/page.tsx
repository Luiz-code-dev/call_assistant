"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Trash2, GripVertical, Sparkles, Loader2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

interface Skill { id: string; code: string; shortLabel: string | null; description: string; }
interface Subject { id: string; name: string; color: string | null; }
interface ActivityItem { activityId: string; order: number; estMinutes: number; _tipo?: string; _enunciado?: string; }
interface SuggestedItem { order: number; type: string; enunciado: string; criterios: string; estMinutes: number; activityId?: string; }

export default function NovaTrilhaPage() {
  const router = useRouter();
  const [passo, setPasso] = useState(1);

  // Passo 1 — habilidades
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [gradeYear, setGradeYear] = useState(6);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillResults, setSkillResults] = useState<Skill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [title, setTitle] = useState("");

  // Passo 2 — atividades
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [suggerindo, setSuggerindo] = useState(false);
  const [erroSugerir, setErroSugerir] = useState("");

  // Geral
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  // Carrega componentes na montagem
  useState(() => {
    fetch("/api/escola/componentes").then(r => r.ok ? r.json() : { subjects: [] })
      .then(d => { setSubjects(d.subjects ?? []); if (d.subjects?.[0]) setSubjectId(d.subjects[0].id); });
  });

  async function buscarHabilidades() {
    if (!skillSearch.trim()) return;
    setLoadingSkills(true);
    const r = await fetch(`/api/escola/habilidades?q=${encodeURIComponent(skillSearch)}&gradeYear=${gradeYear}`).catch(() => null);
    if (r?.ok) { const d = await r.json(); setSkillResults(d.skills ?? []); }
    setLoadingSkills(false);
  }

  function toggleSkill(s: Skill) {
    setSelectedSkills(prev =>
      prev.find(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) :
        prev.length < 3 ? [...prev, s] : prev
    );
  }

  async function sugerirIA() {
    if (!subjectId || selectedSkills.length === 0) return;
    const subj = subjects.find(s => s.id === subjectId);
    if (!subj) return;
    setSuggerindo(true); setErroSugerir("");
    const r = await fetch("/api/escola/trilhas/sugerir", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectName: subj.name, gradeYear, skills: selectedSkills.map(s => ({ code: s.code, description: s.description })) }),
    });
    if (!r.ok) { setErroSugerir("Não foi possível gerar sugestões. Tente novamente."); setSuggerindo(false); return; }
    const d = await r.json();
    const sugeridos: SuggestedItem[] = d.atividades ?? [];
    setItems(sugeridos.map((it, i) => ({ activityId: `sugerido_${i}`, order: it.order - 1, estMinutes: it.estMinutes, _tipo: it.type, _enunciado: it.enunciado })));
    setSuggerindo(false);
  }

  function moverItem(idx: number, dir: -1 | 1) {
    const arr = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    setItems(arr.map((it, i) => ({ ...it, order: i })));
  }

  function removerItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, order: i }))); }

  async function salvar(acao: "rascunho" | "enviar") {
    setErro(""); setSaving(true);
    const payload = {
      title: title.trim(),
      subjectId,
      gradeYear,
      skillIds: selectedSkills.map(s => s.id),
      items: items.map(it => ({ activityId: it.activityId, order: it.order, estMinutes: it.estMinutes })),
    };
    const r = await fetch("/api/escola/trilhas", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!r.ok) { const d = await r.json(); setErro(d.error ?? "Erro ao salvar."); setSaving(false); return; }
    const d = await r.json();
    if (acao === "enviar") {
      await fetch(`/api/escola/trilhas/${d.track.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enviar" }),
      });
    }
    router.push("/escola/professor/trilhas");
  }

  const totalMin = items.reduce((s, it) => s + it.estMinutes, 0);
  const passo1Ok = title.trim().length > 0 && subjectId && selectedSkills.length > 0;
  const passo2Ok = items.length >= 3 && items.length <= 8;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/escola/professor/trilhas" className="text-[#5B5470] hover:text-[#1F1A2E] transition-colors"><ChevronLeft size={18} /></Link>
        <h1 className="text-xl font-bold text-[#1F1A2E]">Nova trilha</h1>
      </div>

      {/* Indicador de passo */}
      <div className="flex items-center gap-2 mb-8">
        {[1,2,3].map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
              ${passo === n ? "bg-[#6D28D9] text-white" : passo > n ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F8F7FC] text-[#5B5470] border border-[#DDD6EE]"}`}>{n}</div>
            {n < 3 && <div className={`flex-1 h-0.5 w-12 ${passo > n ? "bg-[#6D28D9]" : "bg-[#E9E5F5]"}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-[#5B5470]">{passo === 1 ? "Habilidades" : passo === 2 ? "Atividades" : "Revisar"}</span>
      </div>

      {/* ── Passo 1: Habilidades ── */}
      {passo === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Título da trilha</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Frações — 6º Ano"
              className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-sm text-[#1F1A2E] outline-none focus:border-[#6D28D9] bg-white min-h-[44px]" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Componente</label>
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
                className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-sm text-[#1F1A2E] outline-none focus:border-[#6D28D9] bg-white min-h-[44px]">
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Ano</label>
              <select value={gradeYear} onChange={e => setGradeYear(+e.target.value)}
                className="border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-sm text-[#1F1A2E] outline-none focus:border-[#6D28D9] bg-white min-h-[44px]">
                {[1,2,3,4,5,6,7,8,9].map(y => <option key={y} value={y}>{y}º</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Habilidades BNCC (1 a 3)</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && buscarHabilidades()}
                placeholder="Buscar por código ou texto (ex: EF06MA07)"
                className="flex-1 border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-sm text-[#1F1A2E] outline-none focus:border-[#6D28D9] bg-white min-h-[44px]" />
              <button onClick={buscarHabilidades} disabled={loadingSkills}
                className="bg-[#6D28D9] text-white px-3 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50">
                {loadingSkills ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedSkills.map(s => (
                  <span key={s.id} className="bg-[#EDE9FE] text-[#4C1D95] text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-[#DDD6EE]"
                    onClick={() => toggleSkill(s)}>
                    <span className="font-mono font-semibold">{s.code}</span>
                    <span className="text-[#6D28D9]">·</span>
                    <span className="max-w-[180px] truncate">{s.shortLabel ?? s.description.slice(0, 40)}</span>
                    <span className="text-[#5B5470]">✕</span>
                  </span>
                ))}
              </div>
            )}
            {skillResults.length > 0 && (
              <div className="border border-[#E9E5F5] rounded-xl overflow-hidden divide-y divide-[#F8F7FC]">
                {skillResults.map(s => {
                  const sel = !!selectedSkills.find(x => x.id === s.id);
                  return (
                    <button key={s.id} onClick={() => toggleSkill(s)} disabled={!sel && selectedSkills.length >= 3}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${sel ? "bg-[#EDE9FE]" : "bg-white hover:bg-[#F8F7FC]"} disabled:opacity-40`}>
                      <span className="font-mono font-semibold text-[#4C1D95] mr-2">{s.code}</span>
                      <span className="text-[#5B5470]">{s.shortLabel ?? s.description}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button onClick={() => setPasso(2)} disabled={!passo1Ok}
            className="w-full flex items-center justify-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white py-3 rounded-xl font-medium min-h-[44px] transition-colors">
            Próximo: Atividades <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Passo 2: Atividades ── */}
      {passo === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#5B5470]">{items.length} {items.length === 1 ? "atividade" : "atividades"} · ~{totalMin} min · mín. 3, máx. 8</div>
            <button onClick={sugerirIA} disabled={suggerindo}
              className="flex items-center gap-1.5 border border-[#6D28D9] text-[#6D28D9] hover:bg-[#EDE9FE] text-sm px-3 py-2 rounded-lg min-h-[40px] transition-colors disabled:opacity-50">
              {suggerindo ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {suggerindo ? "Gerando..." : "Sugerir com IA"}
            </button>
          </div>

          {erroSugerir && (
            <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl px-4 py-3 text-sm text-[#B91C1C] flex items-center gap-2">
              <AlertCircle size={16} />{erroSugerir}
            </div>
          )}

          {items.length === 0 ? (
            <div className="border-2 border-dashed border-[#DDD6EE] rounded-xl p-8 text-center text-[#5B5470]">
              <p className="text-sm">Clique em "Sugerir com IA" ou adicione atividades manualmente.</p>
              <p className="text-xs mt-1">Mínimo de 3, máximo de 8 atividades · cada uma com até 15 min</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={it.activityId + idx} className="bg-white border border-[#E9E5F5] rounded-xl px-4 py-3 flex items-center gap-3">
                  <GripVertical size={16} className="text-[#DDD6EE] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-[#5B5470] font-medium">Atividade {idx+1}</span>
                    {it._tipo && <span className="ml-2 text-xs bg-[#F8F7FC] text-[#5B5470] px-1.5 py-0.5 rounded">{it._tipo}</span>}
                    {it._enunciado && <p className="text-sm text-[#1F1A2E] mt-0.5 line-clamp-1">{it._enunciado}</p>}
                    <span className="text-xs text-[#5B5470]">~{it.estMinutes} min</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moverItem(idx,-1)} disabled={idx===0} className="p-1 text-[#5B5470] hover:text-[#6D28D9] disabled:opacity-30">▲</button>
                    <button onClick={() => moverItem(idx,1)} disabled={idx===items.length-1} className="p-1 text-[#5B5470] hover:text-[#6D28D9] disabled:opacity-30">▼</button>
                    <button onClick={() => removerItem(idx)} className="p-1 text-[#B91C1C] hover:text-[#991B1B]"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {items.length < 8 && (
            <button onClick={() => setItems(prev => [...prev, { activityId: `manual_${Date.now()}`, order: prev.length, estMinutes: 10, _tipo: "ESCRITA" }])}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-[#DDD6EE] text-[#5B5470] hover:text-[#6D28D9] hover:border-[#6D28D9] py-3 rounded-xl text-sm transition-colors min-h-[44px]">
              <Plus size={16} /> Adicionar atividade
            </button>
          )}

          {items.length > 8 && <p className="text-[#B91C1C] text-sm text-center">Máximo de 8 atividades.</p>}

          <div className="flex gap-3">
            <button onClick={() => setPasso(1)} className="flex-1 border border-[#DDD6EE] text-[#5B5470] py-2.5 rounded-xl text-sm min-h-[44px]">
              <ChevronLeft size={16} className="inline mr-1" />Voltar
            </button>
            <button onClick={() => setPasso(3)} disabled={!passo2Ok}
              className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-colors">
              Revisar <ChevronRight size={16} className="inline ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* ── Passo 3: Revisar ── */}
      {passo === 3 && (
        <div className="space-y-5">
          <div className="bg-white border border-[#E9E5F5] rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-[#1F1A2E]">{title}</h2>
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map(s => (
                <span key={s.id} className="bg-[#EDE9FE] text-[#4C1D95] text-xs px-2 py-1 rounded-full font-mono">{s.code}</span>
              ))}
            </div>
            <p className="text-[#5B5470] text-sm">{items.length} atividades · ~{totalMin} min · {gradeYear}º ano</p>
            <div className="space-y-1.5 pt-1">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-[#F8F7FC] border border-[#E9E5F5] flex items-center justify-center text-xs font-medium text-[#5B5470]">{idx+1}</span>
                  <span className="text-[#1F1A2E] flex-1 truncate">{it._enunciado ?? `Atividade ${idx+1}`}</span>
                  <span className="text-[#5B5470] text-xs shrink-0">{it.estMinutes} min</span>
                </div>
              ))}
            </div>
          </div>

          {erro && (
            <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl px-4 py-3 text-sm text-[#B91C1C] flex items-center gap-2">
              <AlertCircle size={16} />{erro}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={() => salvar("rascunho")} disabled={saving}
              className="w-full border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] py-3 rounded-xl text-sm font-medium min-h-[44px] transition-colors disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar rascunho"}
            </button>
            <button onClick={() => salvar("enviar")} disabled={saving}
              className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white py-3 rounded-xl text-sm font-semibold min-h-[44px] transition-colors disabled:opacity-50">
              {saving ? "Enviando..." : "Enviar para aprovação"}
            </button>
          </div>
          <button onClick={() => setPasso(2)} className="w-full text-center text-sm text-[#5B5470] hover:text-[#1F1A2E] py-2 transition-colors">
            <ChevronLeft size={14} className="inline mr-1" />Voltar e editar
          </button>
        </div>
      )}
    </div>
  );
}
