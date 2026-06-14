import { NextRequest, NextResponse } from "next/server";
import { getNetworkSession } from "../../../_auth";
import { checkToolAccess } from "@/lib/planGuard";
import { evaluateSubmission, EvaluationError } from "@/lib/evaluateSubmission";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const access = await checkToolAccess(session.sub, "network");
  if (!access.allowed) return NextResponse.json({ error: access.reason, userPlan: access.userPlan }, { status: 403 });

  try {
    const evaluation = await evaluateSubmission(params.id, session.sub, { charge: true });
    return NextResponse.json({ ...evaluation }, { status: 201 });
  } catch (err) {
    if (err instanceof EvaluationError) {
      return NextResponse.json(
        { error: err.message, ...(err.evaluation ? { evaluation: err.evaluation } : {}) },
        { status: err.status }
      );
    }
    console.error("[evaluate] unexpected error", err);
    return NextResponse.json({ error: "Erro inesperado ao avaliar." }, { status: 500 });
  }
}
