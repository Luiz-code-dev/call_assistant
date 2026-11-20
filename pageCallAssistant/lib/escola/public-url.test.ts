import { describe, it, expect } from "vitest";
import { enderecoNoNavegador, enderecoProprioDoEscolas, urlDoSite } from "./public-url";

describe("urlDoSite", () => {
  it("o domínio sem www vira www (sem www a página não abre)", () => {
    expect(urlDoSite("https://speakflow.ia.br")).toBe("https://www.speakflow.ia.br");
    expect(urlDoSite("http://speakflow.ia.br/")).toBe("https://www.speakflow.ia.br");
  });
  it("mantém o www e outros endereços", () => {
    expect(urlDoSite("https://www.speakflow.ia.br")).toBe("https://www.speakflow.ia.br");
    expect(urlDoSite("http://localhost:3000")).toBe("http://localhost:3000");
  });
  it("sem endereço usa o www", () => {
    expect(urlDoSite(undefined)).toBe("https://www.speakflow.ia.br");
    expect(urlDoSite("0.0.0.0:3000")).toBe("https://www.speakflow.ia.br");
  });
});

describe("endereço próprio do Escolas (ESCOLAS_PUBLIC_URL)", () => {
  it("sem a variável não muda nada", () => {
    expect(enderecoProprioDoEscolas(undefined)).toBeNull();
    expect(enderecoProprioDoEscolas("")).toBeNull();
  });
  it("aceita só https e devolve a origem limpa", () => {
    expect(enderecoProprioDoEscolas("https://reforco.exemplo.gov.br/")).toBe("https://reforco.exemplo.gov.br");
    expect(enderecoProprioDoEscolas(' "https://reforco.exemplo.gov.br/escola" ')).toBe("https://reforco.exemplo.gov.br");
    expect(enderecoProprioDoEscolas("http://reforco.exemplo.gov.br")).toBeNull();
    expect(enderecoProprioDoEscolas("reforco.exemplo.gov.br")).toBeNull();
  });
  it("com a variável, todos os links usam o endereço próprio", () => {
    const antes = process.env.ESCOLAS_PUBLIC_URL;
    process.env.ESCOLAS_PUBLIC_URL = "https://reforco.exemplo.gov.br";
    try {
      expect(urlDoSite(undefined)).toBe("https://reforco.exemplo.gov.br");
      expect(urlDoSite("https://www.speakflow.ia.br")).toBe("https://reforco.exemplo.gov.br");
    } finally {
      if (antes === undefined) delete process.env.ESCOLAS_PUBLIC_URL; else process.env.ESCOLAS_PUBLIC_URL = antes;
    }
    expect(urlDoSite(undefined)).toBe("https://www.speakflow.ia.br");
  });
});

describe("endereço no navegador", () => {
  it("no domínio atual e em localhost, o endereço padrão de sempre", () => {
    expect(enderecoNoNavegador("https://www.speakflow.ia.br", "www.speakflow.ia.br")).toBe("https://www.speakflow.ia.br");
    expect(enderecoNoNavegador("https://speakflow.ia.br", "speakflow.ia.br")).toBe("https://www.speakflow.ia.br");
    expect(enderecoNoNavegador("http://localhost:3000", "localhost")).toBe("https://www.speakflow.ia.br");
  });
  it("em domínio próprio, o endereço em que a pessoa está", () => {
    expect(enderecoNoNavegador("https://reforco.exemplo.gov.br", "reforco.exemplo.gov.br")).toBe("https://reforco.exemplo.gov.br");
  });
});
