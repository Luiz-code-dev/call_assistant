"use client";
import { useEffect, useState } from "react";
import { STAGE_LABEL, SHIFT_LABEL, EduStage, EduShift } from "@/lib/escola/types";

interface Subject { id: string; name: string; color: string | null; }
interface CurriculumItem { id: string; subjectId: string; stage: EduStage; gradeYear: number; shift: EduShift | null; weeklyHours: number; }

const STAGES: EduStage[] = ["ELEMENTARY_EARLY", "ELEMENTARY_LATE", "HIGH_SCHOOL", "EARLY_CHILDHOOD", "EJA"];
const SHIFTS: (EduShift | "ALL")[] = ["ALL", "MORNING", "AFTERNOON", "EVENING", "FULL_TIME"];

export default function MatrizPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<EduStage>("ELEMENTARY_LATE");
  const [selectedShift, setSelectedShift] = useState<EduShift | "ALL">("ALL");
  const [editing, setEditing] = useState<{subjectId:string; stage:EduStage; gradeYear:number; shift:EduShift|null; weeklyHours:number} | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [sr, ir] = await Promise.all([fetch("/api/escola/componentes"), fetch("/api/escola/matriz")]);
    const [sd, id2] = await Promise.all([sr.json(), ir.json()]);
    setSubjects(sd.subjects ?? []);
    setItems(id2.items ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const gradeYears = selectedStage === "EARLY_CHILDHOOD" ? [1,2,3,4,5] : selectedStage === "ELEMENTARY_EARLY" ? [1,2,3,4,5] : selectedStage === "ELEMENTARY_LATE" ? [6,7,8,9] : selectedStage === "HIGH_SCHOOL" ? [1,2,3] : [1,2,3,4];

  function getItem(subjectId: string, gradeYear: number) {
    return items.find(i => i.subjectId === subjectId && i.stage === selectedStage && i.gradeYear === gradeYear && (selectedShift === "ALL" ? !i.shift : i.shift === selectedShift));
  }

  async function saveItem(subjectId: string, gradeYear: number, weeklyHours: number) {
    setSaving(true);
    await fetch("/api/escola/matriz", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, stage: selectedStage, gradeYear, shift: selectedShift === "ALL" ? null : selectedShift, weeklyHours }),
    });
    await load(); setSaving(false); setEditing(null);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1F1A2E] mb-4">Matriz Curricular</h1>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-[#5B5470] text-xs block mb-1">Etapa</label>
            <select value={selectedStage} onChange={e => setSelectedStage(e.target.value as EduStage)} className="bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2 text-sm border border-[#DDD6EE] focus:border-purple-500 outline-none min-h-[44px]">
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[#5B5470] text-xs block mb-1">Turno</label>
            <select value={selectedShift} onChange={e => setSelectedShift(e.target.value as EduShift | "ALL")} className="bg-[#FAF9FD] text-[#1F1A2E] rounded-lg px-3 py-2 text-sm border border-[#DDD6EE] focus:border-purple-500 outline-none min-h-[44px]">
              <option value="ALL">Todos os turnos</option>
              {(["MORNING","AFTERNOON","EVENING","FULL_TIME"] as EduShift[]).map(s => <option key={s} value={s}>{SHIFT_LABEL[s]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-[#5B5470] py-12 text-center">Carregando...</div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 text-[#5B5470]"><div className="text-4xl mb-3">🗂️</div><div>Cadastre componentes curriculares primeiro</div></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left text-[#5B5470] font-medium p-3 bg-white rounded-tl-lg sticky left-0 z-10 min-w-[160px]">Componente</th>
                {gradeYears.map(y => (
                  <th key={y} className="text-center text-[#5B5470] font-medium p-3 bg-white min-w-[80px]">{y}º ano</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.filter(s => s).map(subject => (
                <tr key={subject.id} className="border-t border-[#E9E5F5]">
                  <td className="p-3 bg-white sticky left-0 z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color ?? "#7C3AED" }} />
                      <span className="text-[#1F1A2E] text-xs font-medium truncate max-w-[130px]">{subject.name}</span>
                    </div>
                  </td>
                  {gradeYears.map(gradeYear => {
                    const item = getItem(subject.id, gradeYear);
                    const isEditing = editing?.subjectId === subject.id && editing?.gradeYear === gradeYear;
                    return (
                      <td key={gradeYear} className="p-2 text-center bg-[#F8F7FC] border-l border-[#E9E5F5]">
                        {isEditing ? (
                          <div className="flex flex-col gap-1 items-center">
                            <input type="number" min={0} max={20} defaultValue={editing.weeklyHours}
                              onChange={e => setEditing(ed => ed ? {...ed, weeklyHours: +e.target.value} : ed)}
                              className="w-16 bg-[#FAF9FD] text-[#1F1A2E] text-center rounded px-1 py-1 text-xs border border-purple-500 outline-none" />
                            <div className="flex gap-1">
                              <button disabled={saving} onClick={() => saveItem(subject.id, gradeYear, editing.weeklyHours)} className="text-[#166534] text-xs px-1 min-h-[28px]">✓</button>
                              <button onClick={() => setEditing(null)} className="text-[#5B5470] text-xs px-1 min-h-[28px]">✕</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setEditing({ subjectId: subject.id, stage: selectedStage, gradeYear, shift: selectedShift === "ALL" ? null : selectedShift, weeklyHours: item?.weeklyHours ?? 0 })}
                            className={`w-full h-10 rounded text-xs transition-colors min-h-[44px] ${item ? "text-[#1F1A2E] font-semibold hover:opacity-80" : "text-[#5B5470] hover:text-[#5B5470] hover:bg-[#F5F3FF]"}`}
                            style={item ? { backgroundColor: subject.color ? subject.color + "33" : "#7C3AED33", color: subject.color ?? "#7C3AED" } : {}}>
                            {item ? `${item.weeklyHours}h` : "—"}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
