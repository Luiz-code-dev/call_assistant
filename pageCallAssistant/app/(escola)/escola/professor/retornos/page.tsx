"use client";
import { useEffect, useState } from "react";
import { MessageSquare, Flag } from "lucide-react";

interface Submission { id: string; studentName: string; activityTitle: string; submittedAt: string; flagged: boolean }

export default function RetornosPage() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"todos"|"sinalizados">("todos");

  useEffect(() => {
    fetch("/api/escola/professor/retornos")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setSubs(d.submissions ?? []); setLoading(false); })
      .catch(() => { setError("Nao foi possivel carregar os retornos."); setLoading(false); });
  }, []);

  const visible = tab === "sinalizados" ? subs.filter(s => s.flagged) : subs;

  return (
    <div className="px-7 py-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="text-[#6D28D9]" size={22}/>
        <h1 className="text-[#1F1A2E] font-bold text-2xl">Retornos para revisar</h1>
      </div>
      <div className="flex gap-2 mb-6">
        {(["todos","sinalizados"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold min-h-[40px] border transition-colors ${tab===t ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-[#5B5470] border-[#DDD6EE]"}`}>
            {t === "todos" ? "Todos" : "Sinalizados"}
          </button>
        ))}
      </div>
      {error && <p className="text-[#B91C1C] text-sm mb-4">{error}</p>}
      {loading ? <p className="text-[#5B5470] text-center py-8">Carregando...</p> : visible.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="mx-auto text-[#DDD6EE] mb-3" size={40}/>
          <p className="text-[#5B5470]">Nenhum retorno para revisar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(s => (
            <div key={s.id} className="bg-white border border-[#E9E5F5] rounded-xl px-4 py-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-[#1F1A2E] font-medium text-sm">{s.studentName}</p>
                <p className="text-[#5B5470] text-xs">{s.activityTitle} · {new Date(s.submittedAt).toLocaleDateString("pt-BR")}</p>
              </div>
              {s.flagged && <Flag className="text-[#B91C1C] shrink-0" size={16}/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
