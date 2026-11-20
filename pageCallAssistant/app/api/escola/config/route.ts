import { NextResponse } from "next/server";
import { urlDoSite } from "@/lib/escola/public-url";
import { isEscolasEnabled, isNotasEnabled, envFlag } from "@/lib/escola/feature-flag";

// Lida a cada chamada: as variáveis de ambiente valem as do servidor em execução.
export const dynamic = "force-dynamic";

// Config pública consumida pelo app (gating de telas/abas sem "em breve").
// Ex.: "Sou responsável" só aparece quando familyEnabled = true.
export async function GET() {
  // Sem ESCOLAS_PUBLIC_URL, é o endereço de sempre (https://www.speakflow.ia.br).
  const site = urlDoSite();
  return NextResponse.json({
    escolasEnabled: isEscolasEnabled(),
    familyEnabled: envFlag(process.env.FEATURE_ESCOLAS_FAMILIA, true),
    notasEnabled: isNotasEnabled(),
    // URLs de conformidade usadas pelo app
    termsUrl: `${site}/escola/termos`,
    privacyUrl: `${site}/escola/privacidade`,
    deleteAccountUrl: `${site}/escola/excluir-conta`,
    aiProvider: "OpenAI",
  });
}
