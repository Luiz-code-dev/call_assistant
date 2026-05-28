import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";

export const dynamic = "force-dynamic"; // b2b lead notify

const resend      = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL  = process.env.EMAIL_FROM || "SpeakFlow <onboarding@resend.dev>";
const NOTIFY_EMAIL = process.env.B2B_NOTIFY_EMAIL || process.env.ADMIN_EMAILS?.split(",")[0] || "";

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, role, teamSize, message } = await req.json();

    if (!name || !email || !company) {
      return NextResponse.json({ error: "Nome, e-mail e empresa são obrigatórios." }, { status: 400 });
    }

    await (db as any).supportMessage.create({
      data: {
        name,
        email,
        message: `[B2B LEAD]\nEmpresa: ${company}\nCargo: ${role ?? "—"}\nTamanho do time: ${teamSize ?? "—"}\n\n${message ?? "Solicitou demonstração."}`,
      },
    });

    let emailSent = false;
    let emailError: string | null = null;

    if (!resend) {
      console.warn("[b2b-lead] RESEND_API_KEY não configurado — e-mail não enviado.");
    } else if (!NOTIFY_EMAIL) {
      console.warn("[b2b-lead] B2B_NOTIFY_EMAIL não configurado — e-mail não enviado.");
    } else {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.speakflow.ia.br";
      const seats = teamSize ? (parseInt(String(teamSize).replace(/\D.*/,"")) || 5) : 5;
      const approveUrl = `${APP_URL}/api/admin/b2b-approve?secret=${process.env.INTERNAL_API_SECRET}&email=${encodeURIComponent(email)}&seats=${seats}`;

      const sizeStr = String(teamSize ?? "");
      const rawNum = parseInt(sizeStr.replace(/\D.*/,"")) || 0;
      let pricePerUser = "R$ 100";
      let monthlyEst   = "";
      if (sizeStr.includes("100+") || rawNum > 50) {
        pricePerUser = "Custom"; monthlyEst = "Consulta comercial";
      } else if (rawNum >= 26 || sizeStr.includes("31")) {
        pricePerUser = "R$ 70"; monthlyEst = `R$ ${(rawNum * 70).toLocaleString("pt-BR")}/mês (estimado)`;
      } else if (rawNum >= 11 || sizeStr.includes("16")) {
        pricePerUser = "R$ 85"; monthlyEst = `R$ ${(rawNum * 85).toLocaleString("pt-BR")}/mês (estimado)`;
      } else {
        pricePerUser = "R$ 100"; monthlyEst = `R$ ${(rawNum * 100).toLocaleString("pt-BR")}/mês (estimado)`;
      }

      console.log(`[b2b-lead] Enviando e-mail de ${FROM_EMAIL} para ${NOTIFY_EMAIL} ...`);

      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        replyTo: `${name} <${email}>`,
        subject: `[SpeakFlow] Novo lead B2B: ${company} - ${name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#ffffff;color:#111111;border:1px solid #e5e7eb;border-radius:8px">
            <h2 style="color:#111111;font-size:18px;margin:0 0 20px;border-bottom:2px solid #7c3aed;padding-bottom:10px">Novo lead SpeakFlow for Teams</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr style="border-bottom:1px solid #f3f4f6"><td style="color:#6b7280;padding:8px 0;width:130px;vertical-align:top">Empresa</td><td style="color:#111111;font-weight:bold;padding:8px 0">${company}</td></tr>
              <tr style="border-bottom:1px solid #f3f4f6"><td style="color:#6b7280;padding:8px 0;vertical-align:top">Nome</td><td style="color:#111111;padding:8px 0">${name}</td></tr>
              <tr style="border-bottom:1px solid #f3f4f6"><td style="color:#6b7280;padding:8px 0;vertical-align:top">E-mail</td><td style="padding:8px 0"><a href="mailto:${email}?subject=SpeakFlow for Teams - ${company}" style="color:#7c3aed;font-weight:bold;text-decoration:none">${email}</a></td></tr>
              <tr style="border-bottom:1px solid #f3f4f6"><td style="color:#6b7280;padding:8px 0;vertical-align:top">Cargo</td><td style="color:#111111;padding:8px 0">${role ?? "—"}</td></tr>
              <tr style="border-bottom:1px solid #f3f4f6"><td style="color:#6b7280;padding:8px 0;vertical-align:top">Tamanho do time</td><td style="color:#111111;padding:8px 0">${teamSize ?? "—"}</td></tr>
              <tr style="border-bottom:1px solid #f3f4f6;background:#faf5ff"><td style="color:#6b7280;padding:8px 0;vertical-align:top">Plano estimado</td><td style="color:#7c3aed;font-weight:bold;padding:8px 0">${pricePerUser}/usuário/mês</td></tr>
              <tr style="border-bottom:1px solid #f3f4f6;background:#faf5ff"><td style="color:#6b7280;padding:8px 0;vertical-align:top">Receita estimada</td><td style="color:#059669;font-weight:bold;padding:8px 0">${monthlyEst}</td></tr>
              ${message ? `<tr><td style="color:#6b7280;padding:8px 0;vertical-align:top">Mensagem</td><td style="color:#374151;padding:8px 0">${message}</td></tr>` : ""}
            </table>
            <div style="margin-top:24px;text-align:center">
              <a href="mailto:${email}?subject=SpeakFlow for Teams - Agendarmos uma conversa&body=Ola ${name}, recebi sua solicitacao de demo do SpeakFlow for Teams para a empresa ${company}. Quando teria disponibilidade para uma conversa rapida?"
                style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px">
                Entrar em contato com ${name}
              </a>
              <p style="color:#6b7280;font-size:12px;margin-top:8px">Ou clique em Responder — o email ja vai direto para o interessado.</p>
            </div>
            <div style="margin-top:16px;padding:14px;background:#f9fafb;border-left:4px solid #d1d5db;border-radius:4px">
              <p style="color:#6b7280;font-size:12px;margin:0">Apos fechar o contrato, acesse o painel <strong>/superadmin</strong> para liberar o acesso B2B desta empresa.</p>
            </div>
            <p style="color:#9ca3af;font-size:11px;margin-top:20px">SpeakFlow — Notificacao interna</p>
          </div>
        `,
      });

      if (result.error) {
        emailError = JSON.stringify(result.error);
        console.error("[b2b-lead] Resend erro:", emailError);
      } else {
        emailSent = true;
        console.log("[b2b-lead] E-mail enviado. ID:", result.data?.id);
      }
    }

    return NextResponse.json({ ok: true, emailSent, emailError });
  } catch (err) {
    console.error("[b2b-contact]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
