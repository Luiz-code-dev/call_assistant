import { db } from "@/lib/db";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function generateUniqueUsername(fullName: string): Promise<string> {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = normalize(parts[0] ?? "user");
  const last = parts.length >= 2 ? normalize(parts[parts.length - 1]) : "";
  const penultimate = parts.length >= 3 ? normalize(parts[parts.length - 2]) : null;

  const isTaken = async (candidate: string) =>
    !!(await db.user.findUnique({ where: { username: candidate } }));

  const candidate1 = `${first}${last}`;
  if (!(await isTaken(candidate1))) return candidate1;

  if (penultimate) {
    const candidate2 = `${first}${penultimate}`;
    if (!(await isTaken(candidate2))) return candidate2;
  }

  for (let i = 1; i <= 9999; i++) {
    const candidate3 = `${first}${i}`;
    if (!(await isTaken(candidate3))) return candidate3;
  }

  return `${first}${Date.now()}`;
}

export function formatUsername(username: string): string {
  return `@${username}`;
}
