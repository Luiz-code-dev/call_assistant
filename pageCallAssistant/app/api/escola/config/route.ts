import { NextResponse } from "next/server";
import { isEscolasEnabled, isNotasEnabled, envFlag } from "@/lib/escola/feature-flag";

// Config pública consumida pelo app (gating de telas/abas sem "em breve").
// Ex.: "Sou responsável" só aparece quando familyEnabled = true.
export async function GET() {
  return NextResponse.json({
    escolasEnabled: isEscolasEnabled(),
    familyEnabled: envFlag(process.env.FEATURE_ESCOLAS_FAMILIA, true),
    notasEnabled: isNotasEnabled(),
    // URLs de conformidade usadas pelo app
    termsUrl: "https://www.speakflow.ia.br/escola/termos",
    privacyUrl: "https://www.speakflow.ia.br/escola/privacidade",
    deleteAccountUrl: "https://www.speakflow.ia.br/escola/excluir-conta",
    aiProvider: "OpenAI",
  });
}
