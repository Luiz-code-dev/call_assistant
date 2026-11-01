"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DiagnosticItem { id: string; order: number; skill: { code: string; shortLabel: string | null } }
interface Diagnostic {
  id: string; title: string; status: string; gradeYear: number; cycle: number;
  createdAt: string; items: DiagnosticItem[]; source?: string;
}
interface Turma { id: string; name: string; gradeYear: number }

const STATUS_LABELS: Record<string, string> = { DRAFT: "Rascunho", OPEN: "Aberto", CLOSED: "Encerrado" };
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-[#F8F7FC] text-[#5B5470]",
  OPEN: "bg-[#DCFCE7] text-[#166534]",
  CLOSED: "bg-[#EDE9FE] text-[#5B5470]",
};

export default function DiagnosticosPage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [abrindoRede, setAbrindoRede] = useState<string | null>(null);
  const [msgRede, setMsgRede] = useState<Record<string, string>>({});

  async function load() {
    const [rDiag, rTurmas] = await Promise.all([
      fetch("/api/escola/diagnosticos"),
      fetch("/api/escola/coordenacao/turmas").catch(() => null),
    ]);
    if (rDiag.ok) { const d = await rDiag.json(); setDiagnostics(d.diagnostics ?? []); }
    if (rTurmas?.ok) { const t = await rTurmas.json(); setTurmas(t.turmas ?? []); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function abrir(id: string) {
    await fetch(`/api/escola/diagnosticos/${id}/abrir`, { method: "POST" });
    load();
  }

  async function abrirParaRede(id: string, gradeYear: number, isLibrary = false) {
    setAbrindoRede(id);
    setMsgRede(prev => ({ ...prev, [id]: "" }));

    // Itens da biblioteca (networkId=null) precisam ser clonados para a rede antes de abrir
    let diagId = id;
    if (isLibrary) {
      const rc = await fetch(`/api/escola/diagnosticos/biblioteca/${id}/ativar-rede`, { method: "POST" });
      if (!rc.ok) { setMsgRede(prev => ({ ...prev, [id]: "Erro ao ativar diagnóstico para a rede." })); setAbrindoRede(null); return; }
      const clone = await rc.json();
      diagId = clone.id;
    }

    // Abre o diagnostico (agora pertencente à rede)
    const r1 = await fetch(`/api/escola/diagnosticos/${diagId}/abrir`, { method: "POST" });
    if (!r1.ok) { setMsgRede(prev => ({ ...prev, [id]: "Erro ao abrir diagnóstico." })); setAbrindoRede(null); return; }

    // Associa a turmas do gradeYear
    const turmasAno = turmas.filter(t => t.gradeYear === gradeYear);
    if (turmasAno.length > 0) {
      await fetch(`/api/escola/diagnosticos/${diagId}/aplicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classIds: turmasAno.map(t => t.id) }),
      }).catch(() => null);
    }
    setMsgRede(prev => ({ ...prev, [id]: `Aberto para ${turmasAno.length > 0 ? `${turmasAno.length} turma(s) do ${gradeYear}º ano` : "a rede"}.` }));
    setAbrindoRede(null);
    load();
  }

  const speakflow = diagnostics.filter(d => d.source === "SPEAKFLOW");
  const rede = diagnostics.filter(d => d.source !== "SPEAKFLOW");

  return (
    <div className="min-h-screen bg-[#F8F7FC] p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-[#1F1A2E] text-xl font-bold">Diagnosticos</h1>
          <p className="text-[#5B5470] text-xs mt-0.5">Identifique lacunas BNCC por turma</p>
        </div>
        <Link href="/escola/coordenacao/diagnosticos/novo"
          className="bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors min-h-[44px] flex items-center">
          + Novo
        </Link>
      </div>

      {loading ? (
        <div className="text-[#5B5470] text-center py-16">Carregando diagnosticos...</div>
      ) : (
        <>
          {/* Diagnosticos SpeakFlow (prontos) */}
          {speakflow.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-[#1F1A2E] uppercase tracking-wide">Diagnosticos SpeakFlow</h2>
                <span className="bg-[#EDE9FE] text-[#6D28D9] text-xs font-semibold px-2 py-0.5 rounded-full">Prontos</span>
              </div>
              <p className="text-xs text-[#5B5470] mb-3">Diagnosticos pre-elaborados pela equipe SpeakFlow, alinhados com a BNCC. Use "Abrir para a rede" para aplicar em turmas.</p>
              <div className="space-y-3">
                {speakflow.map(d => (
                  <div key={d.id} className="bg-white rounded-2xl p-5 border-2 border-[#DDD6EE]">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-[#1F1A2E] font-semibold">{d.title}</h3>
                        <p className="text-[#5B5470] text-xs mt-0.5">{d.gradeYear}º ano · Ciclo {d.cycle} · {d.items.length} habilidades</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[d.status] ?? "bg-[#F8F7FC] text-[#5B5470]"}`}>
                        {STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {d.items.slice(0, 6).map(item => (
                        <span key={item.id} className="bg-[#EDE9FE] text-[#6D28D9] text-xs px-2 py-0.5 rounded-full">{item.skill.shortLabel ?? item.skill.code}</span>
                      ))}
                      {d.items.length > 6 && <span className="text-[#5B5470] text-xs px-2 py-0.5">+{d.items.length - 6}</span>}
                    </div>

                    {msgRede[d.id] && (
                      <p className="text-xs text-[#166534] bg-[#DCFCE7] rounded-lg px-3 py-2 mb-2">{msgRede[d.id]}</p>
                    )}

                    <div className="flex gap-2">
                      <Link href={`/escola/coordenacao/diagnosticos/${d.id}`}
                        className="flex-1 text-center text-[#6D28D9] border border-[#DDD6EE] hover:border-[#6D28D9] hover:bg-[#EDE9FE] text-sm py-2.5 rounded-xl transition-colors min-h-[44px] flex items-center justify-center">
                        Ver resultados
                      </Link>
                      {(d.status === "DRAFT" || d.status === "CLOSED") && (
                        <button onClick={() => abrirParaRede(d.id, d.gradeYear, true)} disabled={abrindoRede === d.id}
                          className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50 min-h-[44px]">
                          {abrindoRede === d.id ? "Abrindo..." : "Abrir para a rede"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Diagnosticos da rede */}
          {rede.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-[#1F1A2E] uppercase tracking-wide mb-3">Criados pela rede</h2>
              <div className="space-y-3">
                {rede.map(d => (
                  <div key={d.id} className="bg-white rounded-2xl p-5 border border-[#E9E5F5]">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h2 className="text-[#1F1A2E] font-semibold">{d.title}</h2>
                        <p className="text-[#5B5470] text-xs mt-0.5">{d.gradeYear}º ano · Ciclo {d.cycle} · {d.items.length} habilidades</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[d.status] ?? "bg-[#F8F7FC] text-[#5B5470]"}`}>
                        {STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {d.items.slice(0, 6).map(item => (
                        <span key={item.id} className="bg-[#F8F7FC] text-[#5B5470] text-xs px-2 py-0.5 rounded-full">{item.skill.shortLabel ?? item.skill.code}</span>
                      ))}
                      {d.items.length > 6 && <span className="text-[#5B5470] text-xs px-2 py-0.5">+{d.items.length - 6}</span>}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/escola/coordenacao/diagnosticos/${d.id}`}
                        className="flex-1 text-center text-[#6D28D9] border border-[#DDD6EE] hover:border-[#6D28D9] text-sm py-2.5 rounded-xl transition-colors min-h-[44px] flex items-center justify-center">
                        Ver resultados
                      </Link>
                      {d.status === "DRAFT" && (
                        <button onClick={() => abrir(d.id)}
                          className="flex-1 bg-[#166534] hover:bg-[#14532D] text-white text-sm py-2.5 rounded-xl transition-colors min-h-[44px]">
                          Abrir para alunos
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {diagnostics.length === 0 && (
            <div className="text-center py-16 text-[#5B5470]">
              <p>Nenhum diagnostico criado.</p>
              <p className="text-sm mt-1">Crie um diagnostico para mapear o dominio das habilidades da turma.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
