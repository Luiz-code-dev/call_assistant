"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Settings, UserPlus, LogOut, X, ChevronLeft } from "lucide-react";

export interface FamilyChild {
  studentId: string; firstName: string; fullName: string;
  className: string | null; schoolName: string | null; initials: string; color: string;
}

export function useFilhos() {
  const [data, setData] = useState<{ guardianFirstName: string; filhos: FamilyChild[] } | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Tenta de novo sozinho algumas vezes: durante uma atualização do servidor a
    // primeira chamada pode falhar por alguns segundos
    let vivo = true;
    (async () => {
      for (let tentativa = 0; tentativa < 4 && vivo; tentativa++) {
        try {
          const r = await fetch("/api/escola/familia/filhos", { cache: "no-store" });
          if (r.status === 401) { window.location.href = "/escola/familia/entrar"; return; }
          if (r.ok) {
            const d = await r.json();
            if (vivo) { setData({ guardianFirstName: d.guardianFirstName ?? "", filhos: d.filhos ?? [] }); setLoading(false); }
            return;
          }
        } catch { /* tenta de novo */ }
        await new Promise((ok) => setTimeout(ok, 2500 * (tentativa + 1)));
      }
      if (vivo) { setError(true); setLoading(false); }
    })();
    return () => { vivo = false; };
  }, []);
  return { data, error, loading };
}

export default function FamilyShell({ activeStudentId, children, voltar, titulo, subtitulo }: {
  activeStudentId?: string; children: React.ReactNode;
  /** Botão de voltar dentro da capa (alinhado ao topo, sem cair por cima do conteúdo) */
  voltar?: { href: string; texto?: string };
  /** Título da página na capa; sem ele, mostra "Olá, ...!" */
  titulo?: string; subtitulo?: string;
}) {
  const { data } = useFilhos();
  const [menu, setMenu] = useState(false);
  const filhos = data?.filhos ?? [];

  return (
    <div className="min-h-screen bg-[#F6F4FE]">
      {/* Capa */}
      <header className="relative overflow-hidden rounded-b-[28px] text-white bg-gradient-to-br from-[#5B21B6] via-[#6D28D9] to-[#8B5CF6]">
        <div className="absolute -top-14 -right-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute top-20 -left-10 w-28 h-28 rounded-full bg-white/5" />
        <div className="relative max-w-[920px] mx-auto px-5 pt-4 pb-16">
          <div className="flex items-center justify-between gap-3 min-h-[44px]">
            <Link href="/escola/familia" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-white text-[#6D28D9] inline-flex items-center justify-center text-[14px] font-extrabold">S</span>
              <span className="font-extrabold text-[15px]">SpeakFlow Escolas</span>
            </Link>
            <button onClick={() => setMenu((v) => !v)} aria-label="Menu"
              className="rounded-full bg-white/15 hover:bg-white/25 min-h-[44px] min-w-[44px] flex items-center justify-center">
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          {voltar && (
            <Link href={voltar.href} className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 pl-2 pr-3 min-h-[40px] text-sm font-semibold">
              <ChevronLeft className="size-4" />{voltar.texto ?? "Voltar"}
            </Link>
          )}
          <h1 className="text-2xl font-extrabold mt-3">{titulo ?? `Olá, ${data?.guardianFirstName || "família"}!`}</h1>
          <p className="text-sm text-white/85 mt-1">{subtitulo ?? (titulo ? "" : "Acompanhe o reforço do seu filho em todas as matérias.")}</p>

          {filhos.length > 1 && (
            <div className="mt-4 -mx-1 px-1 flex gap-2 overflow-x-auto">
              {filhos.map((f) => {
                const active = f.studentId === activeStudentId;
                return (
                  <Link key={f.studentId} href={`/escola/familia/${f.studentId}`}
                    className={`inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 shrink-0 transition-colors ${active ? "bg-white text-[#4C1D95]" : "bg-white/15 text-white hover:bg-white/25"}`}>
                    <span className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: f.color }}>{f.initials}</span>
                    <span className="text-[13px] font-semibold whitespace-nowrap">{f.firstName}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {menu && (
        <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setMenu(false)}>
          <div className="absolute right-4 top-16 w-64 rounded-3xl bg-white p-2 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <Link href="/escola/familia/configuracoes" onClick={() => setMenu(false)} className="flex items-center gap-3 px-3 py-3 rounded-2xl text-[14px] font-semibold text-[#1F1A2E] hover:bg-[#F5F3FF]"><Settings size={18} className="text-[#6D28D9]" /> Configurações</Link>
            <Link href="/escola/familia/adicionar-filho" onClick={() => setMenu(false)} className="flex items-center gap-3 px-3 py-3 rounded-2xl text-[14px] font-semibold text-[#1F1A2E] hover:bg-[#F5F3FF]"><UserPlus size={18} className="text-[#6D28D9]" /> Adicionar outro filho</Link>
            <form method="POST" action="/api/escola/familia/sair"><button className="flex items-center gap-3 px-3 py-3 rounded-2xl text-[14px] font-semibold text-[#B91C1C] w-full hover:bg-[#FEF2F2]"><LogOut size={18} /> Sair</button></form>
          </div>
        </div>
      )}

      <main className="relative max-w-[920px] mx-auto px-4 -mt-10 pb-10">{children}</main>
    </div>
  );
}
