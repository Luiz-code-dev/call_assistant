"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";

const SUBJECTS = [
  { code: "MA", label: "Matemática" },
  { code: "LP", label: "Língua Portuguesa" },
  { code: "CN", label: "Ciências" },
  { code: "HI", label: "História" },
  { code: "GE", label: "Geografia" },
];
const GRADES = [1,2,3,4,5,6,7,8,9];

export default function GerarPage() {
  const [subjectCode, setSubjectCode] = useState("MA");
  const [gradeYear, setGradeYear] = useState(6);
  const [skillCodesRaw, setSkillCodesRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ generated: {skillCode:string;activityId:string}[]; errors: {skillCode:string;error:string}[]; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    const skillCodes = skillCodesRaw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (!skillCodes.length) { setError("Informe pelo menos um código de habilidade."); return; }
    if (skillCodes.length > 10) { setError("Máximo 10 habilidades por lote."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/escola/plataforma/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillCodes, subjectCode, gradeYear }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar");
      setResult(data);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-4"><Link href="/escola/plataforma/conteudo" className="text-[#5B5470] text-sm hover:text-[#6D28D9]">← Estúdio de Conteúdo</Link></div>
      <h1 className="text-2xl font-bold text-[#1F1A2E] mb-1">Gerar conteúdo com IA</h1>
      <p className="text-[#5B5470] text-sm mb-6">O conteúdo gerado sempre entra como rascunho na fila de revisão antes de ser publicado.</p>

      <div className="bg-white rounded-xl border border-[#E9E5F5] p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[#1F1A2E] block mb-1">Componente</label>
            <select value={subjectCode} onChange={e => setSubjectCode(e.target.value)}
              className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2 text-sm text-[#1F1A2E]">
              {SUBJECTS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[#1F1A2E] block mb-1">Ano</label>
            <select value={gradeYear} onChange={e => setGradeYear(Number(e.target.value))}
              className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2 text-sm text-[#1F1A2E]">
              {GRADES.map(g => <option key={g} value={g}>{g}º ano</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-[#1F1A2E] block mb-1">Códigos de habilidade (um por linha ou separados por vírgula)</label>
          <textarea value={skillCodesRaw} onChange={e => setSkillCodesRaw(e.target.value)}
            rows={4} placeholder={"EF06MA07\nEF06MA08\nEF06MA09"}
            className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2 text-sm font-mono text-[#1F1A2E] resize-none" />
          <p className="text-xs text-[#5B5470] mt-1">Máximo 10 habilidades por lote. Cada habilidade gera 1 atividade de quiz.</p>
        </div>
        {error && <div className="text-sm text-[#B91C1C] bg-[#FEE2E2] rounded-lg p-3">{error}</div>}
        <button onClick={handleGenerate} disabled={loading}
          className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? "Gerando..." : "Gerar com IA"}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium text-[#166534]">{result.message}</p>
          {result.generated.map(g => (
            <div key={g.activityId} className="bg-[#DCFCE7] border border-green-200 rounded-lg px-4 py-2 text-sm text-[#166534]">
              {g.skillCode} — atividade criada e enviada para revisão
            </div>
          ))}
          {result.errors.map(e => (
            <div key={e.skillCode} className="bg-[#FEE2E2] border border-red-200 rounded-lg px-4 py-2 text-sm text-[#B91C1C]">
              {e.skillCode}: {e.error}
            </div>
          ))}
          {result.generated.length > 0 && (
            <Link href="/escola/plataforma/conteudo/revisar"
              className="inline-block mt-2 text-sm text-[#6D28D9] hover:text-[#5B21B6] font-medium">
              Ver na fila de revisão →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
