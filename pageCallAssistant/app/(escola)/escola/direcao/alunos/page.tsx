"use client";
import { useEffect, useState, useRef } from "react";

interface Student { id: string; enrollmentCode: string; fullName: string; birthDate: string | null; isActive: boolean; createdAt: string; enrollments: { id: string; class: { name: string }; status: string }[]; }

export default function AlunosPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{id:string;name:string}[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ enrollmentCode: "", fullName: "", birthDate: "", classId: "", pin: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [csvMode, setCsvMode] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvResult, setCsvResult] = useState<{success:number;errors:{line:number;msg:string}[]}>({ success: 0, errors: [] });

  async function load() {
    setLoading(true);
    const [sr, cr] = await Promise.all([fetch(`/api/escola/alunos?search=${encodeURIComponent(search)}`), fetch("/api/escola/turmas")]);
    const [sd, cd] = await Promise.all([sr.json(), cr.json()]);
    setStudents(sd.students ?? []); setClasses(cd.classes ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [search]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const r = await fetch("/api/escola/alunos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setSaving(false); return; }
    setShowForm(false); setForm({ enrollmentCode: "", fullName: "", birthDate: "", classId: "", pin: "" }); load(); setSaving(false);
  }

  async function importCsv() {
    setSaving(true); setCsvResult({ success: 0, errors: [] });
    const rows = csvText.split("\n").filter(l => l.trim()).map((l, i) => {
      const cols = l.split(",").map(c => c.trim());
      if (cols.length < 2) return { line: i + 1, error: "Poucos campos" };
      return { enrollmentCode: cols[0], fullName: cols[1], birthDate: cols[2] || null, classId: classes.find(c => c.name === cols[3])?.id || null };
    });
    const r = await fetch("/api/escola/alunos/importar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
    const data = await r.json();
    setCsvResult({ success: data.success ?? 0, errors: data.errors ?? [] });
    if ((data.success ?? 0) > 0) { load(); }
    setSaving(false);
  }

  async function resetPin(id: string) {
    const pin = prompt("Novo PIN (6 dígitos):");
    if (!pin || !/^\d{6}$/.test(pin)) { alert("PIN deve ter 6 dígitos numéricos"); return; }
    const r = await fetch(`/api/escola/alunos/${id}/pin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    if (r.ok) alert("PIN redefinido com sucesso!"); else alert("Erro ao redefinir PIN");
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-[#1F1A2E]">Alunos</h1>
        <div className="flex gap-2">
          <button onClick={() => { setCsvMode(true); setShowForm(false); }} className="border border-[#DDD6EE] text-[#3F3A4F] hover:text-[#1F1A2E] px-4 py-2 rounded-lg text-sm min-h-[44px] transition-colors">Importar CSV</button>
          <button onClick={() => { setShowForm(true); setCsvMode(false); }} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]">+ Novo aluno</button>
        </div>
      </div>

      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou matrícula..." className="w-full sm:w-80 bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2 text-sm border border-[#DDD6EE] outline-none min-h-[44px] focus:border-purple-500" />
      </div>

      {csvMode && (
        <div className="bg-white border border-[#E9E5F5] rounded-xl p-6 mb-6">
          <h2 className="text-[#1F1A2E] font-semibold mb-2">Importar via CSV</h2>
          <p className="text-[#5B5470] text-xs mb-3">Formato: matrícula, nome, data_nascimento (opcional), nome_da_turma (opcional)</p>
          <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={8} placeholder={"12345, João da Silva, 2012-03-15, 7º A\n67890, Maria Souza,,8º B"} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2 text-sm border border-[#DDD6EE] outline-none font-mono resize-y mb-3 focus:border-purple-500" />
          <button onClick={importCsv} disabled={saving || !csvText.trim()} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm min-h-[44px] disabled:opacity-50">{saving ? "Importando..." : "Importar"}</button>
          {csvResult.success > 0 && <p className="text-[#166534] text-sm mt-3">✅ {csvResult.success} aluno(s) importado(s)</p>}
          {csvResult.errors.length > 0 && (
            <div className="mt-3 space-y-1">{csvResult.errors.map((e, i) => <p key={i} className="text-[#B91C1C] text-xs">Linha {e.line}: {e.msg}</p>)}</div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-[#1F1A2E]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD6EE] rounded-xl p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto">
            <h2 className="text-[#1F1A2E] font-semibold mb-4">Novo Aluno</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Matrícula *</label>
                <input className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={form.enrollmentCode} onChange={e => setForm(f => ({...f, enrollmentCode: e.target.value}))} required />
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Nome completo *</label>
                <input className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={form.fullName} onChange={e => setForm(f => ({...f, fullName: e.target.value}))} required />
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Data de nascimento</label>
                <input type="date" className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={form.birthDate} onChange={e => setForm(f => ({...f, birthDate: e.target.value}))} />
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">Turma</label>
                <select value={form.classId} onChange={e => setForm(f => ({...f, classId: e.target.value}))} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] outline-none min-h-[44px]">
                  <option value="">— Sem enturmação —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#5B5470] text-sm block mb-1">PIN inicial (6 dígitos) *</label>
                <input type="text" pattern="[0-9]{6}" maxLength={6} className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none font-mono" value={form.pin} onChange={e => setForm(f => ({...f, pin: e.target.value.replace(/\D/g, "")}))} placeholder="000000" required />
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

      {loading ? <div className="text-[#5B5470] text-center py-12">Carregando...</div> : students.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]"><div className="text-4xl mb-3">🎓</div><div>Nenhum aluno encontrado</div></div>
      ) : (
        <div className="space-y-2">
          {students.map(s => (
            <div key={s.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[#1F1A2E] font-medium">{s.fullName}</div>
                <div className="text-[#5B5470] text-sm">Mat: {s.enrollmentCode}{s.birthDate ? ` · ${new Date(s.birthDate).toLocaleDateString("pt-BR")}` : ""}</div>
                {s.enrollments?.[0] && <div className="text-purple-400 text-xs">{s.enrollments[0].class?.name}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => resetPin(s.id)} className="text-xs text-[#5B5470] hover:text-[#92400E] px-2 py-1 min-h-[44px] flex items-center transition-colors">Redefinir PIN</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
