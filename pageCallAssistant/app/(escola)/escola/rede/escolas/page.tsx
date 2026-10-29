"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { School, AlertTriangle, X } from "lucide-react";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";

interface SchoolRow {
  id: string; name: string; inepCode: string | null; isActive: boolean;
  classCount?: number; hasDirector?: boolean;
}

const inputCls =
  "w-full bg-white text-[#1F1A2E] rounded-[10px] px-3 h-12 text-sm border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none transition-colors";

export default function EscolasPage() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", inepCode: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rowError, setRowError] = useState("");
  const [pendingToggle, setPendingToggle] = useState<SchoolRow | null>(null);
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

  const inepValid = !form.inepCode.trim() || /^\d{8}$/.test(form.inepCode.trim());

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!inepValid) { setError("O código INEP deve ter 8 dígitos."); return; }
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
    setSaving(false);
    load();
  }

  async function toggleActive(s: SchoolRow) {
    setRowError("");
    if (s.isActive) { setPendingToggle(s); return; }
    const r = await fetch(`/api/escola/escolas/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setRowError(d.error ?? "Não foi possível alterar a escola.");
      return;
    }
    load();
  }

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede", href: "/escola/rede" }, { label: "Escolas" }]}
        title="Escolas"
        subtitle="Cadastre e gerencie as escolas da rede."
        action={
          <button onClick={() => { setError(""); setShowForm(true); }} className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]">
            + Nova escola
          </button>
        }
      />

      <div className="px-7 py-6 max-w-[1440px] mx-auto w-full">
        {rowError && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg">
            <AlertTriangle size={15} className="text-[#B91C1C] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[#B91C1C]">{rowError}</p>
          </div>
        )}

        {loading ? (
          <div className="text-[#5B5470] text-center py-16">Carregando…</div>
        ) : schools.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E9E5F5] flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-4"><School size={26} className="text-[#6D28D9]" /></div>
            <p className="text-[#1F1A2E] text-[15px] font-semibold">Nenhuma escola cadastrada</p>
            <p className="text-[#5B5470] text-sm mt-1 max-w-sm">Cadastre a primeira escola ou importe a planilha (Modelo A).</p>
            <button onClick={() => setShowForm(true)} className="mt-4 text-[13px] font-medium text-[#6D28D9] hover:text-[#5B21B6] transition-colors">Criar primeira escola</button>
          </div>
        ) : (
          <div className="space-y-3">
            {schools.map((s) => (
              <div key={s.id} className="bg-white border border-[#E9E5F5] rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#1F1A2E] font-semibold">{s.name}</span>
                    {s.hasDirector === false && (
                      <span className="text-[11px] font-medium text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded-full">Sem diretor</span>
                    )}
                  </div>
                  <div className="text-[#5B5470] text-sm">
                    {s.inepCode ? `INEP: ${s.inepCode}` : "Sem código INEP"}
                    {typeof s.classCount === "number" && <> · {s.classCount} turma{s.classCount !== 1 ? "s" : ""}</>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FAF9FD] text-[#5B5470]"}`}>
                    {s.isActive ? "Ativa" : "Inativa"}
                  </span>
                  <button
                    onClick={() => toggleActive(s)}
                    className={`text-xs px-2 py-1 min-h-[40px] flex items-center transition-colors ${s.isActive ? "text-[#B91C1C] hover:text-[#991B1B]" : "text-[#166534] hover:text-[#14532D]"}`}
                  >
                    {s.isActive ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1A2E]/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#1F1A2E] font-semibold text-[15px]">Nova escola</h2>
              <button onClick={() => setShowForm(false)} className="text-[#5B5470] hover:text-[#1F1A2E] p-1"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-[#1F1A2E] text-[13px] font-medium block mb-1">Nome da escola *</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="EMEF Professor…" required />
              </div>
              <div>
                <label className="text-[#1F1A2E] text-[13px] font-medium block mb-1">Código INEP</label>
                <input
                  className={inputCls}
                  value={form.inepCode}
                  onChange={(e) => setForm((f) => ({ ...f, inepCode: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
                  placeholder="35000001"
                  inputMode="numeric"
                />
                {!inepValid && <p className="text-[12px] text-[#B91C1C] mt-1">O código INEP deve ter 8 dígitos.</p>}
              </div>
              {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] min-h-[44px]">Cancelar</button>
                <button type="submit" disabled={saving || !inepValid} className="flex-1 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold min-h-[44px] disabled:opacity-50">{saving ? "Salvando…" : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmação desativar escola */}
      {pendingToggle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-[#1F1A2E] font-bold text-lg mb-2">Desativar escola</h3>
            <p className="text-[#5B5470] text-sm mb-6">Deseja desativar <strong>{pendingToggle.name}</strong>? Os dados serão preservados.</p>
            <div className="flex gap-3">
              <button onClick={() => setPendingToggle(null)} className="flex-1 border border-[#DDD6EE] text-[#5B5470] py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">Cancelar</button>
              <button onClick={async () => {
                const s = pendingToggle; setPendingToggle(null);
                const r = await fetch(`/api/escola/escolas/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: false }) });
                if (!r.ok) { const d = await r.json().catch(() => ({})); setRowError(d.error ?? "Erro."); } else load();
              }} className="flex-1 bg-[#B91C1C] hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">Desativar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
