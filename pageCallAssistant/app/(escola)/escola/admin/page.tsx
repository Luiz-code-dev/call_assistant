import { redirect } from "next/navigation";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export default async function EscolaAdminPage() {
  if (!isEscolasEnabled()) return redirect("/escola/entrar");

  const ctx = await getEduContext();
  if (!ctx) return redirect("/escola/entrar");
  if (ctx.role !== "PLATFORM_ADMIN") return redirect("/escola/painel");

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-purple-700/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🏛️</span>
          </div>
          <h1 className="text-white text-2xl font-bold">Painel da Plataforma</h1>
          <p className="text-gray-400 text-sm mt-1">SpeakFlow Escolas · Administrador da Plataforma</p>
        </div>

        <div className="grid gap-4">
          <a
            href="/escola/rede"
            className="bg-gray-900 border border-gray-800 hover:border-purple-600 rounded-xl p-5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌐</span>
              <div>
                <div className="text-white font-semibold group-hover:text-purple-400 transition-colors">Redes de Ensino</div>
                <div className="text-gray-500 text-sm">Gerenciar redes, escolas e usuários</div>
              </div>
            </div>
          </a>

          <a
            href="/superadmin"
            className="bg-gray-900 border border-gray-800 hover:border-purple-600 rounded-xl p-5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚙️</span>
              <div>
                <div className="text-white font-semibold group-hover:text-purple-400 transition-colors">Super Admin</div>
                <div className="text-gray-500 text-sm">Painel de administração geral da plataforma</div>
              </div>
            </div>
          </a>
        </div>

        <div className="text-center">
          <a href="/escola/entrar" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
            Sair
          </a>
        </div>
      </div>
    </div>
  );
}
