import { redirect } from "next/navigation";
import { isNotasEnabled } from "@/lib/escola/feature-flag";
import { AvaliacoesClient } from "./_AvaliacoesClient";

export default function AvaliacoesPage({ params }: { params: { id: string } }) {
  if (!isNotasEnabled()) redirect("/escola/professor");
  return <AvaliacoesClient params={params} />;
}
