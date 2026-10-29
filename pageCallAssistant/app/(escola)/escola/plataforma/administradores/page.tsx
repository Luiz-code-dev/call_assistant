"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, Plus } from "lucide-react";

interface Admin { id: string; name: string; email: string; isActive: boolean }

export default function AdministradoresPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/escola/plataforma/administradores")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setAdmins(d.admins ?? []); setLoading(false); })
      .catch(() => { setError("Nao foi possivel carregar os administradores."); setLoading(false); });
  }, []);

  return (
    <div className="px-7 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[#6D28D9]" size={22}/>
          <h1 className="text-[#1F1A2E] font-bold text-2xl">Administradores</h1>
        </div>
        <button className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">
          <Plus size={16}/> Convidar administrador
        </button>
      </div>
      {error && <p className="text-[#B91C1C] text-sm mb-4">{error}</p>}
      {loading ? <p className="text-[#5B5470] text-center py-8">Carregando...</p> : admins.length === 0 ? (
        <p className="text-[#5B5470] text-center py-8">Nenhum administrador cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {admins.map(a => (
            <div key={a.id} className="bg-white border border-[#E9E5F5] rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[#1F1A2E] font-medium text-sm">{a.name}</p>
                <p className="text-[#5B5470] text-xs">{a.email}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${a.isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}>
                {a.isActive ? "Ativo" : "Inativo"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
