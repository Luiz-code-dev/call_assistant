# Notas do projeto — pageCallAssistant

## Deploy Railway (gleaming-endurance)

- O Railway só faz build automático quando há mudança dentro de `pageCallAssistant/`.
- Commits que alteram apenas `speakflowEscolas/`, `call-assistant/` ou outros diretórios do monorepo são **ignorados** (SKIPPED).
- Se um PR muda só arquivos do app nativo ou do desktop, o deploy precisa ser **acionado manualmente** no Railway após o merge.
- Quando um PR muda tanto `pageCallAssistant/` quanto outros diretórios, o deploy dispara automaticamente.

**Regra prática:** sempre que um PR não tiver nenhum arquivo em `pageCallAssistant/`, avisar o usuário para acionar o redeploy manual no Railway após o merge.

## Comandos úteis

```bash
# TypeScript check (rodar antes de todo commit)
cd pageCallAssistant && npx tsc --noEmit

# Testes unitários
cd pageCallAssistant && npx vitest run

# Build app nativo (após mudanças em speakflowEscolas/)
cd speakflowEscolas && eas build --platform android --profile production

# Build desktop .exe (após mudanças em call-assistant/apps/desktop/)
cd call-assistant/apps/desktop && npm run pack
```

## Branches

- Nunca commitar direto na `main` (branch protegida).
- Sempre criar branch, PR e mergear pelo GitHub.
- Atualizar a branch com `origin/main` antes de abrir o PR.
