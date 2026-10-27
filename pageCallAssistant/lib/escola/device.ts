/**
 * "Aparelho de casa" (Etapa 3) — cookie assinado sf_edu_device.
 * Guarda ate 4 alunos (id, primeiro nome, inicial, modo de login) para a
 * tela "Quem vai praticar agora?". Nao contem token de sessao: so lembra
 * quem usa o aparelho. Assinado com o segredo do aluno (integridade).
 */
import { SignJWT, jwtVerify } from "jose";
import { studentSecret } from "@/lib/escola/secrets";

export interface DeviceStudent {
  id: string;
  name: string;    // primeiro nome
  initial: string; // inicial do sobrenome (pode ser "")
  loginMode: string;
}

export const MAX_DEVICE_STUDENTS = 4;
export const DEVICE_MAX_AGE = 60 * 60 * 24 * 180; // 180 dias

/** Primeiro nome + inicial do sobrenome, a partir do nome completo. */
export function studentDisplayParts(fullName: string): { name: string; initial: string } {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const name = parts[0] ?? "Aluno";
  const initial = parts.length > 1 ? (parts[parts.length - 1][0] ?? "").toUpperCase() : "";
  return { name, initial };
}

export async function signDeviceToken(students: DeviceStudent[]): Promise<string> {
  const list = students.slice(0, MAX_DEVICE_STUDENTS);
  return new SignJWT({ st: list })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(studentSecret());
}

export async function readDeviceToken(token: string | undefined | null): Promise<DeviceStudent[]> {
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, studentSecret());
    const st = (payload as { st?: unknown }).st;
    if (!Array.isArray(st)) return [];
    return st
      .filter(
        (s): s is DeviceStudent =>
          !!s &&
          typeof (s as DeviceStudent).id === "string" &&
          typeof (s as DeviceStudent).name === "string" &&
          typeof (s as DeviceStudent).initial === "string" &&
          typeof (s as DeviceStudent).loginMode === "string"
      )
      .slice(0, MAX_DEVICE_STUDENTS);
  } catch {
    return [];
  }
}

/** Coloca o aluno no topo da lista, sem duplicar, respeitando o limite. */
export function addDeviceStudent(list: DeviceStudent[], student: DeviceStudent): DeviceStudent[] {
  const rest = list.filter((x) => x.id !== student.id);
  return [student, ...rest].slice(0, MAX_DEVICE_STUDENTS);
}
