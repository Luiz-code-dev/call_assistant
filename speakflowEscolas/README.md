# SpeakFlow Escolas — App (Expo)

App separado do SpeakFlow AI (`speakflowMobile/` — **não tocar**). Público escolar (crianças): Política de Famílias no Google Play, sem IAP, sem anúncios, sem áudio em segundo plano.

- iOS/Android: `br.com.speakflow.escolas` · iPad habilitado · retrato e paisagem.
- Consome as mesmas APIs do site (`https://www.speakflow.ia.br/api/escola/*`) — mesma lógica da web.
- Config/gating de telas via `GET /api/escola/config` (ex.: `familyEnabled` controla "Sou responsável").

## Status
- [x] Config de loja (`app.json`, `eas.json`) conforme PROMPT (permissões mic/câmera com texto PT, sem IAP, sem background audio, iPad, targetSdk 36, cripto isenta).
- [x] Base: tema (`lib/theme.ts`), API (`lib/api.ts`), navegação (`expo-router`).
- [x] Entrada (Sou aluno · Equipe escolar · Sou responsável com `familyEnabled`).
- [x] Configurações: Termos, Privacidade, Excluir conta + aviso de IA.
- [ ] Telas nativas do aluno (Minha trilha, Atividade fala/escrita/quiz, Retorno com "Reportar este retorno", Evolução).
- [ ] Telas da família e do professor.
- [ ] Permissões pedidas só no uso (expo-av mic ao gravar; expo-camera ao ler QR).

## Antes de buildar
1. `npm install` nesta pasta.
2. Colocar ícones/splash de `SpeakFlow-Escolas-Icones.zip` em `assets/`.
3. Criar projeto EAS novo e preencher `extra.eas.projectId` (app.json) e `submit` (eas.json) — **não** reutilizar credenciais do SpeakFlow AI.
4. `npx expo config --type introspect` para conferir `targetSdkVersion 36` e permissões.
5. `eas build -p android --profile preview` / `-p ios`.

## Regras de loja (resumo — ver docs/escolas/lojas-*.md no pageCallAssistant)
- Nada de "em breve"; telas não prontas ficam escondidas via `/api/escola/config`.
- Exclusão de conta no app + página pública `/escola/excluir-conta`.
- Aviso de IA antes do 1º envio; botão "Reportar este retorno" na tela de retorno.
- Sem SDK de anúncio/analytics de terceiros; sem push para aluno.
