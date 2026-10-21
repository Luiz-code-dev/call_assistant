import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushToUsers } from "@/lib/webpush";

const TIPS = [
  "Use 'actually' para corrigir uma informação com naturalidade, sem soar rude.",
  "Prefira 'I'd like to' no lugar de 'I want to' para soar mais profissional.",
  "'Could you elaborate on that?' é a forma mais educada de pedir mais detalhes.",
  "Use 'I appreciate' para agradecer de forma mais sofisticada do que 'thank you'.",
  "'Let me clarify' demonstra assertividade sem soar agressivo ou defensivo.",
  "Prefira 'reach out' a 'contact' em contextos de networking e e-mails formais.",
  "'Moving forward' é a forma profissional de introduzir um próximo passo.",
  "Use 'touch base' para sugerir uma conversa rápida de alinhamento com seu time.",
  "'As per our conversation' é perfeito para referenciar algo discutido antes.",
  "Use 'take ownership' para mostrar que você está assumindo responsabilidade.",
  "'Circle back' significa retomar uma conversa mais tarde — essencial em reuniões.",
  "Use 'on the same page' para confirmar alinhamento com stakeholders.",
  "'That makes sense' é a resposta perfeita para mostrar que você acompanhou.",
  "Use 'just to confirm' para evitar mal-entendidos antes de agir em algo importante.",
  "'Happy to help' soa mais natural e profissional do que 'No problem' ou 'Sure'.",
  "Use 'going forward' como alternativa a 'from now on' em contextos corporativos.",
  "'That said' introduz uma ressalva sem invalidar o que foi dito antes.",
  "Use 'walk me through' para pedir uma explicação passo a passo de algo técnico.",
  "'Deliverable' é a palavra certa para o que você entrega ao cliente ou ao time.",
  "Use 'bandwidth' metaforicamente para falar sobre capacidade disponível de alguém.",
];

// GET /api/cron/daily-tip?secret=CRON_SECRET
// Call once daily (e.g. 8am UTC) via Railway cron or external scheduler.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const tip = TIPS[dayOfYear % TIPS.length];

  // Get all distinct userIds with a push subscription
  const subs = await db.pushSubscription.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  const userIds = subs.map((s) => s.userId);
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, tip });
  }

  await sendPushToUsers(userIds, {
    title: "💡 Dica do Dia — SpeakFlow",
    body: tip,
    url: "/home",
  }).catch(console.error);

  return NextResponse.json({ ok: true, sent: userIds.length, tip });
}
