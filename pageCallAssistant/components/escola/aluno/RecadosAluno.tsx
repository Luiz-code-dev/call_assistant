"use client";
/**
 * Tela inicial do aluno: recado da família (elogio, lembrete, sugestão) e o horário
 * de estudo de hoje que a família combinou.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Bell, Lightbulb, Check, CalendarDays, Clock, Play } from "lucide-react";
import { materiaDe } from "@/components/escola/reforco-ui";

type Tipo = "ELOGIO" | "LEMBRETE" | "SUGESTAO";
interface Recado { id: string; kind: Tipo; text: string; createdAt: string; lido: boolean; de: string }
interface ItemAgenda { id: string; weekday: number; time: string; subjectCode: string | null; minutes: number }

const TIPOS: Record<Tipo, { titulo: string; Icone: typeof Heart; cor: string; fundo: string; resposta: string }> = {
  ELOGIO: { titulo: "Um elogio para você", Icone: Heart, cor: "#BE185D", fundo: "linear-gradient(135deg, #FCE7F3, #FFF1F7)", resposta: "Obrigado!" },
  LEMBRETE: { titulo: "Um lembrete", Icone: Bell, cor: "#6D28D9", fundo: "linear-gradient(135deg, #EDE9FE, #F5F3FF)", resposta: "Combinado!" },
  SUGESTAO: { titulo: "Uma sugestão", Icone: Lightbulb, cor: "#B45309", fundo: "linear-gradient(135deg, #FEF3C7, #FFFBEB)", resposta: "Vou tentar!" },
};

export function RecadoDaFamilia() {
  const [recados, setRecados] = useState<Recado[]>([]);
  useEffect(() => {
    fetch("/api/escola/aluno/recados").then((r) => (r.ok ? r.json() : null))
      .then((d) => setRecados(d?.recados ?? [])).catch(() => {});
  }, []);
  const atual = recados.find((r) => !r.lido);
  if (!atual) return null;
  const t = TIPOS[atual.kind] ?? TIPOS.LEMBRETE;
  const outros = recados.filter((r) => !r.lido).length - 1;

  async function ler() {
    setRecados((l) => l.map((r) => (r.id === atual!.id ? { ...r, lido: true } : r)));
    await fetch("/api/escola/aluno/recados", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: atual!.id }),
    }).catch(() => {});
  }

  return (
    <section className="rounded-3xl p-4 shadow-[0_4px_18px_rgba(91,33,182,0.10)]" style={{ background: t.fundo }}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: t.cor }}>
          <t.Icone className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: t.cor }}>
            {t.titulo}{atual.de ? ` · de ${atual.de}` : " · da sua família"}
          </p>
          <p className="text-[15px] font-semibold text-[#1F1A2E] leading-snug mt-1">{atual.text}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-[#8B84A0]">{outros > 0 ? `mais ${outros} ${outros === 1 ? "recado" : "recados"}` : ""}</span>
        <button onClick={ler} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 min-h-[40px] text-[13px] font-bold shadow-sm" style={{ color: t.cor }}>
          <Check className="size-4" strokeWidth={3} />{t.resposta}
        </button>
      </div>
    </section>
  );
}

export function AgendaDeHoje() {
  const [hoje, setHoje] = useState<ItemAgenda[]>([]);
  useEffect(() => {
    fetch("/api/escola/aluno/agenda").then((r) => (r.ok ? r.json() : null))
      .then((d) => setHoje(d?.hoje ?? [])).catch(() => {});
  }, []);
  if (!hoje.length) return null;
  return (
    <section className="rounded-3xl bg-white p-4 shadow-[0_4px_18px_rgba(91,33,182,0.08)]">
      <p className="text-sm font-bold text-[#1F1A2E] mb-2 flex items-center gap-2"><CalendarDays className="size-4 text-[#6D28D9]" />Hoje na sua agenda</p>
      <ul className="space-y-2">
        {hoje.map((i) => {
          const m = materiaDe(i.subjectCode);
          const cor = m?.cor ?? "#6D28D9";
          return (
            <li key={i.id}>
              <Link href={m ? "/escola/aluno" : "/escola/aluno/trilha"} className="flex items-center gap-3 rounded-2xl p-2.5" style={{ background: cor + "12" }}>
                <span className="rounded-xl px-2.5 py-1.5 text-[13px] font-extrabold text-white inline-flex items-center gap-1" style={{ background: cor }}>
                  <Clock className="size-3.5" />{i.time}
                </span>
                <span className="flex-1 min-w-0 text-[14px] font-semibold text-[#1F1A2E]">{m?.nome ?? "Sua trilha"} · {i.minutes} min</span>
                <Play className="size-4 fill-current shrink-0" style={{ color: cor }} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
