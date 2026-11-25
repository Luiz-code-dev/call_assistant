"use client";

import { Download } from "lucide-react";

/** Abre a impressão do navegador, que também salva o e-book em PDF. */
export default function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] print:hidden"
    >
      <Download size={16} /> Baixar em PDF
    </button>
  );
}
