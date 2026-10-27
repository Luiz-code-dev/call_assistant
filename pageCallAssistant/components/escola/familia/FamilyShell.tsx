"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Settings, UserPlus, LogOut, X } from "lucide-react";

export interface FamilyChild {
  studentId: string; firstName: string; fullName: string;
  className: string | null; schoolName: string | null; initials: string; color: string;
}

export function useFilhos() {
  const [data, setData] = useState<{ guardianFirstName: string; filhos: FamilyChild[] } | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/escola/familia/filhos")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setData({ guardianFirstName: d.guardianFirstName ?? "", filhos: d.filhos ?? [] }))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  return { data, error, loading };
}

export default function FamilyShell({ activeStudentId, children }: { activeStudentId?: string; children: React.ReactNode }) {
  const { data } = useFilhos();
  const [menu, setMenu] = useState(false);
  const filhos = data?.filhos ?? [];

  return (
    <div className="min-h-screen bg-[#F8F7FC]">
      {/* Topo fixo */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#E9E5F5]">
        <div className="max-w-[1180px] mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/escola/familia" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#6D28D9] inline-flex items-center justify-center text-white text-[13px] font-bold">S</span>
            <span className="font-extrabold text-[15px] text-[#1F1A2E]">SpeakFlow<span className="text-[#BE185D]"> Escolas</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {data && <span className="text-[14px] text-[#5B5470] hidden sm:inline">Olá, <b className="text-[#1F1A2E] font-semibold">{data.guardianFirstName || "família"}</b></span>}
            <button onClick={() => setMenu((v) => !v)} aria-label="Menu" className="p-2 rounded-lg text-[#5B5470] hover:bg-[#F5F3FF]">
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menu && (
          <div className="border-t border-[#E9E5F5] bg-white">
            <div className="max-w-[1180px] mx-auto px-4 py-2 flex flex-col">
              <Link href="/escola/familia/configuracoes" onClick={() => setMenu(false)} className="flex items-center gap-2 py-2.5 text-[14px] text-[#1F1A2E]"><Settings size={16} className="text-[#6D28D9]" /> Configurações</Link>
              <Link href="/escola/familia/adicionar-filho" onClick={() => setMenu(false)} className="flex items-center gap-2 py-2.5 text-[14px] text-[#1F1A2E]"><UserPlus size={16} className="text-[#6D28D9]" /> Adicionar outro filho</Link>
              <form method="POST" action="/api/escola/familia/sair"><button className="flex items-center gap-2 py-2.5 text-[14px] text-[#B91C1C] w-full"><LogOut size={16} /> Sair</button></form>
            </div>
          </div>
        )}
      </header>

      {/* Seletor de filhos */}
      {filhos.length > 0 && (
        <div className="sticky top-14 z-10 bg-[#F8F7FC]/95 backdrop-blur border-b border-[#E9E5F5]">
          <div className="max-w-[1180px] mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto">
            {filhos.map((f) => {
              const active = f.studentId === activeStudentId;
              return (
                <Link key={f.studentId} href={`/escola/familia/${f.studentId}`} className={`inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 shrink-0 border transition-colors ${active ? "bg-[#6D28D9] border-[#6D28D9] text-white" : "bg-white border-[#E9E5F5] text-[#1F1A2E] hover:border-[#C4B5FD]"}`}>
                  <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: active ? "rgba(255,255,255,0.25)" : f.color }}>{f.initials}</span>
                  <span className="text-[13px] font-medium whitespace-nowrap">{f.firstName}{f.className ? ` · ${f.className}` : ""}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <main className="max-w-[1180px] mx-auto px-4 py-5">{children}</main>
    </div>
  );
}
