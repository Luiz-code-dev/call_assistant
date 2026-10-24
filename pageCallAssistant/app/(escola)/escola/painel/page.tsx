import { redirect } from "next/navigation";
import { getEduContext, rotaDoPapel } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export default async function EscolaPainelPage() {
  if (!isEscolasEnabled()) redirect("/escola/entrar");
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");
  redirect(rotaDoPapel(ctx.role));
}
