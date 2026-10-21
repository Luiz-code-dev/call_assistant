"use client";
import { useEffect, useState } from "react";

interface ClassOffer { id: string; classId: string; class: { name: string; gradeYear: number; shift: string } }
interface ActiveSession { id: string; code: string; expiresAt: string; class: { name: string; gradeYear: number; shift: string } }

const SHIFT_LABEL: Record<string, string> = { MORNING: "Manhã", AFTERNOON: "Tarde", EVENING: "Noturno", FULL_TIME: "Integral" };

export default function AulaPage() {
  const [offers, setOffers] = useState<ClassOffer[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [offersRes, sessionsRes] = await Promise.all([
      fetch("/api/escola/professor/ofertas"),
      fetch("/api/escola/aulas"),
    ]);
    if (offersRes.ok) {
      const d = await offersRes.json();
      setOffers(d.ofertas ?? []);
      if (d.ofertas?.length) setSelectedClassId(d.ofertas[0].classId);
    }
    if (sessionsRes.ok) {
      const d = await sessionsRes.json();
      setSessions(d.sessions ?? []);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openAula() {
    if (!selectedClassId) return;
    setOpening(true); setError("");
    const r = await fetch("/api/escola/aulas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClassId }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error); setOpening(false); return; }
    setOpening(false); load();
  }

  async function closeAula(id: string) {
    await fetch(`/api/escola/aulas/${id}/encerrar`, { method: "POST" });
    load();
  }

  const uniqueClasses = offers.filter((o, i, a) => a.findIndex(x => x.classId === o.classId) === i);

  if (loading) return <div className="p-8 text-gray-400 text-center">Carregando...</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Modo Sala de Aula</h1>
      <p className="text-gray-400 text-sm mb-6">Abra uma aula para que os alunos entrem pelo código no projetor.</p>

      {/* Active sessions */}
      {sessions.length > 0 && (
        <div className="space-y-3 mb-6">
          {sessions.map(s => {
            const expiresIn = Math.max(0, Math.round((new Date(s.expiresAt).getTime() - Date.now()) / 60000));
            return (
              <div key={s.id} className="bg-green-900/30 border border-green-700 rounded-2xl p-6 text-center">
                <div className="text-gray-400 text-sm mb-1">{s.class.name} — {s.class.gradeYear}º {SHIFT_LABEL[s.class.shift] ?? s.class.shift}</div>
                <div className="text-6xl font-bold font-mono text-white tracking-widest my-3">{s.code}</div>
                <div className="text-green-400 text-sm mb-4">Aula aberta · expira em {expiresIn} min</div>
                <div className="text-gray-500 text-xs mb-4">Alunos entram em <span className="text-white">/escola/aluno/entrar</span></div>
                <button onClick={() => closeAula(s.id)} className="bg-red-900/60 hover:bg-red-800 text-red-300 px-6 py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-colors">
                  Encerrar aula
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Open new session */}
      {uniqueClasses.length === 0 ? (
        <div className="text-center py-12 text-gray-600"><div className="text-4xl mb-3">📭</div><div>Você não está atribuído a nenhuma turma ainda.</div></div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Abrir nova aula</h2>
          <div className="mb-4">
            <label className="text-gray-400 text-sm block mb-1">Turma</label>
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-3 border border-gray-700 outline-none min-h-[44px] text-base">
              {uniqueClasses.map(o => (
                <option key={o.classId} value={o.classId}>{o.class.name} — {o.class.gradeYear}º {SHIFT_LABEL[o.class.shift] ?? o.class.shift}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button onClick={openAula} disabled={opening || !selectedClassId}
            className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-lg font-bold py-4 rounded-xl min-h-[56px] transition-colors">
            {opening ? "Abrindo..." : "📺 Abrir Aula"}
          </button>
          <p className="text-gray-600 text-xs text-center mt-3">A aula ficará aberta por até 2 horas. Feche ao terminar a aula.</p>
        </div>
      )}
    </div>
  );
}
