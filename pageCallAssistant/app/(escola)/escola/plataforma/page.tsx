/**
 * /escola/plataforma — visão geral para PLATFORM_ADMIN
 *
 * PLATFORM_ADMIN não tem banco tenant. Lemos os tenants pelo catalogDb,
 * não pelo prismaEdu (que exige setTenantDb e lançaria erro).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getEduContext } from "@/lib/escola/context";
import { catalogDb } from "@/lib/escola/catalogo";
import {
  Building2,
  LayoutDashboard,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

export default async function PlataformaPage() {
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN") redirect("/escola/entrar");

  let tenants: Array<{ id: string; name: string; kind: string; status: string; plan: string; createdAt: Date }> = [];
  let errorMsg: string | null = null;

  try {
    tenants = await catalogDb.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, kind: true, status: true, plan: true, createdAt: true },
    });
  } catch (err) {
    console.error("[/escola/plataforma]", (err as Error).message);
    errorMsg = "Não foi possível carregar a lista de redes.";
  }

  const ativas    = tenants.filter((t) => t.status === "ACTIVE");
  const migrando  = tenants.filter((t) => t.status === "MIGRATING");
  const suspensas = tenants.filter((t) => t.status === "SUSPENDED");

  return (
    <div className="px-7 py-8 max-w-[1440px] mx-auto">
      <div className="mb-8">
        <p className="text-sm text-[#5B5470] mb-1">Plataforma</p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[28px] font-extrabold text-[#1F1A2E] leading-tight">Visão geral</h1>
            <p className="text-[15px] text-[#5B5470] mt-1">Situação das redes atendidas.</p>
          </div>
          <Link
            href="/escola/plataforma/redes/nova"
            className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shrink-0 min-h-[44px]"
          >
            <Building2 size={16} />
            Nova rede
          </Link>
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-[#FEE2E2] bg-white p-8 text-center">
          <p className="font-semibold text-[#B91C1C]">{errorMsg}</p>
          <p className="text-sm text-[#5B5470] mt-1">Verifique o log do servidor para o erro completo.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard icon={<Building2 size={20} className="text-[#6D28D9]" />}  label="Redes ativas"     value={ativas.length}    bg="bg-[#EDE9FE]" />
            <KpiCard icon={<LayoutDashboard size={20} className="text-[#92400E]" />} label="Em migração" value={migrando.length}   bg="bg-[#FEF3C7]" />
            <KpiCard icon={<GraduationCap size={20} className="text-[#166534]" />}   label="Total redes"  value={tenants.length}   bg="bg-[#DCFCE7]" />
            <KpiCard icon={<Building2 size={20} className="text-[#B91C1C]" />}       label="Suspensas"    value={suspensas.length} bg="bg-[#FEE2E2]" />
          </div>

          {tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-[#EDE9FE] flex items-center justify-center mb-5">
                <Building2 size={32} className="text-[#6D28D9]" />
              </div>
              <h2 className="text-[20px] font-bold text-[#1F1A2E] mb-2">Nenhuma rede cadastrada ainda</h2>
              <p className="text-[#5B5470] text-[15px] max-w-md mb-6">
                Comece criando a primeira rede e convidando o gestor da Secretaria.
              </p>
              <Link
                href="/escola/plataforma/redes/nova"
                className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-3 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
              >
                <Building2 size={16} />
                Criar primeira rede
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E9E5F5] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-[#1F1A2E]">Redes cadastradas</h2>
                <Link href="/escola/plataforma/redes" className="text-[13px] text-[#6D28D9] hover:text-[#5B21B6] font-medium">
                  Ver todas
                </Link>
              </div>
              <div className="space-y-1">
                {tenants.slice(0, 10).map((t) => (
                  <Link
                    key={t.id}
                    href={`/escola/plataforma/redes/${t.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F8F7FC] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-[#1F1A2E] group-hover:text-[#6D28D9] transition-colors truncate">
                        {t.name}
                      </div>
                      <div className="text-[12px] text-[#5B5470]">{t.kind === "PUBLIC_NETWORK" ? "Rede pública" : "Escola privada"} · {t.plan}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[12px] px-2 py-0.5 rounded-full font-medium ${
                        t.status === "ACTIVE"    ? "bg-[#DCFCE7] text-[#166534]"
                        : t.status === "MIGRATING" ? "bg-[#FEF3C7] text-[#92400E]"
                        : "bg-[#FEE2E2] text-[#B91C1C]"
                      }`}>
                        {t.status === "ACTIVE" ? "Ativa" : t.status === "MIGRATING" ? "Em migração" : "Suspensa"}
                      </span>
                      <ArrowRight size={14} className="text-[#5B5470]" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number | string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-white/60`}>
      <div className="mb-2">{icon}</div>
      <div className="text-[28px] font-extrabold text-[#1F1A2E] leading-none mb-1">{value}</div>
      <div className="text-[13px] text-[#5B5470] font-medium leading-tight">{label}</div>
    </div>
  );
}
