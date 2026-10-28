"use client";
import { useEffect, useState } from "react";
import { Printer, QrCode, Key, Users } from "lucide-react";
import Link from "next/link";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";

interface ClassInfo {
  id: string;
  name: string;
  gradeYear: number;
  shift: string;
  _count: { enrollments: number };
}

const SHIFT_LABEL: Record<string, string> = {
  MORNING: "Manhã", AFTERNOON: "Tarde", EVENING: "Noite", FULL: "Integral",
};

export default function DirecaoCartoesPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true); setError(false);
    try {
      const r = await fetch("/api/escola/turmas");
      if (!r.ok) { setError(true); return; }
      const d = await r.json();
      setClasses(d.classes ?? []);
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Direção", href: "/escola/direcao" }, { label: "Cartões de acesso" }]}
        title="Cartões de acesso"
        subtitle="Imprima os cartões QR e as folhas de senhas por turma."
      />

      <div className="px-7 py-6 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="text-center py-16 text-[#5B5470]">Carregando…</div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-[#B91C1C] mb-3">Erro ao carregar turmas.</p>
            <button onClick={load} className="text-[#6D28D9] underline text-sm">Tentar de novo</button>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 text-[#5B5470]">
            <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-4">
              <QrCode size={26} className="text-[#6D28D9]" />
            </div>
            <p className="font-semibold text-[#1F1A2E]">Nenhuma turma cadastrada</p>
            <p className="text-sm mt-1">Vá em <Link href="/escola/direcao/turmas" className="text-[#6D28D9] underline">Turmas e alunos</Link> para cadastrar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[#5B5470] text-sm mb-4">
              Clique em <strong>Imprimir cartões</strong> para gerar o PDF com os QR codes da turma.
              Para entregar as senhas, clique em <strong>Folha de senhas</strong>.
            </p>
            {classes.map((c) => (
              <div key={c.id} className="bg-white border border-[#E9E5F5] rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[#1F1A2E] font-semibold">{c.name}</p>
                  <p className="text-[#5B5470] text-sm">{c.gradeYear}º · {SHIFT_LABEL[c.shift] ?? c.shift}</p>
                  <p className="text-[#5B5470] text-xs mt-0.5 flex items-center gap-1">
                    <Users size={12} /> {c._count.enrollments} aluno(s)
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Link
                    href={`/escola/professor/turmas/${c.id}/cartoes`}
                    className="flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] transition-colors"
                  >
                    <Printer size={14} /> Imprimir cartões
                  </Link>
                  <Link
                    href={`/escola/professor/turmas/${c.id}/cartoes`}
                    className="flex items-center gap-2 border border-[#DDD6EE] text-[#5B5470] hover:border-[#C4B5FD] hover:text-[#1F1A2E] px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] transition-colors"
                  >
                    <Key size={14} /> Folha de senhas
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
