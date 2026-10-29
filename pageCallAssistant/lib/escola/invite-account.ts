import bcrypt from "bcryptjs";
import { prismaEdu } from "@/lib/escola/db";

/**
 * Determina o modo de aceite de convite.
 * "create" — usuário ainda não tem conta com passwordHash definida.
 * "login"  — usuário já tem conta com senha → deve confirmar antes de aceitar.
 */
export async function resolveInviteMode(
  email: string,
  existingUserId: string | null | undefined
): Promise<{ mode: "create" | "login"; userId: string | null }> {
  if (!existingUserId) {
    const u = await prismaEdu.eduUser.findFirst({ where: { email }, select: { id: true, passwordHash: true } });
    if (!u || !u.passwordHash) return { mode: "create", userId: u?.id ?? null };
    return { mode: "login", userId: u.id };
  }
  const u = await prismaEdu.eduUser.findUnique({ where: { id: existingUserId }, select: { id: true, passwordHash: true } });
  if (!u?.passwordHash) return { mode: "create", userId: u?.id ?? null };
  return { mode: "login", userId: u.id };
}

/**
 * Garante que o userId existe e tem senha definida corretamente para cada modo.
 * Retorna o userId ou lança um objeto com { error, status }.
 */
export async function resolveAccount(
  invite: { email: string; name: string; userId: string | null | undefined; networkId?: string | null },
  mode: "create" | "login",
  password: string | undefined | null
): Promise<string> {
  if (mode === "create") {
    if (!password || password.length < 8)
      throw { error: "Senha deve ter ao menos 8 caracteres", status: 400 };
    const hash = await bcrypt.hash(password, 12);
    const existing = await prismaEdu.eduUser.findFirst({ where: { email: invite.email } });
    if (existing) {
      if (!existing.passwordHash) {
        await prismaEdu.eduUser.update({ where: { id: existing.id }, data: { passwordHash: hash } });
      }
      return existing.id;
    }
    const created = await prismaEdu.eduUser.create({
      data: { email: invite.email, name: invite.name, passwordHash: hash, isActive: true, networkId: invite.networkId ?? "" },
    });
    return created.id;
  }

  // mode === "login"
  if (!password) throw { error: "Digite sua senha atual para aceitar o convite", status: 400 };
  const uid = invite.userId;
  if (!uid) throw { error: "Conta não encontrada", status: 404 };
  const u = await prismaEdu.eduUser.findUnique({ where: { id: uid }, select: { passwordHash: true } });
  if (!u?.passwordHash) throw { error: "Conta sem senha definida. Entre em contato com o suporte.", status: 400 };
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) throw { error: "Senha atual incorreta", status: 401 };
  return uid;
}
