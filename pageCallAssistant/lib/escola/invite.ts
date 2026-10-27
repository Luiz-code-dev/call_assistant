/**
 * Invite helpers — token generation/verification and email dispatch.
 */
import crypto from "crypto";
import { prismaEdu } from "@/lib/escola/db";

export function generateInviteToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export async function findInviteByToken(rawToken: string) {
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return prismaEdu.eduInvite.findUnique({ where: { tokenHash: hash } });
}

/** Hash de um token cru (mesmo esquema do convite): guardamos so o hash. */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/** Envia o link de redefinicao de senha da familia (tema claro SpeakFlow Escolas). */
export async function sendFamilyPasswordResetEmail(to: string, name: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/escola/familia/redefinir-senha?token=${token}`;
  const firstName = (name ?? "").split(" ")[0] || "responsavel";

  if (!process.env.RESEND_API_KEY) {
    console.log(`[DEV] Edu family password reset email to ${to}: ${link}`);
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      // Mesmo remetente verificado dos demais e-mails da familia (sendGuardianInviteEmail).
      from: process.env.EMAIL_FROM_ESCOLA || process.env.RESEND_FROM || "SpeakFlow Escolas <escolas@speakflow.ia.br>",
      to,
      subject: "Redefinir a senha — SpeakFlow Escolas",
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redefinir senha SpeakFlow Escolas</title></head>
<body style="margin:0;padding:0;background-color:#F8F7FC;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;border-radius:16px;border:1px solid #E9E5F5;overflow:hidden;max-width:100%">
        <tr>
          <td style="background:#EDE9FE;padding:28px 32px">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="width:36px;height:36px;background:#6D28D9;border-radius:10px;text-align:center;vertical-align:middle">
                  <span style="color:#FFFFFF;font-size:18px;line-height:36px">&#x1F4AC;</span>
                </td>
                <td style="padding-left:10px;font-size:18px;font-weight:800;color:#1F1A2E;vertical-align:middle">
                  SpeakFlow <span style="color:#6D28D9">Escolas</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#3B0764">Olá, ${firstName}!</h1>
            <p style="margin:0 0 20px;font-size:15px;color:#5B5470;line-height:1.6">
              Recebemos um pedido para redefinir a senha da sua conta na <strong style="color:#1F1A2E">Área da família</strong>.
              Clique no botão abaixo para criar uma nova senha.
            </p>
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px">
              <tr>
                <td style="border-radius:10px;background:#6D28D9">
                  <a href="${link}" style="display:inline-block;padding:14px 32px;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px">
                    Criar nova senha &rarr;
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 4px;font-size:13px;color:#9CA3AF">Ou copie e cole este link no navegador:</p>
            <p style="margin:0;font-size:12px;color:#6D28D9;word-break:break-all">${link}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#FAF9FD;border-top:1px solid #E9E5F5;padding:16px 32px">
            <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6">
              O link é válido por 1 hora. Se você não pediu isso, ignore este e-mail — sua senha continua a mesma.
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#C4B5FD">SpeakFlow Escolas &middot; speakflow.com.br</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[sendFamilyPasswordResetEmail] Erro ao enviar redefinicao:", err);
  }
}

/** Send invite email — light-theme template aligned with SpeakFlow Escolas brand */
export async function sendInviteEmail(
  to: string,
  name: string,
  token: string,
  networkName: string,
  roleName?: string
) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/escola/convite/${token}`;
  const firstName = name.split(" ")[0];
  const roleLabel = roleName ?? "membro da equipe escolar";

  if (!process.env.RESEND_API_KEY) {
    console.log(`[DEV] Edu invite email to ${to}: ${link}`);
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "SpeakFlow Escolas <noreply@speakflow.com.br>",
      to,
      subject: `Seu convite para ${networkName} — SpeakFlow Escolas`,
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Convite SpeakFlow Escolas</title></head>
<body style="margin:0;padding:0;background-color:#F8F7FC;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;border-radius:16px;border:1px solid #E9E5F5;overflow:hidden;max-width:100%">

        <!-- Header band -->
        <tr>
          <td style="background:#EDE9FE;padding:28px 32px">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="width:36px;height:36px;background:#6D28D9;border-radius:10px;text-align:center;vertical-align:middle">
                  <span style="color:#FFFFFF;font-size:18px;line-height:36px">&#x1F4AC;</span>
                </td>
                <td style="padding-left:10px;font-size:18px;font-weight:800;color:#1F1A2E;vertical-align:middle">
                  SpeakFlow <span style="color:#6D28D9">Escolas</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#3B0764">
              Olá, ${firstName}!
            </h1>
            <p style="margin:0 0 20px;font-size:15px;color:#5B5470;line-height:1.6">
              Você foi convidado(a) como <strong style="color:#1F1A2E">${roleLabel}</strong> na rede
              <strong style="color:#1F1A2E">${networkName}</strong>.
            </p>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FAF9FD;border:1px solid #E9E5F5;border-radius:10px;margin-bottom:24px">
              <tr>
                <td style="padding:16px 20px;font-size:14px;color:#5B5470;line-height:1.6">
                  Clique no botão abaixo para aceitar o convite, criar ou vincular sua conta, e começar a usar a plataforma.
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px">
              <tr>
                <td style="border-radius:10px;background:#6D28D9">
                  <a href="${link}" style="display:inline-block;padding:14px 32px;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px">
                    Aceitar convite &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 4px;font-size:13px;color:#9CA3AF">
              Ou copie e cole este link no navegador:
            </p>
            <p style="margin:0;font-size:12px;color:#6D28D9;word-break:break-all">${link}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#FAF9FD;border-top:1px solid #E9E5F5;padding:16px 32px">
            <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6">
              O link é válido por 7 dias. Se você não esperava este convite, ignore este e-mail — nenhuma ação é necessária.
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#C4B5FD">SpeakFlow Escolas &middot; speakflow.com.br</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[sendInviteEmail] Erro ao enviar convite:", err);
  }
}
