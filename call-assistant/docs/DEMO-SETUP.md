# Call Assistant — Guia de Demo para Investidores

## Visão Geral

Para que um investidor possa instalar e usar o Call Assistant, são necessárias duas partes:
1. **Backend na nuvem** — você faz o deploy uma vez (Railway.app, gratuito para demo)
2. **Instalador `.exe`** — você gera e envia para o investidor instalar no Windows

---

## Passo 1 — Deploy do Backend no Railway

### Pré-requisitos
- Conta no [railway.app](https://railway.app) (gratuita)
- Sua OpenAI API Key

### 1.1 — Criar o projeto no Railway

1. Acesse [railway.app/new](https://railway.app/new)
2. Clique em **Deploy from GitHub repo** e selecione `call_assistant`
3. Defina o **Root Directory** como: `apps/backend`
4. Railway detectará o `Dockerfile` automaticamente

### 1.2 — Adicionar PostgreSQL e Redis

No painel do projeto Railway:
1. **+ New** → **Database** → **PostgreSQL** (aguarde provisionar)
2. **+ New** → **Database** → **Redis** (aguarde provisionar)

### 1.3 — Configurar variáveis de ambiente

No serviço do backend (não nos databases), vá em **Variables** e adicione:

```
OPENAI_API_KEY=sk-...sua-chave...
SPRING_DATASOURCE_URL=${{Postgres.DATABASE_URL}}
SPRING_DATA_REDIS_URL=${{Redis.REDIS_URL}}
CALLASSISTANT_AI_STT_PROVIDER=whisper
CALLASSISTANT_AI_COPILOT_PROVIDER=openai
OPENAI_COPILOT_PROMPT_ID=pmpt_...seu-prompt-id...
```

> **Nota:** Railway injeta `${{Postgres.DATABASE_URL}}` e `${{Redis.REDIS_URL}}` automaticamente via referências de variáveis.

### 1.4 — Obter a URL do backend

Após o deploy, Railway exibirá uma URL no formato:
```
https://call-assistant-backend-xxxx.up.railway.app
```
Copie essa URL — você precisará dela no próximo passo.

---

## Passo 2 — Gerar o Instalador `.exe`

### Pré-requisitos (na sua máquina de build)
- Node.js 20+ e pnpm 9 instalados
- Rust e Cargo instalados (para o sidecar)
- Java 21 + Maven (só para validar, não precisa para o build do .exe)

### 2.1 — Compilar o sidecar Rust

```bash
cargo build --release
# Gera: services/audio-engine/target/release/audio-engine.exe
```

### 2.2 — Configurar a URL de produção

Crie o arquivo `apps/desktop/.env`:
```
VITE_BACKEND_URL=https://call-assistant-backend-xxxx.up.railway.app
```
(substitua pela URL real do Railway)

### 2.3 — Instalar dependências e gerar o `.exe`

```bash
cmd /c pnpm install
cmd /c pnpm --filter @call-assistant/desktop pack
```

O instalador será gerado em:
```
apps/desktop/dist/CallAssistant-Setup-0.1.0.exe
```

### 2.4 — Enviar para os investidores

Envie o arquivo `CallAssistant-Setup-0.1.0.exe` via e-mail, Google Drive ou WeTransfer.

---

## Instruções para o Investidor

O investidor precisa apenas:
1. Baixar o `CallAssistant-Setup-0.1.0.exe`
2. Executar como administrador (pode aparecer aviso do Windows Defender — clicar em "Mais informações" → "Executar assim mesmo")
3. Seguir o instalador (next → next → finish)
4. Abrir **Call Assistant** pelo atalho na área de trabalho

> O app se conecta automaticamente ao backend que você configurou. Não é necessário instalar Java, Docker ou qualquer outro software.

---

## Custos Estimados (Railway)

| Plano | Custo | Adequado para |
|---|---|---|
| **Hobby (gratuito)** | $0/mês | Demo de curta duração (limite de uso) |
| **Pro** | ~$20/mês | Demo estável para múltiplos investidores |

---

## Avisos Importantes

- A **OpenAI API Key** tem custo por uso. Para demo de ~30 min espere gastar < $0.50.
- O backend no Railway **dorme após 30min de inatividade** no plano gratuito. Acesse a URL do backend uma vez antes da demo para "acordá-lo".
- O app captura **áudio do sistema** (WASAPI loopback). O investidor precisa ter uma chamada (Teams, Zoom, Meet) acontecendo na máquina dele.
