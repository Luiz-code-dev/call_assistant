import { getEduContext } from "@/lib/escola/context";
import { redirect } from "next/navigation";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";

export default async function CoordPage() {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");
  if (!["COORDINATOR","NETWORK_ADMIN"].includes(ctx.role)) redirect("/escola/painel");

  const [planCounts, pendingCount] = await Promise.all([
    prismaEdu.eduTeachingPlan.groupBy({ by: ["status"], where: { networkId: ctx.networkId }, _count: true }),
    prismaEdu.eduGradeCorrection.count({ where: { networkId: ctx.networkId, status: "PENDING" } }),
  ]);

  const plansByStatus = Object.fromEntries(planCounts.map((p: { status: string; _count: number }) => [p.status, p._count]));

  const links = [
    { label: "Planos de Ensino", href: "/escola/coordenacao/planos", desc: "Criar e aprovar planos", icon: "📋", badge: null },
    { label: "Acompanhamento", href: "/escola/coordenacao/acompanhamento", desc: "% de conteúdo ministrado", icon: "📊", badge: null },
    { label: "Retificações", href: "/escola/coordenacao/retificacoes", desc: "Aprovar pedidos de correção", icon: "✏️", badge: pendingCount > 0 ? pendingCount : null },
    { label: "Auditoria", href: "/escola/coordenacao/auditoria", desc: "Trilha de ações", icon: "🔍", badge: null },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1F1A2E]">Coordenação Pedagógica</h1>
        <p className="text-[#5B5470] text-sm mt-1">Painel de acompanhamento</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Rascunho", value: plansByStatus["DRAFT"] ?? 0, color: "text-[#5B5470]" },
          { label: "Em análise", value: plansByStatus["IN_REVIEW"] ?? 0, color: "text-[#92400E]" },
          { label: "Aprovados", value: plansByStatus["APPROVED"] ?? 0, color: "text-[#166534]" },
          { label: "Retificações pendentes", value: pendingCount, color: "text-[#B91C1C]" },
        ].map(item => (
          <div key={item.label} className="bg-white border border-[#E9E5F5] rounded-xl p-4">
            <div className="text-[#5B5470] text-xs">{item.label}</div>
            <div className={`text-3xl font-bold mt-1 ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {links.map(l => (
          <Link key={l.href} href={l.href} className="relative bg-white border border-[#E9E5F5] rounded-xl p-4 hover:border-purple-700 transition-colors group">
            {l.badge !== null && <span className="absolute top-3 right-3 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{l.badge}</span>}
            <div className="text-2xl mb-2">{l.icon}</div>
            <div className="font-medium text-[#1F1A2E] group-hover:text-purple-400 transition-colors">{l.label}</div>
            <div className="text-[#5B5470] text-xs mt-1">{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
