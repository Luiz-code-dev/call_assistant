import { redirect } from "next/navigation";
import { getEduContext } from "@/lib/escola/context";
import { rotaDoPapel } from "@/lib/escola/context";

export default async function PainelPage() {
  const ctx = await getEduContext();
  if (!ctx) redirect("/escola/entrar");
  redirect(rotaDoPapel(ctx.role));
}
