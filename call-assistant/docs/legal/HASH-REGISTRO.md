# REGISTRO DE HASHES CRIPTOGRÁFICOS — PROVA DE ANTERIORIDADE

**Software:** SpeakFlow  
**Autor:** Luiz Eduardo da Silva Dias Melo (CPF 046.245.652-5)  
**Data de Geração:** 31 de março de 2026  
**Algoritmo:** SHA-256

> Este documento constitui **prova de anterioridade** da criação do software.
> Os hashes abaixo são impressões digitais criptográficas únicas de cada arquivo
> fonte, geradas na data de criação. Qualquer alteração posterior em qualquer
> arquivo produzirá um hash completamente diferente, comprovando que este
> conjunto de hashes é único para esta versão do software nesta data.

---

## 🔑 HASH PRINCIPAL DO REPOSITÓRIO (Git)

```
Commit Hash (SHA-1):  ca918407a5ac13241f0446caecd7c192cdb3a9c3
Branch:               main
Data/Hora:            2026-03-31 21:55:23 -0300 (BRT)
Repositório:          https://github.com/Luiz-code-dev/call_assistant
```

**Este hash Git é globalmente único e imutável.** O GitHub registra
automaticamente data, hora e conteúdo de cada commit. Qualquer tentativa
de falsificação de data seria detectável pela estrutura criptográfica do Git.

---

## 📁 HASHES SHA-256 POR ARQUIVO FONTE

### Backend — Java (Spring Boot 3.4 + WebFlux)

| Arquivo | SHA-256 |
|---|---|
| `application.yml` | `1F9ADB7302A3ACF08973EBA3683032DB76C58F87FE38487E83A8C420225C1C5A` |
| `V1__create_sessions_table.sql` | `18F6C79424A1595AF0DEA55BF905FD211448EED5125900CC608FF46DCE73969E` |
| `V2__create_transcripts_table.sql` | `B554DF1A5A0B89291FA137AA139639F992937E7A6EC64808434AE03587980498` |
| `V3__create_translations_table.sql` | `F093E4704A5097C7049F9FD313F5671706A57D91F6438E6EC52B6E3084C3600E` |
| `V4__add_meeting_context_to_sessions.sql` | `FA5891D4E85CADD5BE7E4C03B1B6D0CC5B40D8A2F4D3F0DE2659914E53B454BC` |

### Desktop — TypeScript (Electron + React)

| Arquivo | SHA-256 |
|---|---|
| `CopilotPanel.tsx` | `97A8E932A85EBDF008243E021E363B533465CF5A1117583C084CF122FA1E4410` |
| `TranscriptPanel.tsx` | `C74F6D8556A62FAE694990D509DA0F6225A3304FB6F97BBFAF84230E2DB3E6D5` |
| `SessionPage.tsx` | `3C0441559694FA2A60C39E76EA546DD02A036EA795532F3D049CE8DF91A47B00` |
| `SidecarManager.ts` | `FBEFF7AE0CC42987B25506B871A6D88CFC29106D91316BB49FD1D80480E499D0` |
| `WebSocketClient.ts` | `16EC8FC3787B79C2164F051B2AB1C28C0046D736ED89D180B99FF82A009A08DA` |
| `useTranscription.ts` | `BE470182AD095908450D209E82AB8D79A3C130E7235A9EADA066CE6EEB1F59BE` |
| `useAudioBridge.ts` | `083AE86348F61948166D46F6FD0C5885BD2F20DCB4A1C32C9A9BDA562B9E15CC` |
| `copilotStore.ts` | `16E5F0EC7A893E737D4AB2519845C7F573B8FBCB64F02FBB482F1962AAE2F3A9` |
| `sessionStore.ts` | `A9BEB2713585401864CB343B10F0C25CB97A57B81A25DA2BBE464300FBFB6397` |

### Shared Types — TypeScript

| Arquivo | SHA-256 |
|---|---|
| `session.ts` | `A40672F6376C282E86AD1FBAA20241B99895F4115C82D337551A2C706893270C` |
| `suggestion.ts` | `989C1C9AA90281DDA9C82D5064298E04C652247BBFC2154D2033BB38BE5FED39` |
| `websocket-events.ts` | `0A6FF4928F5B930C1544FB4B92D4905E431261D92EA39F952A3179257985708F` |
| `transcript.ts` | `D50BFFD11045AA0CA3AFA1D75D7A28ADE26F0FDE8E4712505456B6A2734786EC` |
| `translation.ts` | `CE2B6A443DE638E8A94E2F5E70E54A0349AE368F6B66936587D46042EBE7CE07` |

### Audio Engine — Rust

| Arquivo | SHA-256 |
|---|---|
| `main.rs` | `11053C3AB2AAD509BFBEB9EB9C1D8D81D49F8EFCD78AFBB9E696B7D79E5E9A87` |
| `protocol.rs` | `0F802D3709EBEF8B2E14204DA6BE2367E7C12683FD8958F13BB9527B45C0C394` |
| `Cargo.toml` | `6657F1DDB159AC701C54BF57F1C462AB2586DAD616C79DE1B86B30ADBA2E2E61` |

---

## 🛡️ COMO USAR ESTES HASHES COMO PROVA

### 1. Verificação independente
Qualquer pessoa pode verificar que os arquivos não foram adulterados:
```powershell
# Windows PowerShell
Get-FileHash -Path "caminho\para\arquivo.java" -Algorithm SHA256
```
```bash
# Linux / macOS
sha256sum caminho/para/arquivo.java
```

### 2. Prova de Data via GitHub
O commit `ca918407a5ac13241f0446caecd7c192cdb3a9c3` está registrado
publicamente em: https://github.com/Luiz-code-dev/call_assistant/commits/main

O GitHub utiliza servidores nos EUA com timestamp auditável. A data do commit
é prova pública e imutável de anterioridade.

### 3. Para Registro no INPI
Consulte `docs/legal/GUIA-REGISTRO-INPI.md` para o passo a passo completo
do registro formal do software no Brasil.

---

*Documento gerado em 31/03/2026 por Luiz Eduardo da Silva Dias Melo*  
*© 2026 — Todos os direitos reservados*
