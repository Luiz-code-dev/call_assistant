"use client";
import Link from "next/link";
import { ArrowLeft, FileText, ShieldCheck, Trash2, LogOut, ChevronRight } from "lucide-react";
import FamilyShell from "@/components/escola/familia/FamilyShell";

export default function FamiliaConfiguracoes() {
  const rows = [
    { icon: FileText, label: "Termos de Uso", href: "/escola/termos" },
    { icon: ShieldCheck, label: "Aviso de Privacidade", href: "/escola/privacidade" },
    { icon: Trash2, label: "Excluir minha conta", href: "/escola/excluir-conta", danger: true },
  ];
  return (
    <FamilyShell>
      <div className="max-w-md mx-auto space-y-4">
        <Link href="/escola/familia" className="inline-flex items-center gap-1.5 text-[14px] text-[#6D28D9] font-medium"><ArrowLeft size={16} /> Voltar</Link>
        <h1 className="text-[22px] font-extrabold text-[#1F1A2E]">Configurações</h1>

        <div className="bg-white border border-[#E9E5F5] rounded-[20px] overflow-hidden">
          {rows.map((r, i) => {
            const Icon = r.icon;
            return (
              <Link key={r.label} href={r.href} className={`flex items-center gap-3 px-4 py-4 min-h-[52px] ${i > 0 ? "border-t border-[#E9E5F5]" : ""}`}>
                <Icon size={18} className={r.danger ? "text-[#B91C1C]" : "text-[#6D28D9]"} />
                <span className={`flex-1 text-[15px] font-medium ${r.danger ? "text-[#B91C1C]" : "text-[#1F1A2E]"}`}>{r.label}</span>
                <ChevronRight size={16} className="text-[#5B5470]" />
              </Link>
            );
          })}
          <form method="POST" action="/api/escola/familia/sair" className="border-t border-[#E9E5F5]">
            <button className="flex items-center gap-3 px-4 py-4 min-h-[52px] w-full text-left"><LogOut size={18} className="text-[#5B5470]" /><span className="flex-1 text-[15px] font-medium text-[#1F1A2E]">Sair</span></button>
          </form>
        </div>
        <p className="text-[12px] text-[#5B5470] text-center">SpeakFlow Escolas · você vê apenas os seus filhos.</p>
      </div>
    </FamilyShell>
  );
}
