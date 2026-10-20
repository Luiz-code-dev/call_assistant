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

/** Send invite email — reuses the existing resend integration */
export async function sendInviteEmail(to: string, name: string, token: string, networkName: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/escola/convite/${token}`;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "noreply@speakflow.com.br",
      to,
      subject: `Convite para ${networkName} — SpeakFlow Escolas`,
      html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
  <h2 style="color:#7C3AED;">SpeakFlow Escolas</h2>
  <p>Olá, <strong>${name}</strong>!</p>
  <p>Você foi convidado(a) para acessar a plataforma <strong>${networkName}</strong> no SpeakFlow Escolas.</p>
  <p>Clique no botão abaixo para aceitar o convite e criar (ou vincular) sua conta:</p>
  <a href="${link}" style="display:inline-block;background:#7C3AED;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Aceitar convite</a>
  <p style="color:#888;font-size:12px;">O link é válido por 7 dias. Se você não esperava este convite, ignore este e-mail.</p>
</div>`,
    });
  } catch (err) {
    console.error("Erro ao enviar convite:", err);
  }
}
