import { getEduContext } from "@/lib/escola/context";
import { redirect } from "next/navigation";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";
import { Users, CreditCard, ClipboardList, Search, UserCheck } from "lucide-react";

export default async function DirecaoPage() {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");
  if (!["SCHOOL_ADMIN","NETWORK_ADMIN"].includes(ctx.role)) redirect("/escola/painel");

  const schoolId = ctx.schoolId;
  const where = schoolId ? { networkId: ctx.networkId, schoolId } : { networkId: ctx.networkId };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = prismaEdu as any;

  const [classCount, school] = await Promise.all([
    P.eduClass.count({ where: { ...where, isActive: true } }),
    schoolId ? P.eduSchool.findUnique({ where: { id: schoolId } }) : null,
  ]);

  // Alunos matriculados na escola (via turmas)
  const classIds: string[] = (await P.eduClass.findMany({
    where: { ...where, isActive: true }, select: { id: true },
  })).map((c: { id: string }) => c.id);

  const studentCount: number = classIds.length
    ? await P.eduEnrollment.count({ where: { classId: { in: classIds }, status: "ACTIVE" } })
    : 0;

  // Famílias vinculadas — conta alunos distintos com pelo menos 1 vínculo ativo nesta escola
  const comAcesso: number = classIds.length
    ? await P.eduEnrollment.count({
        where: {
          classId: { in: classIds },
          status: "ACTIVE",
          student: { guardianLinks: { some: { isActive: true } } },
        },
      }).catch(() => 0)
    : 0;

  const links = [
    { label: "Turmas e alunos", href: "/escola/direcao/turmas", icon: <Users size={20} className="text-[#6D28D9]" />, bg: "bg-[#EDE9FE]", desc: "Turmas, alunos, PINs e cartões" },
    { label: "Famílias", href: "/escola/direcao/familias", icon: <UserCheck size={20} className="text-[#BE185D]" />, bg: "bg-[#FCE7F3]", desc: "Responsáveis, convites e vínculos" },
    { label: "Cartões de acesso", href: "/escola/direcao/cartoes", icon: <CreditCard size={20} className="text-[#1D4ED8]" />, bg: "bg-[#DBEAFE]", desc: "Imprimir cartões e senhas" },
    { label: "Atribuições", href: "/escola/direcao/atribuicoes", icon: <ClipboardList size={20} className="text-[#0F766E]" />, bg: "bg-[#CCFBF1]", desc: "Professores por componente" },
    { label: "Auditoria", href: "/escola/direcao/auditoria", icon: <Search size={20} className="text-[#92400E]" />, bg: "bg-[#FEF3C7]", desc: "Trilha de ações da escola" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1F1A2E]">{school?.name ?? "Direção Escolar"}</h1>
        <p className="text-[#5B5470] text-sm mt-1">Painel de gestão da escola</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-4">
          <div className="text-[#5B5470] text-xs mb-1">Turmas ativas</div>
          <div className="text-3xl font-bold text-[#1F1A2E]">{classCount}</div>
        </div>
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-4">
          <div className="text-[#5B5470] text-xs mb-1">Alunos matriculados</div>
          <div className="text-3xl font-bold text-[#1F1A2E]">{studentCount}</div>
        </div>
        <div className="bg-white border border-[#E9E5F5] rounded-2xl p-4">
          <div className="text-[#5B5470] text-xs mb-1">Com família vinculada</div>
          <div className="text-3xl font-bold text-[#1F1A2E]">{comAcesso}</div>
        </div>
      </div>

      {/* Ações rápidas */}
      <h2 className="text-[#1F1A2E] font-semibold text-sm mb-3">Acesso rápido</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className="bg-white border border-[#E9E5F5] rounded-2xl p-4 hover:border-[#C4B5FD] transition-colors group flex flex-col gap-2">
            <div className={`w-10 h-10 rounded-xl ${l.bg} flex items-center justify-center`}>{l.icon}</div>
            <div className="font-semibold text-[#1F1A2E] text-sm group-hover:text-[#6D28D9] transition-colors">{l.label}</div>
            <div className="text-[#5B5470] text-xs">{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
