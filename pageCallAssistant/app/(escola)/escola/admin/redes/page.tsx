import { redirect } from "next/navigation";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";
import Link from "next/link";

export default async function AdminRedesPage() {
  if (!isEscolasEnabled()) return redirect("/escola/entrar");

  const ctx = await getEduContext();
  if (!ctx) return redirect("/escola/entrar");
  if (ctx.role !== "PLATFORM_ADMIN") return redirect("/escola/painel");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const networks = await (prismaEdu as any).eduNetwork.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      _count: { select: { schools: true, students: true, memberships: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/escola/admin" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Admin
          </Link>
          <h1 className="text-white text-xl font-bold">Redes de Ensino</h1>
          <span className="ml-auto text-gray-500 text-sm">{networks.length} rede{networks.length !== 1 ? "s" : ""}</span>
        </div>

        {networks.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <div className="text-4xl mb-3">🌐</div>
            <p>Nenhuma rede cadastrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {networks.map((n: { id: string; name: string; city: string | null; state: string | null; _count: { schools: number; students: number; memberships: number } }) => (
              <div key={n.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-white font-semibold">{n.name}</div>
                    {(n.city || n.state) && (
                      <div className="text-gray-500 text-sm mt-0.5">{[n.city, n.state].filter(Boolean).join(", ")}</div>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>{n._count.schools} escola{n._count.schools !== 1 ? "s" : ""}</span>
                      <span>{n._count.students} aluno{n._count.students !== 1 ? "s" : ""}</span>
                      <span>{n._count.memberships} membro{n._count.memberships !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <span className="text-gray-700 text-xs font-mono shrink-0">{n.id.slice(0, 8)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
