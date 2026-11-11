"use client";
/** Missões de hoje do Flow, na tela inicial: até 3 tarefas curtas, com o avanço do dia. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight, Target } from "lucide-react";

type Missao = { id: string; titulo: string; descricao: string; href: string; feita: boolean };

export default function MissoesDoDia() {
  const [m, setM] = useState<Missao[] | null>(null);
  useEffect(() => {
    fetch("/api/escola/aluno/missoes", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d) => setM(d?.missoes ?? [])).catch(() => setM([]));
  }, []);
  if (m === null) return <div className="h-40 rounded-3xl bg-[#E9E5F5] animate-pulse" />;
  if (!m.length) return null;
  const feitas = m.filter((x) => x.feita).length;
  const todas = feitas === m.length;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-2xl bg-[#FFF1E6] text-[#C2410C] flex items-center justify-center"><Target className="size-5" /></span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-extrabold text-[#1F1A2E] leading-tight">Missões de hoje</h2>
          <p className="text-xs text-[#5B5470]">{todas ? "Todas feitas! O Flow está orgulhoso de você." : `${feitas} de ${m.length} feitas`}</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[#F1EEF9] overflow-hidden mb-3" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-[#F97316] to-[#C2410C] transition-all" style={{ width: `${(feitas / m.length) * 100}%` }} />
      </div>
      <ul className="space-y-2">
        {m.map((x) => (
          <li key={x.id}>
            <Link href={x.href} className={`flex items-center gap-3 rounded-2xl px-3 py-3 min-h-[60px] border ${x.feita ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FBFAFF] border-[#EDE9F7] hover:border-[#C4B5FD]"}`}>
              {x.feita ? <CheckCircle2 className="size-6 text-[#16A34A] shrink-0" /> : <Circle className="size-6 text-[#C4B5FD] shrink-0" />}
              <span className="flex-1 min-w-0">
                <span className={`block text-[15px] font-bold leading-snug ${x.feita ? "text-[#166534]" : "text-[#1F1A2E]"}`}>{x.titulo}</span>
                <span className="block text-xs text-[#5B5470] truncate">{x.descricao}</span>
              </span>
              {!x.feita && <ChevronRight className="size-5 text-[#A59FB8] shrink-0" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
