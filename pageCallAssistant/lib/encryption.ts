import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

const SECRET = process.env.ENCRYPTION_SECRET ?? "default-insecure-key-change-me";

function derivedKey(conversationKey: string): Buffer {
  return createHmac("sha256", SECRET).update(conversationKey).digest();
}

export function conversationKey(userA: string, userB: string): string {
  return [userA, userB].sort().join(":");
}

export function encryptMessage(plaintext: string, convKey: string): { content: string; iv: string } {
  const key = derivedKey(convKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([tag, encrypted]);
  return {
    content: payload.toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decryptMessage(content: string, iv: string, convKey: string): string {
  try {
    const key = derivedKey(convKey);
    const ivBuf = Buffer.from(iv, "base64");
    const payload = Buffer.from(content, "base64");
    const tag = payload.subarray(0, 16);
    const encrypted = payload.subarray(16);
    const decipher = createDecipheriv("aes-256-gcm", key, ivBuf);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    return "[mensagem não pôde ser decifrada]";
  }
}
