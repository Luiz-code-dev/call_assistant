"use client";

import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";

interface Term { id: string; name: string; order: number; startsAt: string; endsAt: string; status: string; }
interface Year { id: string; year: number; startsAt: string; endsAt: string; isCurrent: boolean; terms: Term[]; }

const STATUS_COLOR: Record<string, string> = { OPEN: "text-[#166534]", CLOSED: "text-[#5B5470]" };
const STATUS_LABEL: Record<string, string> = { OPEN: "Aberto", CLOSED: "Fechado" };

export default function AnosLetivosPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);
  const [showYearForm, setShowYearForm] = useState(false);
  const [showTermForm, setShowTermForm] = useState<string | null>(null);
  const [yearForm, setYearForm] = useState({ year: new Date().getFullYear() + 1, startsAt: "", endsAt: "" });
  const [termForm, setTermForm] = useState({ name: "", order: 1, startsAt: "", endsAt: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/escola/anos-letivos");
    const data = await r.json();
    setYears(data.years ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveYear(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const r = await fetch("/api/escola/anos-letivos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(yearForm),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setSaving(false); return; }
    setShowYearForm(false);
    setYearForm({ year: new Date().getFullYear() + 1, startsAt: "", endsAt: "" });
    load(); setSaving(false);
  }

  async function saveTerm(e: React.FormEvent) {
    e.preventDefault();
    if (!showTermForm) return;
    setSaving(true); setError("");
    const r = await fetch(`/api/escola/anos-letivos/${showTermForm}/periodos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(termForm),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setSaving(false); return; }
    setShowTermForm(null);
    setTermForm({ name: "", order: 1, startsAt: "", endsAt: "" });
    load(); setSaving(false);
  }

  async function setCurrentYear(id: string) {
    await fetch(`/api/escola/anos-letivos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCurrent: true }),
    });
    load();
  }

  async function closeTerm(termId: string) {
    await fetch(`/api/escola/periodos/${termId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    load();
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1F1A2E]">Anos Letivos & Períodos</h1>
        <button onClick={() => setShowYearForm(true)} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]">
          + Novo ano
        </button>
      </div>

      {(showYearForm || showTermForm) && (
        <div className="fixed inset-0 bg-[#1F1A2E]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD6EE] rounded-xl p-6 w-full max-w-md">
            {showYearForm ? (
              <>
                <h2 className="text-[#1F1A2E] font-semibold mb-4">Novo Ano Letivo</h2>
                <form onSubmit={saveYear} className="space-y-4">
                  <div>
                    <label className="text-[#5B5470] text-sm block mb-1">Ano *</label>
                    <input type="number" className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={yearForm.year} onChange={e => setYearForm(f => ({ ...f, year: +e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-[#5B5470] text-sm block mb-1">Início *</label>
                    <input type="date" className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={yearForm.startsAt} onChange={e => setYearForm(f => ({ ...f, startsAt: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-[#5B5470] text-sm block mb-1">Fim *</label>
                    <input type="date" className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={yearForm.endsAt} onChange={e => setYearForm(f => ({ ...f, endsAt: e.target.value }))} required />
                  </div>
                  {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setShowYearForm(false); setError(""); }} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] min-h-[44px]">Cancelar</button>
                    <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-purple-700 text-white font-medium min-h-[44px] disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-[#1F1A2E] font-semibold mb-4">Novo Período</h2>
                <form onSubmit={saveTerm} className="space-y-4">
                  <div>
                    <label className="text-[#5B5470] text-sm block mb-1">Nome *</label>
                    <input className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" placeholder="1º bimestre" value={termForm.name} onChange={e => setTermForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-[#5B5470] text-sm block mb-1">Ordem</label>
                    <input type="number" className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={termForm.order} onChange={e => setTermForm(f => ({ ...f, order: +e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[#5B5470] text-sm block mb-1">Início *</label>
                    <input type="date" className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={termForm.startsAt} onChange={e => setTermForm(f => ({ ...f, startsAt: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-[#5B5470] text-sm block mb-1">Fim *</label>
                    <input type="date" className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none" value={termForm.endsAt} onChange={e => setTermForm(f => ({ ...f, endsAt: e.target.value }))} required />
                  </div>
                  {error && <p className="text-[#B91C1C] text-sm">{error}</p>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setShowTermForm(null); setError(""); }} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] min-h-[44px]">Cancelar</button>
                    <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-purple-700 text-white font-medium min-h-[44px] disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-[#5B5470] text-center py-12">Carregando...</div>
      ) : years.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]">
          <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><CalendarRange size={26} className="text-[#6D28D9]" /></div>
          <div>Nenhum ano letivo cadastrado</div>
        </div>
      ) : (
        <div className="space-y-6">
          {years.map(y => (
            <div key={y.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-[#1F1A2E] font-semibold text-lg">Ano letivo {y.year}</h2>
                  {y.isCurrent && <span className="px-2 py-0.5 bg-purple-900 text-purple-300 rounded text-xs">Atual</span>}
                </div>
                <div className="flex gap-2">
                  {!y.isCurrent && (
                    <button onClick={() => setCurrentYear(y.id)} className="text-xs text-[#5B5470] hover:text-purple-400 px-2 py-1 min-h-[44px] flex items-center transition-colors">Definir como atual</button>
                  )}
                  <button onClick={() => { setShowTermForm(y.id); setTermForm({ name: `${(y.terms?.length ?? 0) + 1}º bimestre`, order: (y.terms?.length ?? 0) + 1, startsAt: "", endsAt: "" }); }} className="text-xs text-[#5B5470] hover:text-purple-400 px-2 py-1 min-h-[44px] flex items-center transition-colors">+ Período</button>
                </div>
              </div>
              <p className="text-[#5B5470] text-sm mb-3">{y.startsAt?.slice(0, 10)} → {y.endsAt?.slice(0, 10)}</p>
              {y.terms?.length > 0 ? (
                <div className="space-y-2">
                  {y.terms.sort((a: Term, b: Term) => a.order - b.order).map((t: Term) => (
                    <div key={t.id} className="flex items-center justify-between bg-[#FAF9FD] rounded-lg px-3 py-2">
                      <div>
                        <span className="text-[#1F1A2E] text-sm">{t.name}</span>
                        <span className="text-[#5B5470] text-xs ml-3">{t.startsAt?.slice(0, 10)} → {t.endsAt?.slice(0, 10)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${STATUS_COLOR[t.status] ?? "text-[#5B5470]"}`}>{STATUS_LABEL[t.status] ?? t.status}</span>
                        {t.status === "OPEN" && (
                          <button onClick={() => closeTerm(t.id)} className="text-xs text-[#5B5470] hover:text-[#92400E] px-2 py-1 min-h-[44px] flex items-center transition-colors">Fechar</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#5B5470] text-sm">Sem períodos. <button onClick={() => setShowTermForm(y.id)} className="text-purple-400">Adicionar</button></p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
