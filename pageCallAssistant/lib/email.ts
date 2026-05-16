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
          <img src="${APP_URL}/icon.svg" width="36" height="36" alt="" style="display:block;border-radius:9px" />
          <span style="font-weight:800;font-size:20px;letter-spacing:-0.5px">SpeakFlow</span>
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
          <img src="${APP_URL}/icon.svg" width="36" height="36" alt="" style="display:block;border-radius:9px" />
          <span style="font-weight:800;font-size:20px;letter-spacing:-0.5px">SpeakFlow</span>
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
          <img src="${APP_URL}/icon.svg" width="36" height="36" alt="" style="display:block;border-radius:9px" />
          <span style="font-weight:800;font-size:20px;letter-spacing:-0.5px">SpeakFlow</span>
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

export async function sendB2BApprovalEmail(toEmail: string, name: string) {
  const teamsLink = `${APP_URL}/teams/create`;
  const firstName = name?.split(" ")[0] || "usuário";

  if (!resend) {
    console.log(`[DEV] B2B approval email to ${toEmail}: ${teamsLink}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: "✅ Sua conta corporativa foi aprovada — SpeakFlow for Teams",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:0;background:#09090b;color:#fafafa;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#14532d,#166534,#1a3a5c);padding:36px 28px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:20px">
            <img src="${APP_URL}/icon.svg" width="38" height="38" alt="" style="display:inline-block;border-radius:10px;vertical-align:middle" />
            <span style="font-weight:800;font-size:21px;color:#fff;vertical-align:middle;letter-spacing:-0.5px">SpeakFlow</span>
          </div>
          <div style="font-size:48px;margin-bottom:12px">✅</div>
          <h1 style="font-size:24px;font-weight:800;margin:0 0 6px;color:#fff">Conta aprovada, ${firstName}!</h1>
          <p style="color:#86efac;margin:0;font-size:15px">Seu acesso ao SpeakFlow for Teams está ativo</p>
        </div>
        <div style="padding:32px 28px">
          <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px">
            A sua conta corporativa foi aprovada pela equipe SpeakFlow. Você já pode criar o workspace da sua empresa, convidar colaboradores e começar a usar o copiloto de comunicação com IA em tempo real.
          </p>
          <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 14px;font-size:13px;font-weight:600;color:#a78bfa;text-transform:uppercase;letter-spacing:0.05em">Próximos passos</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
              <tr><td style="padding:6px 0">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:26px;vertical-align:middle"><span style="display:inline-block;background:#7c3aed;color:#fff;font-size:11px;font-weight:700;width:20px;height:20px;border-radius:50%;text-align:center;line-height:20px">1</span></td>
                  <td style="font-size:14px;color:#d4d4d8;padding-left:10px;vertical-align:middle">Crie o workspace da sua empresa</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:6px 0">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:26px;vertical-align:middle"><span style="display:inline-block;background:#7c3aed;color:#fff;font-size:11px;font-weight:700;width:20px;height:20px;border-radius:50%;text-align:center;line-height:20px">2</span></td>
                  <td style="font-size:14px;color:#d4d4d8;padding-left:10px;vertical-align:middle">Convide colaboradores por e-mail</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:6px 0">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:26px;vertical-align:middle"><span style="display:inline-block;background:#7c3aed;color:#fff;font-size:11px;font-weight:700;width:20px;height:20px;border-radius:50%;text-align:center;line-height:20px">3</span></td>
                  <td style="font-size:14px;color:#d4d4d8;padding-left:10px;vertical-align:middle">Configure desafios por função</td>
                </tr></table>
              </td></tr>
            </table>
          </div>
          <div style="text-align:center">
            <a href="${teamsLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px">
              Criar minha organização →
            </a>
          </div>
        </div>
        <div style="background:#09090b;padding:16px 28px;border-top:1px solid #18181b">
          <p style="color:#3f3f46;font-size:11px;margin:0">SpeakFlow for Teams · speakflow.ia.br</p>
        </div>
      </div>
    `,
  }).catch((err: unknown) => console.error("[sendB2BApprovalEmail]", err));
}

export async function sendOrgInviteEmail(
  toEmail: string,
  orgName: string,
  inviterName: string,
  role: string,
  token: string,
  expiresAt: Date
) {
  const inviteLink = `${APP_URL}/teams/invite/${token}`;
  const roleLabel = role === "admin" ? "Administrador" : "Membro";
  const expiryDate = expiresAt.toLocaleDateString("pt-BR");

  if (!resend) {
    console.log(`[DEV] Org invite email to ${toEmail}: ${inviteLink}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `${inviterName} te convidou para ${orgName} no SpeakFlow for Teams`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:0;background:#09090b;color:#fafafa;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#4c1d95,#312e81);padding:36px 28px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:20px">
            <img src="${APP_URL}/icon.svg" width="38" height="38" alt="" style="display:inline-block;border-radius:10px;vertical-align:middle" />
            <span style="font-weight:800;font-size:21px;color:#fff;vertical-align:middle;letter-spacing:-0.5px">SpeakFlow</span>
          </div>
          <div style="font-size:44px;margin-bottom:12px">🏢</div>
          <h1 style="font-size:22px;font-weight:800;margin:0 0 6px;color:#fff">Você foi convidado!</h1>
          <p style="color:#c4b5fd;margin:0;font-size:15px">${inviterName} te convidou para <strong style="color:#fff">${orgName}</strong></p>
        </div>
        <div style="padding:32px 28px">
          <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 4px;font-size:13px;color:#a1a1aa">Organização</p>
            <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#fff">${orgName}</p>
            <p style="margin:0 0 4px;font-size:13px;color:#a1a1aa">Sua função</p>
            <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#a78bfa">${roleLabel}</p>
            <p style="margin:0 0 4px;font-size:13px;color:#a1a1aa">Convite expira em</p>
            <p style="margin:0;font-size:14px;color:#71717a">${expiryDate}</p>
          </div>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px">
            Ao aceitar, você terá acesso ao painel da equipe com sessões Live, desafios de comunicação e analytics de evolução.
          </p>
          <div style="text-align:center;margin-bottom:24px">
            <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px">
              Aceitar convite →
            </a>
          </div>
          <p style="color:#3f3f46;font-size:12px;text-align:center;margin:0">
            Ou acesse: <a href="${inviteLink}" style="color:#7c3aed">${inviteLink}</a>
          </p>
        </div>
        <div style="background:#09090b;padding:16px 28px;border-top:1px solid #18181b">
          <p style="color:#3f3f46;font-size:11px;margin:0">SpeakFlow for Teams · speakflow.ia.br</p>
        </div>
      </div>
    `,
  }).catch((err: unknown) => console.error("[sendOrgInviteEmail]", err));
}

export async function sendCrmAccessEmail(
  toEmail: string,
  name: string,
  grant: boolean
) {
  const firstName = name?.split(" ")[0] || "usuário";
  const crmLink = `${APP_URL}/crm`;

  if (!resend) {
    console.log(`[DEV] CRM access email (${grant ? "grant" : "revoke"}) to ${toEmail}`);
    return;
  }

  if (grant) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "📊 Você agora tem acesso ao CRM & Growth Center — SpeakFlow",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:0;background:#09090b;color:#fafafa;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#064e3b,#065f46,#1e3a5c);padding:36px 28px;text-align:center">
            <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:20px">
              <img src="${APP_URL}/icon.svg" width="38" height="38" alt="" style="display:inline-block;border-radius:10px;vertical-align:middle" />
              <span style="font-weight:800;font-size:21px;color:#fff;vertical-align:middle;letter-spacing:-0.5px">SpeakFlow</span>
            </div>
            <div style="font-size:48px;margin-bottom:12px">📊</div>
            <h1 style="font-size:24px;font-weight:800;margin:0 0 6px;color:#fff">Acesso liberado, ${firstName}!</h1>
            <p style="color:#6ee7b7;margin:0;font-size:15px">Você agora faz parte da equipe comercial</p>
          </div>
          <div style="padding:32px 28px">
            <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px">
              O administrador liberou seu acesso ao <strong style="color:#fff">CRM &amp; Growth Center</strong> do SpeakFlow. Você já pode acessar o painel comercial com leads, pipeline, analytics e muito mais.
            </p>
            <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:24px">
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#34d399;text-transform:uppercase;letter-spacing:0.05em">O que você pode fazer agora</p>
              <ul style="margin:0;padding-left:18px;color:#d4d4d8;font-size:14px;line-height:2">
                <li>📋 Gerenciar e criar leads comerciais</li>
                <li>🚀 Visualizar o pipeline de vendas (Kanban)</li>
                <li>📈 Acompanhar métricas de crescimento e MRR</li>
                <li>👥 Explorar usuários da plataforma por plano</li>
              </ul>
            </div>
            <div style="text-align:center">
              <a href="${crmLink}" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px">
                Acessar CRM &amp; Growth Center →
              </a>
            </div>
          </div>
          <div style="background:#09090b;padding:16px 28px;border-top:1px solid #18181b">
            <p style="color:#3f3f46;font-size:11px;margin:0">SpeakFlow · speakflow.ia.br</p>
          </div>
        </div>
      `,
    }).catch((err: unknown) => console.error("[sendCrmAccessEmail grant]", err));
  } else {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "Acesso ao CRM removido — SpeakFlow",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
            <img src="${APP_URL}/icon.svg" width="36" height="36" alt="" style="display:block;border-radius:9px" />
            <span style="font-weight:800;font-size:20px;letter-spacing:-0.5px">SpeakFlow</span>
          </div>
          <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">Olá, ${firstName}</h1>
          <p style="color:#a1a1aa;margin:0 0 20px;font-size:15px;line-height:1.6">
            Seu acesso ao <strong style="color:#fafafa">CRM &amp; Growth Center</strong> foi removido pelo administrador. Se acredita que isso foi um engano, entre em contato com o suporte.
          </p>
          <p style="color:#52525b;font-size:12px;margin-top:28px">Equipe SpeakFlow</p>
          <hr style="border:none;border-top:1px solid #27272a;margin:24px 0"/>
          <p style="color:#3f3f46;font-size:11px">SpeakFlow · speakflow.ia.br</p>
        </div>
      `,
    }).catch((err: unknown) => console.error("[sendCrmAccessEmail revoke]", err));
  }
}

export async function sendPromoWelcomeEmail(email: string, name: string, verifyLink: string) {
  if (!resend) {
    console.log(`[DEV] Promo welcome email would be sent to ${email}`);
    return;
  }

  const firstName = name?.split(" ")[0] || "usuário";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "🚀 Parabéns! Você garantiu 300 créditos grátis — SpeakFlow",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:0;background:#09090b;color:#fafafa;border-radius:16px;overflow:hidden">

        <!-- Header banner -->
        <div style="background:linear-gradient(135deg,#4c1d95,#312e81,#1e3a5f);padding:36px 28px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:20px">
            <img src="${APP_URL}/icon.svg" width="38" height="38" alt="" style="display:inline-block;border-radius:10px;vertical-align:middle" />
            <span style="font-weight:800;font-size:21px;color:#fff;vertical-align:middle;letter-spacing:-0.5px">SpeakFlow</span>
          </div>
          <div style="font-size:48px;margin-bottom:12px">🚀</div>
          <h1 style="font-size:26px;font-weight:800;margin:0 0 8px;color:#fff">Parabéns, ${firstName}!</h1>
          <p style="color:#c4b5fd;margin:0;font-size:16px">Você é um dos primeiros 300 usuários do SpeakFlow</p>
        </div>

        <!-- Body -->
        <div style="padding:32px 28px">

          <!-- Credits box -->
          <div style="background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.15));border:1px solid rgba(124,58,237,0.4);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
            <p style="color:#a1a1aa;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">Você recebeu</p>
            <p style="font-size:52px;font-weight:900;margin:0;color:#a78bfa;line-height:1">300</p>
            <p style="font-size:18px;font-weight:700;color:#fff;margin:4px 0 0">créditos grátis</p>
            <p style="color:#71717a;font-size:12px;margin:8px 0 0">Bônus exclusivo de lançamento · válido imediatamente após ativar sua conta</p>
          </div>

          <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 20px">
            Você chegou na hora certa! Como um dos primeiros membros, você ganhou <strong style="color:#a78bfa">6x mais créditos</strong> do que um cadastro normal — e pode usar em todas as ferramentas do SpeakFlow:
          </p>

          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:28px">
            <div style="display:flex;align-items:center;gap:12px;background:#18181b;border-radius:10px;padding:14px 16px">
              <span style="font-size:20px">🎙</span>
              <div>
                <p style="margin:0;font-size:14px;font-weight:700;color:#fafafa">SpeakFlow Live</p>
                <p style="margin:2px 0 0;font-size:12px;color:#71717a">Pratique inglês em tempo real com IA</p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;background:#18181b;border-radius:10px;padding:14px 16px">
              <span style="font-size:20px">💼</span>
              <div>
                <p style="margin:0;font-size:14px;font-weight:700;color:#fafafa">Simulador de Entrevistas</p>
                <p style="margin:2px 0 0;font-size:12px;color:#71717a">Prepare-se para entrevistas em inglês</p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;background:#18181b;border-radius:10px;padding:14px 16px">
              <span style="font-size:20px">✍️</span>
              <div>
                <p style="margin:0;font-size:14px;font-weight:700;color:#fafafa">Gerador & Corretor de Textos</p>
                <p style="margin:2px 0 0;font-size:12px;color:#71717a">Escreva e melhore seus textos em inglês</p>
              </div>
            </div>
          </div>

          <!-- CTA -->
          <div style="text-align:center;margin-bottom:28px">
            <a href="${verifyLink}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 24px rgba(124,58,237,0.4)">
              Ativar minha conta e começar →
            </a>
            <p style="color:#52525b;font-size:12px;margin-top:12px">Confirme seu e-mail para liberar os 300 créditos. Link válido por 24 horas.</p>
          </div>

          <hr style="border:none;border-top:1px solid #27272a;margin:0 0 20px"/>
          <p style="color:#52525b;font-size:12px;margin:0">Boas-vindas ao SpeakFlow! Estamos animados em ter você por aqui.<br/>— Equipe SpeakFlow</p>
        </div>

        <div style="background:#09090b;padding:16px 28px;border-top:1px solid #18181b">
          <p style="color:#3f3f46;font-size:11px;margin:0">SpeakFlow · speakf.com.br</p>
        </div>
      </div>
    `,
  }).catch((err: unknown) => console.error("[sendPromoWelcomeEmail]", err));
}
