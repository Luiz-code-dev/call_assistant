/**
 * E-mails da família (SpeakFlow Escolas):
 * - boas-vindas quando o responsável faz o primeiro acesso;
 * - solicitação de suporte enviada pelo assistente do painel da família.
 * Tema claro, sem nota, sem dados sensíveis do aluno além do primeiro nome.
 */
import { Resend } from "resend";
import { urlDoSite } from "@/lib/escola/public-url";

export const EMAIL_SUPORTE = process.env.SUPORTE_ESCOLAS_EMAIL || "luiz.melo@cdsolutions.com.br";

/** Mesmo remetente verificado do e-mail de redefinir senha da família. */
export function remetenteFamilia(): string {
  return process.env.EMAIL_FROM_ESCOLA || process.env.RESEND_FROM || process.env.EMAIL_FROM || "SpeakFlow Escolas <escolas@speakflow.ia.br>";
}

export function escaparHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function primeiroNome(nome: string | null | undefined, padrao: string): string {
  return (nome ?? "").trim().split(/\s+/)[0] || padrao;
}

function base(): string {
  return urlDoSite(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL);
}

const CABECALHO = `
<tr><td style="background:#6D28D9;padding:26px 28px;color:#ffffff">
  <p style="margin:0;font-size:13px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;opacity:.85">SpeakFlow Escolas · Reforço</p>
</td></tr>`;

function bloco(titulo: string, corpo: string): string {
  return `<tr><td style="padding:0 28px 20px">
  <p style="margin:0 0 8px;font-size:16px;font-weight:bold;color:#1F1A2E">${titulo}</p>
  ${corpo}
</td></tr>`;
}

function lista(itens: string[]): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%">${itens.map((i) => `
    <tr><td style="width:22px;vertical-align:top;padding:4px 0;color:#6D28D9;font-weight:bold;font-size:15px">•</td>
    <td style="padding:4px 0;font-size:15px;line-height:1.5;color:#3B3550">${i}</td></tr>`).join("")}</table>`;
}

export function emailBoasVindas(nomeResponsavel: string, nomeAluno: string, siteBase: string) {
  const ola = escaparHtml(primeiroNome(nomeResponsavel, "família"));
  const filho = escaparHtml(primeiroNome(nomeAluno, "seu filho"));
  const painel = `${siteBase}/escola/familia`;
  const subject = `Bem-vindo ao reforço de ${primeiroNome(nomeAluno, "seu filho")} no SpeakFlow Escolas`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaparHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F6F4FE;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding:32px 14px">
<table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:100%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E9E5F5">
${CABECALHO}
<tr><td style="padding:26px 28px 8px">
  <h1 style="margin:0 0 10px;font-size:23px;line-height:1.3;color:#1F1A2E">Olá, ${ola}! Agora você acompanha o reforço de ${filho}.</h1>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#3B3550">O seu cadastro foi feito com a ficha que a escola entregou. A partir de hoje, ${filho} estuda em casa com o SpeakFlow Escolas e você vê, pelo celular, como ${filho} está indo em cada matéria.</p>
</td></tr>
${bloco("Como o reforço ajuda " + filho, lista([
  "<b>Começa do ponto certo.</b> Um diagnóstico descobre o que já foi aprendido e onde a dificuldade começou, mesmo que seja num conteúdo de anos anteriores.",
  "<b>Estudo curto, todo dia.</b> As trilhas têm etapas de cerca de 8 minutos, nas matérias do ano escolar, seguindo a BNCC.",
  "<b>Retorno na hora, sem nota.</b> ${filho} vê o que acertou e como melhorar. O nível aparece como Domina, Quase lá ou Praticando, para não desanimar.",
]))}
${bloco("Como você pode ajudar", lista([
  `Combine com ${filho} um horário fixo para estudar, mesmo que sejam 15 minutos.`,
  "Pergunte o que aprendeu hoje e peça para explicar para você.",
  "Elogie o esforço, não só o resultado. Quase lá também é progresso.",
  "Mande um recado pelo painel. Uma palavra sua faz diferença.",
]))}
${bloco("Como acompanhar pelo celular", lista([
  "No painel da família você vê os dias de estudo da semana e a evolução em cada matéria.",
  `Você recebe um aviso quando ${filho} ficar 24 horas sem estudar, quando precisar de ajuda num assunto e quando tiver uma conquista.`,
  "Para receber os avisos no celular, abra o painel e permita as notificações. No iPhone, adicione o site à tela inicial primeiro.",
]))}
<tr><td align="center" style="padding:6px 28px 28px">
  <a href="${painel}" style="display:inline-block;padding:14px 28px;background:#6D28D9;color:#ffffff;border-radius:14px;text-decoration:none;font-weight:bold;font-size:16px">Abrir o painel da família</a>
  <p style="margin:14px 0 0;font-size:13px;color:#5B5470">Para entrar das próximas vezes, use o seu e-mail ou WhatsApp e a senha que você criou.</p>
</td></tr>
<tr><td style="padding:18px 28px;background:#F6F4FE;font-size:13px;line-height:1.5;color:#5B5470">
  Precisa de ajuda? No painel da família, abra o menu e toque em <b>Suporte</b>. A gente responde por e-mail ou WhatsApp.
</td></tr>
</table>
<p style="margin:14px 0 0;font-size:12px;color:#8B84A0;max-width:520px;line-height:1.4">Você recebeu este e-mail porque se cadastrou como responsável no SpeakFlow Escolas. Se não foi você, responda este e-mail e avisaremos a escola.</p>
</td></tr></table>
</body></html>`;

  const text = `Olá, ${primeiroNome(nomeResponsavel, "família")}! Agora você acompanha o reforço de ${primeiroNome(nomeAluno, "seu filho")} no SpeakFlow Escolas.

Como o reforço ajuda:
- Um diagnóstico descobre onde a dificuldade começou.
- Trilhas curtas, de cerca de 8 minutos, nas matérias do ano, seguindo a BNCC.
- Retorno na hora, sem nota: Domina, Quase lá ou Praticando.

Como você pode ajudar:
- Combine um horário fixo para estudar.
- Pergunte o que aprendeu hoje.
- Elogie o esforço.
- Mande um recado pelo painel.

Como acompanhar: no painel você vê a semana e a evolução por matéria, e recebe avisos quando ficar 24 horas sem estudar, precisar de ajuda ou tiver uma conquista.

Abrir o painel da família: ${painel}`;

  return { subject, html, text };
}

/** Boas-vindas ao responsável. Nunca derruba o cadastro: erros só vão para o log. */
export async function enviarBoasVindasFamilia(para: string, nomeResponsavel: string, nomeAluno: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const msg = emailBoasVindas(nomeResponsavel, nomeAluno, base());
  if (!key) { console.log(`[DEV] boas-vindas da família para ${para}: ${msg.subject}`); return false; }
  try {
    const r = await new Resend(key).emails.send({ from: remetenteFamilia(), to: para, subject: msg.subject, html: msg.html, text: msg.text });
    if ((r as { error?: { message?: string } }).error) { console.error("[escolas/boas-vindas] Resend:", (r as { error: { message?: string } }).error.message); return false; }
    return true;
  } catch (err) {
    console.error("[escolas/boas-vindas] e-mail:", (err as Error).message);
    return false;
  }
}

export interface PedidoSuporte {
  protocolo: string;
  assunto: string;
  descricao: string;
  tentativas: string[];
  responsavel: { nome: string; email: string | null; whatsapp: string | null; responderPor: "email" | "whatsapp" };
  filhos: string[];
  rede: string;
  diagnostico: Record<string, string>;
}

export function emailSuporte(p: PedidoSuporte) {
  const subject = `[Suporte Família ${p.protocolo}] ${p.assunto} — ${p.responsavel.nome}`;
  const linha = (k: string, v: string) => `<tr><td style="padding:6px 10px;color:#5B5470;font-size:13px;white-space:nowrap;vertical-align:top">${escaparHtml(k)}</td><td style="padding:6px 10px;font-size:14px;color:#1F1A2E">${escaparHtml(v || "—")}</td></tr>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#1F1A2E">
  <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#6D28D9;text-transform:uppercase">SpeakFlow Escolas · Suporte da família</p>
  <h1 style="margin:0 0 16px;font-size:20px">${escaparHtml(p.assunto)} <span style="color:#8B84A0;font-weight:normal">#${escaparHtml(p.protocolo)}</span></h1>
  <p style="margin:0 0 6px;font-size:13px;color:#5B5470">O que o responsável escreveu:</p>
  <div style="background:#F6F4FE;border-radius:12px;padding:14px 16px;font-size:15px;line-height:1.5;white-space:pre-wrap">${escaparHtml(p.descricao)}</div>
  <h2 style="font-size:15px;margin:20px 0 6px">Responsável</h2>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;background:#fff;border:1px solid #E9E5F5;border-radius:10px">
    ${linha("Nome", p.responsavel.nome)}${linha("E-mail", p.responsavel.email ?? "")}${linha("WhatsApp", p.responsavel.whatsapp ?? "")}
    ${linha("Responder por", p.responsavel.responderPor === "whatsapp" ? "WhatsApp" : "E-mail")}${linha("Filhos", p.filhos.join(", "))}${linha("Rede", p.rede)}
  </table>
  <h2 style="font-size:15px;margin:20px 0 6px">O assistente já sugeriu</h2>
  <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.5">${p.tentativas.map((t) => `<li>${escaparHtml(t)}</li>`).join("") || "<li>—</li>"}</ul>
  <h2 style="font-size:15px;margin:20px 0 6px">Diagnóstico do aparelho</h2>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;background:#fff;border:1px solid #E9E5F5;border-radius:10px">
    ${Object.entries(p.diagnostico).map(([k, v]) => linha(k, v)).join("")}
  </table>
</div>`;
  const text = `${subject}\n\n${p.descricao}\n\nResponsável: ${p.responsavel.nome} | ${p.responsavel.email ?? "-"} | ${p.responsavel.whatsapp ?? "-"} | responder por ${p.responsavel.responderPor}\nFilhos: ${p.filhos.join(", ")}\nRede: ${p.rede}\n\nJá sugerido:\n${p.tentativas.map((t) => `- ${t}`).join("\n")}\n\nDiagnóstico:\n${Object.entries(p.diagnostico).map(([k, v]) => `${k}: ${v}`).join("\n")}`;
  return { subject, html, text };
}

export async function enviarPedidoSuporte(p: PedidoSuporte): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const msg = emailSuporte(p);
  if (!key) { console.log(`[DEV] suporte da família para ${EMAIL_SUPORTE}: ${msg.subject}`); return false; }
  try {
    const r = await new Resend(key).emails.send({
      from: remetenteFamilia(), to: EMAIL_SUPORTE, subject: msg.subject, html: msg.html, text: msg.text,
      ...(p.responsavel.email ? { replyTo: p.responsavel.email } : {}),
    });
    if ((r as { error?: { message?: string } }).error) { console.error("[escolas/suporte] Resend:", (r as { error: { message?: string } }).error.message); return false; }
    return true;
  } catch (err) {
    console.error("[escolas/suporte] e-mail:", (err as Error).message);
    return false;
  }
}
