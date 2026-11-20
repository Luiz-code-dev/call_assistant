import { describe, it, expect } from "vitest";
import { agendadoresInternos, apenasEscolas, arquivoPublico, caminhoDoEscolas, decidirEscopoEscolas } from "./escopo";

describe("escopo da instância", () => {
  it("sem variável, nada muda: serve tudo e os lembretes rodam no servidor", () => {
    expect(apenasEscolas(undefined)).toBe(false);
    expect(agendadoresInternos(undefined)).toBe(true);
  });
  it("liga só com o valor exato (com ou sem aspas, maiúsculas ou espaços)", () => {
    expect(apenasEscolas("escolas")).toBe(true);
    expect(apenasEscolas(' "Escolas" ')).toBe(true);
    expect(apenasEscolas("tudo")).toBe(false);
    expect(apenasEscolas("")).toBe(false);
    expect(agendadoresInternos("externo")).toBe(false);
    expect(agendadoresInternos("interno")).toBe(true);
    expect(agendadoresInternos("qualquer")).toBe(true);
  });
});

describe("caminhos", () => {
  it("reconhece o que é do Escolas", () => {
    for (const p of ["/escola", "/escola/inicio", "/escola/aluno/entrar", "/escola-icons/a.png", "/escola-manifest.json", "/verificar", "/verificar/abc"]) {
      expect(caminhoDoEscolas(p), p).toBe(true);
    }
    for (const p of ["/", "/login", "/dashboard", "/escolas", "/escolar/x", "/verificarx"]) {
      expect(caminhoDoEscolas(p), p).toBe(false);
    }
  });
  it("reconhece arquivo público", () => {
    for (const p of ["/sw.js", "/icon.png", "/manifest.json", "/.well-known/assetlinks.json", "/.well-known/apple-app-site-association"]) {
      expect(arquivoPublico(p), p).toBe(true);
    }
    for (const p of ["/", "/login", "/dashboard/x", "/home"]) {
      expect(arquivoPublico(p), p).toBe(false);
    }
  });
});

describe("regras do middleware com APP_SCOPE=escolas", () => {
  const d = (url: string, proto = "https", host = "reforco.exemplo.gov.br") => decidirEscopoEscolas({ url, host, proto });

  it("páginas do Escolas seguem para as regras normais", () => {
    expect(d("http://0.0.0.0:3000/escola/inicio")).toEqual({ tipo: "seguir" });
    expect(d("http://0.0.0.0:3000/escola/familia/entrar?x=1")).toEqual({ tipo: "seguir" });
    expect(d("http://0.0.0.0:3000/verificar/abc")).toEqual({ tipo: "seguir" });
  });

  it("arquivos públicos são liberados", () => {
    expect(d("http://0.0.0.0:3000/sw.js")).toEqual({ tipo: "liberar" });
    expect(d("http://0.0.0.0:3000/.well-known/assetlinks.json")).toEqual({ tipo: "liberar" });
  });

  it("páginas do SpeakFlow IA levam para a entrada do Escolas, no mesmo endereço", () => {
    for (const p of ["/", "/login", "/dashboard", "/home", "/chat"]) {
      expect(d(`http://0.0.0.0:3000${p}`), p).toEqual({ tipo: "redirecionar", destino: "https://reforco.exemplo.gov.br/escola/inicio" });
    }
  });

  it("sem https, volta para https no MESMO endereço (nunca para o domínio do SpeakFlow IA)", () => {
    const r = d("http://0.0.0.0:3000/escola/aluno/entrar?aula=AB12", "http");
    expect(r).toEqual({ tipo: "redirecionar", destino: "https://reforco.exemplo.gov.br/escola/aluno/entrar?aula=AB12" });
    expect(JSON.stringify(r)).not.toContain("speakf.com.br");
  });

  it("em localhost não força https", () => {
    expect(d("http://localhost:3000/escola/inicio", "http", "localhost:3000")).toEqual({ tipo: "seguir" });
    expect(d("http://localhost:3000/login", "http", "localhost:3000")).toEqual({ tipo: "redirecionar", destino: "http://localhost:3000/escola/inicio" });
  });
});
