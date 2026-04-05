import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "Call Assistant <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;

  if (!resend) {
    console.log(`[DEV] Verification link for ${email}: ${link}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirme seu e-mail — Call Assistant",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-size:16px">🎙</span>
          </div>
          <span style="font-weight:600;font-size:18px">Call Assistant</span>
        </div>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 8px">Olá, ${name}!</h1>
        <p style="color:#a1a1aa;margin:0 0 24px">Confirme seu e-mail para ativar sua conta e receber 50 créditos grátis.</p>
        <a href="${link}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Confirmar e-mail
        </a>
        <p style="color:#52525b;font-size:12px;margin-top:24px">Link válido por 24 horas. Se você não criou uma conta, ignore este e-mail.</p>
        <hr style="border:none;border-top:1px solid #27272a;margin:24px 0" />
        <p style="color:#3f3f46;font-size:11px">Call Assistant · call-assistant.com.br</p>
      </div>
    `,
  });
}
