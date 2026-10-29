"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, CheckCircle, Search } from "lucide-react";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";

interface Subject { id: string; name: string; color: string | null }
interface Skill { id: string; code: string; description: string; gradeYear: number }

const GRADE_OPTS = [
  { value: 1, label: "1º ano" }, { value: 2, label: "2º ano" }, { value: 3, label: "3º ano" },
  { value: 4, label: "4º ano" }, { value: 5, label: "5º ano" }, { value: 6, label: "6º ano" },
  { value: 7, label: "7º ano" }, { value: 8, label: "8º ano" }, { value: 9, label: "9º ano" },
];

const inputCls = "bg-white text-[#1F1A2E] rounded-[10px] px-3 h-11 text-sm border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none transition-colors w-full";

export default function NovoDiagnosticoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    subjectId: "", gradeYear: 6, cycle: 1, title: "",
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/escola/componentes").then(r => r.ok ? r.json() : { subjects: [] }).then(d => setSubjects(d.subjects ?? []));
  }, []);

  useEffect(() => {
    if (!form.subjectId || !form.gradeYear) return;
    fetch(`/api/escola/habilidades?subjectId=${form.subjectId}&gradeYear=${form.gradeYear}`)
      .then(r => r.ok ? r.json() : { skills: [] })
      .then(d => setSkills(d.skills ?? []));
  }, [form.subjectId, form.gradeYear]);

  const filteredSkills = skills.filter(s =>
    s.code.toLowerCase().includes(skillSearch.toLowerCase()) ||
    s.description.toLowerCase().includes(skillSearch.toLowerCase())
  );

  function toggleSkill(id: string) {
    setSelectedSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  async function create() {
    if (!form.title || !form.subjectId || selectedSkills.length === 0) {
      setError("Preencha o título, componente e selecione ao menos uma habilidade."); return;
    }
    setSaving(true); setError("");
    // items: uma atividade fictícia por habilidade (school admin pode editar depois)
    const items = selectedSkills.map((skillId, i) => ({ skillId, activityId: skillId, order: i }));
    const r = await fetch("/api/escola/diagnosticos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, items }),
    });
    if (r.ok) {
      router.push("/escola/coordenacao/diagnosticos");
    } else {
      const d = await r.json();
      setError(d.error ?? "Erro ao criar diagnóstico.");
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[
          { label: "Coordenação", href: "/escola/coordenacao" },
          { label: "Diagnósticos", href: "/escola/coordenacao/diagnosticos" },
          { label: "Novo" },
        ]}
        title="Novo diagnóstico"
        subtitle="Crie um diagnóstico por habilidades da BNCC."
      />

      <div className="px-7 py-6 max-w-2xl mx-auto w-full">
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? "bg-[#6D28D9] text-white" : "bg-[#E9E5F5] text-[#5B5470]"}`}>
                {step > s ? <CheckCircle size={18} /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 w-12 ${step > s ? "bg-[#6D28D9]" : "bg-[#E9E5F5]"}`} />}
            </div>
          ))}
          <span className="ml-2 text-[#5B5470] text-sm">
            {step === 1 ? "Configuração" : step === 2 ? "Habilidades" : "Revisar"}
          </span>
        </div>

        {/* Step 1: Configuração */}
        {step === 1 && (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl p-6 space-y-5">
            <h2 className="text-[#1F1A2E] font-semibold text-lg">Configuração</h2>
            <div>
              <label className="text-[#5B5470] text-sm block mb-1.5">Título do diagnóstico *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Diagnóstico de Português — 6º ano — 1º ciclo"
                className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[#5B5470] text-sm block mb-1.5">Componente *</label>
                <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))} className={inputCls}>
                  <option value="">Selecione…</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1.5">Ano/série *</label>
                <select value={form.gradeYear} onChange={e => setForm(f => ({ ...f, gradeYear: +e.target.value }))} className={inputCls}>
                  {GRADE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[#5B5470] text-sm block mb-1.5">Ciclo</label>
              <select value={form.cycle} onChange={e => setForm(f => ({ ...f, cycle: +e.target.value }))} className={inputCls}>
                <option value={1}>1º ciclo</option>
                <option value={2}>2º ciclo</option>
                <option value={3}>3º ciclo</option>
              </select>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => { if (!form.title || !form.subjectId) { setError("Preencha título e componente."); return; } setError(""); setStep(2); }}
                className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-xl font-semibold text-sm min-h-[44px]"
              >
                Próximo <ChevronRight size={16} />
              </button>
            </div>
            {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
          </div>
        )}

        {/* Step 2: Habilidades */}
        {step === 2 && (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl p-6 space-y-4">
            <h2 className="text-[#1F1A2E] font-semibold text-lg">Selecione as habilidades</h2>
            <p className="text-[#5B5470] text-sm">{selectedSkills.length} selecionada(s)</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3.5 text-[#5B5470]" />
              <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
                placeholder="Buscar por código ou descrição…"
                className={`${inputCls} pl-8`} />
            </div>
            {filteredSkills.length === 0 ? (
              <p className="text-[#5B5470] text-center py-8 text-sm">
                {skills.length === 0 ? "Carregando habilidades…" : "Nenhuma habilidade encontrada."}
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredSkills.map(skill => (
                  <label key={skill.id} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${selectedSkills.includes(skill.id) ? "border-[#6D28D9] bg-[#EDE9FE]" : "border-[#E9E5F5] hover:border-[#C4B5FD]"}`}>
                    <input type="checkbox" checked={selectedSkills.includes(skill.id)} onChange={() => toggleSkill(skill.id)} className="mt-0.5 accent-[#6D28D9]" />
                    <div>
                      <p className="text-[#6D28D9] text-xs font-bold">{skill.code}</p>
                      <p className="text-[#1F1A2E] text-sm">{skill.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-between pt-2">
              <button onClick={() => { setError(""); setStep(1); }} className="flex items-center gap-2 border border-[#DDD6EE] text-[#5B5470] px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] hover:border-[#C4B5FD]">
                <ChevronLeft size={16} /> Voltar
              </button>
              <button
                onClick={() => { if (selectedSkills.length === 0) { setError("Selecione ao menos uma habilidade."); return; } setError(""); setStep(3); }}
                className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-xl font-semibold text-sm min-h-[44px]"
              >
                Próximo <ChevronRight size={16} />
              </button>
            </div>
            {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
          </div>
        )}

        {/* Step 3: Revisar */}
        {step === 3 && (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl p-6 space-y-5">
            <h2 className="text-[#1F1A2E] font-semibold text-lg">Revisar e criar</h2>
            <div className="bg-[#FAF9FD] rounded-xl p-4 space-y-2 text-sm">
              <p><span className="text-[#5B5470]">Título:</span> <strong>{form.title}</strong></p>
              <p><span className="text-[#5B5470]">Componente:</span> <strong>{subjects.find(s => s.id === form.subjectId)?.name}</strong></p>
              <p><span className="text-[#5B5470]">Ano:</span> <strong>{form.gradeYear}º ano</strong></p>
              <p><span className="text-[#5B5470]">Ciclo:</span> <strong>{form.cycle}º</strong></p>
              <p><span className="text-[#5B5470]">Habilidades selecionadas:</span> <strong>{selectedSkills.length}</strong></p>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {selectedSkills.map(id => {
                const s = skills.find(sk => sk.id === id);
                return s ? (
                  <div key={id} className="flex items-start gap-2 text-sm bg-[#EDE9FE] rounded-lg px-3 py-2">
                    <span className="text-[#6D28D9] font-bold text-xs shrink-0">{s.code}</span>
                    <span className="text-[#1F1A2E] text-xs">{s.description}</span>
                  </div>
                ) : null;
              })}
            </div>
            {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
            <div className="flex justify-between pt-2">
              <button onClick={() => { setError(""); setStep(2); }} className="flex items-center gap-2 border border-[#DDD6EE] text-[#5B5470] px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] hover:border-[#C4B5FD]">
                <ChevronLeft size={16} /> Voltar
              </button>
              <button
                onClick={create} disabled={saving}
                className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-semibold text-sm min-h-[44px]"
              >
                {saving ? "Criando…" : "Criar diagnóstico"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
