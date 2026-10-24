import bcrypt from "bcryptjs";
import { prismaEdu } from "@/lib/escola/db";

/**
 * Determina o modo de aceite de convite.
 * "create" — usuário ainda não tem conta com senha definida.
 * "login"  — usuário já tem conta com senha → deve confirmar com a senha atual antes de aceitar.
 */
export async function resolveInviteMode(
  email: string,
  existingUserId: string | null | undefined
): Promise<{ mode: "create" | "login"; userId: string | null }> {
  if (!existingUserId) {
    const u = await prismaEdu.user.findFirst({ where: { email }, select: { id: true, password: true } });
    if (!u || !u.password) return { mode: "create", userId: u?.id ?? null };
    return { mode: "login", userId: u.id };
  }
  const u = await prismaEdu.user.findUnique({ where: { id: existingUserId }, select: { id: true, password: true } });
  if (!u?.password) return { mode: "create", userId: u?.id ?? null };
  return { mode: "login", userId: u.id };
}

/**
 * Garante que o userId existe e tem senha definida corretamente para cada modo.
 * Retorna o userId ou lança um objeto com { error, status }.
 */
export async function resolveAccount(
  invite: { email: string; name: string; userId: string | null | undefined },
  mode: "create" | "login",
  password: string | undefined | null
): Promise<string> {
  if (mode === "create") {
    if (!password || password.length < 8)
      throw { error: "Senha deve ter ao menos 8 caracteres", status: 400 };
    const hash = await bcrypt.hash(password, 12);
    const existing = await prismaEdu.user.findFirst({ where: { email: invite.email } });
    if (existing) {
      if (!existing.password) {
        await prismaEdu.user.update({ where: { id: existing.id }, data: { password: hash } });
      }
      return existing.id;
    }
    const created = await prismaEdu.user.create({
      data: { email: invite.email, name: invite.name, password: hash, emailVerified: true, acceptedTerms: true },
    });
    return created.id;
  }

  // mode === "login"
  if (!password) throw { error: "Digite sua senha atual para aceitar o convite", status: 400 };
  const uid = invite.userId;
  if (!uid) throw { error: "Conta não encontrada", status: 404 };
  const u = await prismaEdu.user.findUnique({ where: { id: uid }, select: { password: true } });
  if (!u?.password) throw { error: "Conta sem senha definida. Entre em contato com o suporte.", status: 400 };
  const ok = await bcrypt.compare(password, u.password);
  if (!ok) throw { error: "Senha atual incorreta", status: 401 };
  return uid;
}
