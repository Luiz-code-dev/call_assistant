import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/superAdmin";
import { sendSupportEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function getSession(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const cookie = req.cookies.get("token")?.value;
  const raw = bearer ?? cookie;
  return raw ? verifyToken(raw) : null;
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { category, content } = await req.json().catch(() => ({}));
  if (!content?.trim()) return NextResponse.json({ error: "Conteúdo obrigatório." }, { status: 400 });

  const validCategories = ["feature", "bug", "ux", "performance", "outro"];
  const cat = validCategories.includes(category) ? category : "feature";

  const user = await (db as any).user.findUnique({
    where: { id: session.sub },
    select: { name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  await (db as any).feedback.create({
    data: { userId: session.sub, category: cat, content: content.trim() },
  });

  const categoryLabels: Record<string, string> = {
    feature: "Nova funcionalidade",
    bug: "Bug / Erro",
    ux: "Interface / UX",
    performance: "Performance",
    outro: "Outro",
  };

  sendSupportEmail(
    user.name ?? "Usuário",
    user.email,
    `[Sugestão: ${categoryLabels[cat]}]\n\n${content.trim()}`
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  if (!(await isSuperAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const feedbacks = await (db as any).feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json(feedbacks);
}
