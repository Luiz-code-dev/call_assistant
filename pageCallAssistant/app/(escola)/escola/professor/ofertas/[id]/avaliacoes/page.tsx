import { redirect } from "next/navigation";

// Módulo de notas removido — redireciona para a oferta
export default function AvaliacoesPage({ params }: { params: { id: string } }) {
  redirect(`/escola/professor/ofertas/${params.id}`);
}
