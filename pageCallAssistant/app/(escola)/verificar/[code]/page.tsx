import { redirect } from "next/navigation";
import { isEscolasEnabled, isNotasEnabled } from "@/lib/escola/feature-flag";
import { getTenantDb } from "@/lib/escola/tenant-db";

interface Props {
  params: { code: string };
  searchParams: { nid?: string };
}

export default async function VerificarPage({ params, searchParams }: Props) {
  if (!isEscolasEnabled() || !isNotasEnabled()) redirect("/escola/painel");

  const nid = searchParams.nid;
  if (!nid) {
    return (
      <main className="min-h-screen bg-[#F8F7FC] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-[#1F1A2E] mb-2">Parâmetro de rede ausente</h1>
          <p className="text-[#5B5470] text-sm">
            O link de verificação deve incluir o parâmetro <span className="font-mono">?nid=...</span>. Obtenha o link completo com a escola.
          </p>
        </div>
      </main>
    );
  }

  let closure: {
    verificationCode: string; closedAt: Date; rootHash: string;
    term: { name: string; startsAt: Date; endsAt: Date };
  } | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await getTenantDb(nid) as any;
    closure = await db.eduTermClosure.findFirst({
      where: { verificationCode: params.code },
      include: { term: { select: { name: true, startsAt: true, endsAt: true } } },
    });
  } catch {
    // rede não encontrada ou DB indisponível
  }

  if (!closure) {
    return (
      <main className="min-h-screen bg-[#F8F7FC] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-[#1F1A2E] mb-2">Código não encontrado</h1>
          <p className="text-[#5B5470] text-sm">
            O código <span className="font-mono font-medium">{params.code}</span> não corresponde a nenhum fechamento de bimestre registrado.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F7FC] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-[#E9E5F5] bg-white p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-[#1F1A2E]">Boletim Verificado</h1>
          <p className="text-sm text-[#5B5470] mt-1">
            Este boletim é autentico e foi gerado pelo sistema SpeakFlow Escolas.
          </p>
        </div>

        <dl className="space-y-3 text-sm">
          <Row label="Bimestre" value={closure.term.name} />
          <Row label="Período" value={`${fmt(closure.term.startsAt)} – ${fmt(closure.term.endsAt)}`} />
          <Row label="Fechado em" value={fmt(closure.closedAt)} />
          <Row label="Código de verificação" value={params.code} mono />
          <Row label="Root hash" value={closure.rootHash.slice(0, 16) + "..."} mono />
        </dl>

        <p className="mt-6 text-xs text-center text-[#5B5470]">
          SpeakFlow Escolas — sistema de gestão educacional
        </p>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-[#E9E5F5] last:border-0">
      <dt className="text-[#5B5470] shrink-0">{label}</dt>
      <dd className={`text-[#1F1A2E] text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function fmt(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}
