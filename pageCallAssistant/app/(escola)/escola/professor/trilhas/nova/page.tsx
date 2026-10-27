"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NovaTrilhaPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [gradeYear, setGradeYear] = useState(6);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  async function criar() {
    if (!title.trim()) { setErro("Informe o título da trilha."); return; }
    setSaving(true);
    setErro("");
    const r = await fetch("/api/escola/trilhas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), gradeYear }),
    });
    if (r.ok) {
      const d = await r.json();
      router.push(`/escola/professor/trilhas/${d.id ?? ""}`);
    } else {
      const d = await r.json().catch(() => ({}));
      setErro(d.error ?? "Erro ao criar trilha. Tente novamente.");
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-lg mx-auto">
      <div className="mb-4">
        <Link href="/escola/professor/trilhas" className="text-[#5B5470] hover:text-[#3F3A4F] text-sm transition-colors">← Trilhas</Link>
      </div>

      <h1 className="text-2xl font-bold text-[#1F1A2E] mb-6">Nova trilha de reforço</h1>

      <div className="bg-white border border-[#E9E5F5] rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Título da trilha</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex.: Frações — 6º Ano"
            className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-[#1F1A2E] text-sm outline-none focus:border-[#6D28D9] transition-colors min-h-[44px] bg-white"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1F1A2E] mb-1.5">Ano / série</label>
          <select
            value={gradeYear}
            onChange={e => setGradeYear(Number(e.target.value))}
            className="w-full border border-[#DDD6EE] rounded-lg px-3 py-2.5 text-[#1F1A2E] text-sm outline-none focus:border-[#6D28D9] transition-colors min-h-[44px] bg-white"
            disabled={saving}
          >
            {[1,2,3,4,5,6,7,8,9].map(y => (
              <option key={y} value={y}>{y}º ano</option>
            ))}
          </select>
        </div>

        {erro && <p className="text-[#B91C1C] text-sm">{erro}</p>}

        <div className="flex gap-3 pt-1">
          <Link
            href="/escola/professor/trilhas"
            className="flex-1 text-center border border-[#DDD6EE] text-[#5B5470] hover:text-[#1F1A2E] py-2.5 rounded-lg text-sm transition-colors min-h-[44px] flex items-center justify-center"
          >
            Cancelar
          </Link>
          <button
            onClick={criar}
            disabled={saving || !title.trim()}
            className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            {saving ? "Criando…" : "Criar trilha"}
          </button>
        </div>
      </div>

      <p className="text-[#5B5470] text-xs mt-4 text-center">
        Depois de criar, adicione atividades e publique para os alunos.
      </p>
    </div>
  );
}
