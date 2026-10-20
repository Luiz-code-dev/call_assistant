import { getEduContext } from "@/lib/escola/context";
import { redirect } from "next/navigation";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";

export default async function RedePage() {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");
  if (ctx.role !== "NETWORK_ADMIN") redirect("/escola/painel");

  const [schools, currentYear] = await Promise.all([
    prismaEdu.eduSchool.findMany({ where: { networkId: ctx.networkId }, orderBy: { name: "asc" } }),
    prismaEdu.eduSchoolYear.findFirst({ where: { networkId: ctx.networkId, isCurrent: true }, include: { terms: true } }),
  ]);

  const [studentCount, memberCount] = await Promise.all([
    prismaEdu.eduStudent.count({ where: { networkId: ctx.networkId, isActive: true } }),
    prismaEdu.eduMembership.count({ where: { networkId: ctx.networkId, isActive: true } }),
  ]);

  const network = await prismaEdu.eduNetwork.findUnique({ where: { id: ctx.networkId } });

  const cards = [
    { label: "Escolas", value: schools.length, href: "/escola/rede/escolas", icon: "🏫" },
    { label: "Alunos ativos", value: studentCount, href: "/escola/rede/alunos", icon: "🎓" },
    { label: "Membros da equipe", value: memberCount, href: "/escola/rede/vinculos", icon: "👤" },
    { label: "Períodos", value: currentYear?.terms?.length ?? 0, href: "/escola/rede/anos-letivos", icon: "📅" },
  ];

  const quickLinks = [
    { label: "Gerenciar Escolas", href: "/escola/rede/escolas", desc: "CRUD de escolas e código INEP" },
    { label: "Anos Letivos & Períodos", href: "/escola/rede/anos-letivos", desc: "Configurar bimestres e datas" },
    { label: "Componentes Curriculares", href: "/escola/rede/componentes", desc: "Catálogo de disciplinas" },
    { label: "Matriz Curricular", href: "/escola/rede/matriz", desc: "Componentes por etapa/série/turno" },
    { label: "Turmas", href: "/escola/rede/turmas", desc: "Gerenciar turmas de todas as escolas" },
    { label: "Alunos", href: "/escola/rede/alunos", desc: "Cadastro e enturmação" },
    { label: "Vínculos de Equipe", href: "/escola/rede/vinculos", desc: "Gestores, coordenadores, diretores" },
    { label: "Auditoria", href: "/escola/rede/auditoria", desc: "Trilha de ações da rede" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{network?.name}</h1>
        <p className="text-gray-400 text-sm mt-1">
          {network?.city}, {network?.state}
          {currentYear ? ` — Ano letivo ${currentYear.year}` : " — Nenhum ano letivo ativo"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-purple-700 transition-colors"
          >
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="text-xs text-gray-400">{c.label}</div>
            <div className="text-2xl font-bold text-white mt-1">{c.value}</div>
          </Link>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-white mb-4">Gestão da Rede</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {quickLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-purple-700 transition-colors group"
          >
            <div className="font-medium text-white group-hover:text-purple-400 transition-colors">{l.label}</div>
            <div className="text-gray-500 text-xs mt-1">{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
