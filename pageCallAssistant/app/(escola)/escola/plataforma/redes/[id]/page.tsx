import { redirect } from "next/navigation";
import Link from "next/link";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import { School, Users, Mail } from "lucide-react";

export default async function PlataformaRedeDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN") redirect("/escola/entrar");

  const { id } = await params;

  const network = await prismaEdu.eduNetwork.findUnique({
    where: { id },
    include: {
      schools: { orderBy: { name: "asc" }, select: { id: true, name: true, inepCode: true } },
      memberships: {
        where: { isActive: true },
        select: { id: true, role: true, user: { select: { name: true, email: true } } },
        take: 20,
      },
      _count: { select: { memberships: true, schools: true } },
    },
  });

  if (!network) redirect("/escola/plataforma/redes");

  const pendingInvites = await prismaEdu.eduInvite.count({
    where: { networkId: id, acceptedAt: null },
  });

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[
          { label: "Plataforma", href: "/escola/plataforma" },
          { label: "Redes", href: "/escola/plataforma/redes" },
          { label: network.name },
        ]}
        title={network.name}
        subtitle={`${network.city}, ${network.state}${!network.isActive ? " · Inativa" : ""}`}
        action={
          <Link
            href="/escola/plataforma/convites"
            className="inline-flex items-center gap-2 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
          >
            <Mail size={15} />
            Convidar gestor
          </Link>
        }
      />

      <div className="px-7 py-6 space-y-6 max-w-[1440px] mx-auto w-full">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Escolas", value: network._count.schools, icon: <School size={18} className="text-indigo-600" />, bg: "bg-indigo-50" },
            { label: "Membros ativos", value: network._count.memberships, icon: <Users size={18} className="text-violet-600" />, bg: "bg-violet-50" },
            { label: "Convites pendentes", value: pendingInvites, icon: <Mail size={18} className="text-amber-600" />, bg: "bg-amber-50" },
          ].map((k) => (
            <div key={k.label} className={`${k.bg} rounded-xl p-4 border border-white/60`}>
              <div className="mb-1">{k.icon}</div>
              <div className="text-[26px] font-extrabold text-gray-900 leading-none">{k.value}</div>
              <div className="text-[12px] text-[#5B5470] mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Schools list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-gray-700">Escolas</h2>
            <span className="text-[12px] text-[#5B5470]">{network.schools.length} escola{network.schools.length !== 1 ? "s" : ""}</span>
          </div>
          {network.schools.length === 0 ? (
            <div className="px-5 py-8 text-center text-[14px] text-[#5B5470]">Nenhuma escola cadastrada nesta rede.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {network.schools.map((s: typeof network.schools[number]) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-[14px] text-gray-800">{s.name}</span>
                  {s.inepCode && <span className="text-[12px] text-[#5B5470] font-mono">{s.inepCode}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-gray-700">Equipe da rede</h2>
            <span className="text-[12px] text-[#5B5470]">{network._count.memberships} membro{network._count.memberships !== 1 ? "s" : ""}</span>
          </div>
          {network.memberships.length === 0 ? (
            <div className="px-5 py-8 text-center text-[14px] text-[#5B5470]">Nenhum membro ativo. Envie um convite para o gestor.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {network.memberships.map((m: typeof network.memberships[number]) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-[14px] font-medium text-gray-800">{m.user.name}</div>
                    <div className="text-[12px] text-[#5B5470]">{m.user.email}</div>
                  </div>
                  <span className="text-[12px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">{m.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
