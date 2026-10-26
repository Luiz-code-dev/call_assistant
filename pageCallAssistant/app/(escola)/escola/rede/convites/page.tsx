import { redirect } from "next/navigation";

// Servidores e convites foram unificados em /escola/rede/servidores.
export default function ConvitesRedirect() {
  redirect("/escola/rede/servidores");
}
