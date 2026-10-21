#!/usr/bin/env tsx
/**
 * Script de instalação do Administrador Master do SpeakFlow Escolas.
 *
 * Uso:
 *   railway run npm run escola:admin-master -- --email luiz.melo@cdsolutions.com.br --nome "Luiz Melo"
 *
 * Comportamento:
 *   - Valida argumentos e variáveis de ambiente obrigatórias
 *   - Cria ou reutiliza o User pelo e-mail (senha inutilizável se criado aqui)
 *   - Cria ou reativa EduPlatformAdmin para esse User
 *   - Invalida convites PLATFORM_ADMIN anteriores e cria um novo (72 h)
 *   - Envia e-mail via Resend com o link de definição de senha
 *   - Grava EduAuditLog com actorType "system"
 *   - Idempotente: rodar de novo não duplica nada
 */

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

// ──────────────────────────────────────────────────────────────────────────────
// Args
// ──────────────────────────────────────────────────────────────────────────────
function parseArgs(): { email: string; nome: string } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const email = get("--email");
  const nome = get("--nome");
  if (!email || !nome) {
    console.error("Uso: npm run escola:admin-master -- --email <email> --nome <nome>");
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("E-mail inválido:", email);
    process.exit(1);
  }
  return { email: email.toLowerCase().trim(), nome: nome.trim() };
}

// ──────────────────────────────────────────────────────────────────────────────
// Env validation
// ──────────────────────────────────────────────────────────────────────────────
function validateEnv() {
  const missing: string[] = [];
  if (process.env.FEATURE_ESCOLAS !== "true") missing.push("FEATURE_ESCOLAS=true");
  if (!process.env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (missing.length) {
    console.error("Variáveis de ambiente obrigatórias ausentes:", missing.join(", "));
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  validateEnv();
  const { email, nome } = parseArgs();

  const prisma = new PrismaClient();
  const resendKey = process.env.RESEND_API_KEY!;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.speakflow.ia.br").replace(/\/$/, "");

  try {
    // 1. Encontra ou cria o User
    let user = await prisma.user.findUnique({ where: { email } });
    let userAction: "criado" | "reutilizado";

    if (user) {
      userAction = "reutilizado";
      console.log(`✓  User encontrado: ${user.name} (${user.id})`);
    } else {
      // Senha inutilizável: string que jamais casa com bcrypt.compare()
      const unusableHash = "BOOTSTRAPPED:" + crypto.randomBytes(32).toString("hex");

      user = await prisma.user.create({
        data: {
          email,
          name: nome,
          password: unusableHash,
          emailVerified: true,
          acceptedTerms: true,
        },
      });
      userAction = "criado";
      console.log(`✓  User criado: ${user.name} (${user.id})`);
    }

    // 2. Cria ou reativa EduPlatformAdmin
    const p = prisma as AnyPrisma;
    const existing = await p.eduPlatformAdmin.findUnique({ where: { userId: user.id } });
    let adminAction: "criado" | "reativado" | "já ativo";

    if (existing) {
      if (!existing.isActive) {
        await p.eduPlatformAdmin.update({ where: { userId: user.id }, data: { isActive: true } });
        adminAction = "reativado";
      } else {
        adminAction = "já ativo";
      }
    } else {
      await p.eduPlatformAdmin.create({
        data: { userId: user.id, createdById: null },
      });
      adminAction = "criado";
    }
    console.log(`✓  EduPlatformAdmin ${adminAction}`);

    // 3. Invalida convites PLATFORM_ADMIN anteriores para este e-mail
    const now = new Date();
    await p.eduInvite.updateMany({
      where: { email, role: "PLATFORM_ADMIN", acceptedAt: null },
      data: { expiresAt: now },
    });

    // 4. Cria novo convite (72 horas)
    const tokenRaw = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(tokenRaw).digest("hex");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await p.eduInvite.create({
      data: {
        networkId: null,
        email,
        name: nome,
        role: "PLATFORM_ADMIN",
        tokenHash,
        expiresAt,
        userId: user.id,
        createdById: "system",
        sentCount: 1,
      },
    });

    const inviteLink = `${appUrl}/escola/convite/${tokenRaw}`;
    console.log(`✓  Convite criado (válido até ${expiresAt.toISOString()})`);

    // 5. Envia e-mail via Resend
    const emailFrom = process.env.EMAIL_FROM ?? "SpeakFlow Escolas <noreply@speakflow.ia.br>";
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: "Defina sua senha de administrador do SpeakFlow Escolas",
        html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;font-family:Inter,Arial,sans-serif;background:#f5f5f5">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
                <tr>
                  <td style="background:#5B21B6;padding:32px 40px">
                    <p style="margin:0;color:#fff;font-size:22px;font-weight:700">SpeakFlow <span style="color:#C4B5FD">Escolas</span></p>
                    <p style="margin:4px 0 0;color:#DDD6FE;font-size:13px">Plataforma educacional para redes municipais</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px">
                    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111">Olá, ${nome}!</h1>
                    <p style="margin:0 0 16px;color:#444;line-height:1.6">
                      Você foi configurado como <strong>Administrador Master</strong> do SpeakFlow Escolas.
                      Clique no botão abaixo para definir sua senha e acessar o painel de administração da plataforma.
                    </p>
                    <p style="margin:0 0 32px;color:#444;line-height:1.6">
                      Este link é válido por <strong>72 horas</strong> e pode ser usado apenas uma vez.
                    </p>
                    <a href="${inviteLink}"
                       style="display:inline-block;background:#5B21B6;color:#fff;font-size:15px;font-weight:600;
                              padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:.3px">
                      Definir senha e acessar
                    </a>
                    <p style="margin:32px 0 0;color:#888;font-size:12px">
                      Se o botão não funcionar, copie e cole no navegador:<br>
                      <a href="${inviteLink}" style="color:#5B21B6;word-break:break-all">${inviteLink}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#F5F3FF;padding:20px 40px;border-top:1px solid #EDE9FE">
                    <p style="margin:0;color:#888;font-size:11px">
                      Este e-mail foi gerado automaticamente pelo sistema de instalação do SpeakFlow Escolas.
                      Se você não esperava recebê-lo, ignore esta mensagem.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
      }),
    });
    const sendError = resendRes.ok ? null : await resendRes.text();

    if (sendError) {
      console.warn("⚠  Não foi possível enviar o e-mail via Resend:", sendError);
      console.warn("   Use o link abaixo manualmente:");
    } else {
      console.log(`✓  E-mail enviado para ${email}`);
    }

    // 6. Audit log
    await p.eduAuditLog.create({
      data: {
        networkId: null,
        actorType: "system",
        actorId: user.id,
        action: "platform_admin.bootstrap",
        entity: "EduPlatformAdmin",
        entityId: user.id,
        metadata: { userAction, adminAction, email },
      },
    });

    console.log("\n─────────────────────────────────────────────");
    console.log(`🎉  Pronto!`);
    console.log(`    User:  ${user.name} <${email}> [${userAction}]`);
    console.log(`    Admin: ${adminAction}`);
    console.log(`    Link:  ${inviteLink}`);
    console.log("─────────────────────────────────────────────\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
