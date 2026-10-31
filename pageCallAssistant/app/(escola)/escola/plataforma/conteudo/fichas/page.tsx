"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Pencil, Loader2, RefreshCw } from "lucide-react";

interface Ficha {
  id: string;
  status: string;
  whatStudentDoes: string;
  commonErrors: unknown[];
  skill: { code: string; shortLabel: string };
}

export default function FichasPage() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/escola/plataforma/fichas?status=DRAFT");
      if (!res.ok) throw new Error("Erro ao carregar");
      const data = await res.json();
      setFichas(data.items ?? []);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(id: string) {
    setSaving(true);
    try {
      await fetch("/api/escola/plataforma/fichas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "APPROVE" }),
      });
      await load();
    } finally { setSaving(false); }
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    try {
      await fetch("/api/escola/plataforma/fichas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, whatStudentDoes: editText }),
      });
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-[#6D28D9]" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/escola/plataforma/conteudo" className="text-[#5B5470] text-sm hover:text-[#6D28D9]">← Estúdio</Link>
          <h1 className="text-2xl font-bold text-[#1F1A2E] mt-1">Fichas pedagógicas</h1>
          <p className="text-[#5B5470] text-sm">O que o aluno faz, erros comuns, tipos de atividade indicados — por habilidade BNCC.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-sm text-[#5B5470] hover:text-[#6D28D9]"><RefreshCw size={14} /> Atualizar</button>
      </div>
      {error && <div className="text-sm text-[#B91C1C] bg-[#FEE2E2] rounded-lg p-3 mb-4">{error} <button onClick={load} className="underline ml-2">Tentar de novo</button></div>}
      {!fichas.length && !error && (
        <div className="border border-dashed border-[#DDD6EE] rounded-xl p-12 text-center text-[#5B5470]">Nenhuma ficha DRAFT encontrada.</div>
      )}
      <div className="space-y-3">
        {fichas.map(f => (
          <div key={f.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#1F1A2E]">{f.skill.code} — {f.skill.shortLabel}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">{f.status}</span>
            </div>
            {editing === f.id ? (
              <div className="space-y-2">
                <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
                  className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2 text-sm text-[#1F1A2E]" />
                <div className="flex gap-2">
                  <button onClick={() => handleSaveEdit(f.id)} disabled={saving}
                    className="bg-[#6D28D9] text-white rounded-lg px-4 py-1.5 text-sm disabled:opacity-50">Salvar</button>
                  <button onClick={() => setEditing(null)} className="text-sm text-[#5B5470]">Cancelar</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#5B5470] line-clamp-3">{f.whatStudentDoes}</p>
            )}
            {editing !== f.id && (
              <div className="flex gap-3 mt-3">
                <button onClick={() => { setEditing(f.id); setEditText(f.whatStudentDoes); }}
                  className="flex items-center gap-1 text-xs text-[#6D28D9] hover:text-[#5B21B6]">
                  <Pencil size={12} /> Editar
                </button>
                <button onClick={() => handleApprove(f.id)} disabled={saving}
                  className="flex items-center gap-1 text-xs text-[#166534] hover:text-green-800 disabled:opacity-50">
                  <CheckCircle size={12} /> Aprovar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
