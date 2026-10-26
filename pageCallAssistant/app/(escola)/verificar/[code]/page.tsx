import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isEscolasEnabled, isNotasEnabled } from "@/lib/escola/feature-flag";

interface Props {
  params: { code: string };
}

export default async function VerificarPage({ params }: Props) {
  if (!isEscolasEnabled() || !isNotasEnabled()) redirect("/escola/painel");

  const closure = await db.eduTermClosure.findFirst({
    where: { verificationCode: params.code },
    include: {
      term: { select: { name: true, startsAt: true, endsAt: true } },
    },
  });

  if (!closure) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-foreground mb-2">Código não encontrado</h1>
          <p className="text-muted-foreground text-sm">
            O código <span className="font-mono font-medium">{params.code}</span> não corresponde a nenhum fechamento de bimestre registrado.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-green-500/30 bg-card p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">✅</div>
          <h1 className="text-xl font-bold text-foreground">Boletim Verificado</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Este boletim é autentico e foi gerado pelo sistema SpeakFlow Escolas.
          </p>
        </div>

        <dl className="space-y-3 text-sm">
          <Row label="Bimestre" value={closure.term.name} />
          <Row
            label="Período"
            value={`${fmt(closure.term.startsAt)} – ${fmt(closure.term.endsAt)}`}
          />
          <Row label="Fechado em" value={fmt(closure.closedAt)} />
          <Row label="Código de verificação" value={params.code} mono />
          <Row label="Root hash" value={closure.rootHash.slice(0, 16) + "..."} mono />
        </dl>

        <p className="mt-6 text-xs text-center text-muted-foreground">
          SpeakFlow Escolas — sistema de gestão educacional
        </p>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border last:border-0">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={`text-foreground text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function fmt(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}
