import { redirect } from "next/navigation";
import Link from "next/link";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import { Building2, Plus, ExternalLink } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  implanting: "Em implantação",
  suspended: "Suspensa",
};

const STATUS_CLASS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  implanting: "bg-amber-50 text-amber-700",
  suspended: "bg-red-50 text-red-700",
};

export default async function PlataformaRedesPage() {
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN") redirect("/escola/entrar");

  const networks = await prismaEdu.eduNetwork.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          schools: true,
          memberships: true,
        },
      },
    },
  });

  type NetworkRow = (typeof networks)[number];

  function getStatus(n: NetworkRow): string {
    if (!n.isActive) return "suspended";
    return "active";
  }

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Plataforma", href: "/escola/plataforma" }, { label: "Redes" }]}
        title="Redes de ensino"
        subtitle={`${networks.length} rede${networks.length !== 1 ? "s" : ""} cadastrada${networks.length !== 1 ? "s" : ""}`}
        action={
          <Link
            href="/escola/plataforma/redes/nova"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
          >
            <Plus size={16} />
            Nova rede
          </Link>
        }
      />

      <div className="flex-1 px-7 py-6">
        {networks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-5">
              <Building2 size={32} className="text-indigo-400" />
            </div>
            <h2 className="text-[20px] font-bold text-gray-900 mb-2">
              Nenhuma rede cadastrada
            </h2>
            <p className="text-[#5B5470] text-[15px] max-w-md mb-6">
              Comece criando a primeira rede e convidando o gestor da Secretaria.
            </p>
            <Link
              href="/escola/plataforma/redes/nova"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            >
              <Plus size={16} />
              Criar primeira rede
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_140px_120px_80px_80px_100px] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-[12px] font-semibold text-[#5B5470] uppercase tracking-wide">Rede</span>
              <span className="text-[12px] font-semibold text-[#5B5470] uppercase tracking-wide">Situação</span>
              <span className="text-[12px] font-semibold text-[#5B5470] uppercase tracking-wide">Município/UF</span>
              <span className="text-[12px] font-semibold text-[#5B5470] uppercase tracking-wide text-right">Escolas</span>
              <span className="text-[12px] font-semibold text-[#5B5470] uppercase tracking-wide text-right">Membros</span>
              <span className="text-[12px] font-semibold text-[#5B5470] uppercase tracking-wide"></span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100">
              {networks.map((network: NetworkRow) => {
                const status = getStatus(network);
                return (
                  <div
                    key={network.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px_80px_80px_100px] gap-2 md:gap-4 px-5 py-4 hover:bg-gray-50 transition-colors items-center"
                  >
                    {/* Name */}
                    <div>
                      <Link
                        href={`/escola/plataforma/redes/${network.id}`}
                        className="text-[14px] font-semibold text-gray-800 hover:text-indigo-600 transition-colors"
                      >
                        {network.name}
                      </Link>
                      <div className="text-[12px] text-[#5B5470] mt-0.5 md:hidden">
                        {network.city}/{network.state} · {network._count.schools} escola
                        {network._count.schools !== 1 ? "s" : ""} · {network._count.memberships} membro
                        {network._count.memberships !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex md:block">
                      <span
                        className={`inline-flex text-[12px] px-2.5 py-1 rounded-full font-medium ${STATUS_CLASS[status]}`}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </div>

                    {/* City/State */}
                    <div className="hidden md:block text-[13px] text-[#5B5470]">
                      {network.city}/{network.state}
                    </div>

                    {/* Schools count */}
                    <div className="hidden md:block text-[14px] font-medium text-gray-700 text-right">
                      {network._count.schools}
                    </div>

                    {/* Members count */}
                    <div className="hidden md:block text-[14px] font-medium text-gray-700 text-right">
                      {network._count.memberships}
                    </div>

                    {/* Action */}
                    <div className="flex justify-end">
                      <Link
                        href={`/escola/plataforma/redes/${network.id}`}
                        className="inline-flex items-center gap-1.5 text-[13px] text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors min-h-[36px]"
                      >
                        <ExternalLink size={13} />
                        Abrir
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
