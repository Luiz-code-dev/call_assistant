"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Library, BookOpen, Route, ClipboardList, Target } from "lucide-react";

interface Totals { skills: number; guides: number; tracks: number; diagnostics: number; }
interface SubjectCount { subjectCode: string; count: number; }

const SUBJECT_LABELS: Record<string, string> = { MA: "Matemática", LP: "Língua Portuguesa", CI: "Ciências", HI: "História", GE: "Geografia", AR: "Arte", EF: "Ed. Física", ER: "Ensino Religioso", IN: "Inglês", ES: "Espanhol" };

export default function ConteudoPage() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [bySubject, setBySubject] = useState<SubjectCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/escola/plataforma/conteudo", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setTotals(d.totals); setBySubject(d.bySubject ?? []); setLoading(false); })
      .catch(() => { setError("Erro ao carregar painel."); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 text-center text-[#5B5470]">Carregando...</div>;
  if (error) return <div className="p-8 text-center text-[#B91C1C]">{error}</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2"><Library className="w-6 h-6 text-[#6D28D9]" /><h1 className="text-2xl font-bold text-[#1F1A2E]">Estúdio de Conteúdo</h1></div>
      <p className="text-[#5B5470] text-sm mb-6">Gerencie o conteúdo SpeakFlow: fichas, pré-requisitos, trilhas e diagnósticos.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[{ label: "Habilidades BNCC", value: totals?.skills, icon: <Target className="w-5 h-5" /> },
          { label: "Fichas", value: totals?.guides, icon: <BookOpen className="w-5 h-5" /> },
          { label: "Trilhas", value: totals?.tracks, icon: <Route className="w-5 h-5" /> },
          { label: "Diagnósticos", value: totals?.diagnostics, icon: <ClipboardList className="w-5 h-5" /> }].map(item => (
          <div key={item.label} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
            <div className="text-[#6D28D9] mb-2">{item.icon}</div>
            <div className="text-2xl font-bold text-[#1F1A2E]">{item.value ?? 0}</div>
            <div className="text-[#5B5470] text-xs">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[{ href: "/escola/plataforma/conteudo/gerar", title: "Gerar com IA", desc: "Gera lote de atividades, trilhas ou diagnósticos por componente e ano." },
          { href: "/escola/plataforma/conteudo/revisar", title: "Fila de revisão", desc: "Revisar e aprovar conteúdos gerados antes de publicar para as redes." },
          { href: "/escola/plataforma/conteudo/fichas", title: "Fichas pedagógicas", desc: "Fichas por habilidade: o que o aluno faz, erros comuns, tipos indicados." },
          { href: "/escola/plataforma/conteudo/prerequisitos", title: "Pré-requisitos", desc: "Mapa de pré-requisitos entre habilidades BNCC." },
        ].map(item => (
          <Link key={item.href} href={item.href} className="bg-white border border-[#E9E5F5] rounded-xl p-5 hover:border-[#6D28D9] transition-colors group">
            <div className="text-[#6D28D9] font-semibold mb-1 group-hover:text-[#5B21B6]">{item.title}</div>
            <div className="text-[#5B5470] text-sm">{item.desc}</div>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#1F1A2E] mb-3">Cobertura por componente</h2>
        <div className="space-y-2">
          {bySubject.map(s => (
            <div key={s.subjectCode} className="bg-white border border-[#E9E5F5] rounded-lg p-3 flex items-center justify-between">
              <span className="text-[#1F1A2E] text-sm">{SUBJECT_LABELS[s.subjectCode] ?? s.subjectCode}</span>
              <span className="text-[#6D28D9] font-semibold text-sm">{s.count} habilidades</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
