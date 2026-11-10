import { describe, it, expect } from "vitest";
import { urlDoSite } from "./public-url";

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
