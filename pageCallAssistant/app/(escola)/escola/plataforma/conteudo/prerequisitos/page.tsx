"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

interface Prereq {
  id: string;
  weight: number;
  status: string;
  skill: { code: string; shortLabel: string };
  prerequisiteSkill: { code: string; shortLabel: string };
}

export default function PrerequisitosPage() {
  const [items, setItems] = useState<Prereq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/escola/plataforma/prerequisitos?status=DRAFT");
      if (!res.ok) throw new Error("Erro ao carregar");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleAction(id: string, action: "APPROVE" | "REJECT") {
    setProcessing(id);
    try {
      const res = await fetch("/api/escola/plataforma/prerequisitos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, reviewNote: action === "REJECT" ? (rejectNote[id] ?? "") : undefined }),
      });
      if (!res.ok) throw new Error("Erro ao processar");
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setProcessing(null); }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-[#6D28D9]" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/escola/plataforma/conteudo" className="text-[#5B5470] text-sm hover:text-[#6D28D9]">← Estúdio</Link>
          <h1 className="text-2xl font-bold text-[#1F1A2E] mt-1">Mapa de pré-requisitos</h1>
          <p className="text-[#5B5470] text-sm">Relações pré-requisito entre habilidades BNCC. Aprovados pelo pedagogo entram no diagnóstico com degrau.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-sm text-[#5B5470] hover:text-[#6D28D9]"><RefreshCw size={14} /> Atualizar</button>
      </div>
      {error && <div className="text-sm text-[#B91C1C] bg-[#FEE2E2] rounded-lg p-3 mb-4">{error} <button onClick={load} className="underline ml-2">Tentar de novo</button></div>}
      {!items.length && !error && (
        <div className="border border-dashed border-[#DDD6EE] rounded-xl p-12 text-center text-[#5B5470]">
          Nenhum pré-requisito DRAFT encontrado.
        </div>
      )}
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-[#1F1A2E]">
                  <span className="font-mono">{item.skill.code}</span>
                  <span className="text-[#5B5470] mx-2">precisa de</span>
                  <span className="font-mono">{item.prerequisiteSkill.code}</span>
                </p>
                <p className="text-xs text-[#5B5470] mt-0.5">{item.skill.shortLabel} ← {item.prerequisiteSkill.shortLabel}</p>
                <p className="text-xs text-[#5B5470]">Peso: {item.weight}</p>
                <input
                  type="text"
                  placeholder="Motivo da reprovação"
                  value={rejectNote[item.id] ?? ""}
                  onChange={e => setRejectNote(prev => ({ ...prev, [item.id]: e.target.value }))}
                  className="mt-1 border border-[#DDD6EE] rounded-lg px-3 py-1 text-xs text-[#1F1A2E] w-64"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAction(item.id, "APPROVE")} disabled={processing === item.id}
                  className="flex items-center gap-1 bg-[#DCFCE7] text-[#166534] rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50">
                  {processing === item.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Aprovar
                </button>
                <button onClick={() => handleAction(item.id, "REJECT")} disabled={processing === item.id}
                  className="flex items-center gap-1 bg-[#FEE2E2] text-[#B91C1C] rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50">
                  <XCircle size={12} /> Reprovar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
