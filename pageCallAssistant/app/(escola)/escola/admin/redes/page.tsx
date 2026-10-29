import { redirect } from "next/navigation";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { catalogDb } from "@/lib/escola/catalogo";
import Link from "next/link";
import { getTenantDb } from "@/lib/escola/tenant-db";

export default async function AdminRedesPage() {
  if (!isEscolasEnabled()) return redirect("/escola/entrar");

  const ctx = await getEduContext();
  if (!ctx) return redirect("/escola/entrar");
  if (ctx.role !== "PLATFORM_ADMIN") return redirect("/escola/painel");

  const tenants = await catalogDb.tenant.findMany({
    orderBy: { name: "asc" },
    include: { db: true },
  });

  // Para cada tenant, tenta ler contagem de alunos da base correspondente
  const enriched = await Promise.all(
    tenants.map(async (t) => {
      let alunosAtivos = 0;
      try {
        const url = t.db?.envVar ? process.env[t.db.envVar] : undefined;
        if (url) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const db = await getTenantDb(t.id) as any;
          alunosAtivos = await db.eduStudent.count({ where: { networkId: t.id, isActive: true } });
        }
      } catch { /* silencia se base indisponível */ }
      return { ...t, alunosAtivos };
    })
  );

  const statusLabel: Record<string, string> = {
    ACTIVE: "Ativo",
    MIGRATING: "Migrando",
    SUSPENDED: "Suspenso",
  };
  const planLabel: Record<string, string> = {
    SHARED: "Compartilhado",
    DEDICATED: "Exclusivo",
  };
  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    MIGRATING: "bg-yellow-100 text-yellow-800",
    SUSPENDED: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-[#F8F7FC] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/escola/admin" className="text-[#5B5470] hover:text-[#3F3A4F] text-sm transition-colors">
            ← Admin
          </Link>
          <h1 className="text-[#1F1A2E] text-xl font-bold">Redes de Ensino</h1>
          <span className="ml-auto text-[#5B5470] text-sm">{tenants.length} rede{tenants.length !== 1 ? "s" : ""}</span>
        </div>

        {tenants.length === 0 ? (
          <div className="text-center py-16 text-[#5B5470]">
            <p>Nenhuma rede cadastrada ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E9E5F5] bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E9E5F5] bg-[#F8F7FC]">
                <tr>
                  {["Rede", "Base", "Plano", "Situação", "Alunos ativos"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-[#5B5470]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E5F5]">
                {enriched.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F8F7FC] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1F1A2E]">{t.name}</div>
                      <div className="text-xs text-[#5B5470] font-mono">{t.id}</div>
                    </td>
                    <td className="px-4 py-3 text-[#5B5470] font-mono text-xs">{t.dbKey}</td>
                    <td className="px-4 py-3 text-[#5B5470]">{planLabel[t.plan] ?? t.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[t.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {statusLabel[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#1F1A2E] font-medium">{t.alunosAtivos.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-[#5B5470]">Tela somente leitura. Para mover uma rede, use o script <code className="bg-[#EDE9FE] text-[#6D28D9] px-1 rounded">mover-rede.mjs</code>.</p>
      </div>
    </div>
  );
}
