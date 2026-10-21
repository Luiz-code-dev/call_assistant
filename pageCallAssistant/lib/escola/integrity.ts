import { createHash, createHmac, createPrivateKey, sign } from "node:crypto";

export interface GradeEntryData {
  networkId: string;
  assessmentId: string;
  studentId: string;
  value: number | null;
  absent: boolean;
  version: number;
  correctionId: string | null;
  enteredById: string;
  enteredAt: string;
  prevHash: string;
}

export function computeGradeHash(entry: GradeEntryData): string {
  const canonical = JSON.stringify({
    networkId: entry.networkId,
    assessmentId: entry.assessmentId,
    studentId: entry.studentId,
    value: entry.value,
    absent: entry.absent,
    version: entry.version,
    correctionId: entry.correctionId,
    enteredById: entry.enteredById,
    enteredAt: entry.enteredAt,
    prevHash: entry.prevHash,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function signHash(hash: string): { signature: string; keyId: string } {
  const privateKeyPem = process.env.EDU_SIGNING_PRIVATE_KEY;
  const keyId = process.env.EDU_SIGNING_KEY_ID ?? "dev-key";

  if (!privateKeyPem) {
    const hmacSecret = process.env.EDU_STUDENT_JWT_SECRET ?? "edu-dev-secret";
    const signature = createHmac("sha256", hmacSecret).update(hash).digest("hex");
    return { signature: `hmac:${signature}`, keyId: "dev-hmac" };
  }

  const privateKey = createPrivateKey(privateKeyPem);
  const signature = sign(null, Buffer.from(hash, "hex"), privateKey).toString("base64");
  return { signature, keyId };
}

export function buildRootHash(hashes: string[]): string {
  if (hashes.length === 0) return createHash("sha256").update("empty").digest("hex");
  const sorted = [...hashes].sort();
  return createHash("sha256").update(sorted.join("|")).digest("hex");
}

export function pseudonymize(studentId: string): string {
  const secret = process.env.EDU_PSEUDONYM_SECRET ?? "edu-pseudonym-dev";
  return createHmac("sha256", secret).update(studentId).digest("hex").slice(0, 16);
}

export function generateVerificationCode(
  networkId: string,
  classSubjectId: string,
  termId: string,
  version: number
): string {
  const raw = `${networkId}|${classSubjectId}|${termId}|${version}|${Date.now()}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 12).toUpperCase();
}
