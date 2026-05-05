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
): Promise<boolean> {
  if (!resend) {
    console.log(`[DEV] Support email: from=${name} <${email}> question=${question}`);
    return false;
  }

  try {
    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: process.env.SUPPORT_EMAIL || "luiz.melo@cdsolutions.com.br",
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
      console.error("[sendSupportEmail] Resend error:", JSON.stringify(sendError));
      return false;
    }

    return true;
  } catch (err) {
    console.error("[sendSupportEmail] Unexpected error:", err);
    return false;
  }
}

export async function sendCircleInviteEmail(
  inviteeEmail: string,
  inviteeName: string,
  inviterName: string,
  circleName: string,
  circleDescription: string | null | undefined,
  inviteToken: string
) {
  const acceptLink = `${APP_URL}/network/invite/${inviteToken}`;
  const firstName = inviteeName.split(" ")[0];

  if (!resend) {
    console.log(`[DEV] Circle invite email to ${inviteeEmail}: ${acceptLink}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: inviteeEmail,
    subject: `${inviterName} te convidou para o Circle "${circleName}" no SpeakFlow`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-size:18px">🎙</span>
          </div>
          <span style="font-weight:700;font-size:20px">SpeakFlow</span>
        </div>
        <h1 style="font-size:22px;font-weight:800;margin:0 0 6px">Olá, ${firstName}!</h1>
        <p style="color:#a1a1aa;margin:0 0 24px;font-size:15px">
          <strong style="color:#fafafa">${inviterName}</strong> te convidou para participar do Circle
          <strong style="color:#a78bfa">${circleName}</strong> no SpeakFlow Network.
        </p>
        ${circleDescription ? `
        <div style="background:#18181b;border:1px solid #27272a;border-radius:10px;padding:16px;margin-bottom:24px">
          <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.5">${circleDescription}</p>
        </div>` : ""}
        <div style="margin-bottom:24px">
          <p style="margin:0 0 8px;font-size:13px;color:#71717a">O que você vai encontrar:</p>
          <ul style="margin:0;padding:0 0 0 16px;color:#a1a1aa;font-size:14px;line-height:1.8">
            <li>Desafios práticos de comunicação em inglês</li>
            <li>Avaliação com IA (fluência, clareza e conteúdo)</li>
            <li>Ranking e evolução com a comunidade</li>
          </ul>
        </div>
        <a href="${acceptLink}" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
          Aceitar convite →
        </a>
        <p style="color:#52525b;font-size:12px;margin-top:24px">
          Se não quiser participar, basta ignorar este e-mail.<br/>Este convite é pessoal e não pode ser compartilhado.
        </p>
        <hr style="border:none;border-top:1px solid #27272a;margin:24px 0"/>
        <p style="color:#3f3f46;font-size:11px">SpeakFlow Network · speakf.com.br</p>
      </div>
    `,
  });
}

export async function sendCircleRemovalEmail(
  removedEmail: string,
  removedName: string,
  circleName: string
): Promise<void> {
  const firstName = removedName.split(" ")[0];
  const circlesUrl = `${APP_URL}/network/circles`;

  if (!resend) {
    console.log(`[DEV] Circle removal email to ${removedEmail}: circle=${circleName}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: removedEmail,
    subject: `Sua participação no Circle "${circleName}" foi encerrada`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-size:18px">🎙</span>
          </div>
          <span style="font-weight:700;font-size:20px">SpeakFlow</span>
        </div>
        <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">Olá, ${firstName}</h1>
        <p style="color:#a1a1aa;margin:0 0 20px;font-size:15px;line-height:1.6">
          Informamos que sua participação no Circle
          <strong style="color:#a78bfa">${circleName}</strong> foi encerrada pelo administrador do grupo.
        </p>
        <div style="background:#18181b;border:1px solid #27272a;border-radius:10px;padding:20px;margin-bottom:24px">
          <p style="margin:0 0 12px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">Próximos passos</p>
          <ul style="margin:0;padding:0 0 0 16px;color:#a1a1aa;font-size:14px;line-height:2">
            <li>Você pode explorar e entrar em outros Circles disponíveis</li>
            <li>Crie seu próprio Circle para praticar com quem você quiser</li>
            <li>Continue praticando inglês com todos os outros recursos do SpeakFlow</li>
          </ul>
        </div>
        <a href="${circlesUrl}" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
          Explorar outros Circles →
        </a>
        <p style="color:#52525b;font-size:12px;margin-top:24px">
          Se tiver dúvidas, entre em contato com o suporte pelo chat do SpeakFlow.
        </p>
        <hr style="border:none;border-top:1px solid #27272a;margin:24px 0"/>
        <p style="color:#3f3f46;font-size:11px">SpeakFlow Network · speakf.com.br</p>
      </div>
    `,
  }).catch((err) => console.error("[sendCircleRemovalEmail]", err));
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

export async function sendBadgeEmail(
  email: string,
  name: string,
  badges: { slug: string; emoji: string; name: string; description: string }[]
) {
  if (!resend) {
    console.log(`[DEV] Badge email would be sent to ${email}:`, badges.map((b) => b.name).join(", "));
    return;
  }

  const firstName = name?.split(" ")[0] || "usuário";
  const badgeRows = badges
    .map(
      (b) => `
      <div style="display:flex;align-items:center;gap:12px;background:#18181b;border:1px solid #27272a;border-radius:10px;padding:16px;margin-bottom:10px">
        <span style="font-size:32px">${b.emoji}</span>
        <div>
          <p style="margin:0;font-size:15px;font-weight:700;color:#fafafa">${b.name}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#a1a1aa">${b.description}</p>
        </div>
      </div>`
    )
    .join("");

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `🏅 ${badges.length === 1 ? `Nova conquista: ${badges[0].name}` : `${badges.length} novas conquistas desbloqueadas!`} — SpeakFlow`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-weight:bold;font-size:18px">S</span>
          </div>
          <span style="font-weight:700;font-size:20px">SpeakFlow</span>
        </div>
        <h1 style="font-size:22px;font-weight:800;margin:0 0 6px">Parabéns, ${firstName}! 🎉</h1>
        <p style="color:#a1a1aa;margin:0 0 20px;font-size:15px">
          Você desbloqueou ${badges.length === 1 ? "uma nova conquista" : `${badges.length} novas conquistas`} no SpeakFlow Network!
        </p>
        ${badgeRows}
        <a href="${APP_URL}/progress" style="display:inline-block;margin-top:12px;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Ver meu progresso →
        </a>
        <p style="color:#52525b;font-size:12px;margin-top:28px">Continue praticando para desbloquear mais conquistas!<br/>Equipe SpeakFlow</p>
        <hr style="border:none;border-top:1px solid #27272a;margin:24px 0"/>
        <p style="color:#3f3f46;font-size:11px">SpeakFlow · speakf.com.br</p>
      </div>
    `,
  });
}

export async function sendFriendRequestEmail(
  toEmail: string,
  toName: string,
  fromName: string
) {
  const firstName = toName?.split(" ")[0] || "usuário";
  if (!resend) {
    console.log(`[DEV] Friend request email: ${fromName} → ${toEmail}`);
    return;
  }
  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `👥 ${fromName} quer ser seu amigo no SpeakFlow!`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-weight:bold;font-size:18px">S</span>
          </div>
          <span style="font-weight:700;font-size:20px">SpeakFlow</span>
        </div>
        <h1 style="font-size:22px;font-weight:800;margin:0 0 6px">Olá, ${firstName}! 👋</h1>
        <p style="color:#a1a1aa;margin:0 0 24px;font-size:15px">
          <strong style="color:#fafafa">${fromName}</strong> enviou uma solicitação de amizade para você no SpeakFlow.
        </p>
        <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:24px">
          <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa">Com amigos no SpeakFlow você pode:</p>
          <ul style="margin:0;padding-left:18px;color:#d4d4d8;font-size:13px;line-height:1.8">
            <li>💬 Chat criptografado (AES-256-GCM)</li>
            <li>🌍 Tradução instantânea nas mensagens</li>
            <li>✍️ Grammar check com IA por mensagem</li>
            <li>🎯 Ver nível CEFR de cada mensagem</li>
          </ul>
        </div>
        <a href="${APP_URL}/friends" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
          Ver solicitação →
        </a>
        <p style="color:#52525b;font-size:12px;margin-top:28px">Acesse SpeakFlow para aceitar ou recusar.<br/>Equipe SpeakFlow</p>
        <hr style="border:none;border-top:1px solid #27272a;margin:24px 0"/>
        <p style="color:#3f3f46;font-size:11px">SpeakFlow · speakf.com.br</p>
      </div>
    `,
  }).catch((err: unknown) => console.error("[sendFriendRequestEmail]", err));
}
