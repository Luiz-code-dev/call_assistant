import { redirect } from "next/navigation";

// Módulo de notas removido — redireciona para a oferta
export default function NotasPage({ params }: { params: { id: string } }) {
  redirect(`/escola/professor/ofertas/${params.id}`);
}
