"use client";
/** Atalho da tela inicial para a foto do dever da escola */
import Link from "next/link";
import { Camera, ChevronRight } from "lucide-react";

export default function DeverCard() {
  return (
    <Link href="/escola/aluno/dever" className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] border border-[#FED7AA] p-4 shadow-[0_4px_18px_rgba(194,65,12,0.10)] active:scale-[0.99] transition-transform">
      <span className="w-12 h-12 rounded-2xl bg-[#C2410C] text-white flex items-center justify-center shrink-0"><Camera className="size-6" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-extrabold text-[#1F1A2E] leading-tight">Travou no dever da escola?</span>
        <span className="block text-[13px] text-[#7C2D12] mt-0.5">Tire uma foto e o Flow te ajuda a pensar</span>
      </span>
      <ChevronRight className="size-5 text-[#C2410C] shrink-0" />
    </Link>
  );
}
