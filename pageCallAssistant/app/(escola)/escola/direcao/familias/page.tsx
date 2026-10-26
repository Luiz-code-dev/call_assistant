"use client";
import { useEffect, useState } from "react";

interface Guardian {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  links: { studentId: string; relation: string; isActive: boolean; student: { fullName: string } }[];
}

const RELATION_LABELS: Record<string, string> = {
  MAE: "Mãe", PAI: "Pai", AVO_AVO: "Avó/Avô", TIO_TIA: "Tio/Tia",
  TUTOR_LEGAL: "Tutor(a)", OUTRO: "Responsável",
};

export default function FamiliasPage() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/escola/direcao/familias")
      .then(r => r.ok ? r.json() : { guardians: [] })
      .then(d => { setGuardians(d.guardians ?? []); setLoading(false); });
  }, []);

  const filtered = guardians.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.email?.toLowerCase().includes(search.toLowerCase()) ||
    g.links.some(l => l.student.fullName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F8F7FC] p-4 max-w-2xl mx-auto">
      <div className="mt-4 mb-6">
        <h1 className="text-[#1F1A2E] text-xl font-bold">Famílias vinculadas</h1>
        <p className="text-[#5B5470] text-xs mt-1">Responsáveis com acesso ao portal</p>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nome, e-mail ou aluno..."
        className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-xl px-4 py-3 border border-[#DDD6EE] focus:border-purple-500 outline-none text-sm mb-4"
      />

      {loading ? (
        <div className="text-[#5B5470] text-center py-16">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]">
          <div className="text-4xl mb-3">👨‍👩‍👧</div>
          <p>{search ? "Nenhum resultado." : "Nenhum responsável vinculado ainda."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(g => (
            <div key={g.id} className="bg-white rounded-2xl p-4 border border-[#E9E5F5]">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[#1F1A2E] font-semibold">{g.name}</p>
                  {g.email && <p className="text-[#5B5470] text-xs">{g.email}</p>}
                  {g.phone && <p className="text-[#5B5470] text-xs">{g.phone}</p>}
                </div>
                <span className="text-xs text-[#5B5470]">{g.links.filter(l => l.isActive).length} vínculo(s)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.links.filter(l => l.isActive).map((l, i) => (
                  <span key={i} className="bg-[#FAF9FD] text-[#3F3A4F] text-xs px-2 py-1 rounded-lg">
                    {RELATION_LABELS[l.relation] ?? l.relation} de <strong>{l.student.fullName}</strong>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
