# Telas do SpeakFlow Escolas

Screenshots gerados pelo Playwright (`tests/e2e/escolas-fluxo.spec.ts`).

## Como gerar

```bash
# 1. Servidor com seed demo
ESCOLAS_SEED_DEMO=true ESCOLAS_SEED_USUARIOS=true ESCOLAS_SEED_TESTE=true npm run dev

# 2. Playwright (em outro terminal)
BASE_URL=http://localhost:3001 npx playwright test tests/e2e/escolas-fluxo.spec.ts

# 3. Screenshots ficam em docs/escolas/telas/
# 4. Video fica em playwright-results/
```

## Telas geradas

| Arquivo | Perfil | Tela |
|---|---|---|
| 01-professor-painel.png | Professor | Painel inicial |
| 02-professor-turmas.png | Professor | Mapa da turma |
| 03-professor-trilhas.png | Professor | Biblioteca de trilhas (12) |
| 04-coordenacao-painel.png | Coordenacao | Painel |
| 05-coordenacao-diagnosticos.png | Coordenacao | Diagnosticos da rede |
| 06-coordenacao-habilidades.png | Coordenacao | Habilidades prioritarias |
| 07-direcao-painel.png | Direcao | Painel com numeros coerentes |
| 08-direcao-familias.png | Direcao | Pagina de familias |
| 09-aluno-inicio.png | Aluno | Tela inicial |
| 10-aluno-trilha.png | Aluno | Minha trilha com anel SVG |
| 11-aluno-evolucao.png | Aluno | Evolucao |
| 12-familia-entrar.png | Familia | Tela de entrada |
