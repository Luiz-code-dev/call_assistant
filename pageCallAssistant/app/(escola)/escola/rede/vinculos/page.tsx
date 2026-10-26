import { redirect } from "next/navigation";

// Servidores e vínculos foram unificados em /escola/rede/servidores.
export default function VinculosRedirect() {
  redirect("/escola/rede/servidores");
}
