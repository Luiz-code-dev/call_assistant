import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

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

    if (resend && NOTIFY_EMAIL) {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.speakflow.ia.br";
      const approveUrl = `${APP_URL}/api/admin/b2b-approve?secret=${process.env.INTERNAL_API_SECRET}&email=${encodeURIComponent(email)}`;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `🏢 Novo lead B2B: ${company} (${name})`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#09090b;color:#fafafa;border-radius:12px">
            <h2 style="color:#a78bfa;margin:0 0 20px">🏢 Novo lead SpeakFlow for Teams</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="color:#a1a1aa;padding:6px 0;width:120px">Empresa</td><td style="color:#fff;font-weight:600">${company}</td></tr>
              <tr><td style="color:#a1a1aa;padding:6px 0">Nome</td><td style="color:#fff">${name}</td></tr>
              <tr><td style="color:#a1a1aa;padding:6px 0">E-mail</td><td style="color:#fff">${email}</td></tr>
              <tr><td style="color:#a1a1aa;padding:6px 0">Cargo</td><td style="color:#fff">${role ?? "—"}</td></tr>
              <tr><td style="color:#a1a1aa;padding:6px 0">Tamanho do time</td><td style="color:#fff">${teamSize ?? "—"}</td></tr>
              ${message ? `<tr><td style="color:#a1a1aa;padding:6px 0;vertical-align:top">Mensagem</td><td style="color:#d4d4d8">${message}</td></tr>` : ""}
            </table>
            <div style="margin-top:28px;padding:16px;background:#18181b;border-radius:10px;border:1px solid #27272a">
              <p style="color:#a1a1aa;font-size:12px;margin:0 0 12px">Após confirmar com o comercial, clique para aprovar o acesso B2B:</p>
              <a href="${approveUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px">
                ✅ Aprovar acesso B2B para ${email}
              </a>
            </div>
            <p style="color:#3f3f46;font-size:11px;margin-top:20px">SpeakFlow · Notificação interna</p>
          </div>
        `,
      }).catch((err) => console.error("[b2b-lead-notify]", err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[b2b-contact]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
