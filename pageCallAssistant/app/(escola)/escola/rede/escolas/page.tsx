"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface School { id: string; name: string; inepCode: string | null; isActive: boolean; }

export default function EscolasPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", inepCode: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function load() {
    setLoading(true);
    const r = await fetch("/api/escola/escolas");
    if (r.status === 401 || r.status === 403) { router.push("/escola/entrar"); return; }
    const data = await r.json();
    setSchools(data.schools ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const r = await fetch("/api/escola/escolas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error ?? "Erro ao salvar"); setSaving(false); return; }
    setShowForm(false);
    setForm({ name: "", inepCode: "" });
    load();
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/escola/escolas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    load();
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Escolas</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
        >
          + Nova escola
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white font-semibold mb-4">Nova Escola</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Nome da escola *</label>
                <input
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-base border border-gray-700 focus:border-purple-500 outline-none"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="EMEF Professor..."
                  required
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Código INEP</label>
                <input
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-base border border-gray-700 focus:border-purple-500 outline-none"
                  value={form.inepCode}
                  onChange={e => setForm(f => ({ ...f, inepCode: e.target.value }))}
                  placeholder="35000000"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors min-h-[44px]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-medium transition-colors min-h-[44px] disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-12">Carregando...</div>
      ) : schools.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🏫</div>
          <div>Nenhuma escola cadastrada</div>
          <button onClick={() => setShowForm(true)} className="mt-4 text-purple-400 hover:text-purple-300 text-sm">Criar primeira escola</button>
        </div>
      ) : (
        <div className="space-y-3">
          {schools.map(s => (
            <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-white font-medium">{s.name}</div>
                <div className="text-gray-500 text-sm">{s.inepCode ? `INEP: ${s.inepCode}` : "Sem código INEP"}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-2 py-0.5 rounded text-xs ${s.isActive ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-500"}`}>
                  {s.isActive ? "Ativa" : "Inativa"}
                </span>
                <button
                  onClick={() => toggleActive(s.id, s.isActive)}
                  className="text-gray-500 hover:text-yellow-400 text-xs transition-colors px-2 py-1 min-h-[44px] flex items-center"
                >
                  {s.isActive ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
