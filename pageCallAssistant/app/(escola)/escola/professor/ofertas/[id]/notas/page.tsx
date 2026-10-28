import { redirect } from "next/navigation";
import { isNotasEnabled } from "@/lib/escola/feature-flag";
import { NotasClient } from "./_NotasClient";

export default function NotasPage({ params }: { params: { id: string } }) {
  if (!isNotasEnabled()) redirect("/escola/professor");
  return <NotasClient params={params} />;
}

/*

interface Student { id: string; studentId: string; fullName: string; enrollmentCode: string; }
interface Assessment { id: string; title: string; status: string; maxScore: string; }
interface GradeEntry { studentId: string; score: string | null; absent: boolean; note: string | null; }

export default function NotasPage({ params }: { params: { id: string } }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get("assessment") ?? "";

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<Record<string, GradeEntry>>({});
  const [selectedAssessment, setSelectedAssessment] = useState(assessmentId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPublish, setShowPublish] = useState(false);
  const [error, setError] = useState("");

  async function loadAssessments() {
    const r = await fetch(`/api/escola/ofertas/${id}/avaliacoes`);
    const data = await r.json();
    setAssessments(data.assessments ?? []);
    if (!selectedAssessment && data.assessments?.[0]) setSelectedAssessment(data.assessments[0].id);
  }

  async function loadStudents() {
    const r = await fetch(`/api/escola/ofertas/${id}/alunos`);
    const data = await r.json();
    setStudents(data.students ?? []);
  }

  async function loadGrades() {
    if (!selectedAssessment) return;
    const r = await fetch(`/api/escola/grades?classSubjectId=${id}&assessmentId=${selectedAssessment}`);
    const data = await r.json();
    const map: Record<string, GradeEntry> = {};
    for (const e of data.grades ?? []) {
      map[e.studentId] = { studentId: e.studentId, score: e.score !== null ? String(e.score) : null, absent: e.absent ?? false, note: e.note ?? null };
    }
    setEntries(map);
  }

  useEffect(() => {
    Promise.all([loadAssessments(), loadStudents()]).then(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (selectedAssessment) loadGrades();
  }, [selectedAssessment]);

  function setEntry(studentId: string, field: keyof GradeEntry, value: string | boolean | null) {
    setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], studentId, ...{ [field]: value } } }));
    setSaved(false);
  }

  async function saveDraft() {
    setSaving(true); setError("");
    const rows = students.map(s => ({
      studentId: s.studentId,
      score: entries[s.studentId]?.score !== undefined && entries[s.studentId]?.score !== "" ? +entries[s.studentId]!.score! : null,
      absent: entries[s.studentId]?.absent ?? false,
      note: entries[s.studentId]?.note ?? null,
    }));
    const r = await fetch("/api/escola/grades", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classSubjectId: id, assessmentId: selectedAssessment, rows }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error); } else { setSaved(true); }
    setSaving(false);
  }

  async function publish() {
    setPublishing(true); setError("");
    const r = await fetch("/api/escola/grades/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId: selectedAssessment, password: confirmPassword }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setPublishing(false); return; }
    setShowPublish(false); setConfirmPassword(""); loadGrades();
    setPublishing(false);
  }

  const currentAssessment = assessments.find(a => a.id === selectedAssessment);
  const canPublish = currentAssessment && ["OPEN","GRADING"].includes(currentAssessment.status);

  if (loading) return <div className="text-[#5B5470] text-center py-12 p-8">Carregando...</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-2">
        <Link href={`/escola/professor/ofertas/${id}`} className="text-[#5B5470] hover:text-[#3F3A4F] text-sm transition-colors">← Oferta</Link>
      </div>
      <h1 className="text-xl font-bold text-[#1F1A2E] mb-4">Planilha de Notas</h1>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="text-[#5B5470] text-xs block mb-1">Avaliação</label>
          <select value={selectedAssessment} onChange={e => setSelectedAssessment(e.target.value)} className="bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2 text-sm border border-[#DDD6EE] outline-none min-h-[44px] min-w-[220px]">
            {assessments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.status})</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={saveDraft} disabled={saving || !selectedAssessment} className="bg-[#EDE9FE] hover:bg-[#F5F3FF] text-[#1F1A2E] px-4 py-2 rounded-lg text-sm min-h-[44px] disabled:opacity-50 transition-colors">{saving ? "Salvando..." : "Salvar rascunho"}</button>
          {canPublish && <button onClick={() => setShowPublish(true)} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors">Publicar notas</button>}
        </div>
        {saved && <span className="text-[#166534] text-sm flex items-center">✅ Rascunho salvo</span>}
        {error && <span className="text-[#B91C1C] text-sm">{error}</span>}
      </div>

      {showPublish && (
        <div className="fixed inset-0 bg-[#1F1A2E]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD6EE] rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-[#1F1A2E] font-semibold mb-2">Confirmar publicação</h2>
            <p className="text-[#5B5470] text-sm mb-4">As notas publicadas são imutáveis. Digite sua senha para confirmar.</p>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Sua senha" className="w-full bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2.5 text-base border border-[#DDD6EE] focus:border-purple-500 outline-none mb-4" />
            {error && <p className="text-[#B91C1C] text-sm mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowPublish(false); setConfirmPassword(""); setError(""); }} className="flex-1 py-2.5 rounded-lg border border-[#DDD6EE] text-[#5B5470] min-h-[44px]">Cancelar</button>
              <button onClick={publish} disabled={publishing || !confirmPassword} className="flex-1 py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-white font-medium min-h-[44px] disabled:opacity-50">{publishing ? "Publicando..." : "Publicar"}</button>
            </div>
          </div>
        </div>
      )}

      {students.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]"><div className="text-4xl mb-3">🎓</div><div>Nenhum aluno matriculado</div></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-white">
                <th className="text-left text-[#5B5470] font-medium p-3 rounded-tl-lg min-w-[200px]">Aluno</th>
                <th className="text-left text-[#5B5470] font-medium p-3 min-w-[100px]">Matrícula</th>
                <th className="text-center text-[#5B5470] font-medium p-3 min-w-[100px]">Nota {currentAssessment ? `(max ${currentAssessment.maxScore})` : ""}</th>
                <th className="text-center text-[#5B5470] font-medium p-3 min-w-[80px]">Falta</th>
                <th className="text-left text-[#5B5470] font-medium p-3 rounded-tr-lg min-w-[160px]">Observação</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const entry = entries[s.studentId];
                return (
                  <tr key={s.studentId} className="border-t border-[#E9E5F5] hover:bg-white/50">
                    <td className="p-3 text-[#1F1A2E]">{s.fullName}</td>
                    <td className="p-3 text-[#5B5470] font-mono text-xs">{s.enrollmentCode}</td>
                    <td className="p-2 text-center">
                      <input
                        type="number" step="0.01" min={0} max={+(currentAssessment?.maxScore ?? 10)}
                        value={entry?.score ?? ""}
                        onChange={e => setEntry(s.studentId, "score", e.target.value)}
                        disabled={entry?.absent || currentAssessment?.status === "PUBLISHED"}
                        className="w-20 bg-[#FAF9FD] text-[#1F1A2E] text-center rounded px-2 py-1.5 text-sm border border-[#DDD6EE] focus:border-purple-500 outline-none disabled:opacity-40"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={entry?.absent ?? false}
                        onChange={e => setEntry(s.studentId, "absent", e.target.checked)}
                        disabled={currentAssessment?.status === "PUBLISHED"}
                        className="w-5 h-5 accent-purple-600 disabled:opacity-40 cursor-pointer"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={entry?.note ?? ""}
                        onChange={e => setEntry(s.studentId, "note", e.target.value)}
                        disabled={currentAssessment?.status === "PUBLISHED"}
                        className="w-full bg-[#FAF9FD] text-[#3F3A4F] rounded px-2 py-1.5 text-sm border border-[#DDD6EE] focus:border-purple-500 outline-none disabled:opacity-40"
                        placeholder="Opcional..."
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
*/
