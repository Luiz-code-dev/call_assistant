"use client";
import { useEffect, useState } from "react";
import { School, Users, RefreshCw, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";

interface TurmaInfo {
  id: string;
  name: string;
  gradeYear: number;
  shift: string;
  studentCount: number;
  practiceCount: number;
  participationPct: number;
}

interface EscolaInfo {
  id: string;
  name: string;
  city: string;
  turmas: TurmaInfo[];
}

function EscolaCard({ escola }: { escola: EscolaInfo }) {
  const [expanded, setExpanded] = useState(true);
  const totalStudents = escola.turmas.reduce((a, t) => a + t.studentCount, 0);
  const avgParticipation = escola.turmas.length > 0
    ? Math.round(escola.turmas.reduce((a, t) => a + t.participationPct, 0) / escola.turmas.length)
    : 0;

  return (
    <div className="bg-white border border-[#E9E5F5] rounded-2xl mb-4 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F7FC] transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
          <School size={16} className="text-[#6D28D9]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#1F1A2E] truncate">{escola.name}</p>
          <p className="text-[12px] text-[#5B5470]">{escola.city} · {totalStudents} alunos · {escola.turmas.length} turmas · {avgParticipation}% participação</p>
        </div>
        {expanded ? <ChevronDown size={16} className="text-[#5B5470] flex-shrink-0" /> : <ChevronRight size={16} className="text-[#5B5470] flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="turmas-table">
              <thead>
                <tr className="text-[11px] text-[#5B5470] uppercase tracking-wide border-b border-[#E9E5F5]">
                  <th className="text-left py-2 font-semibold">Turma</th>
                  <th className="text-right py-2 font-semibold">Alunos</th>
                  <th className="text-right py-2 font-semibold">Praticaram</th>
                  <th className="text-right py-2 font-semibold">Participação</th>
                  <th className="text-right py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {escola.turmas.map(t => (
                  <tr key={t.id} className="border-b border-[#F8F7FC] last:border-0">
                    <td className="py-2.5 text-[#1F1A2E] font-medium">{t.name} · {t.shift}</td>
                    <td className="py-2.5 text-right text-[#5B5470]">{t.studentCount}</td>
                    <td className="py-2.5 text-right text-[#5B5470]">{t.practiceCount}</td>
                    <td className="py-2.5 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.participationPct >= 70 ? "bg-[#DCFCE7] text-[#166534]" : t.participationPct >= 40 ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}>
                        {t.participationPct}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link href={`/escola/coordenacao/diagnosticos?turmaId=${t.id}`} className="text-[12px] text-[#6D28D9] font-semibold hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
                {escola.turmas.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-[#5B5470] text-sm">Nenhuma turma cadastrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EscolasPage() {
  const [escolas, setEscolas] = useState<EscolaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    fetch("/api/escola/coordenacao/escolas")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setEscolas(d.escolas ?? []); setLoading(false); })
      .catch(e => {
        setError(e === 401 ? "Sem permissão." : "Não foi possível carregar as escolas. Tente novamente.");
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#E9E5F5] rounded-xl w-64" />
        {[1, 2].map(i => <div key={i} className="h-40 bg-[#E9E5F5] rounded-2xl" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-2xl p-6 text-center">
        <p className="text-[#B91C1C] font-medium mb-3">{error}</p>
        <button onClick={load} className="flex items-center gap-2 mx-auto px-4 py-2 bg-white border border-[#E9E5F5] rounded-xl text-sm font-semibold text-[#1F1A2E] hover:bg-[#F8F7FC]">
          <RefreshCw size={14} /> Tentar de novo
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1A2E] flex items-center gap-2" data-testid="page-title">
            <School size={24} className="text-[#6D28D9]" />
            Escolas e Turmas
          </h1>
          <p className="text-[#5B5470] text-sm mt-1">Participação e reforço por escola da sua coordenação.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#5B5470]">{escolas.length} escola{escolas.length !== 1 ? "s" : ""}</span>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E9E5F5] rounded-xl text-sm font-semibold text-[#1F1A2E] hover:bg-[#F8F7FC] min-h-[44px]">
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      {escolas.length === 0 ? (
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-12 text-center">
          <Users size={40} className="text-[#C4B5FD] mx-auto mb-4" />
          <p className="text-[#1F1A2E] font-semibold mb-2">Nenhuma escola encontrada</p>
          <p className="text-[#5B5470] text-sm mb-4">Peça ao gestor de rede para vincular escolas à sua coordenação.</p>
          <Link href="/escola/coordenacao" className="inline-flex items-center gap-2 px-4 py-2 bg-[#6D28D9] text-white rounded-xl text-sm font-semibold hover:bg-[#5B21B6] min-h-[44px]">
            <BookOpen size={14} /> Voltar à coordenação
          </Link>
        </div>
      ) : (
        <div data-testid="escolas-list">
          {escolas.map(e => <EscolaCard key={e.id} escola={e} />)}
        </div>
      )}
    </div>
  );
}
