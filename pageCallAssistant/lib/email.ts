import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "SpeakFlow <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

export async function sendThankYouEmail(email: string, name: string, plan: string, credits: number) {
  if (!resend) {
    console.log(`[DEV] Thank-you email would be sent to ${email} for plan=${plan} credits=${credits}`);
    return;
  }

  const planLabel = plan === "basic" ? "Básico (R$ 74,90/mês)" : plan === "premium" ? "Premium (R$ 149,90/mês)" : `${credits} créditos adicionais`;
  const firstName = name?.split(" ")[0] || "usuário";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Bem-vindo ao SpeakFlow — seu plano está ativo! 🎉",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#06b6d4,#2563eb);display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-weight:bold;font-size:18px">S</span>
          </div>
          <span style="font-weight:700;font-size:20px">SpeakFlow</span>
        </div>
        <h1 style="font-size:24px;font-weight:800;margin:0 0 8px">Parabéns, ${firstName}! 🚀</h1>
        <p style="color:#a1a1aa;margin:0 0 20px;font-size:15px">
          Você acaba de adquirir um produto incrível. Seu plano <strong style="color:#fafafa">${planLabel}</strong> já está ativo e pronto para uso.
        </p>
        <div style="background:#18181b;border:1px solid #27272a;border-radius:10px;padding:20px;margin-bottom:24px">
          <p style="margin:0 0 8px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">O que você ganhou</p>
          <p style="margin:0;font-size:16px;font-weight:600">✨ ${planLabel}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#a1a1aa">Transcrição, tradução e copilot inteligente em tempo real durante suas reuniões e entrevistas.</p>
        </div>
        <a href="${APP_URL}/dashboard" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
          Acessar meu Dashboard →
        </a>
        <p style="color:#52525b;font-size:12px;margin-top:28px">Boa sorte nas suas próximas reuniões! Qualquer dúvida, estamos aqui.<br/>Equipe SpeakFlow</p>
        <hr style="border:none;border-top:1px solid #27272a;margin:24px 0"/>
        <p style="color:#3f3f46;font-size:11px">SpeakFlow · speakf.com.br</p>
      </div>
    `,
  });
}

export async function sendSupportEmail(
  name: string,
  email: string,
  question: string
) {
  if (!resend) {
    console.log(`[DEV] Support email: from=${name} <${email}> question=${question}`);
    return;
  }

  const { error: sendError } = await resend.emails.send({
    from: FROM_EMAIL,
    to: "luiz.melo@cdsolutions.com.br",
    replyTo: email,
    subject: `[Suporte SpeakFlow] Mensagem de ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-weight:bold">✦</span>
          </div>
          <span style="font-weight:700;font-size:18px">Spark · SpeakFlow</span>
        </div>
        <h2 style="font-size:20px;font-weight:700;margin:0 0 16px;color:#a78bfa">📬 Nova mensagem de suporte</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:13px;width:70px;vertical-align:top">Nome</td>
            <td style="padding:6px 0;font-size:14px">${name}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:13px;vertical-align:top">E-mail</td>
            <td style="padding:6px 0;font-size:14px"><a href="mailto:${email}" style="color:#818cf8;text-decoration:none">${email}</a></td>
          </tr>
        </table>
        <hr style="border:none;border-top:1px solid #27272a;margin:16px 0" />
        <p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">Mensagem</p>
        <p style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:14px;font-size:14px;margin:0;line-height:1.6">${question}</p>
        <p style="margin-top:24px;font-size:11px;color:#3f3f46">Enviado pelo Spark — assistente de suporte SpeakFlow · speakf.com.br</p>
      </div>
    `,
  });

  if (sendError) {
    console.error("[sendSupportEmail] Resend error:", sendError);
    throw new Error(sendError.message);
  }
}

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;

  if (!resend) {
    console.log(`[DEV] Verification link for ${email}: ${link}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirme seu e-mail — SpeakFlow",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-size:16px">🎙</span>
          </div>
          <span style="font-weight:600;font-size:18px">SpeakFlow</span>
        </div>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 8px">Olá, ${name}!</h1>
        <p style="color:#a1a1aa;margin:0 0 24px">Confirme seu e-mail para ativar sua conta e receber 50 créditos grátis.</p>
        <a href="${link}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Confirmar e-mail
        </a>
        <p style="color:#52525b;font-size:12px;margin-top:24px">Link válido por 24 horas. Se você não criou uma conta, ignore este e-mail.</p>
        <hr style="border:none;border-top:1px solid #27272a;margin:24px 0" />
        <p style="color:#3f3f46;font-size:11px">SpeakFlow · speakf.com.br</p>
      </div>
    `,
  });
}
