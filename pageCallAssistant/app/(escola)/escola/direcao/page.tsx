import { getEduContext } from "@/lib/escola/context";
import { redirect } from "next/navigation";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";

export default async function DirecaoPage() {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");
  if (!["SCHOOL_ADMIN","NETWORK_ADMIN"].includes(ctx.role)) redirect("/escola/painel");

  const schoolId = ctx.schoolId;
  const where = schoolId ? { networkId: ctx.networkId, schoolId } : { networkId: ctx.networkId };

  const [classCount, studentCount, school] = await Promise.all([
    prismaEdu.eduClass.count({ where: { ...where, isActive: true } }),
    prismaEdu.eduStudent.count({ where: { networkId: ctx.networkId, isActive: true } }),
    schoolId ? prismaEdu.eduSchool.findUnique({ where: { id: schoolId } }) : null,
  ]);

  const recentClasses = await prismaEdu.eduClass.findMany({
    where: { ...where, isActive: true },
    include: { schoolYear: { select: { year: true } }, _count: { select: { enrollments: true } } },
    orderBy: { schoolYear: { year: "desc" } },
    take: 5,
  });

  const links = [
    { label: "Turmas", href: "/escola/direcao/turmas", desc: "Criar e gerenciar turmas", icon: "👥" },
    { label: "Alunos", href: "/escola/direcao/alunos", desc: "Cadastro, enturmação e importação", icon: "🎓" },
    { label: "Cartões de Acesso", href: "/escola/direcao/cartoes", desc: "Gerar e imprimir cartões", icon: "🪪" },
    { label: "Retificações", href: "/escola/direcao/retificacoes", desc: "Aprovar ou rejeitar pedidos", icon: "✏️" },
    { label: "Auditoria", href: "/escola/direcao/auditoria", desc: "Trilha de ações", icon: "🔍" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{school?.name ?? "Direção Escolar"}</h1>
        <p className="text-gray-400 text-sm mt-1">Painel da direção</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">Turmas ativas</div>
          <div className="text-3xl font-bold text-white mt-1">{classCount}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">Alunos ativos</div>
          <div className="text-3xl font-bold text-white mt-1">{studentCount}</div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-4">Ações rápidas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {links.map(l => (
          <Link key={l.href} href={l.href} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-purple-700 transition-colors group">
            <div className="text-2xl mb-2">{l.icon}</div>
            <div className="font-medium text-white group-hover:text-purple-400 transition-colors">{l.label}</div>
            <div className="text-gray-500 text-xs mt-1">{l.desc}</div>
          </Link>
        ))}
      </div>

      {recentClasses.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-white mb-4">Turmas recentes</h2>
          <div className="space-y-2">
            {recentClasses.map((c: { id: string; name: string; schoolYear: { year: number }; _count: { enrollments: number } }) => (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="text-white font-medium">{c.name}</div>
                <div className="text-gray-500 text-sm">{c.schoolYear?.year} · {c._count?.enrollments} alunos</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
