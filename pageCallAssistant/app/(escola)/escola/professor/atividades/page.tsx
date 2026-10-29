"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, Sparkles } from "lucide-react";

interface Activity { id: string; title: string; type: string; subjectName: string }

export default function AtividadesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/escola/atividades?scope=rede")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setActivities(d.activities ?? []); setLoading(false); })
      .catch(() => { setError("Nao foi possivel carregar as atividades."); setLoading(false); });
  }, []);

  return (
    <div className="px-7 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="text-[#6D28D9]" size={22}/>
          <h1 className="text-[#1F1A2E] font-bold text-2xl">Atividades</h1>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">
            <Sparkles size={15}/> Sugerir com IA
          </button>
          <Link href="/escola/professor/atividades/nova" className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">
            <Plus size={15}/> Nova atividade
          </Link>
        </div>
      </div>
      {error && <p className="text-[#B91C1C] text-sm mb-4">{error}</p>}
      {loading ? <p className="text-[#5B5470] text-center py-8">Carregando...</p> : activities.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="mx-auto text-[#DDD6EE] mb-3" size={40}/>
          <p className="text-[#5B5470]">Nenhuma atividade encontrada.</p>
          <p className="text-[#5B5470] text-sm mt-1">Crie uma nova ou use "Sugerir com IA".</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map(a => (
            <div key={a.id} className="bg-white border border-[#E9E5F5] rounded-xl px-4 py-3">
              <p className="text-[#1F1A2E] font-medium text-sm">{a.title}</p>
              <p className="text-[#5B5470] text-xs">{a.subjectName} · {a.type}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
