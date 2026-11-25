import { describe, expect, it } from "vitest";
import { LIVROS, capitulosDoLivro, comNomeDaRede, livroDoPerfil, livrosDoPerfil } from "./indice";
import type { EduRole } from "@/lib/escola/types";

const EQUIPE: EduRole[] = ["NETWORK_ADMIN", "COORDINATOR", "SCHOOL_ADMIN", "TEACHER"];

describe("livros de formação", () => {
  it("cada perfil da equipe tem livros de uso da plataforma e de prática profissional", () => {
    for (const perfil of EQUIPE) {
      const grupos = livrosDoPerfil(perfil).map((livro) => livro.grupo);
      expect(grupos).toContain("plataforma");
      expect(grupos).toContain("pratica");
    }
  });

  it("a Secretaria abre todos os livros e o professor não abre os da gestão", () => {
    expect(livrosDoPerfil("NETWORK_ADMIN").length).toBe(LIVROS.length);
    expect(livroDoPerfil("guia-do-professor", "TEACHER")?.titulo).toBe("Guia do professor");
    expect(livroDoPerfil("guia-da-secretaria", "TEACHER")).toBeNull();
    expect(livroDoPerfil("guia-da-coordenacao-e-da-direcao", "TEACHER")).toBeNull();
    expect(livroDoPerfil("reunioes-pedagogicas", "TEACHER")).toBeNull();
    expect(livroDoPerfil("nao-existe", "NETWORK_ADMIN")).toBeNull();
  });

  it("os slugs não se repetem e todo livro tem perfil", () => {
    expect(new Set(LIVROS.map((livro) => livro.slug)).size).toBe(LIVROS.length);
    expect(LIVROS.every((livro) => livro.perfis.length > 0)).toBe(true);
  });

  it("um livro que não existe não carrega capítulos", async () => {
    expect(await capitulosDoLivro("nao-existe")).toBeNull();
  });

  it("todo livro carrega os capítulos anunciados, com âncoras únicas e texto", async () => {
    for (const livro of LIVROS) {
      const capitulos = await capitulosDoLivro(livro.slug);
      expect(capitulos, livro.slug).not.toBeNull();
      const lista = capitulos ?? [];
      expect(lista.length, livro.slug).toBe(livro.capitulos);
      expect(lista.length).toBeGreaterThanOrEqual(25);
      expect(new Set(lista.map((c) => c.id)).size).toBe(lista.length);
      expect(lista.every((c) => c.titulo.length > 0 && c.html.length > 200)).toBe(true);
    }
  });

  it("o texto segue as regras do produto e não traz código executável", async () => {
    for (const livro of LIVROS) {
      const capitulos = (await capitulosDoLivro(livro.slug)) ?? [];
      const texto = [livro.titulo, livro.subtitulo, livro.publico, ...capitulos.flatMap((c) => [c.titulo, c.html])].join("\n");
      // Sem emoji.
      expect(/[\uD800-\uDFFF☀-➿]/.test(texto), livro.slug).toBe(false);
      // O material serve a qualquer rede: não cita produto nem município.
      expect(/SpeakFlow|EscallarEdu|Camaçari/i.test(texto), livro.slug).toBe(false);
      expect(/gratuit/i.test(texto), livro.slug).toBe(false);
      // Usa "responsáveis" e "aluno".
      expect(/\b(pais e mães|estudantes?)\b/i.test(texto), livro.slug).toBe(false);
      // HTML estático: sem scripts, eventos, quadros ou endereços externos.
      expect(/<script|<iframe|<object|<embed|<link|<img|javascript:|\son[a-z]+\s*=|https?:\/\//i.test(texto), livro.slug).toBe(false);
    }
  });

  it("o nome da rede entra protegido no lugar do marcador", () => {
    expect(comNomeDaRede("<em>{{REDE}}</em> e {{REDE}}", "Rede <A> & B")).toBe("<em>Rede &lt;A&gt; &amp; B</em> e Rede &lt;A&gt; &amp; B");
    expect(comNomeDaRede("sem marcador", "Rede")).toBe("sem marcador");
  });
});
