"use client";
import { useEffect, useState } from "react";
import { ROLE_LABEL, EduRole } from "@/lib/escola/types";

interface Member { id: string; role: EduRole; isActive: boolean; user: { name: string; email: string }; school: { name: string } | null; }

const ROLE_COLORS: Record<EduRole, string> = { NETWORK_ADMIN: "bg-purple-900 text-purple-300", COORDINATOR: "bg-blue-900 text-blue-300", SCHOOL_ADMIN: "bg-green-900 text-green-300", TEACHER: "bg-orange-900 text-orange-300", PLATFORM_ADMIN: "bg-gray-800 text-gray-300" };

export default function VinculosPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [schools, setSchools] = useState<{id:string;name:string}[]>([]);
  const [form, setForm] = useState({ email: "", role: "TEACHER" as EduRole, schoolId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    const [mr, sr] = await Promise.all([fetch("/api/escola/vinculos"), fetch("/api/escola/escolas")]);
    const [md, sd] = await Promise.all([mr.json(), sr.json()]);
    setMembers(md.members ?? []); setSchools(sd.schools ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setSuccess("");
    const r = await fetch("/api/escola/vinculos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setSaving(false); return; }
    setSuccess("Vínculo criado com sucesso!");
    setShowForm(false); setForm({ email: "", role: "TEACHER", schoolId: "" }); load(); setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/escola/vinculos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !current }) });
    load();
  }

  const needsSchool = ["SCHOOL_ADMIN","TEACHER","COORDINATOR"].includes(form.role);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Vínculos de Equipe</h1>
        <button onClick={() => { setShowForm(true); setSuccess(""); }} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]">+ Novo vínculo</button>
      </div>
      {success && <div className="mb-4 bg-green-900/40 border border-green-800 text-green-300 rounded-lg px-4 py-3 text-sm">{success}</div>}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white font-semibold mb-4">Novo Vínculo</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">E-mail do usuário *</label>
                <input type="email" className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-base border border-gray-700 focus:border-purple-500 outline-none" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Papel *</label>
                <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value as EduRole}))} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-base border border-gray-700 outline-none min-h-[44px]">
                  {(Object.keys(ROLE_LABEL) as EduRole[]).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
              {needsSchool && (
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Escola {form.role === "COORDINATOR" ? "(opcional)" : "*"}</label>
                  <select value={form.schoolId} onChange={e => setForm(f => ({...f, schoolId: e.target.value}))} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-base border border-gray-700 outline-none min-h-[44px]" required={form.role !== "COORDINATOR"}>
                    <option value="">— Escopo da rede —</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 min-h-[44px]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-purple-700 text-white font-medium min-h-[44px] disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="text-gray-400 text-center py-12">Carregando...</div> : (
        <div className="space-y-2">
          {members.length === 0 && <div className="text-center py-16 text-gray-500"><div className="text-4xl mb-3">🔗</div><div>Nenhum vínculo</div></div>}
          {members.map(m => (
            <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{m.user?.name || m.user?.email}</div>
                <div className="text-gray-500 text-sm truncate">{m.user?.email}</div>
                {m.school && <div className="text-gray-600 text-xs">{m.school.name}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded text-xs ${ROLE_COLORS[m.role]}`}>{ROLE_LABEL[m.role]}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${m.isActive ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-500"}`}>{m.isActive ? "Ativo" : "Inativo"}</span>
                <button onClick={() => toggleActive(m.id, m.isActive)} className="text-gray-500 hover:text-yellow-400 text-xs px-2 min-h-[44px] flex items-center transition-colors">{m.isActive ? "Desativar" : "Ativar"}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
