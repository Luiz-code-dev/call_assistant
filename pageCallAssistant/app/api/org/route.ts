import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function cleanCnpj(raw: string): string {
  return raw.replace(/\D/g, "");
}

interface CnpjResult {
  valid: boolean;
  active: boolean;
  razaoSocial: string;
  situacao: string;
}

async function validateCnpj(cnpj: string): Promise<CnpjResult> {
  const clean = cleanCnpj(cnpj);
  if (clean.length !== 14) return { valid: false, active: false, razaoSocial: "", situacao: "" };

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
      headers: { "User-Agent": "SpeakFlow/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { valid: false, active: false, razaoSocial: "", situacao: `HTTP ${res.status}` };

    const data = await res.json();
    const situacao: string = (data.descricao_situacao_cadastral ?? "").toUpperCase();
    const active = situacao === "ATIVA";
    return {
      valid: true,
      active,
      razaoSocial: data.razao_social ?? "",
      situacao,
    };
  } catch (err) {
    console.error("[cnpj-validate]", err);
    return { valid: false, active: false, razaoSocial: "", situacao: "timeout" };
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const memberships = await (db as any).orgMember.findMany({
    where: { userId: session.sub },
    include: {
      org: {
        select: {
          id: true, name: true, slug: true, logoUrl: true, industry: true,
          plan: true, cnpj: true, cnpjStatus: true,
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json(memberships.map((m: any) => ({ ...m.org, role: m.role })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, industry, domain, cnpj } = body;

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: "Nome da organização é obrigatório (mínimo 2 caracteres)." }, { status: 400 });
  }

  let cleanedCnpj: string | null = null;
  let cnpjStatus = "unverified";
  let cnpjRazao: string | null = null;

  if (cnpj && cnpj.trim()) {
    const clean = cleanCnpj(cnpj);
    if (clean.length !== 14) {
      return NextResponse.json({ error: "CNPJ inválido. Informe os 14 dígitos." }, { status: 400 });
    }

    const duplicate = await (db as any).organization.findFirst({ where: { cnpj: clean } });
    if (duplicate) {
      return NextResponse.json({ error: "Este CNPJ já está cadastrado." }, { status: 409 });
    }

    const result = await validateCnpj(clean);

    if (!result.valid) {
      return NextResponse.json({
        error: "Não foi possível consultar o CNPJ na Receita Federal. Verifique o número e tente novamente.",
      }, { status: 422 });
    }

    if (!result.active) {
      return NextResponse.json({
        error: `CNPJ com situação "${result.situacao}" na Receita Federal. Apenas empresas ATIVAS podem criar organizações.`,
      }, { status: 422 });
    }

    cleanedCnpj = clean;
    cnpjStatus = "active";
    cnpjRazao = result.razaoSocial;
  }

  let slug = slugify(name);
  const existing = await (db as any).organization.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const org = await (db as any).organization.create({
    data: {
      name: cnpjRazao ? name.trim() : name.trim(),
      slug,
      industry: industry ?? null,
      domain: domain ?? null,
      cnpj: cleanedCnpj,
      cnpjStatus,
      ownerId: session.sub,
      members: {
        create: { userId: session.sub, role: "owner" },
      },
    },
  });

  return NextResponse.json({ ...org, cnpjRazaoSocial: cnpjRazao }, { status: 201 });
}
