import { getEduContext } from "@/lib/escola/context";
import { redirect } from "next/navigation";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import {
  School,
  GraduationCap,
  Users,
  CalendarRange,
  ArrowRight,
} from "lucide-react";

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

  const kpis = [
    { label: "Escolas", value: schools.length, href: "/escola/rede/escolas", icon: <School size={20} className="text-indigo-600" />, bg: "bg-indigo-50" },
    { label: "Alunos ativos", value: studentCount, href: "/escola/rede/alunos", icon: <GraduationCap size={20} className="text-emerald-600" />, bg: "bg-emerald-50" },
    { label: "Membros da equipe", value: memberCount, href: "/escola/rede/convites", icon: <Users size={20} className="text-violet-600" />, bg: "bg-violet-50" },
    { label: "Períodos no ano", value: currentYear?.terms?.length ?? 0, href: "/escola/rede/anos-letivos", icon: <CalendarRange size={20} className="text-amber-600" />, bg: "bg-amber-50" },
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

  const yearLabel = currentYear ? `Ano letivo ${currentYear.year}` : "Nenhum ano letivo ativo";

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Rede" }]}
        title={network?.name ?? "Visão geral"}
        subtitle={`${network?.city ?? ""}, ${network?.state ?? ""} — ${yearLabel}`}
      />

      <div className="px-7 py-6 max-w-[1440px] mx-auto w-full">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi) => (
            <Link
              key={kpi.href}
              href={kpi.href}
              className={`${kpi.bg} rounded-xl p-4 border border-white/60 hover:shadow-sm transition-shadow group`}
            >
              <div className="mb-2">{kpi.icon}</div>
              <div className="text-[28px] font-extrabold text-gray-900 leading-none mb-1">{kpi.value}</div>
              <div className="text-[13px] text-gray-600 font-medium flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                {kpi.label}
                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>

        {/* Quick links */}
        <h2 className="text-[16px] font-semibold text-gray-800 mb-4">Gestão da Rede</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {quickLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
            >
              <div className="text-[14px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors mb-1">
                {l.label}
              </div>
              <div className="text-[12px] text-gray-500">{l.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
