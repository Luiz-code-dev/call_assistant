"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";

interface ReviewItem {
  id: string;
  entityType: "guide" | "prereq";
  label: string;
  detail: string;
  status: string;
}

export default function RevisarPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/escola/plataforma/revisar?type=all");
      if (!res.ok) throw new Error("Erro ao carregar");
      const data = await res.json();
      const list: ReviewItem[] = [
        ...data.guides.map((g: any) => ({
          id: g.id, entityType: "guide" as const,
          label: `Ficha: ${g.skill?.code ?? g.skillId}`,
          detail: g.whatStudentDoes?.slice(0, 120) + "...",
          status: g.status,
        })),
        ...data.prereqs.map((p: any) => ({
          id: p.id, entityType: "prereq" as const,
          label: `Pré-req: ${p.skill?.code ?? p.skillId} → ${p.prerequisiteSkill?.code ?? p.prerequisiteSkillId}`,
          detail: `Peso: ${p.weight}`,
          status: p.status,
        })),
      ];
      setItems(list);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleAction(item: ReviewItem, action: "APPROVE" | "REJECT") {
    setProcessing(item.id);
    try {
      const res = await fetch("/api/escola/plataforma/revisar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: item.entityType,
          id: item.id,
          action,
          reviewNote: action === "REJECT" ? (rejectNote[item.id] ?? "") : undefined,
        }),
      });
      if (!res.ok) throw new Error("Erro ao processar");
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setProcessing(null); }
  }

  if (loading) return (
    <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-[#6D28D9]" /></div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/escola/plataforma/conteudo" className="text-[#5B5470] text-sm hover:text-[#6D28D9]">← Estúdio</Link>
          <h1 className="text-2xl font-bold text-[#1F1A2E] mt-1">Fila de revisão</h1>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-sm text-[#5B5470] hover:text-[#6D28D9]">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>
      {error && <div className="text-sm text-[#B91C1C] bg-[#FEE2E2] rounded-lg p-3 mb-4">{error} <button onClick={load} className="underline ml-2">Tentar de novo</button></div>}
      {!items.length && !error && (
        <div className="border border-dashed border-[#DDD6EE] rounded-xl p-12 text-center text-[#5B5470]">
          Nenhum conteúdo aguardando revisão.
        </div>
      )}
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1F1A2E]">{item.label}</p>
                <p className="text-xs text-[#5B5470] mt-1 line-clamp-2">{item.detail}</p>
                <input
                  type="text"
                  placeholder="Motivo da reprovação (opcional)"
                  value={rejectNote[item.id] ?? ""}
                  onChange={e => setRejectNote(prev => ({ ...prev, [item.id]: e.target.value }))}
                  className="mt-2 w-full border border-[#DDD6EE] rounded-lg px-3 py-1.5 text-xs text-[#1F1A2E]"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAction(item, "APPROVE")}
                  disabled={processing === item.id}
                  className="flex items-center gap-1 bg-[#DCFCE7] text-[#166534] rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-green-200 disabled:opacity-50"
                >
                  {processing === item.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Aprovar
                </button>
                <button
                  onClick={() => handleAction(item, "REJECT")}
                  disabled={processing === item.id}
                  className="flex items-center gap-1 bg-[#FEE2E2] text-[#B91C1C] rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                >
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
