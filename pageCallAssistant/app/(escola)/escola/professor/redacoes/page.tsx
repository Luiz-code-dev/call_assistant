"use client";
/** Professor: propostas de redação das suas turmas e criação de uma nova. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { FilePen, Plus, X } from "lucide-react";

type Turma = { id: string; name: string; gradeYear: number; schoolName: string };
type Proposta = { id: string; titulo: string; genero: string; aberta: boolean; prazo: string | null; turma: string; escola: string; alunos: number; enviadas: number; paraRevisar: number };
type Genero = { id: string; nome: string };

const CAMPO = "w-full rounded-xl border border-[#DDD6EE] focus:border-[#6D28D9] outline-none px-3 py-2.5 text-sm text-[#1F1A2E] bg-white";

export default function RedacoesProfessorPage() {
  const [dados, setDados] = useState<{ propostas: Proposta[]; turmas: Turma[]; generos: Genero[] } | null>(null);
  const [erro, setErro] = useState("");
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ classId: "", titulo: "", genero: "DISSERTATIVO", enunciado: "", minPalavras: 80, maxPalavras: 350, maxVersoes: 2, prazo: "" });

  function carregar() {
    fetch("/api/escola/professor/redacoes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { setDados(d); setForm((f) => ({ ...f, classId: f.classId || d.turmas?.[0]?.id || "" })); })
      .catch(() => setErro("Não foi possível carregar as redações."));
  }
  useEffect(carregar, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true); setErro("");
    try {
      const r = await fetch("/api/escola/professor/redacoes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, prazo: form.prazo ? new Date(`${form.prazo}T23:59:00`).toISOString() : null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.error ?? "Não foi possível criar a proposta."); return; }
      setCriando(false);
      setForm((f) => ({ ...f, titulo: "", enunciado: "", prazo: "" }));
      carregar();
    } finally { setSalvando(false); }
  }

  return (
    <div className="px-4 sm:px-7 py-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <FilePen className="text-[#6D28D9]" size={22} />
          <h1 className="text-[#1F1A2E] font-bold text-2xl">Redações</h1>
        </div>
        <button type="button" onClick={() => setCriando((v) => !v)} className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">
          {criando ? <><X size={15} />Fechar</> : <><Plus size={15} />Nova proposta</>}
        </button>
      </div>
      <p className="text-sm text-[#5B5470] mb-6">O aluno escreve o texto inteiro e o Flow devolve perguntas parágrafo por parágrafo, sem reescrever nada e sem nota. Você revisa, comenta e o aluno reescreve.</p>

      {erro && <p className="text-[#B91C1C] text-sm mb-4">{erro}</p>}

      {criando && dados && (
        <form onSubmit={criar} className="bg-white border border-[#E9E5F5] rounded-2xl p-5 mb-6 grid gap-4 sm:grid-cols-2">
          {dados.turmas.length === 0 ? (
            <p className="sm:col-span-2 text-sm text-[#5B5470]">Você ainda não tem turmas vinculadas.</p>
          ) : (
            <>
              <label className="text-sm font-semibold text-[#1F1A2E] space-y-1">Turma
                <select className={CAMPO} value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required>
                  {dados.turmas.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.gradeYear}º ano{t.schoolName ? ` · ${t.schoolName}` : ""}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#1F1A2E] space-y-1">Gênero do texto
                <select className={CAMPO} value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value })}>
                  {dados.generos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              </label>
              <label className="sm:col-span-2 text-sm font-semibold text-[#1F1A2E] space-y-1">Título
                <input className={CAMPO} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} maxLength={160} required placeholder="Ex.: O esporte na escola" />
              </label>
              <label className="sm:col-span-2 text-sm font-semibold text-[#1F1A2E] space-y-1">Enunciado para o aluno
                <textarea className={CAMPO} rows={5} value={form.enunciado} onChange={(e) => setForm({ ...form, enunciado: e.target.value })} maxLength={3000} required
                  placeholder="Ex.: Escreva um texto dando a sua opinião: a escola deveria ter mais aulas de esporte? Explique os seus motivos com exemplos." />
              </label>
              <label className="text-sm font-semibold text-[#1F1A2E] space-y-1">Mínimo de palavras
                <input type="number" className={CAMPO} min={10} max={1000} value={form.minPalavras} onChange={(e) => setForm({ ...form, minPalavras: Number(e.target.value) })} />
              </label>
              <label className="text-sm font-semibold text-[#1F1A2E] space-y-1">Máximo de palavras
                <input type="number" className={CAMPO} min={20} max={1500} value={form.maxPalavras} onChange={(e) => setForm({ ...form, maxPalavras: Number(e.target.value) })} />
              </label>
              <label className="text-sm font-semibold text-[#1F1A2E] space-y-1">Versões por aluno (com reescritas)
                <select className={CAMPO} value={form.maxVersoes} onChange={(e) => setForm({ ...form, maxVersoes: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#1F1A2E] space-y-1">Prazo (opcional)
                <input type="date" className={CAMPO} value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" disabled={salvando} className="bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-60">
                  {salvando ? "Criando..." : "Abrir para a turma"}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {!dados ? <p className="text-[#5B5470] text-center py-8">Carregando...</p> : dados.propostas.length === 0 ? (
        <div className="text-center py-16">
          <FilePen className="mx-auto text-[#DDD6EE] mb-3" size={40} />
          <p className="text-[#5B5470]">Nenhuma proposta de redação ainda.</p>
          <p className="text-[#5B5470] text-sm mt-1">Use &ldquo;Nova proposta&rdquo; para abrir uma para a turma.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dados.propostas.map((p) => (
            <Link key={p.id} href={`/escola/professor/redacoes/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E9E5F5] hover:border-[#C4B5FD] rounded-xl px-4 py-3">
              <div className="min-w-0">
                <p className="text-[#1F1A2E] font-semibold text-sm">{p.titulo}</p>
                <p className="text-[#5B5470] text-xs">{p.turma}{p.escola ? ` · ${p.escola}` : ""}{p.prazo ? ` · até ${new Date(p.prazo).toLocaleDateString("pt-BR")}` : ""}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-[#F5F3FF] text-[#5B21B6] px-2.5 py-1 font-semibold">{p.enviadas} de {p.alunos} enviaram</span>
                {p.paraRevisar > 0 && <span className="rounded-full bg-[#FEF3C7] text-[#92400E] px-2.5 py-1 font-semibold">{p.paraRevisar} para revisar</span>}
                {!p.aberta && <span className="rounded-full bg-[#F3F4F6] text-[#4B5563] px-2.5 py-1 font-semibold">Encerrada</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
