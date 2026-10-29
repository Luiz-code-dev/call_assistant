import { getEduContext } from "@/lib/escola/context";
import { redirect } from "next/navigation";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";
import { ClipboardList, Route, Target, School } from "lucide-react";

export default async function CoordPage() {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");
  if (!["COORDINATOR","NETWORK_ADMIN"].includes(ctx.role)) redirect("/escola/painel");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = prismaEdu as any;

  let diagAbertos = 0, trilhasPendentes = 0;
  try { diagAbertos = await P.eduDiagnostic.count({ where: { networkId: ctx.networkId, status: "OPEN" } }); } catch (e) { console.error("[coordenacao] diagAbertos", e); }
  try { trilhasPendentes = await P.eduTrack.count({ where: { networkId: ctx.networkId, status: "SUBMITTED" } }); } catch (e) { console.error("[coordenacao] trilhasPendentes", e); }

  const cards = [
    {
      label: "Diagnósticos abertos",
      value: diagAbertos,
      desc: "Aguardando resposta dos alunos",
      href: "/escola/coordenacao/diagnosticos",
      icon: <ClipboardList size={22} className="text-[#6D28D9]" />,
      bg: "bg-[#EDE9FE]",
      alert: false,
    },
    {
      label: "Trilhas para aprovar",
      value: trilhasPendentes,
      desc: "Propostas de professores",
      href: "/escola/coordenacao/trilhas",
      icon: <Route size={22} className="text-[#BE185D]" />,
      bg: "bg-[#FCE7F3]",
      alert: trilhasPendentes > 0,
    },
  ];

  const links = [
    { label: "Novo diagnóstico", href: "/escola/coordenacao/diagnosticos/novo", icon: <ClipboardList size={16} />, desc: "Criar diagnóstico BNCC" },
    { label: "Trilhas", href: "/escola/coordenacao/trilhas", icon: <Route size={16} />, desc: "Biblioteca de trilhas" },
    { label: "Habilidades prioritárias", href: "/escola/coordenacao/habilidades", icon: <Target size={16} />, desc: "Ver por ano e componente" },
    { label: "Escolas e turmas", href: "/escola/coordenacao/escolas", icon: <School size={16} />, desc: "Participação por turma" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1F1A2E]">Coordenação Pedagógica</h1>
        <p className="text-[#5B5470] text-sm mt-1">Acompanhe diagnósticos, trilhas e habilidades da rede.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}
            className={`bg-white border ${c.alert ? "border-[#6D28D9]" : "border-[#E9E5F5]"} rounded-2xl p-5 hover:border-[#C4B5FD] transition-colors group`}>
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>{c.icon}</div>
            <div className="text-[32px] font-extrabold text-[#1F1A2E] leading-none">{c.value}</div>
            <div className="text-[#1F1A2E] text-sm font-semibold mt-1 group-hover:text-[#6D28D9] transition-colors">{c.label}</div>
            <div className="text-[#5B5470] text-xs mt-0.5">{c.desc}</div>
          </Link>
        ))}
      </div>

      {/* Ações rápidas */}
      <h2 className="text-[#1F1A2E] font-semibold text-sm mb-3">Ações rápidas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href}
            className="bg-white border border-[#E9E5F5] rounded-xl p-4 hover:border-[#C4B5FD] transition-colors group flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] flex items-center justify-center text-[#6D28D9] group-hover:bg-[#6D28D9] group-hover:text-white transition-colors">
              {l.icon}
            </div>
            <div className="font-medium text-[#1F1A2E] text-sm group-hover:text-[#6D28D9] transition-colors">{l.label}</div>
            <div className="text-[#5B5470] text-xs">{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
