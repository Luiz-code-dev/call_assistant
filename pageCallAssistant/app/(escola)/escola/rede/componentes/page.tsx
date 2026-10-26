"use client";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

interface Subject { id: string; name: string; area: string | null; color: string | null; isActive: boolean; }

const COLORS = ["#7C3AED","#2563EB","#059669","#D97706","#DC2626","#DB2777","#0891B2","#65A30D"];

export default function ComponentesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", area: "", color: COLORS[0] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/escola/componentes");
    const data = await r.json();
    setSubjects(data.subjects ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const r = await fetch("/api/escola/componentes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setSaving(false); return; }
    setShowForm(false); setForm({ name: "", area: "", color: COLORS[0] }); load(); setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/escola/componentes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !current }) });
    load();
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1F1A2E]">Componentes Curriculares</h1>
        <button onClick={() => setShowForm(true)} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]">+ Novo componente</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-[#1F1A2E]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD6EE] rounded-xl p-6 w-full max-w-md">
            <h2 className="text-[#1F1A2E] font-semibold mb-4">Novo Componente Curricular</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Nome *</label>
                <input className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" placeholder="Língua Portuguesa" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Área do conhecimento</label>
                <input className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" placeholder="Linguagens" value={form.area} onChange={e => setForm(f => ({...f, area: e.target.value}))} />
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({...f, color: c}))}
                      className={`w-8 h-8 rounded-full transition-all min-w-[32px] ${form.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] min-h-[44px]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-purple-700 text-white font-medium min-h-[44px] disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-[#5B5470] text-center py-12">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {subjects.length === 0 && (
            <div className="text-center py-16 text-[#5B5470]"><div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><BookOpen size={26} className="text-[#6D28D9]" /></div><div>Nenhum componente cadastrado</div></div>
          )}
          {subjects.map(s => (
            <div key={s.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4 flex items-center gap-4">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: s.color ?? "#7C3AED" }} />
              <div className="flex-1 min-w-0">
                <div className="text-[#1F1A2E] font-medium">{s.name}</div>
                {s.area && <div className="text-[#5B5470] text-sm">{s.area}</div>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-2 py-0.5 rounded text-xs ${s.isActive ? "bg-[#DCFCE7] text-green-300" : "bg-[#FAF9FD] text-[#5B5470]"}`}>{s.isActive ? "Ativo" : "Inativo"}</span>
                <button onClick={() => toggleActive(s.id, s.isActive)} className="text-[#5B5470] hover:text-[#92400E] text-xs min-h-[44px] flex items-center px-2 transition-colors">{s.isActive ? "Desativar" : "Ativar"}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
