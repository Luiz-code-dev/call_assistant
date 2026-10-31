"use client";
// Módulo de avaliações/notas removido. Esta rota redireciona para o painel do professor.
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export function AvaliacoesClient({ params }: { params: { id: string } }) {
  const router = useRouter();
  useEffect(() => { router.replace("/escola/professor"); }, [router]);
  return null;
}
