/**
 * /escola/plataforma/redes — lista de redes para PLATFORM_ADMIN
 *
 * Usa catalogDb.tenant (não prismaEdu.eduNetwork) porque PLATFORM_ADMIN
 * não tem banco tenant e prismaEdu lançaria erro.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getEduContext } from "@/lib/escola/context";
import { catalogDb } from "@/lib/escola/catalogo";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import { Building2, Plus, ExternalLink } from "lucide-react";

export default async function PlataformaRedesPage() {
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN") redirect("/escola/entrar");

  let tenants: Array<{ id: string; name: string; kind: string; status: string; plan: string; createdAt: Date }> = [];
  let errorMsg: string | null = null;

  try {
    tenants = await catalogDb.tenant.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true, status: true, plan: true, createdAt: true },
    });
  } catch (err) {
    console.error("[/escola/plataforma/redes]", (err as Error).message);
    errorMsg = "Não foi possível carregar a lista de redes. Veja o log do servidor.";
  }

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[{ label: "Plataforma", href: "/escola/plataforma" }, { label: "Redes" }]}
        title="Redes de ensino"
        subtitle={errorMsg ? "Erro ao carregar" : `${tenants.length} rede${tenants.length !== 1 ? "s" : ""} cadastrada${tenants.length !== 1 ? "s" : ""}`}
        action={
          <Link
            href="/escola/plataforma/redes/nova"
            className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
          >
            <Plus size={16} />
            Nova rede
          </Link>
        }
      />

      <div className="flex-1 px-7 py-6">
        {errorMsg ? (
          <div className="rounded-xl border border-[#FEE2E2] bg-white p-8 text-center">
            <p className="font-semibold text-[#B91C1C]">{errorMsg}</p>
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EDE9FE] flex items-center justify-center mb-5">
              <Building2 size={32} className="text-[#6D28D9]" />
            </div>
            <h2 className="text-[20px] font-bold text-[#1F1A2E] mb-2">Nenhuma rede cadastrada</h2>
            <p className="text-[#5B5470] text-[15px] max-w-md mb-6">
              Comece criando a primeira rede e convidando o gestor da Secretaria.
            </p>
            <Link
              href="/escola/plataforma/redes/nova"
              className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-5 py-3 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            >
              <Plus size={16} />
              Criar primeira rede
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E9E5F5] overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_140px_120px_100px] gap-4 px-5 py-3 border-b border-[#E9E5F5] bg-[#F8F7FC]">
              <span className="text-[12px] font-semibold text-[#5B5470] uppercase tracking-wide">Rede</span>
              <span className="text-[12px] font-semibold text-[#5B5470] uppercase tracking-wide">Situação</span>
              <span className="text-[12px] font-semibold text-[#5B5470] uppercase tracking-wide">Tipo</span>
              <span className="text-[12px] font-semibold text-[#5B5470] uppercase tracking-wide"></span>
            </div>
            <div className="divide-y divide-[#E9E5F5]">
              {tenants.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px_100px] gap-2 md:gap-4 px-5 py-4 hover:bg-[#F8F7FC] transition-colors items-center"
                >
                  <div>
                    <Link
                      href={`/escola/plataforma/redes/${t.id}`}
                      className="text-[14px] font-semibold text-[#1F1A2E] hover:text-[#6D28D9] transition-colors"
                    >
                      {t.name}
                    </Link>
                    <div className="text-[12px] text-[#5B5470] mt-0.5 md:hidden">
                      {t.kind === "PUBLIC_NETWORK" ? "Rede pública" : "Escola privada"}
                    </div>
                  </div>
                  <div>
                    <span className={`inline-flex text-[12px] px-2.5 py-1 rounded-full font-medium ${
                      t.status === "ACTIVE"    ? "bg-[#DCFCE7] text-[#166534]"
                      : t.status === "MIGRATING" ? "bg-[#FEF3C7] text-[#92400E]"
                      : "bg-[#FEE2E2] text-[#B91C1C]"
                    }`}>
                      {t.status === "ACTIVE" ? "Ativa" : t.status === "MIGRATING" ? "Em migração" : "Suspensa"}
                    </span>
                  </div>
                  <div className="hidden md:block text-[13px] text-[#5B5470]">
                    {t.kind === "PUBLIC_NETWORK" ? "Rede pública" : "Escola privada"}
                  </div>
                  <div className="flex justify-end">
                    <Link
                      href={`/escola/plataforma/redes/${t.id}`}
                      className="inline-flex items-center gap-1.5 text-[13px] text-[#6D28D9] hover:text-[#5B21B6] font-medium px-3 py-1.5 rounded-lg hover:bg-[#EDE9FE] transition-colors min-h-[36px]"
                    >
                      <ExternalLink size={13} />
                      Abrir
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
