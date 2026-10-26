import { redirect } from "next/navigation";
import Link from "next/link";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import {
  Building2,
  LayoutDashboard,
  MailPlus,
  GraduationCap,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

export default async function PlataformaPage() {
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN") redirect("/escola/entrar");

  const [networks, pendingInvites] = await Promise.all([
    prismaEdu.eduNetwork.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { schools: true, memberships: true } },
      },
    }),
    prismaEdu.eduInvite.findMany({
      where: { acceptedAt: null },
      orderBy: { expiresAt: "asc" },
      take: 5,
      select: { id: true, name: true, email: true, role: true, expiresAt: true },
    }),
  ]);

  type Network = typeof networks[number];
  type PendingInvite = typeof pendingInvites[number];
  const activeNetworks = networks.filter((n: Network) => n.isActive);
  const implanting = networks.filter((n: Network) => !n.isActive);

  return (
    <div className="px-7 py-8 max-w-[1440px] mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <p className="text-sm text-[#5B5470] mb-1">Plataforma</p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[28px] font-extrabold text-gray-900 leading-tight">Visão geral</h1>
            <p className="text-[15px] text-[#5B5470] mt-1">Situação das redes atendidas.</p>
          </div>
          <Link
            href="/escola/plataforma/redes/nova"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shrink-0 min-h-[44px]"
          >
            <Building2 size={16} />
            Nova rede
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          icon={<Building2 size={20} className="text-indigo-600" />}
          label="Redes ativas"
          value={activeNetworks.length}
          bg="bg-indigo-50"
        />
        <KpiCard
          icon={<LayoutDashboard size={20} className="text-amber-600" />}
          label="Em implantação"
          value={implanting.length}
          bg="bg-amber-50"
        />
        <KpiCard
          icon={<MailPlus size={20} className="text-violet-600" />}
          label="Convites pendentes"
          value={pendingInvites.length}
          bg="bg-violet-50"
        />
        <KpiCard
          icon={<GraduationCap size={20} className="text-emerald-600" />}
          label="Redes cadastradas"
          value={networks.length}
          bg="bg-emerald-50"
        />
      </div>

      {/* Empty state */}
      {networks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-5">
            <Building2 size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-[20px] font-bold text-gray-900 mb-2">Nenhuma rede cadastrada ainda</h2>
          <p className="text-[#5B5470] text-[15px] max-w-md mb-6">
            Comece criando a primeira rede e convidando o gestor da Secretaria.
          </p>
          <Link
            href="/escola/plataforma/redes/nova"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
          >
            <Building2 size={16} />
            Criar primeira rede
          </Link>
        </div>
      )}

      {networks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attention panel */}
          {pendingInvites.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-[15px] font-semibold text-gray-800 mb-4">Precisa de atenção</h2>
              <div className="space-y-2">
                {pendingInvites.map((inv: PendingInvite) => {
                  const daysLeft = Math.ceil(
                    (new Date(inv.expiresAt).getTime() - Date.now()) / 86400000
                  );
                  const expiring = daysLeft <= 1;
                  return (
                    <div
                      key={inv.id}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        expiring ? "bg-amber-50 border border-amber-100" : "bg-gray-50"
                      }`}
                    >
                      <AlertTriangle
                        size={15}
                        className={`mt-0.5 shrink-0 ${expiring ? "text-amber-500" : "text-[#5B5470]"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-gray-700">
                          Convite para <strong>{inv.name}</strong>{" "}
                          {daysLeft <= 0
                            ? "expirou"
                            : daysLeft === 1
                            ? "vence amanhã"
                            : `vence em ${daysLeft} dias`}
                        </p>
                        <p className="text-[12px] text-[#5B5470]">{inv.email}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link
                href="/escola/plataforma/convites"
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-4"
              >
                Ver todos os convites
                <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Networks list */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-gray-800">Redes cadastradas</h2>
              <Link
                href="/escola/plataforma/redes"
                className="text-[13px] text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Ver todas
              </Link>
            </div>
            <div className="space-y-1">
              {networks.slice(0, 8).map((network: Network) => (
                <Link
                  key={network.id}
                  href={`/escola/plataforma/redes/${network.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-gray-800 group-hover:text-indigo-600 transition-colors truncate">
                      {network.name}
                    </div>
                    <div className="text-[12px] text-[#5B5470]">
                      {network.city}/{network.state} · {network._count.schools} escola
                      {network._count.schools !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <span
                    className={`text-[12px] px-2 py-0.5 rounded-full font-medium ml-3 shrink-0 ${
                      network.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {network.isActive ? "Ativa" : "Em implantação"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-white/60`}>
      <div className="mb-2">{icon}</div>
      <div className="text-[28px] font-extrabold text-gray-900 leading-none mb-1">{value}</div>
      <div className="text-[13px] text-[#5B5470] font-medium leading-tight">{label}</div>
    </div>
  );
}
