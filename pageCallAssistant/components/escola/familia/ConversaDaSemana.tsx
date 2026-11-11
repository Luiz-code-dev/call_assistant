"use client";
/** "Para conversar com o seu filho": o que ele estudou na semana e perguntas para puxar conversa */
import { useEffect, useState } from "react";
import { MessageCircleHeart, BookOpen } from "lucide-react";

type Dados = { nome: string; assuntos: { materia: string; assunto: string; situacao: "indo_bem" | "quase" | "praticando" }[]; perguntas: string[] };
const SIT = {
  indo_bem: { texto: "Indo bem", cor: "#166534", fundo: "#DCFCE7" },
  quase: { texto: "Quase lá", cor: "#92400E", fundo: "#FEF3C7" },
  praticando: { texto: "Praticando", cor: "#6D28D9", fundo: "#EDE9FE" },
};

export default function ConversaDaSemana({ studentId }: { studentId: string }) {
  const [d, setD] = useState<Dados | null>(null);
  useEffect(() => {
    fetch(`/api/escola/familia/filhos/${studentId}/conversa`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => setD(null));
  }, [studentId]);
  if (!d || !d.assuntos.length) return null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-2xl bg-[#FFF1E6] text-[#C2410C] flex items-center justify-center"><MessageCircleHeart className="size-5" /></span>
        <div>
          <h2 className="text-[17px] font-extrabold text-[#1F1A2E] leading-tight">Para conversar com {d.nome}</h2>
          <p className="text-xs text-[#5B5470]">O que estudou nos últimos 7 dias</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {d.assuntos.map((a) => (
          <span key={a.assunto} className="inline-flex items-center gap-1.5 rounded-full border border-[#EDE9F7] bg-[#FBFAFF] pl-2.5 pr-1 py-1 text-[13px] text-[#1F1A2E]">
            <BookOpen className="size-3.5 text-[#6D28D9]" /><span className="font-semibold">{a.assunto}</span>
            <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: SIT[a.situacao].cor, background: SIT[a.situacao].fundo }}>{SIT[a.situacao].texto}</span>
          </span>
        ))}
      </div>
      {d.perguntas.length > 0 && (
        <>
          <p className="text-[13px] font-bold text-[#5B5470] mb-2">Pergunte hoje, no jantar ou no caminho:</p>
          <ul className="space-y-2">
            {d.perguntas.map((p) => (
              <li key={p} className="rounded-2xl bg-[#F5F3FF] px-4 py-3 text-[15px] leading-snug text-[#1F1A2E]">&ldquo;{p}&rdquo;</li>
            ))}
          </ul>
          <p className="text-xs text-[#5B5470] mt-3">Deixe {d.nome} explicar com as próprias palavras. Explicar para alguém é uma das melhores formas de aprender.</p>
        </>
      )}
    </section>
  );
}
