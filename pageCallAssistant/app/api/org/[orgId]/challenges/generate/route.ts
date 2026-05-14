import { NextRequest, NextResponse } from "next/server";
import { getOrgSessionById, hasRole } from "@/lib/orgAuth";
import { getOpenAI } from "@/lib/openai";

export const dynamic = "force-dynamic";

type Ctx = { params: { orgId: string } };

const CATEGORY_LABELS: Record<string, string> = {
  meetings: "Reuniões corporativas", sales: "Vendas e negociação",
  support: "Suporte ao cliente", onboarding: "Onboarding",
  presentations: "Apresentações", "customer-success": "Customer Success",
  interviews: "Entrevistas", general: "Comunicação geral", calls: "Calls com clientes",
};

export async function POST(req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!hasRole(org.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { sector, category, quantity = 3, context } = await req.json().catch(() => ({}));
  if (!sector || !category) return NextResponse.json({ error: "sector e category são obrigatórios." }, { status: 400 });

  const qty = Math.min(Math.max(Number(quantity) || 3, 1), 5);
  const catLabel = CATEGORY_LABELS[category] ?? category;

  const prompt = `Você é um especialista em treinamento corporativo de comunicação em inglês.

Empresa/Setor: ${sector}
Contexto de prática: ${catLabel}
${context ? `Contexto adicional: ${context}` : ""}

Crie ${qty} desafios de comunicação em inglês para colaboradores desse setor.
Cada desafio deve simular uma situação real que esses profissionais enfrentam no dia a dia.

Responda APENAS com um JSON array no formato:
[
  {
    "title": "Título curto e direto (max 70 chars)",
    "description": "O que o colaborador deve praticar — 2 frases objetivas.",
    "type": "scenario | roleplay | quick-response | audio",
    "scenario": "Contexto específico da situação real que o colaborador vai enfrentar — 2 frases."
  }
]

Regras:
- type "roleplay" para simulações de conversa
- type "scenario" para contextos de tomada de decisão
- type "quick-response" para respostas rápidas e objetivas
- type "audio" para prática de pronúncia ou pitch verbal
- Os textos do scenario e description devem ser em português
- O title deve ser em português
- Varie os tipos entre os ${qty} desafios
- Seja específico para o setor: ${sector}`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let challenges: any[] = [];
  try {
    const parsed = JSON.parse(raw);
    challenges = Array.isArray(parsed) ? parsed : (parsed.challenges ?? parsed.items ?? []);
  } catch {
    return NextResponse.json({ error: "Falha ao interpretar resposta da IA." }, { status: 500 });
  }

  return NextResponse.json({ challenges, category });
}
