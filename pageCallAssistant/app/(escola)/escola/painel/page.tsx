import { redirect } from "next/navigation";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { db } from "@/lib/db";

export default async function EscolaPainelPage() {
  if (!isEscolasEnabled()) return redirect("/escola/entrar");

  const ctx = await getEduContext();
  if (!ctx) return redirect("/escola/entrar");

  const network = await db.eduNetwork.findUnique({
    where: { id: ctx.networkId },
    select: {
      name: true,
      city: true,
      state: true,
      _count: { select: { schools: true, students: true, memberships: true } },
    },
  });

  const currentYear = await db.eduSchoolYear.findFirst({
    where: { networkId: ctx.networkId, isCurrent: true },
    select: { year: true, _count: { select: { terms: true } } },
  });

  const roleLabel: Record<string, string> = {
    NETWORK_ADMIN: "Gestor de Rede",
    COORDINATOR: "Coordenador(a)",
    SCHOOL_ADMIN: "Direção",
    TEACHER: "Professor(a)",
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">SpeakFlow Escolas</h1>
          <p className="text-xs text-muted-foreground">{network?.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{roleLabel[ctx.role] ?? ctx.role}</span>
          <form action="/api/escola/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-foreground mb-6">
          {network?.city}, {network?.state} — Ano letivo {currentYear?.year ?? "—"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Escolas" value={network?._count.schools ?? 0} />
          <StatCard label="Alunos" value={network?._count.students ?? 0} />
          <StatCard label="Membros da equipe" value={network?._count.memberships ?? 0} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NavCard href="/escola/turmas" title="Turmas" description="Gerenciar turmas e componentes curriculares" />
          <NavCard href="/escola/notas" title="Notas" description="Lançar e publicar notas por avaliação" />
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}

function NavCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <a
      href={href}
      className="rounded-xl border border-border bg-card p-5 hover:border-primary transition-colors block"
    >
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </a>
  );
}
