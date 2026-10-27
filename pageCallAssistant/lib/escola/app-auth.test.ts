import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// next/headers nao existe fora do Next; mockamos um store simples.
const headerStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: () => ({ get: (k: string) => headerStore.get(k.toLowerCase()) ?? null }),
}));

import { verifyTypedToken, bearerToken, isAppClient, APP_CLIENT, AUD_LEGACY_UNTIL } from "./app-auth";

const SECRET = new TextEncoder().encode("test-secret-com-pelo-menos-32-caracteres!!");

async function makeToken(opts: { aud?: string; exp?: string | number } = {}) {
  let b = new SignJWT({ sub: "u1", nid: "n1" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt();
  if (opts.aud) b = b.setAudience(opts.aud);
  b = b.setExpirationTime(opts.exp ?? "1h");
  return b.sign(SECRET);
}

describe("verifyTypedToken (aud + assinatura + expiracao)", () => {
  it("aceita token com aud correto", async () => {
    const p = await verifyTypedToken(await makeToken({ aud: "staff" }), SECRET, "staff");
    expect(p?.sub).toBe("u1");
  });

  it("rejeita token de aluno numa leitura de equipe (aud errado)", async () => {
    expect(await verifyTypedToken(await makeToken({ aud: "student" }), SECRET, "staff")).toBeNull();
  });

  it("rejeita token expirado", async () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(await verifyTypedToken(await makeToken({ aud: "staff", exp: past }), SECRET, "staff")).toBeNull();
  });

  it("rejeita assinatura invalida", async () => {
    const outro = new TextEncoder().encode("outro-secret-com-pelo-menos-32-caracteres!");
    expect(await verifyTypedToken(await makeToken({ aud: "staff" }), outro, "staff")).toBeNull();
  });

  it("aceita token legado sem aud DENTRO da janela de migracao", async () => {
    const antes = AUD_LEGACY_UNTIL.getTime() - 1000;
    const p = await verifyTypedToken(await makeToken({}), SECRET, "staff", antes);
    expect(p?.sub).toBe("u1");
  });

  it("recusa token legado sem aud DEPOIS da janela de migracao", async () => {
    const depois = AUD_LEGACY_UNTIL.getTime() + 1000;
    expect(await verifyTypedToken(await makeToken({}), SECRET, "staff", depois)).toBeNull();
  });

  // Sentinela: falha de proposito apos AUD_LEGACY_UNTIL para forcar a remocao
  // da tolerancia ao token legado (e o TODO em app-auth.ts).
  it("ainda estamos no periodo de tolerancia ao legado (remover apos o prazo)", () => {
    expect(Date.now()).toBeLessThan(AUD_LEGACY_UNTIL.getTime());
  });
});

describe("bearerToken / isAppClient", () => {
  beforeEach(() => headerStore.clear());

  it("extrai o token de Authorization: Bearer", () => {
    headerStore.set("authorization", "Bearer abc.def.ghi");
    expect(bearerToken()).toBe("abc.def.ghi");
  });

  it("sem Authorization retorna null", () => {
    expect(bearerToken()).toBeNull();
  });

  it("detecta o app pelo cabecalho X-Client", () => {
    headerStore.set("x-client", APP_CLIENT);
    expect(isAppClient()).toBe(true);
  });

  it("qualquer outro cliente nao e app", () => {
    headerStore.set("x-client", "navegador");
    expect(isAppClient()).toBe(false);
  });
});
